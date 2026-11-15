// node --test tools/test.js  (no dependencies; CI runs this on every PR and before every deploy)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const Bingo = require(path.join(ROOT, 'site/assets/bingo-core.js'));
const Presets = require(path.join(ROOT, 'site/assets/bingo-presets.js'));
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/config.json'), 'utf8'));

const CODES = Array.from({ length: 300 }, (_, i) => 'T' + i.toString(36).toUpperCase());

test('75-ball: every column draws from its own 15, five different numbers, free centre', () => {
  for (const code of CODES) {
    const card = Bingo.card75(code, 0);
    assert.deepStrictEqual(Bingo.problems(card), [], code);
    assert.strictEqual(card.grid[2][2], null);
    const filled = card.grid.flat().filter((v) => v !== null);
    assert.strictEqual(filled.length, 24);
    card.grid.forEach((row) => row.forEach((v, c) => v !== null && assert.ok(v >= 15 * c + 1 && v <= 15 * c + 15)));
  }
});

test('75-ball: without the free centre all 25 squares hold a number', () => {
  const card = Bingo.card75('NOFREE', 3, { free: false });
  assert.deepStrictEqual(Bingo.problems(card), []);
  assert.strictEqual(card.grid.flat().filter((v) => v !== null).length, 25);
});

test('90-ball: 3x9, five numbers a row, every column used and ascending, 15 different numbers', () => {
  for (const code of CODES) for (let i = 0; i < 6; i++) {
    const card = Bingo.card90(code, i);
    assert.deepStrictEqual(Bingo.problems(card), [], `${code}#${i}`);
  }
});

test('90-ball: the column ranges are 1-9, 10-19 .. 70-79, 80-90', () => {
  assert.deepStrictEqual(Bingo.column90(0), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.strictEqual(Bingo.column90(4)[0], 40);
  assert.strictEqual(Bingo.column90(8).length, 11);
  assert.strictEqual(Bingo.column90(8)[10], 90);
});

test('problems() catches a broken card (so the validity tests can fail)', () => {
  const card = Bingo.card75('X', 0);
  card.grid[0][0] = card.grid[1][0];
  assert.ok(Bingo.problems(card).some((p) => p.startsWith('duplicates')));
  const t = Bingo.card90('X', 0);
  t.grid[0] = t.grid[0].map(() => null);
  assert.ok(Bingo.problems(t).length > 0);
});

test('the same set code gives the same cards, and asking for more cards keeps the first ones', () => {
  for (const kind of ['75', '90']) {
    const a = [0, 1, 2].map((i) => Bingo.makeCard(kind, 'ab-c12', i));
    const b = [0, 1, 2].map((i) => Bingo.makeCard(kind, 'ABC12', i));
    assert.deepStrictEqual(a, b, 'code is case- and dash-insensitive');
    assert.notDeepStrictEqual(a[0], a[1], 'cards in a set differ');
    assert.notDeepStrictEqual(Bingo.makeCard(kind, 'ABC12', 0), Bingo.makeCard(kind, 'ABC13', 0));
  }
  const words = Bingo.cleanWords(Presets.christmas.words.join('\n'));
  assert.deepStrictEqual(Bingo.cardWords('S1', 4, words), Bingo.cardWords('S1', 4, words));
});

test('set codes are readable: six characters, no 0, O, 1, I or L', () => {
  const rng = Bingo.makeRng(7);
  for (let i = 0; i < 200; i++) assert.match(Bingo.newCode(rng), /^[A-HJKMNP-Z2-9]{6}$/);
});

test('custom words: trimmed, duplicates dropped regardless of case, commas or lines both work', () => {
  assert.deepStrictEqual(Bingo.cleanWords(' Santa \nsanta\n\nElf, Star ;Snow  man'), ['Santa', 'Elf', 'Star', 'Snow man']);
  assert.strictEqual(Bingo.cleanWords('x'.repeat(100))[0].length, 40);
});

test('custom words: every card uses 24 different words from the list plus FREE', () => {
  const words = Bingo.cleanWords(Presets['baby-shower'].words.join('\n'));
  for (let i = 0; i < 100; i++) {
    const card = Bingo.cardWords('BABY', i, words);
    assert.deepStrictEqual(Bingo.problems(card, words), [], String(i));
  }
});

test('custom words: too few gives a clear message instead of a card with repeats', () => {
  const words = Bingo.cleanWords(Array.from({ length: 20 }, (_, i) => 'w' + i).join('\n'));
  const r = Bingo.cardWords('A', 0, words);
  assert.ok(!r.grid);
  assert.match(r.error, /at least 24 different words.*You have 20, so add 4 more/);
  assert.match(Bingo.cardWords('A', 0, Bingo.cleanWords(words.concat('w24', 'w25', 'w26', 'w27').join('\n')), { free: false }).error, /at least 25.*You have 24, so add 1 more/);
  assert.match(Bingo.cardWords('A', 0, []).error, /You have 0/);
  assert.ok(Bingo.cardWords('A', 0, words.concat(['a', 'b', 'c', 'd'])).grid);
});

test('presets: every theme list has enough different words for a card, with room to vary', () => {
  for (const [name, p] of Object.entries(Presets)) {
    const words = Bingo.cleanWords(p.words.join('\n'));
    assert.strictEqual(words.length, p.words.length, `${name} has duplicates`);
    assert.ok(words.length >= 40, `${name}: only ${words.length} words`);
  }
});

test('caller sheet lists every number once, or every word', () => {
  assert.deepStrictEqual(Bingo.callerSheet('75').flatMap((g) => g.items), Array.from({ length: 75 }, (_, i) => i + 1));
  assert.deepStrictEqual(Bingo.callerSheet('90').flatMap((g) => g.items), Array.from({ length: 90 }, (_, i) => i + 1));
  assert.deepStrictEqual(Bingo.callerSheet('words', ['b', 'a']), [{ label: 'Words', items: ['a', 'b'] }]);
});

// ---- the build -------------------------------------------------------------

let built = false;
function build(env = {}) {
  execFileSync('python3', [path.join(ROOT, 'tools/build.py')], { cwd: ROOT, stdio: 'pipe', env: { ...process.env, BASE_URL: '', BASE_PATH: '', ...env } });
  built = true;
}
const dist = (...p) => path.join(ROOT, 'dist', ...p);
function pages() {
  if (!built) build();
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'index.html') out.push(p);
    }
  })(path.join(ROOT, 'site/pages'));
  return out.map((src) => {
    const route = '/' + path.relative(path.join(ROOT, 'site/pages'), path.dirname(src)).split(path.sep).filter(Boolean).map((s) => s + '/').join('');
    return { src, route, html: fs.readFileSync(dist(route, 'index.html'), 'utf8') };
  });
}

