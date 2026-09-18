# 🐍 SNAKE — Arcade Terminal

A retro-styled Snake game built with pure HTML, CSS, and JavaScript. No frameworks, no dependencies — just open `index.html` and play.

## ✨ Features

- **4 levels** with different wall layouts:
  1. **Open Field** — no walls, just you, the apples, and your own tail
  2. **The Cage** — solid walls on every border
  3. **Four Blocks** — four solid blocks in the quadrants
  4. **Labyrinth** — gapped borders and open-ring rooms to thread through
- **Scoring** — +10 points per apple; the game speeds up with every apple eaten (tick interval drops from 140 ms to a 80 ms floor, 2 ms shorter per apple)
- **Best score** saved to `localStorage` across sessions
- **Sound effects** via the Web Audio API (eat, die, start) with a mute toggle
- **Touch support** — swipe on the canvas or use the on-screen D-pad (shown automatically on touch devices)
- **Wrap-around borders** — edges loop around, unless the level's walls block you
- **Pause on tab hide** — the game auto-pauses when you switch away from the tab

## 🎮 Controls

| Input | Action |
|-------|--------|
| `W` / `A` / `S` / `D` or arrow keys | Move the snake |
| `Space` | Start / pause / resume / play again |
| `1` – `4` | Select a level (start screen or game over) |
| `Enter` | Play again after game over |
| Swipe / D-pad buttons | Mobile touch controls |
| 🔊 button | Toggle sound |

## 📁 Project Structure

```
qwen3.8-snake/
├── index.html    # Page layout, top bar, board, overlays, D-pad
├── style.css     # Arcade terminal styling, scanlines, overlays, responsive layout
└── game.js       # All game logic: levels, snake, food, input, rendering, audio
```

## 🚀 How to Run

No build step required.

**Option 1 — Double-click** `index.html` in your file browser.

**Option 2 — Local dev server** (recommended, so `localStorage` isn't treated as `file://` quirks):

```bash
python3 -m http.server 8000
# or
npx serve .
# or
npx http-server -p 8000
```

Then open http://localhost:8000.

## 🔧 Tech Notes

- **Board** — 21×21 grid, rendered to a `<canvas>` with `devicePixelRatio` scaling and `image-rendering: pixelated` for a crisp retro look.
- **Input buffering** — up to 2 queued turns so fast key presses at turn times don't get dropped; reversing direction is ignored to prevent self-kills.
- **Frame loop** — `requestAnimationFrame` with time-based step accumulation so the game stays accurate even if frames drop.
- **Persistence** — only `localStorage` keys: `snake.best` (high score) and `snake.level` (last selected level).
- **No external dependencies** — Google Fonts (`Press Start 2P`, `Space Grotesk`) are the only external resources, loaded via CDN.

## 🛠 Extending the Game

- **New level** — add an object to the `LEVELS` array in `game.js` with `name`, `desc`, `snake`, `food`, and `walls` (built with the `hline`, `vline`, `square`, and `openRing` helpers).
- **Tune difficulty** — change `BASE_INTERVAL`, `MIN_INTERVAL`, and `STEP` at the top of the game logic.
- **Board size** — `COLS` / `ROWS` set the grid dimensions.

## 📝 Credits

- **Game code** — written by **Qwen3.8** (specifically `Qwen3.8-27B-UD-Q3_K_XL` by [unsloth](https://github.com/unsloth)).
- **README.md** — authored by **Ternary Bonsai 2** (specifically `Ternary-Bonsai-2-27B-PTQ1_0` by [PrismLM](https://prism-ai.com)).

## 📄 License

Not specified — all code in this repository is provided as-is.
