"""収集状況のクイックレポート。 usage: python3 report.py"""
import datetime as dt
from pathlib import Path

import db

conn = db.connect(Path(__file__).resolve().parent / "data" / "vinted.db")

total = conn.execute("SELECT COUNT(*) FROM items").fetchone()[0]
by_status = conn.execute(
    "SELECT status, COUNT(*) n FROM items GROUP BY status ORDER BY n DESC").fetchall()
with_image = conn.execute(
    "SELECT COUNT(*) FROM items WHERE image_file IS NOT NULL").fetchone()[0]

print(f"累計商品数: {total}（画像あり: {with_image}）")
print("状態内訳:", ", ".join(f"{r['status']}={r['n']}" for r in by_status))
print()
print("=== 実行履歴（直近10件） ===")
for r in conn.execute(
        "SELECT * FROM runs ORDER BY run_date DESC, search_key LIMIT 10"):
    err = f" ERROR: {r['error']}" if r["error"] else ""
    print(f"{r['run_date']} {r['search_key']:<18} {r['items']:>4} 件"
          f"（新規 {r['new_items']}）{err}")

print()
print("=== 直近で売れた（と判定された）商品 ===")
rows = conn.execute(
    """SELECT i.id, i.title, i.status, i.listed_at, i.status_checked_at,
              (SELECT favourite_count FROM snapshots s WHERE s.item_id = i.id
               ORDER BY run_date DESC LIMIT 1) fav,
              (SELECT price FROM snapshots s WHERE s.item_id = i.id
               ORDER BY run_date DESC LIMIT 1) price
       FROM items i WHERE i.status IN ('sold', 'reserved')
       ORDER BY i.status_checked_at DESC LIMIT 15""").fetchall()
if not rows:
    print("（まだなし — 売却チェックは観測開始3日後から動きます）")
for r in rows:
    days = ""
    if r["listed_at"] and r["status_checked_at"]:
        d0 = dt.datetime.fromisoformat(r["listed_at"])
        d1 = dt.datetime.fromisoformat(r["status_checked_at"])
        days = f" {round((d1 - d0).days)}日で"
    print(f"[{r['status']}]{days} {r['price']} SEK fav={r['fav']} {r['title'][:50]}")

conn.close()
