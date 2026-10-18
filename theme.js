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
  // Neon night palette for the leaderboard (and anything else neon),
  // straight from cover.png: dark navy/purple, neon cyan, hot pink, gold.
  // Every leaderboard colour comes from here — style.css only uses vars.
  ui: {
    bg:       '#0b0f2a',   // deep navy (panel bottom)
    bg2:      '#1b1449',   // purple (panel top)
    fg:       '#eaf3ff',   // text on the panel
    muted:    '#96a2d6',   // secondary text on the panel
    cyan:     '#3df5ff',   // neon cyan (scores, accents, buttons)
    pink:     '#ff2d95',   // neon pink (the player's own row)
    gold:     '#ffcf33',   // trophy gold (title, 1st place, "New best!")
    rank1:    '#ffcf33',
    rank2:    '#3df5ff',
    rank3:    '#ff2d95',
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

  // Neon leaderboard palette -> CSS variables (the glow/line colours are
  // derived from the same hexes, so one edit in THEME.ui restyles it all).
  const ui = window.THEME.ui || {};
  const rgba = (h, a) => {
    const s = ('' + h).replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return 'rgba(255,255,255,' + a + ')';
    const n = parseInt(s, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  const set = (k, v) => { if (v) r.setProperty(k, v); };
  set('--lb-bg', ui.bg);
  set('--lb-bg2', ui.bg2);
  set('--lb-fg', ui.fg);
  set('--lb-muted', ui.muted);
  set('--neon', ui.cyan);
  set('--pink', ui.pink);
  set('--gold', ui.gold);
  set('--rank1', ui.rank1);
  set('--rank2', ui.rank2);
  set('--rank3', ui.rank3);
  set('--neon-line', rgba(ui.cyan, 0.38));
  set('--neon-glow', rgba(ui.cyan, 0.22));
  set('--pink-line', rgba(ui.pink, 0.85));
  set('--pink-glow', rgba(ui.pink, 0.28));
  set('--gold-glow', rgba(ui.gold, 0.35));
  set('--lb-row', 'rgba(255,255,255,.055)');
  set('--lb-me', rgba(ui.pink, 0.14));
  set('--lb-scrim', 'rgba(5,7,24,.74)');
  set('--lb-chip', rgba(ui.cyan, 0.18));
};
