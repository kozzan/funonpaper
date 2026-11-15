/* Bingo generator UI. The rules live in bingo-core.js; this file only reads
   the form, draws the sheets and prints. Everything stays in the browser.

   <div id="bingo" data-preset="75|90|christmas|baby-shower|sight-words|..."></div> */
(function () {
  'use strict';
  var root = document.getElementById('bingo');
  if (!root || !window.Bingo) return;
  var B = window.Bingo;
  var P = window.BingoPresets || {};

  // Printable area inside a 10 mm margin.
  var PAPER = {
    a4: { css: 'size: A4; margin: 10mm;', w: 190, h: 277, label: 'A4' },
    letter: { css: 'size: letter; margin: 10mm;', w: 195.9, h: 259.4, label: 'US Letter' }
  };
  var PER_PAGE = { grid: [1, 2, 4], '90': [1, 3, 6] };
  var MAX_CARDS = 200;

  var preset = root.getAttribute('data-preset') || '75';
  var startKind = preset === '90' ? '90' : preset === '75' ? '75' : 'words';
  var startWords = P[preset] ? P[preset].words.join('\n') : '';
  var startTitle = P[preset] ? P[preset].title : 'Bingo';
  var lang = (navigator.language || 'en-US').toLowerCase();
  var startPaper = /^en-(us|ca)|^es-(mx|us)/.test(lang) ? 'letter' : 'a4';

  root.innerHTML = [
    '<form class="bingo-form no-print" novalidate>',
    '  <fieldset class="field"><legend>Card type</legend>',
    '    <div class="seg">',
    '      <label><input type="radio" name="kind" value="75"> 1–75 numbers <small>US</small></label>',
    '      <label><input type="radio" name="kind" value="90"> 1–90 numbers <small>UK</small></label>',
    '      <label><input type="radio" name="kind" value="words"> Your own words</label>',
    '    </div>',
    '  </fieldset>',
    '  <div class="field words-only">',
    '    <label for="bg-list">Start from a list</label>',
    '    <select id="bg-list" name="list"><option value="">Keep my words</option></select>',
    '    <label for="bg-words">Words, one per line</label>',
    '    <textarea id="bg-words" name="words" rows="8" spellcheck="true" placeholder="One word or short phrase per line. You need at least 24."></textarea>',
    '    <p class="hint" id="bg-count" aria-live="polite"></p>',
    '  </div>',
    '  <div class="row">',
    '    <div class="field"><label for="bg-title">Title on the cards</label><input id="bg-title" name="title" maxlength="40"></div>',
    '    <div class="field"><label for="bg-n">How many cards</label><input id="bg-n" name="n" type="number" min="1" max="' + MAX_CARDS + '" inputmode="numeric"></div>',
    '    <div class="field"><label for="bg-per">Cards per page</label><select id="bg-per" name="per"></select></div>',
    '  </div>',
    '  <div class="row">',
    '    <fieldset class="field"><legend>Paper</legend><div class="seg">',
    '      <label><input type="radio" name="paper" value="letter"> US Letter</label>',
    '      <label><input type="radio" name="paper" value="a4"> A4</label>',
    '    </div></fieldset>',
    '    <div class="field checks">',
    '      <label class="check free-only"><input type="checkbox" name="free"> Free centre square</label>',
    '      <label class="check"><input type="checkbox" name="caller"> Add a caller sheet</label>',
    '    </div>',
    '  </div>',
    '  <div class="row code-row">',
    '    <div class="field"><label for="bg-code">Set code</label><input id="bg-code" name="code" maxlength="12" autocapitalize="characters" spellcheck="false"></div>',
    '    <button type="button" class="btn" data-new>New cards</button>',
    '  </div>',
    '  <p class="hint">The same set code always gives the same cards, so you can print more copies later.</p>',
    '  <p class="error" role="alert" hidden></p>',
    '  <div class="actions">',
    '    <button type="button" class="btn btn-primary" data-print>Print or save as PDF</button>',
    '    <span class="hint" id="bg-summary"></span>',
    '  </div>',
    '  <p class="hint">To get a PDF, choose <b>Save as PDF</b> as the printer in the print window.</p>',
    '</form>',
    '<div class="sheets" aria-label="Preview of the printed pages"></div>'
  ].join('\n');

  var form = root.querySelector('form');
  var sheets = root.querySelector('.sheets');
  var errorBox = root.querySelector('.error');
  var printBtn = root.querySelector('[data-print]');
  var pageStyle = document.createElement('style');
  document.head.appendChild(pageStyle);

  var list = form.list;
  Object.keys(P).forEach(function (k) {
    var o = document.createElement('option');
    o.value = k; o.textContent = P[k].label;
    list.appendChild(o);
  });

  // Start from the URL (a shared or bookmarked set), then the page's preset.
  var q = new URLSearchParams(location.search);
  function pick(name, ok, fallback) { var v = q.get(name); return v !== null && ok(v) ? v : fallback; }
  var kind0 = pick('type', function (v) { return v === '75' || v === '90' || v === 'words'; }, startKind);
  form.querySelector('input[name=kind][value="' + kind0 + '"]').checked = true;
  form.querySelector('input[name=paper][value="' + pick('paper', function (v) { return !!PAPER[v]; }, startPaper) + '"]').checked = true;
  form.words.value = startWords;
  form.title.value = pick('title', function (v) { return v.length <= 40; }, startTitle);
  form.n.value = pick('n', function (v) { return +v >= 1 && +v <= MAX_CARDS; }, '8');
  form.free.checked = q.get('free') !== '0';
  form.caller.checked = q.get('caller') !== '0';
  form.code.value = B.normalizeCode(q.get('code')) || B.newCode();
  fillPer(kind0, q.get('per'));

  function kind() { return form.querySelector('input[name=kind]:checked').value; }
  function paper() { return form.querySelector('input[name=paper]:checked').value; }

  function fillPer(k, want) {
    var opts = PER_PAGE[k === '90' ? '90' : 'grid'];
    var cur = want || form.per.value;
    form.per.innerHTML = opts.map(function (n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');
    form.per.value = opts.indexOf(+cur) >= 0 ? String(cur) : String(opts[k === '90' ? 2 : 1]);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* A square is a fifth of the card wide. Size each entry so its longest
     word fits on one line (about 0.62 em per bold character) and the whole
     entry fits in three lines, rather than breaking a word in the middle. */
  function wordSize(w) {
    var parts = String(w).split(/\s+/);
    var longest = parts.reduce(function (m, s) { return Math.max(m, s.length); }, 1);
    var byWord = 16 / (0.62 * longest);
    var byLines = 16 * 3 / (0.62 * String(w).length);
    return Math.max(1.6, Math.min(4.4, byWord, byLines)).toFixed(2) + 'cqw';
  }

  function drawCard(card, title, code, number) {
    var c = el('div', 'card card-' + (card.kind === '90' ? '90' : '5'));
    if (title) c.appendChild(el('div', 'card-title', title));
    var g = el('div', 'card-grid');
    if (card.kind === '75') B.LETTERS.forEach(function (l) { g.appendChild(el('div', 'cell head', l)); });
    card.grid.forEach(function (row) {
      row.forEach(function (v) {
        if (v === null && card.kind !== '90') {
          var f = el('div', 'cell free');
          f.appendChild(el('span', 'star', '★'));
          f.appendChild(el('span', '', 'FREE'));
          g.appendChild(f);
        } else if (v === null) g.appendChild(el('div', 'cell blank'));
        else {
          var cell = el('div', 'cell ' + (card.kind === 'words' ? 'word' : 'num'), String(v));
          if (card.kind === 'words') cell.style.fontSize = wordSize(v);
          g.appendChild(cell);
        }
      });
    });
    c.appendChild(g);
    c.appendChild(el('div', 'card-foot', 'Card ' + number + ' · set ' + code));
    return c;
  }

  function drawCaller(k, words, title, code) {
    var s = el('section', 'sheet caller');
    s.appendChild(el('h2', 'caller-title', (title ? title + ' — ' : '') + 'caller sheet'));
    s.appendChild(el('p', 'caller-note', k === 'words'
      ? 'Call the words in any order and tick each one off. Set ' + code + '.'
      : 'Call the numbers in any order and tick each one off. Set ' + code + '.'));
    var groups = B.callerSheet(k, words);
    var wrap = el('div', 'caller-groups ' + (k === 'words' ? 'caller-words' : 'caller-' + k));
    groups.forEach(function (grp) {
      var col = el('div', 'caller-group');
      if (k !== 'words') col.appendChild(el('div', 'caller-label', grp.label));
      grp.items.forEach(function (it) { col.appendChild(el('div', 'caller-item', String(it))); });
      wrap.appendChild(col);
    });
    s.appendChild(wrap);
    return s;
  }

  function wordsInfo() {
    var words = B.cleanWords(form.words.value);
    var need = B.wordsNeeded(form.free.checked);
    var count = root.querySelector('#bg-count');
    count.textContent = words.length + (words.length === 1 ? ' word' : ' different words') +
      (words.length < need ? ' — you need ' + need + '.' : ' — enough for a card.');
    return words;
  }

  function render() {
    var k = kind();
    root.setAttribute('data-kind', k);
    var pp = PAPER[paper()];
    pageStyle.textContent = '@page { ' + pp.css + ' }';
    root.style.setProperty('--sheet-w', pp.w + 'mm');
    root.style.setProperty('--sheet-h', pp.h + 'mm');
    root.style.setProperty('--sheet-ratio', pp.w + ' / ' + pp.h);

    var n = Math.max(1, Math.min(MAX_CARDS, Math.floor(+form.n.value) || 1));
    var per = +form.per.value;
    var code = B.normalizeCode(form.code.value) || B.newCode();
    var title = form.title.value.trim();
    var free = form.free.checked;
    var words = k === 'words' ? wordsInfo() : null;

    var cards = [];
    for (var i = 0; i < n; i++) {
      var card = B.makeCard(k, code, i, { free: free, words: words });
      if (card.error) { cards = null; showError(card.error); break; }
      cards.push(card);
    }
    sheets.innerHTML = '';
    if (!cards) return;
    showError('');

    for (var start = 0; start < cards.length; start += per) {
      var s = el('section', 'sheet per-' + per + (k === '90' ? ' sheet-90' : ' sheet-grid'));
      for (var j = start; j < Math.min(start + per, cards.length); j++) {
        var slot = el('div', 'slot');
        slot.appendChild(drawCard(cards[j], title, code, j + 1));
        s.appendChild(slot);
      }
      sheets.appendChild(s);
    }
    if (form.caller.checked) sheets.appendChild(drawCaller(k, words, title, code));

    var pages = Math.ceil(n / per) + (form.caller.checked ? 1 : 0);
    root.querySelector('#bg-summary').textContent = n + (n === 1 ? ' card' : ' cards') + ' on ' + pages + (pages === 1 ? ' page' : ' pages') + ', ' + pp.label + '.';

    // Keep the address bar in step so a set can be bookmarked or shared
    // (the word list stays out of the URL: it can be long and personal).
    var params = new URLSearchParams({ type: k, n: n, per: per, paper: paper(), code: code });
    if (title !== startTitle) params.set('title', title);
    if (!free) params.set('free', '0');
    if (!form.caller.checked) params.set('caller', '0');
    try { history.replaceState(null, '', location.pathname + '?' + params); } catch (e) {}
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = !msg;
    printBtn.disabled = !!msg;
  }

  var timer = null;
  function later() { clearTimeout(timer); timer = setTimeout(render, 120); }

  form.addEventListener('input', function (e) {
    if (e.target.name === 'kind') {
      fillPer(kind());
      if (kind() === '75' && form.title.value === startTitle && startKind === 'words') form.title.value = 'Bingo';
    }
    if (e.target.name === 'list' && list.value) {
      form.words.value = P[list.value].words.join('\n');
      if (P[list.value].title) form.title.value = P[list.value].title;
      list.value = '';
    }
    later();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  root.querySelector('[data-new]').addEventListener('click', function () {
    form.code.value = B.newCode();
    render();
  });
  printBtn.addEventListener('click', function () {
    clearTimeout(timer);
    render();
    if (!printBtn.disabled) window.print();
  });

  render();
})();
