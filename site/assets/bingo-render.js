/* Draws one card from bingo-core's data. Shared by the generator (bingo.js)
   and the home page's tile previews (home.js). DOM only, no rules here. */
(function (root) {
  'use strict';

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

  /* opts.foot: the "Card n · set CODE" line (printed cards need it). */
  function card(data, title, code, number, opts) {
    var c = el('div', 'card card-' + (data.kind === '90' ? '90' : '5'));
    if (title) c.appendChild(el('div', 'card-title', title));
    var g = el('div', 'card-grid');
    if (data.kind === '75') root.Bingo.LETTERS.forEach(function (l) { g.appendChild(el('div', 'cell head', l)); });
    data.grid.forEach(function (row) {
      row.forEach(function (v) {
        if (v === null && data.kind !== '90') {
          var f = el('div', 'cell free');
          f.appendChild(el('span', 'star', '★'));
          f.appendChild(el('span', '', 'FREE'));
          g.appendChild(f);
        } else if (v === null) {
          g.appendChild(el('div', 'cell blank'));
        } else {
          var cell = el('div', 'cell ' + (data.kind === 'words' ? 'word' : 'num'), String(v));
          if (data.kind === 'words') cell.style.fontSize = wordSize(v);
          g.appendChild(cell);
        }
      });
    });
    c.appendChild(g);
    if (!opts || opts.foot !== false) c.appendChild(el('div', 'card-foot', 'Card ' + number + ' · set ' + code));
    return c;
  }

  root.BingoRender = { card: card, el: el, wordSize: wordSize };
})(typeof self !== 'undefined' ? self : this);
