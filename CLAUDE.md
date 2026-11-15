# CLAUDE.md

Guidance for Claude Code (and the site-network agent) working in this repository.

## What this is

**funonpaper.com**: free printable games you set up in the browser and play on paper. Bingo first:
1–75 cards, 90-ball tickets and custom-word cards, with a caller sheet. Static HTML/CSS/plain JS, no
framework, no backend, hosted on GitHub Pages. Audience: parents, teachers and party hosts in the US and UK.

**All user-facing copy is in English** (plain, friendly, US spelling in running text; "A4" and
"US Letter" both stay). Code, comments and commits are English too.

## Commands

```bash
python3 tools/build.py            # site/pages/** -> dist/
node --test tools/test.js         # CI runs this on every PR and before every deploy
cd dist && python3 -m http.server 8765
```

Deploy is automatic: push to `main` → `.github/workflows/deploy.yml` tests, builds and publishes.

## Layout

```
site/config.json      the domain (one value), site name, adsenseClient (null until AdSense approves)
site/_layout.html     shared shell: head, header, footer, the empty ad slot
site/pages/**         one index.html per route, each starting with a <!--meta title/desc/priority --> block
site/assets/          app.css (shell), bingo.css (form, sheets, print), bingo-core.js (rules),
                      bingo-presets.js (word lists), bingo.js (UI)
tools/build.py        the whole build; stdlib only
tools/test.js         node:test, no framework
```

## Rules that must hold

- **The rules live in `bingo-core.js`, not in the UI.** It has no DOM and is UMD so node can test it.
  `problems()` checks a card; the tests run it over hundreds of set codes. Anything that can be wrong goes
  in the core with a test.
- **75-ball:** column B 1–15, I 16–30, N 31–45, G 46–60, O 61–75, five different numbers per column, free
  centre unless switched off.
- **90-ball:** 3 rows × 9 columns; columns 1–9, 10–19 … 70–79, 80–90; exactly five numbers per row, every
  column used, each column ascending top to bottom, 15 numbers.
- **Word cards** need 24 different words (25 without the free square). Too few must give a clear message,
  never a card that repeats a word.
- **A card is a pure function of (set code, card number, options).** Never add `Math.random()` to a card:
  the set code is how people reprint the same cards. More cards must keep the first ones the same.
- **Nothing the user types leaves the browser**, and the word list is never put in the URL. The privacy page
  says so; keep it true.
- **Print:** one `.sheet` per printed page; sizes inside a sheet are container units. `@page` size is set by
  bingo.js for A4 or US Letter. Check a print preview after any layout change.

## SEO and content

- Title 15–70 characters, meta description 70–160, one `<h1>`, JSON-LD on every page (tests enforce it).
  The site-network daily check flags anything outside those ranges.
- Each landing page targets one search ("printable bingo cards", "christmas bingo cards", …) with its own
  title, H1, how-to and FAQ, and presets the generator. No keyword stuffing; text must be correct game rules.
- New pages: add the page, link it from the home page and the "More bingo cards" lists, and the sitemap
  picks it up from the build.
- Facts in content (rules, history) must be correct; cite an external source if you state anything beyond the
  rules of play. Word lists must be original or public domain (the Dolch lists are).

## Ads

AdSense is **off** until the domain is approved: `adsenseClient` is `null`, the layout's `.ad-slot` stays
empty and hidden, no ad script, no ads.txt. When it is turned on: Consent Mode defaults before the ad tag,
`ads.txt` with `pub-…` (never `ca-pub-…`), and never an ad inside or next to the generator or the printed
sheets. Update the privacy page first.
