#!/usr/bin/env python3
"""Render site/pages/** into dist/ using site/_layout.html.

    python3 tools/build.py

Stdlib only. Each page starts with a metadata block:

    <!--meta
    title: Printable Bingo Cards ...
    desc: ...
    priority: 1.0
    -->

The domain lives in one place, site/config.json. BASE_URL / BASE_PATH env vars
override it for a preview at <user>.github.io/funonpaper.
"""
import datetime
import html
import json
import os
import re
import shutil
import subprocess
from string import Template

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE, DIST = os.path.join(ROOT, "site"), os.path.join(ROOT, "dist")
CONFIG = json.load(open(os.path.join(SITE, "config.json"), encoding="utf-8"))
DOMAIN = CONFIG["domain"]
# `or`, not a default argument: GitHub Actions passes an unset repo variable as
# "", and set-but-empty beats a default. On hjarngympa that shipped relative
# canonicals and an invalid sitemap.
BASE_URL = (os.environ.get("BASE_URL") or f"https://{DOMAIN}").rstrip("/")
BASE_PATH = (os.environ.get("BASE_PATH") or "").rstrip("/")
ADS_CLIENT = CONFIG.get("adsenseClient")
META_RE = re.compile(r"^<!--meta\s*(.*?)-->\s*", re.S)

# Until AdSense approves the domain the slot is an empty, sized box, so adding
# the ad later does not move anything. With a client id configured the build
# loads the script and fills the box.
AD_SCRIPT = (
    '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
    '?client={c}" crossorigin="anonymous"></script>'
)
AD_INS = (
    '<ins class="adsbygoogle" style="display:block;width:100%;height:100%" '
    'data-ad-client="{c}" data-ad-format="auto" data-full-width-responsive="false"></ins>'
    "<script>(adsbygoogle=window.adsbygoogle||[]).push({{}});</script>"
)


def read_page(path):
    raw = open(path, encoding="utf-8").read()
    m = META_RE.match(raw)
    meta, body = {}, raw
    if m:
        for line in m.group(1).strip().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        body = raw[m.end():]
    return meta, body


def route_of(rel):
    """bingo/index.html -> /bingo/"""
    d = os.path.dirname(rel)
    return "/" + (d + "/" if d else "")


# The nightly-rebuild lesson from hjarngympa: a lastmod that is always "today"
# is noise to Google. A page's own last commit is its date (fetch-depth: 0).
def lastmod(src):
    d = subprocess.run(["git", "log", "-1", "--format=%cs", "--", src],
                       capture_output=True, text=True, cwd=ROOT).stdout.strip()
    return d or datetime.date.today().isoformat()


def main():
    if not BASE_URL.startswith(("http://", "https://")):
        raise SystemExit(f"BASE_URL must be absolute, got {BASE_URL!r}: relative canonicals are invalid.")

    layout = Template(open(os.path.join(SITE, "_layout.html"), encoding="utf-8").read())
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    pages_dir = os.path.join(SITE, "pages")
    routes = []
    for dirpath, _, files in sorted(os.walk(pages_dir)):
        for fn in sorted(files):
            if not fn.endswith(".html"):
                continue
            src = os.path.join(dirpath, fn)
            rel = os.path.relpath(src, pages_dir)
            meta, body = read_page(src)
            route = route_of(rel)
            canonical = BASE_URL + BASE_PATH + route
            page = layout.safe_substitute(
                basepath=BASE_PATH,
                sitename=html.escape(CONFIG["siteName"]),
                title=html.escape(meta.get("title", CONFIG["siteName"])),
                desc=html.escape(meta.get("desc", "")),
                canonical=canonical,
                siteurl=BASE_URL + BASE_PATH + "/",
                head=meta.get("head", ""),
                ads_head=AD_SCRIPT.format(c=ADS_CLIENT) if ADS_CLIENT else "",
                ad=AD_INS.format(c=ADS_CLIENT) if ADS_CLIENT else "",
                body=body.replace("$canonical", canonical).replace("$siteurl", BASE_URL + BASE_PATH + "/"),
            )
            if BASE_PATH:
                page = page.replace('href="/', f'href="{BASE_PATH}/').replace('src="/', f'src="{BASE_PATH}/')
            out = os.path.join(DIST, os.path.dirname(rel), "index.html")
            os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, "w", encoding="utf-8").write(page)
            routes.append((route, meta.get("priority", "0.5"), lastmod(src)))

    shutil.copytree(os.path.join(SITE, "assets"), os.path.join(DIST, "assets"))

    urls = "\n".join(
        f"  <url><loc>{BASE_URL}{BASE_PATH}{r}</loc><lastmod>{m}</lastmod><priority>{p}</priority></url>"
        for r, p, m in sorted(routes)
    )
    open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n'
    )
    open(os.path.join(DIST, "robots.txt"), "w", encoding="utf-8").write(
        f"User-agent: *\nAllow: /\n\nSitemap: {BASE_URL}{BASE_PATH}/sitemap.xml\n"
    )
    if ADS_CLIENT:
        # ads.txt takes pub-..., never ca-pub-... (hjarngympa learned that one).
        open(os.path.join(DIST, "ads.txt"), "w", encoding="utf-8").write(
            f"google.com, {ADS_CLIENT.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n"
        )
    open(os.path.join(DIST, ".nojekyll"), "w").close()
    if not BASE_PATH:
        open(os.path.join(DIST, "CNAME"), "w").write(DOMAIN + "\n")

    print(f"built {len(routes)} pages -> {DIST}")
    for r, *_ in sorted(routes):
        print("  ", r)


if __name__ == "__main__":
    main()
