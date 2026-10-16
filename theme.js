/* =============================================================
   theme.js  —  THE CENTRAL STYLING (single source of truth)
   =============================================================
   The task: "Styling centrally must affect the look of your
   character." Everything about how the game and the runner LOOK
   is defined here. Change a value -> reload -> it changes.

   Try it: change SKINS[0].shirt from 0x2f8fff to 0xff0000,
   reload, and the default runner wears red. That is the
   "central styling drives the character" link, proven.
   ============================================================= */

// World look (environment + UI colours).
window.THEME = {
  world: {
    sky:        0xcfe0f7,
    fogNear:    24,
    fogFar:     70,
    road:       '#3b414d',
    roadEdge:   '#e9d9a6',
    roadDash:   '#f2f2f2',
    sidewalk:   0xcbd1dc,
    buildings:  [0xcf8f6f, 0xd9c08a, 0x7fb0a8, 0xc58aa0, 0x6b7a99, 0xe0a86a],
    treeLeaf:   0x6aae55,
    treeTrunk:  0x8a5a34,
    coin:       0xffbf2e,
  },
  character: {
    skinTone:   0xe8b48c,
    shoe:       0x2b2b2b,
  },
};

// Each outfit FULLY describes the runner. Add or edit an entry
// and the character (and its button in the game) updates to match.
window.SKINS = [
  { key: 'azure',  name: 'Azure',  css: '#2f8fff', shirt: 0x2f8fff, cap: 0xffffff, shorts: 0x2a3c6b },
  { key: 'ember',  name: 'Ember',  css: '#ff5a3c', shirt: 0xff5a3c, cap: 0x2b2b2b, shorts: 0x7a2a1e },
  { key: 'leaf',   name: 'Leaf',   css: '#49c06a', shirt: 0x49c06a, cap: 0xfff2b0, shorts: 0x234a2c },
  { key: 'violet', name: 'Violet', css: '#9a6bff', shirt: 0x9a6bff, cap: 0x2b2b2b, shorts: 0x3a2a63 },
];

// Push a couple of theme colours into the page UI so one central
// theme drives the game AND the HUD.
window.applyThemeCSS = function () {
  const r = document.documentElement.style;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  r.setProperty('--sky', hex(window.THEME.world.sky));
  r.setProperty('--coin', hex(window.THEME.world.coin));
};
