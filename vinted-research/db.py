"""SQLite スキーマとデータ操作。"""
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    brand TEXT,
    size TEXT,
    condition TEXT,
    seller_id INTEGER,
    seller_login TEXT,
    listed_at TEXT,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    photo_url TEXT,
    image_file TEXT,
    promoted INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    status_http INTEGER,
    status_checked_at TEXT,
    gone_at TEXT
);
CREATE TABLE IF NOT EXISTS snapshots (
    item_id INTEGER NOT NULL,
    run_date TEXT NOT NULL,
    price REAL,
    total_price REAL,
    fee REAL,
    currency TEXT,
    favourite_count INTEGER,
    PRIMARY KEY (item_id, run_date)
);
CREATE TABLE IF NOT EXISTS item_searches (
    item_id INTEGER NOT NULL,
    search_key TEXT NOT NULL,
    PRIMARY KEY (item_id, search_key)
);
CREATE TABLE IF NOT EXISTS runs (
    run_date TEXT NOT NULL,
    search_key TEXT NOT NULL,
    pages INTEGER,
    items INTEGER,
    new_items INTEGER,
    started_at TEXT,
    finished_at TEXT,
    error TEXT,
    PRIMARY KEY (run_date, search_key)
);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_first_seen ON items(first_seen);
"""


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 10000")
    conn.executescript(SCHEMA)
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(items)")}
    if "gone_at" not in cols:
        conn.execute("ALTER TABLE items ADD COLUMN gone_at TEXT")
        conn.commit()
    return conn


def upsert_item(conn, item: dict, run_date: str, listed_at_iso: str | None,
                search_key: str) -> bool:
    """商品を登録/更新する。新規なら True を返す。"""
    price = (item.get("price") or {})
    row = conn.execute("SELECT id FROM items WHERE id = ?", (item["id"],)).fetchone()
    is_new = row is None
    photo = item.get("photo") or {}
    thumb = next(
        (t["url"] for t in (photo.get("thumbnails") or []) if t.get("type") == "thumb310x430"),
        photo.get("url"),
    )
    user = item.get("user") or {}
    if is_new:
        conn.execute(
            """INSERT INTO items
               (id, title, url, brand, size, condition, seller_id, seller_login,
                listed_at, first_seen, last_seen, photo_url, promoted)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (item["id"], item.get("title") or "", item.get("url") or "",
             item.get("brand_title"), item.get("size_title"), item.get("status"),
             user.get("id"), user.get("login"),
             listed_at_iso, run_date, run_date, thumb,
             1 if item.get("promoted") else 0),
        )
    else:
        conn.execute(
            """UPDATE items SET last_seen = ?, title = ?, status = 'active', gone_at = NULL
               WHERE id = ?""",
            (run_date, item.get("title") or "", item["id"]),
        )
    total = (item.get("total_item_price") or {})
    fee = (item.get("service_fee") or {})
    conn.execute(
        """INSERT OR REPLACE INTO snapshots
           (item_id, run_date, price, total_price, fee, currency, favourite_count)
           VALUES (?,?,?,?,?,?,?)""",
        (item["id"], run_date,
         _amount(price), _amount(total), _amount(fee),
         price.get("currency_code"), item.get("favourite_count")),
    )
    conn.execute(
        "INSERT OR IGNORE INTO item_searches (item_id, search_key) VALUES (?, ?)",
        (item["id"], search_key),
    )
    return is_new


def _amount(money: dict) -> float | None:
    amount = money.get("amount")
    if amount is None:
        return None
    try:
        return float(amount)
    except (TypeError, ValueError):
        return None


def sold_check_candidates(conn, run_date: str, ages_days: list[int], limit: int) -> list:
    """状態チェック対象: first_seen からの経過日数が指定日数に一致する active 商品。"""
    placeholders = ",".join("?" for _ in ages_days)
    return conn.execute(
        f"""SELECT id FROM items
            WHERE status = 'active'
              AND CAST(julianday(?) - julianday(first_seen) AS INTEGER) IN ({placeholders})
            ORDER BY RANDOM() LIMIT ?""",
        (run_date, *ages_days, limit),
    ).fetchall()


def mark_gone(conn, run_date: str) -> int:
    """「まだ検索窓に残っているはずなのに消えた」商品を gone にする。

    各検索の窓の下限（今日見えた中で最も古い出品時刻）より新しい商品が
    今日見えなかった場合、売れた/取り下げ/予約のどれかで消えたと推定できる。
    窓から自然に押し出されただけの古い商品は対象外。
    境界の揺れ対策で 2 時間のマージンを取る。
    """
    marked = 0
    for row in conn.execute(
            """SELECT search_key FROM runs
               WHERE run_date = ? AND error IS NULL AND pages > 0""", (run_date,)):
        key = row["search_key"]
        wmin = conn.execute(
            """SELECT MIN(i.listed_at) FROM items i
               JOIN item_searches s ON s.item_id = i.id
               WHERE s.search_key = ? AND i.last_seen = ? AND i.listed_at IS NOT NULL""",
            (key, run_date)).fetchone()[0]
        if not wmin:
            continue
        cur = conn.execute(
            """UPDATE items SET status = 'gone', gone_at = ?
               WHERE status = 'active' AND last_seen < ?
                 AND listed_at > datetime(?, '+2 hours')
                 AND id IN (SELECT item_id FROM item_searches WHERE search_key = ?)""",
            (run_date, run_date, wmin, key))
        marked += cur.rowcount
    conn.commit()
    return marked


def record_status(conn, item_id: int, status: str, http_code: int, checked_at: str) -> None:
    conn.execute(
        "UPDATE items SET status = ?, status_http = ?, status_checked_at = ? WHERE id = ?",
        (status, http_code, checked_at, item_id),
    )
