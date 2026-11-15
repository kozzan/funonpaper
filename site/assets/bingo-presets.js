/* Word lists for the theme pages. Written for this site; the sight-word lists
   are the Dolch pre-primer and primer lists (Edward W. Dolch, 1936/1948),
   which are in the public domain. Each list needs at least 24 different
   words; 40+ keeps the cards in a set from looking alike. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BingoPresets = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    christmas: {
      label: 'Christmas',
      title: 'Christmas Bingo',
      words: ['Santa', 'Reindeer', 'Snowman', 'Stocking', 'Candy cane', 'Mistletoe',
        'Elf', 'Sleigh', 'Presents', 'Christmas tree', 'Star', 'Angel', 'Bells',
        'Wreath', 'Gingerbread', 'Holly', 'Ornament', 'Tinsel', 'Snowflake',
        'Hot cocoa', 'Cookies', 'Milk', 'Chimney', 'North Pole', 'Carols',
        'Lights', 'Ribbon', 'Bow', 'Wrapping paper', 'Fireplace', 'Mittens',
        'Scarf', 'Sledding', 'Nutcracker', 'Eggnog', 'Poinsettia', 'Nativity',
        'Toy', 'Workshop', 'Jingle bells', 'Snowball', 'Icicle', 'Pine cone',
        'Candle', 'Christmas Eve', 'Turkey', 'Pudding', 'Advent calendar']
    },
    'baby-shower': {
      label: 'Baby shower',
      title: 'Baby Shower Bingo',
      words: ['Bottle', 'Diaper', 'Rattle', 'Pacifier', 'Stroller', 'Crib',
        'Onesie', 'Bib', 'Blanket', 'Teddy bear', 'Car seat', 'Lullaby',
        'Booties', 'Baby wipes', 'Bath tub', 'Rubber duck', 'Mobile',
        'High chair', 'Baby monitor', 'Burp cloth', 'Sippy cup', 'Teether',
        'Bouncer', 'Swaddle', 'Nursery', 'Diaper bag', 'Changing table',
        'Night light', 'Socks', 'Hat', 'Mittens', 'Board book', 'Baby powder',
        'Lotion', 'Shampoo', 'Hooded towel', 'Playmat', 'Baby carrier',
        'Bassinet', 'Nursing pillow', 'Bodysuit', 'Sleep sack', 'Pajamas',
        'Thermometer', 'Nail clippers']
    },
    'sight-words': {
      label: 'Sight words: pre-primer',
      title: 'Sight Word Bingo',
      words: ['a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find',
        'for', 'funny', 'go', 'help', 'here', 'I', 'in', 'is', 'it', 'jump',
        'little', 'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run',
        'said', 'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where',
        'yellow', 'you']
    },
    'sight-words-primer': {
      label: 'Sight words: primer',
      title: 'Sight Word Bingo',
      words: ['all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but',
        'came', 'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into',
        'like', 'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please',
        'pretty', 'ran', 'ride', 'saw', 'say', 'she', 'so', 'soon', 'that',
        'there', 'they', 'this', 'too', 'under', 'want', 'was', 'well', 'went',
        'what', 'white', 'who', 'will', 'with', 'yes']
    }
  };
});