test('the domain lives in one config value, and the build uses it for canonicals, sitemap and CNAME', () => {
  assert.strictEqual(CONFIG.domain, 'funonpaper.com');
  build();
  assert.strictEqual(fs.readFileSync(dist('CNAME'), 'utf8').trim(), CONFIG.domain);
  assert.match(fs.readFileSync(dist('robots.txt'), 'utf8'), new RegExp(`Sitemap: https://${CONFIG.domain}/sitemap.xml`));
  for (const p of pages()) assert.ok(p.html.includes(`<link rel="canonical" href="https://${CONFIG.domain}${p.route}">`), p.route);
});

test('the sitemap lists every page exactly once, with absolute URLs', () => {
  const all = pages();
  const xml = fs.readFileSync(dist('sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepStrictEqual(locs.slice().sort(), all.map((p) => `https://${CONFIG.domain}${p.route}`).sort());
  assert.ok(all.length >= 8, `${all.length} pages`);
});

test('every page: lang="en", a title of 15-70 characters, a description of 70-160, one h1, structured data', () => {
  const titles = new Set();
  const descs = new Set();
  for (const { route, html } of pages()) {
    assert.match(html, /<html lang="en"/, route);
    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    const desc = html.match(/<meta name="description" content="([^"]*)"/)[1];
    assert.ok(title.length >= 15 && title.length <= 70, `${route} title ${title.length}`);
    assert.ok(desc.length >= 70 && desc.length <= 160, `${route} description ${desc.length}`);
    assert.strictEqual((html.match(/<h1[\s>]/g) || []).length, 1, route);
    assert.match(html, /<script type="application\/ld\+json">/, route);
    for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(block[1]);
    assert.ok(!titles.has(title) && !descs.has(desc), `${route} repeats a title or description`);
    titles.add(title);
    descs.add(desc);
  }
});

test('every internal link points at a page that exists', () => {
  const routes = new Set(pages().map((p) => p.route));
  for (const { route, html } of pages())
    for (const [, href] of html.matchAll(/href="(\/[^"#?]*)"/g))
      if (!href.startsWith('/assets/') && href !== '/sitemap.xml') assert.ok(routes.has(href), `${route} links to ${href}`);
});

test('each bingo landing page aims at its search and presets the generator', () => {
  const byRoute = Object.fromEntries(pages().map((p) => [p.route, p.html]));
  const expect = {
    '/printable-bingo-cards/': [/printable bingo cards/i, '75'],
    '/christmas-bingo-cards/': [/christmas bingo cards/i, 'christmas'],
    '/baby-shower-bingo-cards/': [/baby shower bingo/i, 'baby-shower'],
    '/classroom-bingo-cards/': [/sight word bingo|classroom bingo/i, 'sight-words'],
    '/90-ball-bingo-tickets/': [/90.ball bingo tickets/i, '90'],
  };
  for (const [route, [query, preset]] of Object.entries(expect)) {
    const html = byRoute[route];
    assert.ok(html, route);
    assert.match(html.match(/<title>([^<]*)<\/title>/)[1], query, route);
    assert.match(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, ''), query, route);
    assert.match(html, new RegExp(`data-preset="${preset}"`), route);
    assert.match(html, /<h2[^>]*>Frequently asked questions<\/h2>/, route);
    assert.match(html, /src="\/assets\/bingo-core\.js"/, route);
    assert.match(byRoute['/'], new RegExp(`href="${route}"`), `home links to ${route}`);
  }
});

test('ads are off: the layout keeps a sized slot but no AdSense script until a client id is configured', () => {
  assert.strictEqual(CONFIG.adsenseClient, null);
  for (const { route, html } of pages()) {
    assert.doesNotMatch(html, /adsbygoogle|googlesyndication/, route);
    assert.match(html, /class="ad-slot"/, route);
  }
  assert.ok(!fs.existsSync(dist('ads.txt')));
});

test('BASE_URL must be absolute (an empty CI variable must not produce relative canonicals)', () => {
  build({ BASE_URL: '' });
  assert.match(fs.readFileSync(dist('sitemap.xml'), 'utf8'), /<loc>https:\/\/funonpaper\.com\//);
  assert.throws(() => build({ BASE_URL: 'funonpaper.com' }));
  build();
});

test('print: the stylesheet sets A4 and US Letter page sizes and hides everything but the sheets', () => {
  const css = fs.readFileSync(path.join(ROOT, 'site/assets/bingo.css'), 'utf8');
  assert.match(css, /@media print/);
  const js = fs.readFileSync(path.join(ROOT, 'site/assets/bingo.js'), 'utf8');
  assert.match(js, /size: A4/);
  assert.match(js, /size: letter/);
});

test('contact: hello@funonpaper.com is on the contact and privacy pages as a mailto link', () => {
  const byRoute = Object.fromEntries(pages().map((p) => [p.route, p.html]));
  for (const route of ['/contact/', '/privacy/'])
    assert.match(byRoute[route], /<a href="mailto:hello@funonpaper\.com">hello@funonpaper\.com<\/a>/, route);
});

// ---- SITE-61 redesign: its own identity, nothing shared with the Swedish sites --------------------------

test('fonts are self-hosted woff2 with their OFL licences, and no page loads Google Fonts', () => {
  const css = fs.readFileSync(path.join(ROOT, 'site/assets/app.css'), 'utf8');
  for (const f of ['fredoka-var.woff2', 'atkinson-hyperlegible-400.woff2', 'atkinson-hyperlegible-700.woff2']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'site/assets/fonts', f)), f);
    assert.match(css, new RegExp(`url\\(/assets/fonts/${f.replace('.', '\\.')}\\)`), f);
  }
  for (const f of ['OFL-Fredoka.txt', 'OFL-AtkinsonHyperlegible.txt']) assert.ok(fs.existsSync(dist('assets/fonts', f)), f);
  for (const { route, html } of pages()) assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/, route);
});

