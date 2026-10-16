# City Dash — start.ng runner

An original stylized 3D endless runner built with **three.js** for the
start.ng platform. You're behind a low-poly runner on a city street:
grab coins, dodge barriers (slide to another lane, or jump the hurdles).

## Files
| File | What it does |
|------|--------------|
| `index.html` | The page. Loads three.js from a CDN, then our files. |
| `theme.js` | **The central styling** — one place that controls the runner's outfit + the world/UI colours. |
| `game.js` | The game (scene, runner, coins, barriers, controls). |
| `auth.js` | start.ng login slot — returns the logged-in player (placeholder for now). |
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
`auth.js` → `getCurrentUser()` currently returns a placeholder. Once the
start.ng login details are added there, the HUD shows the real player and
the game-over screen greets them by name. Nothing else needs to change.

## ⚠️ Still to wire (waiting on start.ng/docs)
1. **Login** — the real `getCurrentUser()` in `auth.js`.
2. **Publish** — how start.ng wants the game submitted (subdomain / upload / pull request).

## Publishing with a coding agent (later)
From your terminal, once the repo is set up:
```bash
claude "commit this game and open a pull request to <your Zedu-Endor repo>"
# or
opencode run "commit this game and open a pull request to <your Zedu-Endor repo>"
```
