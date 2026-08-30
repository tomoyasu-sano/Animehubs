"""Vinted への HTTP アクセス層。

TLS フィンガープリント検出を避けるため、python の HTTP ライブラリではなく
curl をサブプロセスで呼ぶ（テストで動作実績のある構成をそのまま使う）。
"""
import json
import random
import re
import subprocess
import time
import urllib.parse
from pathlib import Path

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

AVAILABILITY_RE = re.compile(r'"availability"\s*:\s*"([A-Za-z/:.]+)"')
PHOTO_TS_RE = re.compile(r"/(\d{10})\.(?:jpe?g|webp|png)")


class VintedSession:
    def __init__(self, base_url: str, workdir: Path):
        self.base_url = base_url.rstrip("/")
        self.cookie_file = Path(workdir) / "cookies.txt"
        self.warmed = False

    def _curl(self, url: str, accept: str, extra_args: list[str] | None = None,
              timeout: int = 40) -> tuple[int, bytes]:
        args = [
            "curl", "-s", "-L", "--compressed",
            "-A", USER_AGENT,
            "-H", f"Accept: {accept}",
            "-H", "Accept-Language: en-US,en;q=0.9",
            "-b", str(self.cookie_file),
            "-w", "\n%{http_code}",
        ]
        if extra_args:
            args.extend(extra_args)
        args.append(url)
        proc = subprocess.run(args, capture_output=True, timeout=timeout)
        body, _, code = proc.stdout.rpartition(b"\n")
        try:
            return int(code), body
        except ValueError:
            return 0, proc.stdout

    def warmup(self) -> None:
        """トップページを踏んで匿名セッション Cookie を取得する。"""
        code, _ = self._curl(
            self.base_url + "/",
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            extra_args=["-c", str(self.cookie_file)],
        )
        if code != 200:
            raise RuntimeError(f"warmup failed: HTTP {code}")
        self.warmed = True

    def catalog_page(self, search_text: str, catalog_ids: str, page: int,
                     per_page: int, currency: str) -> dict:
        """カタログ検索 API の 1 ページ分を取得する。"""
        params = {
            "search_text": search_text,
            "order": "newest_first",
            "per_page": str(per_page),
            "page": str(page),
            "currency": currency,
        }
        if catalog_ids:
            params["catalog_ids"] = catalog_ids
        qs = urllib.parse.urlencode(params)
        url = f"{self.base_url}/api/v2/catalog/items?{qs}"
        referer = f"{self.base_url}/catalog?search_text={urllib.parse.quote(search_text)}"
        code, body = self._curl(url, "application/json",
                                extra_args=["-H", f"Referer: {referer}"])
        if code != 200:
            raise RuntimeError(f"catalog API HTTP {code} (page={page}, search={search_text})")
        try:
            return json.loads(body)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"catalog API returned non-JSON (page={page}): {body[:120]!r}") from e

    def item_status(self, item_id: int) -> tuple[str, int]:
        """商品ページから販売状態を判定する。

        戻り値: (status, http_code)
          status: active / sold / reserved / removed / unknown
        """
        code, body = self._curl(f"{self.base_url}/items/{item_id}", "text/html")
        if code == 404 or code == 410:
            return "removed", code
        if code != 200:
            return "unknown", code
        m = AVAILABILITY_RE.search(body.decode("utf-8", errors="replace"))
        if not m:
            return "unknown", code
        availability = m.group(1).rsplit("/", 1)[-1].lower()
        if availability == "instock":
            return "active", code
        if availability in ("soldout", "outofstock", "sold_out"):
            return "sold", code
        if "reserved" in availability or availability == "limitedavailability":
            return "reserved", code
        return "unknown", code

    def download_image(self, url: str, dest: Path) -> bool:
        proc = subprocess.run(
            ["curl", "-s", "-f", "-A", USER_AGENT, "-o", str(dest), url],
            capture_output=True, timeout=30,
        )
        return proc.returncode == 0 and dest.exists() and dest.stat().st_size > 0


def extract_listed_at(item: dict) -> int | None:
    """商品 JSON から出品日時 (unix epoch) を推定する。

    メイン写真のアップロード時刻を出品時刻の近似値として使う。
    """
    photo = item.get("photo") or {}
    hi = photo.get("high_resolution") or {}
    ts = hi.get("timestamp")
    if isinstance(ts, int) and ts > 1_000_000_000:
        return ts
    m = PHOTO_TS_RE.search(photo.get("url") or "")
    if m:
        return int(m.group(1))
    return None


def sleep_range(delay_range: list[float]) -> None:
    time.sleep(random.uniform(delay_range[0], delay_range[1]))