test('header: the logo on the left and one "Make bingo cards" button, no nav list', () => {
  for (const { route, html } of pages()) {
    const head = html.match(/<header class="topbar[\s\S]*?<\/header>/);
    assert.ok(head, route);
    assert.match(head[0], /class="logo"[\s\S]*<svg/, route);
    assert.strictEqual((head[0].match(/<a /g) || []).length, 2, `${route}: logo + one button`);
    assert.match(head[0], /class="btn[^"]*"[^>]*>Make bingo cards</, route);
    assert.doesNotMatch(head[0], /<nav/, route);
  }
});

test('bingo pages: the generator and a live card preview are the hero, the printable pages a separate print area', () => {
  for (const { route, html } of pages()) {
    if (!/data-preset=/.test(html)) continue;
    const maker = html.match(/<section class="maker[\s\S]*?<\/section>/)[0];
    assert.match(maker, /<h1/, route);
    assert.match(maker, /id="bingo-preview"/, route);
    assert.match(maker, /id="bingo" data-preset=/, route);
    assert.match(html, /<section class="print-area[^"]*"[\s\S]*?id="bingo-sheets"/, route);
  }
});

test('home: a tile with a small card preview for each kind of bingo', () => {
  const home = pages().find((p) => p.route === '/').html;
  for (const [route, preset] of [['/printable-bingo-cards/', '75'], ['/90-ball-bingo-tickets/', '90'], ['/christmas-bingo-cards/', 'christmas'], ['/baby-shower-bingo-cards/', 'baby-shower'], ['/classroom-bingo-cards/', 'sight-words']])
    assert.match(home, new RegExp(`<a class="tile[^"]*" href="${route}"[\\s\\S]*?data-mini="${preset}"`), route);
  assert.match(home, /src="\/assets\/home\.js"/);
});

test('print stays plain black on white: the print rules reset the coloured header, free square and caller labels', () => {
  const css = fs.readFileSync(path.join(ROOT, 'site/assets/bingo.css'), 'utf8');
  const print = css.slice(css.indexOf('@media print'));
  for (const sel of ['.cell.head', '.cell.free', '.caller-label']) assert.ok(print.includes(sel), sel);
  assert.match(print, /color: #000/);
  assert.doesNotMatch(css, /print-color-adjust: exact/);
});
