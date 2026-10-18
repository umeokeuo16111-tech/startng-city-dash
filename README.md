# City Dash — start.ng runner

An original stylized 3D endless runner built with **three.js** for the
start.ng platform. You're behind a low-poly runner on a city street:
grab coins, dodge barriers (slide to another lane, or jump the hurdles).

## Files
| File | What it does |
|------|--------------|
| `index.html` | The page. Loads three.js from a CDN, then our files. |
| `theme.js` | **The central styling** — one place that controls the runner's outfit + the world/UI colours (incl. the neon leaderboard palette). |
| `game.js` | The game (scene, runner, coins, barriers, controls). |
| `auth.js` | start.ng login — returns the logged-in player via the hidden `start.ng/connect` frame. |
| `leaderboard.js` | **The leaderboard** — saves runs to start.ng and shows its top 10. |
| `startng.json` | The leaderboard's two columns, read by start.ng at publish: Distance (m), Coins. |
| `style.css` | The HUD / page styling. |

## Run it
No build step. Either:
- **Just open `index.html`** in your browser, or
- if your browser blocks local scripts, run a tiny server from this folder:
  ```bash
  python3 -m http.server 8000   # then open http://localhost:8000
  ```
Controls: **← →** switch lanes · **↑ / swipe up** jump · tap left/right on phone.

## Requirement 1 — "central styling controls the character"
Open `theme.js`. Change `SKINS[0].shirt` from `0x2f8fff` to `0xff0000`,
reload — the default runner wears red. The in-game outfit buttons
(Azure / Ember / Leaf / Violet) rebuild the character from the same file.

## Requirement 2 — "uses the logged-in users of start.ng"
`auth.js` → `getCurrentUser()` asks start.ng's hidden connect frame who's
playing and returns `{ id, name, face, style, loggedIn }`. The HUD shows
their start.ng name + face, the runner is dressed from their character's
colour, and the game-over screen greets them by name (Guest if nobody's
signed in). Nothing else needs to change.

## Leaderboard

It's **start.ng's own board** — no database of ours, no sign-up of ours.
`leaderboard.js` talks to the same hidden `https://start.ng/connect` frame
that `auth.js` uses for login:

| The game sends | start.ng replies | Used for |
|------|------|------|
| `{ type:'startng:score', stats:{ distance, coins } }` | `startng:scoreSaved` → `{ ok, result:{ best, improved, rank } }` | saving the run at game over |
| `{ type:'startng:leaderboard', limit:10 }` | `startng:leaderboardData` → `{ ok, entries:[{ rank, player_id, name, color, score, stats }] }` | the 🏆 top-10 panel |

- The two columns (**Distance (m)**, **Coins**) are declared in `startng.json`;
  start.ng reads it on every publish/push, and each player keeps their best run.
- 🏆 **Leaderboard** sits on the start screen and the game-over screen. The
  panel shows rank, name, start.ng face (your own; other players get their
  start.ng colour), and score — your row highlighted in neon pink.
- **"New best!"** uses start.ng's `improved` flag, backed by a per-player
  personal best in `localStorage` (every access wrapped in try/catch), so the
  banner also works offline.
- Guests can **read** the board; only signed-in start.ng players can **save**
  — the note under the buttons tells them which happened.
- All the neon colours come from `theme.js` (`THEME.ui`); `style.css` only
  uses the CSS variables `applyThemeCSS()` sets from it.

### Testing the leaderboard
- **Live:** <https://startng-city-dash.start.ng> — play a run until you crash,
  then tap 🏆 Leaderboard. start.ng only answers games on a `*.start.ng`
  address, so scores really save there.
- **Locally:** `python3 -m http.server 8000`, then open
  <http://startng-city-dash.start.localhost:8000> — start.ng answers
  `*.start.localhost` too, so the real board loads (the game's name comes
  from the subdomain, so the first bit must match the game on start.ng).
- Opened as plain `localhost:8000` or a file, start.ng stays silent: the
  panel explains that, "New best!" still works from the local record, and
  the game keeps playing exactly as before.

## Publishing with a coding agent (later)
From your terminal, once the repo is set up:
```bash
claude "commit this game and open a pull request to <your Zedu-Endor repo>"
# or
opencode run "commit this game and open a pull request to <your Zedu-Endor repo>"
```
