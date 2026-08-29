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
print("=== 消えた商品（売れた/取り下げ推定） ===")
rows = conn.execute(
    """SELECT i.title, i.listed_at, i.gone_at,
              (SELECT favourite_count FROM snapshots s WHERE s.item_id = i.id
               ORDER BY run_date DESC LIMIT 1) fav,
              (SELECT price FROM snapshots s WHERE s.item_id = i.id
               ORDER BY run_date DESC LIMIT 1) price
       FROM items i WHERE i.status = 'gone'
       ORDER BY i.gone_at DESC, fav DESC""").fetchall()
if not rows:
    print("（まだなし — 2日目の収集から検出が始まります）")
else:
    with_fav = [r for r in rows if (r["fav"] or 0) >= 1]
    print(f"計 {len(rows)} 件 — うち いいね≥1 (売れた可能性が高い): {len(with_fav)} 件, "
          f"いいね0 (不明): {len(rows) - len(with_fav)} 件")
    print()
    for r in with_fav[:15]:
        days = ""
        if r["listed_at"] and r["gone_at"]:
            d0 = dt.datetime.fromisoformat(r["listed_at"])
            d1 = dt.datetime.fromisoformat(r["gone_at"])
            days = f"{max((d1 - d0).days, 0)}日で消滅 "
        print(f"{days}{r['price']} SEK fav={r['fav']} {r['title'][:50]}")

conn.close()
