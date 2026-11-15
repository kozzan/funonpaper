# funonpaper

Free printable games at **funonpaper.com**: set them up in the browser, print or save as PDF, play on paper.
The first one is bingo (1–75 cards, 90-ball tickets, custom-word cards, caller sheet).

Static HTML/CSS/plain JS, no framework, no dependencies, hosted on GitHub Pages.

```bash
python3 tools/build.py            # site/pages/** -> dist/
node --test tools/test.js         # CI runs this on every PR and before every deploy
cd dist && python3 -m http.server 8765
```

- The domain is set in one place: `site/config.json` (`domain`). The build writes canonicals, the sitemap,
  robots.txt and `CNAME` from it. `BASE_URL` / `BASE_PATH` override it for a github.io preview.
- `adsenseClient` in the same file is `null` until AdSense approves the domain; the layout keeps an empty
  `.ad-slot` and loads no ad script until then.
- Deploy: push to `main` (`.github/workflows/deploy.yml`, the same shape as kozzan/hjarngympa).
- Rules live in `site/assets/bingo-core.js` (no DOM, tested); `bingo.js` only draws the form and sheets.
  Every card is a pure function of (set code, card number, options), so a set reprints identically.
- Each page starts with a `<!--meta title/desc/priority -->` block. Titles 15–70 characters,
  descriptions 70–160 (the site-network daily SEO check flags anything outside).
