/* Home: a small, real card on each tile. Fixed code, so the tiles look the
   same on every visit; purely decorative (the tiles work without it). */
(function () {
  'use strict';
  if (!window.Bingo || !window.BingoRender) return;
  var P = window.BingoPresets || {};
  Array.prototype.forEach.call(document.querySelectorAll('.mini[data-mini]'), function (box) {
    var preset = box.getAttribute('data-mini');
    var kind = preset === '75' || preset === '90' ? preset : 'words';
    var words = P[preset] ? window.Bingo.cleanWords(P[preset].words.join('\n')) : null;
    var card = window.Bingo.makeCard(kind, 'FUNONPAPER', 0, { words: words });
    if (card.error) return;
    box.appendChild(window.BingoRender.card(card, P[preset] ? P[preset].title : 'Bingo', '', 1, { foot: false }));
  });
})();
