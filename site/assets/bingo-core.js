/* Bingo cards: deal rules only, no DOM. UMD so node:test can require it.

   Three kinds of card:
     - 75-ball (US): 5x5 under B-I-N-G-O. Column n draws from 15n+1..15n+15,
       five different numbers per column, the centre is FREE (optional).
     - 90-ball (UK): a ticket of 3 rows x 9 columns. Column 0 holds 1-9,
       columns 1-7 hold 10-19 .. 70-79, column 8 holds 80-90. Every row has
       exactly 5 numbers, every column at least 1, 15 numbers in all, and each
       column reads in ascending order from top to bottom.
     - words: 5x5 from the player's own list, 24 words + FREE (or 25 without).

   Every card is a pure function of (set code, card number, options), so a set
   reprints identically from its code, and asking for 20 cards instead of 10
   keeps the first 10 the same. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Bingo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LETTERS = ['B', 'I', 'N', 'G', 'O'];
  var MAX_WORD_LENGTH = 40;
  var MAX_WORDS = 300;

  /* FNV-1a, then mulberry32. Small, fast and identical in every engine. */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function range(from, to) {
    var out = [];
    for (var n = from; n <= to; n++) out.push(n);
    return out;
  }

  /* A set code people can read aloud and type back: no 0/O or 1/I/L. */
  var CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function newCode(rng) {
    rng = rng || Math.random;
    var s = '';
    for (var i = 0; i < 6; i++) s += CODE_CHARS.charAt(Math.floor(rng() * CODE_CHARS.length));
    return s;
  }
  function normalizeCode(code) {
    return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }

  function cardRng(code, index, kind) {
    return makeRng(hash(normalizeCode(code) + '|' + kind + '|' + index));
  }

  /* 75-ball: grid[row][col], null for the free centre. */
  function card75(code, index, opts) {
    var free = !opts || opts.free !== false;
    var rng = cardRng(code, index, '75');
    var cols = [];
    for (var c = 0; c < 5; c++) cols.push(shuffle(range(15 * c + 1, 15 * c + 15), rng).slice(0, 5));
    var grid = [];
    for (var r = 0; r < 5; r++) {
      var row = [];
      for (c = 0; c < 5; c++) row.push(free && r === 2 && c === 2 ? null : cols[c][r]);
      grid.push(row);
    }
    return { kind: '75', grid: grid, free: free };
  }

  function column90(c) {
    if (c === 0) return range(1, 9);
    if (c === 8) return range(80, 90);
    return range(10 * c, 10 * c + 9);
  }

  /* 90-ball: grid[row][col], null for a blank square. */
  function card90(code, index) {
    var rng = cardRng(code, index, '90');
    // How many numbers each column gets: one each, then six more at random,
    // at most three per column (a column has only three rows).
    var counts = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    var extra = 6;
    while (extra > 0) {
      var c = Math.floor(rng() * 9);
      if (counts[c] < 3) { counts[c]++; extra--; }
    }
    // Place them so every row ends up with exactly five. Taking the fullest
    // columns first and giving each to the rows with the most room left is
    // the Gale-Ryser construction: it cannot get stuck when the totals agree.
    var room = [5, 5, 5];
    var grid = [[], [], []];
    for (var r = 0; r < 3; r++) for (c = 0; c < 9; c++) grid[r].push(null);
    var order = shuffle(range(0, 8), rng).sort(function (a, b) { return counts[b] - counts[a]; });
    var used = [[], [], []];
    order.forEach(function (col) {
      var rows = shuffle([0, 1, 2], rng).sort(function (a, b) { return room[b] - room[a]; }).slice(0, counts[col]);
      rows.forEach(function (row) { room[row]--; used[row].push(col); });
      var nums = shuffle(column90(col), rng).slice(0, counts[col]).sort(function (a, b) { return a - b; });
      rows.sort(function (a, b) { return a - b; }).forEach(function (row, i) { grid[row][col] = nums[i]; });
    });
    return { kind: '90', grid: grid };
  }

  /* The player's list: one entry per line (or comma), trimmed, duplicates
     dropped regardless of case, overlong entries cut. */
  function cleanWords(text) {
    var seen = {};
    var out = [];
    String(text || '').split(/[\n,;]+/).forEach(function (w) {
      w = w.replace(/\s+/g, ' ').trim().slice(0, MAX_WORD_LENGTH);
      var key = w.toLowerCase();
      if (w && !seen[key] && out.length < MAX_WORDS) { seen[key] = true; out.push(w); }
    });
    return out;
  }

  function wordsNeeded(free) { return free === false ? 25 : 24; }

  /* Returns { error } instead of a card when the list is too short: a card
     that repeats a word can have two winning squares for one call. */
  function cardWords(code, index, words, opts) {
    var free = !opts || opts.free !== false;
    var need = wordsNeeded(free);
    if (!words || words.length < need) {
      var have = words ? words.length : 0;
      return {
        error: 'A word card needs at least ' + need + ' different words' +
          (free ? ' (24 plus the free centre)' : '') + '. You have ' + have +
          ', so add ' + (need - have) + ' more.'
      };
    }
    var rng = cardRng(code, index, 'w:' + words.join('\u0001'));
    var pick = shuffle(words, rng).slice(0, need);
    var grid = [];
    var k = 0;
    for (var r = 0; r < 5; r++) {
      var row = [];
      for (var c = 0; c < 5; c++) row.push(free && r === 2 && c === 2 ? null : pick[k++]);
      grid.push(row);
    }
    return { kind: 'words', grid: grid, free: free };
  }

  function makeCard(kind, code, index, opts) {
    if (kind === '90') return card90(code, index);
    if (kind === 'words') return cardWords(code, index, opts && opts.words, opts);
    return card75(code, index, opts);
  }

  /* What the caller ticks off: every number grouped by column, or every word. */
  function callerSheet(kind, words) {
    if (kind === '90') return range(0, 8).map(function (c) { return { label: c === 0 ? '1-9' : c === 8 ? '80-90' : (10 * c) + '-' + (10 * c + 9), items: column90(c) }; });
    if (kind === 'words') return [{ label: 'Words', items: (words || []).slice().sort(function (a, b) { return a.localeCompare(b); }) }];
    return LETTERS.map(function (l, c) { return { label: l, items: range(15 * c + 1, 15 * c + 15) }; });
  }

  /* Checks a card against the rules above; [] when it is valid. Used by the
     tests and cheap enough to assert on every card in the browser too. */
  function problems(card, words) {
    var out = [];
    var g = card.grid;
    var all = [];
    if (card.kind === '75' || card.kind === 'words') {
      if (g.length !== 5 || g.some(function (row) { return row.length !== 5; })) return ['not 5x5'];
      for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) {
        var v = g[r][c];
        var centre = r === 2 && c === 2;
        if (v === null) { if (!(centre && card.free)) out.push('blank at ' + r + ',' + c); continue; }
        if (centre && card.free) out.push('centre should be free');
        if (card.kind === '75' && (v < 15 * c + 1 || v > 15 * c + 15)) out.push(v + ' outside column ' + LETTERS[c]);
        if (card.kind === 'words' && words && words.indexOf(v) < 0) out.push(v + ' not in the list');
        all.push(card.kind === 'words' ? String(v).toLowerCase() : v);
      }
      if (all.length !== (card.free ? 24 : 25)) out.push(all.length + ' squares filled');
    } else {
      if (g.length !== 3 || g.some(function (row) { return row.length !== 9; })) return ['not 3x9'];
      g.forEach(function (row, r) {
        var n = row.filter(function (v) { return v !== null; }).length;
        if (n !== 5) out.push('row ' + r + ' has ' + n + ' numbers');
      });
      for (var col = 0; col < 9; col++) {
        var colNums = [g[0][col], g[1][col], g[2][col]].filter(function (v) { return v !== null; });
        if (!colNums.length) out.push('column ' + col + ' is empty');
        var allowed = column90(col);
        colNums.forEach(function (v, i) {
          if (allowed.indexOf(v) < 0) out.push(v + ' outside column ' + col);
          if (i && colNums[i - 1] >= v) out.push('column ' + col + ' not ascending');
          all.push(v);
        });
      }
      if (all.length !== 15) out.push(all.length + ' numbers');
    }
    var dupes = all.filter(function (v, i) { return all.indexOf(v) !== i; });
    if (dupes.length) out.push('duplicates: ' + dupes.join(', '));
    return out;
  }

  return {
    LETTERS: LETTERS, MAX_WORDS: MAX_WORDS, hash: hash, makeRng: makeRng,
    newCode: newCode, normalizeCode: normalizeCode, card75: card75,
    card90: card90, cardWords: cardWords, makeCard: makeCard,
    cleanWords: cleanWords, wordsNeeded: wordsNeeded, callerSheet: callerSheet,
    problems: problems, column90: column90
  };
});
