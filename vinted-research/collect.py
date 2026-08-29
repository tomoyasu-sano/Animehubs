"""Vinted 定点観測: 毎朝の収集ジョブ。

使い方:
    python3 collect.py            # 即時実行（手動）
    python3 collect.py --jitter   # 開始前に 0〜25 分ランダム待機（launchd 用）
"""
import argparse
import datetime as dt
import json
import random
import sys
import time
from pathlib import Path

import db
from vinted_api import VintedSession, extract_listed_at, sleep_range

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
IMAGES = DATA / "images"


def log(msg: str) -> None:
    print(f"[{dt.datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def collect_search(session, conn, cfg, search, run_date) -> tuple[int, int, list]:
    """1 検索キーの全ページを収集。(件数, 新規件数, 新規画像候補) を返す。"""
    seen, new_count, new_images = 0, 0, []
    pages_fetched = 0
    started = dt.datetime.now().isoformat(timespec="seconds")
    error = None
    try:
        for page in range(1, cfg["max_pages"] + 1):
            data = session.catalog_page(
                search["search_text"], search["catalog_ids"], page,
                cfg["per_page"], cfg["currency"],
            )
            items = data.get("items", [])
            if not items:
                break
            pages_fetched += 1
            for item in items:
                ts = extract_listed_at(item)
                listed_iso = (
                    dt.datetime.fromtimestamp(ts).isoformat(timespec="seconds")
                    if ts else None
                )
                if db.upsert_item(conn, item, run_date, listed_iso, search["key"]):
                    new_count += 1
                    photo = item.get("photo") or {}
                    thumb = next(
                        (t["url"] for t in (photo.get("thumbnails") or [])
                         if t.get("type") == "thumb310x430"),
                        photo.get("url"),
                    )
                    if thumb:
                        new_images.append((item["id"], thumb))
                seen += 1
            conn.commit()
            total_pages = (data.get("pagination") or {}).get("total_pages", page)
            if page >= total_pages:
                break
            sleep_range(cfg["page_delay_range"])
    except RuntimeError as e:
        error = str(e)
        log(f"  ERROR: {e}")
    conn.execute(
        """INSERT OR REPLACE INTO runs
           (run_date, search_key, pages, items, new_items, started_at, finished_at, error)
           VALUES (?,?,?,?,?,?,?,?)""",
        (run_date, search["key"], pages_fetched, seen, new_count, started,
         dt.datetime.now().isoformat(timespec="seconds"), error),
    )
    conn.commit()
    return seen, new_count, new_images


def download_images(session, conn, cfg, new_images) -> int:
    budget = cfg["max_image_downloads"]
    if len(new_images) > budget:
        log(f"  画像DL上限 {budget} 件に切り詰め（対象 {len(new_images)} 件）")
        new_images = new_images[:budget]
    ok = 0
    for item_id, url in new_images:
        dest = IMAGES / f"{item_id}.jpg"
        if dest.exists():
            continue
        if session.download_image(url, dest):
            conn.execute("UPDATE items SET image_file = ? WHERE id = ?",
                         (dest.name, item_id))
            ok += 1
        sleep_range(cfg["image_delay_range"])
    conn.commit()
    return ok


def check_sold(session, conn, cfg, run_date) -> dict:
    rows = db.sold_check_candidates(
        conn, run_date, cfg["sold_check_ages_days"], cfg["max_sold_checks"])
    counts = {}
    now = dt.datetime.now().isoformat(timespec="seconds")
    for row in rows:
        status, http_code = session.item_status(row["id"])
        if status != "unknown":
            db.record_status(conn, row["id"], status, http_code, now)
        counts[status] = counts.get(status, 0) + 1
        sleep_range(cfg["sold_check_delay_range"])
    conn.commit()
    return counts


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--jitter", action="store_true",
                        help="開始前にランダム待機（定時実行のパターン化を避ける）")
    parser.add_argument("--no-images", action="store_true", help="画像DLをスキップ")
    parser.add_argument("--no-sold-check", action="store_true", help="売却チェックをスキップ")
    args = parser.parse_args()

    cfg = json.loads((ROOT / "config.json").read_text())
    DATA.mkdir(exist_ok=True)
    IMAGES.mkdir(exist_ok=True)

    if args.jitter:
        wait = random.uniform(0, cfg["jitter_max_seconds"])
        log(f"ジッター待機 {wait / 60:.1f} 分")
        time.sleep(wait)

    run_date = dt.date.today().isoformat()
    conn = db.connect(DATA / "vinted.db")
    session = VintedSession(cfg["base_url"], DATA)
    log(f"=== 収集開始 {run_date} ===")
    session.warmup()

    all_new_images = []
    for search in cfg["searches"]:
        seen, new, new_images = collect_search(session, conn, cfg, search, run_date)
        all_new_images.extend(new_images)
        log(f"{search['key']}: {seen} 件（新規 {new}）")
        sleep_range(cfg["page_delay_range"])

    if not args.no_images:
        ok = download_images(session, conn, cfg, all_new_images)
        log(f"画像DL: {ok} 件")

    if not args.no_sold_check:
        counts = check_sold(session, conn, cfg, run_date)
        log(f"売却チェック: {counts or 'なし（対象0件）'}")

    total = conn.execute("SELECT COUNT(*) FROM items").fetchone()[0]
    log(f"=== 完了。累計 {total} 商品 ===")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
