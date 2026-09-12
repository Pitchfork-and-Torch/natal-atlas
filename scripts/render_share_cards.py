#!/usr/bin/env python3
"""Render OG, hive still, and infographic from HTML + Fontshare. Exact text."""
from __future__ import annotations

from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

import base64

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT = PUBLIC

def data_uri(path: Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")

BG = data_uri(PUBLIC / "assets" / "share-atmosphere.jpg", "image/jpeg")
CLASH = data_uri(PUBLIC / "fonts" / "fontshare" / "clash-display" / "woff2" / "ClashDisplay-Semibold.woff2", "font/woff2")
CLASH_B = data_uri(PUBLIC / "fonts" / "fontshare" / "clash-display" / "woff2" / "ClashDisplay-Bold.woff2", "font/woff2")
SATOSHI = data_uri(PUBLIC / "fonts" / "fontshare" / "satoshi" / "woff2" / "Satoshi-Regular.woff2", "font/woff2")
SATOSHI_M = data_uri(PUBLIC / "fonts" / "fontshare" / "satoshi" / "woff2" / "Satoshi-Medium.woff2", "font/woff2")

COMMON = f"""
@font-face {{ font-family: Clash; src: url('{CLASH}') format('woff2'); font-weight: 600; }}
@font-face {{ font-family: Clash; src: url('{CLASH_B}') format('woff2'); font-weight: 700; }}
@font-face {{ font-family: Satoshi; src: url('{SATOSHI}') format('woff2'); font-weight: 400; }}
@font-face {{ font-family: Satoshi; src: url('{SATOSHI_M}') format('woff2'); font-weight: 500; }}
html,body {{ margin:0; padding:0; background:#171512; color:#f3ead8; }}
* {{ box-sizing: border-box; }}
.bg {{ position:absolute; inset:0; background: url('{BG}') center/cover no-repeat; }}
.scrim {{ position:absolute; inset:0; background:
  linear-gradient(90deg, #171512 0%, #171512f2 34%, #17151299 52%, #17151222 72%, transparent 100%),
  linear-gradient(180deg, #17151266 0%, transparent 42%, #171512aa 100%); }}
.kicker {{ font-family: Satoshi, sans-serif; font-weight:500; letter-spacing:0.22em; text-transform:uppercase; color:#d4a017; font-size:18px; margin:0 0 18px; }}
h1 {{ font-family: Clash, sans-serif; font-weight:700; letter-spacing:-0.03em; margin:0; line-height:0.92; }}
.sub {{ font-family: Satoshi, sans-serif; font-weight:400; color:#f3ead8c7; margin:22px 0 0; line-height:1.35; }}
.url {{ font-family: Satoshi, sans-serif; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; color:#d4a017; }}
"""

OG = f"""<!doctype html><html><head><meta charset="utf-8"><style>
{COMMON}
body {{ width:1200px; height:630px; overflow:hidden; position:relative; }}
.copy {{ position:relative; z-index:1; padding:88px 64px; width:58%; }}
h1 {{ font-size:92px; }}
.sub {{ font-size:26px; max-width:18ch; }}
.url {{ position:absolute; left:64px; bottom:48px; font-size:16px; z-index:1; }}
</style></head><body>
<div class="bg"></div><div class="scrim"></div>
<div class="copy">
  <p class="kicker">Pitchfork and Torch</p>
  <h1>Natal<br>Atlas</h1>
  <p class="sub">Cast a nativity in the browser. Nothing is uploaded.</p>
</div>
<p class="url">astrochart.jonbailey.xyz</p>
</body></html>
"""

HIVE = f"""<!doctype html><html><head><meta charset="utf-8"><style>
{COMMON}
body {{ width:1280px; height:720px; overflow:hidden; position:relative; }}
.copy {{ position:relative; z-index:1; padding:96px 72px; width:56%; }}
h1 {{ font-size:108px; }}
.sub {{ font-size:28px; max-width:18ch; }}
.url {{ position:absolute; left:72px; bottom:56px; font-size:18px; z-index:1; }}
</style></head><body>
<div class="bg"></div><div class="scrim"></div>
<div class="copy">
  <p class="kicker">Natal atlas</p>
  <h1>Cast a<br>clock.</h1>
  <p class="sub">Tropical wheel. Houses. Transits. Synastry. On the device.</p>
</div>
<p class="url">astrochart.jonbailey.xyz</p>
</body></html>
"""

INFO = f"""<!doctype html><html><head><meta charset="utf-8"><style>
{COMMON}
body {{ width:1080px; height:1350px; overflow:hidden; position:relative; }}
.scrim {{ background:
  linear-gradient(180deg, #171512f2 0%, #171512d9 28%, #171512b3 58%, #171512f2 100%); }}
.wrap {{ position:relative; z-index:1; padding:72px 72px 64px; height:100%; display:flex; flex-direction:column; }}
h1 {{ font-size:96px; margin-bottom:12px; }}
.lead {{ font-family: Satoshi, sans-serif; font-size:28px; color:#f3ead8c7; max-width:22ch; margin:0 0 48px; line-height:1.4; }}
ol {{ list-style:none; margin:0; padding:0; display:grid; gap:22px; flex:1; }}
li {{ display:grid; grid-template-columns: 4.2rem 1fr; gap:18px; align-items:start; padding:22px 0; border-top:1px solid #f3ead81a; }}
.n {{ font-family: Clash, sans-serif; font-weight:600; font-size:28px; color:#d4a017; }}
h2 {{ font-family: Clash, sans-serif; font-weight:600; font-size:32px; margin:0 0 6px; }}
p {{ font-family: Satoshi, sans-serif; font-size:22px; margin:0; color:#f3ead8b8; line-height:1.4; }}
.foot {{ display:flex; justify-content:space-between; align-items:baseline; margin-top:auto; padding-top:28px; }}
.foot .url {{ font-size:18px; }}
.mit {{ font-family: Satoshi, sans-serif; font-size:16px; color:#f3ead866; letter-spacing:0.12em; text-transform:uppercase; }}
</style></head><body>
<div class="bg"></div><div class="scrim"></div>
<div class="wrap">
  <p class="kicker">Natal Atlas</p>
  <h1>The wheel<br>stays here.</h1>
  <p class="lead">A natal theatre in the browser. Cast a clock. Read the sky. Upload nothing.</p>
  <ol>
    <li><span class="n">01</span><div><h2>Cast</h2><p>Name, date, time, and a place on Earth. City search or coordinates.</p></div></li>
    <li><span class="n">02</span><div><h2>Compute locally</h2><p>Tropical apparent geocentric. Astronomy Engine. Nothing leaves the device.</p></div></li>
    <li><span class="n">03</span><div><h2>Read the wheel</h2><p>Porphyry, whole sign, or equal houses. Patterns solo on the ring.</p></div></li>
    <li><span class="n">04</span><div><h2>Now and overlay</h2><p>Scrub transits. Next solar return. Outer ring for a second chart.</p></div></li>
    <li><span class="n">05</span><div><h2>Vault</h2><p>Save in this browser only. It never opens itself.</p></div></li>
  </ol>
  <div class="foot"><span class="url">astrochart.jonbailey.xyz</span><span class="mit">MIT</span></div>
</div>
</body></html>
"""


def shot(page, html: str, size: tuple[int, int], dest_png: Path, dest_jpg: Path | None = None) -> None:
    w, h = size
    page.set_viewport_size({"width": w, "height": h})
    page.set_content(html, wait_until="load")
    page.evaluate("() => document.fonts.ready")
    page.wait_for_timeout(200)
    dest_png.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(dest_png), type="png")
    rgb = Image.open(dest_png).convert("RGB")
    if dest_jpg:
        rgb.save(dest_jpg, "JPEG", quality=90, optimize=True, progressive=True)
    else:
        rgb.save(dest_png.with_suffix(".jpg"), "JPEG", quality=90, optimize=True, progressive=True)


def main() -> int:
    if not (PUBLIC / "assets" / "share-atmosphere.jpg").is_file():
        raise SystemExit("missing public/assets/share-atmosphere.jpg")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        shot(page, OG, (1200, 630), OUT / "og.png", OUT / "og.jpg")
        shot(page, HIVE, (1280, 720), ROOT / ".local-run" / "hive.png", ROOT / ".local-run" / "hive.jpg")
        shot(page, INFO, (1080, 1350), OUT / "infographic.png", OUT / "infographic.jpg")
        browser.close()
    print("wrote", OUT / "og.jpg", OUT / "infographic.jpg")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
