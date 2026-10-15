# Review — Snake Arcade Terminal

## 🔴 Critical Bug

**`ctx.arcTo` doesn't exist on Canvas** (`game.js` line 149):
```js
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
```
`ctx.arcTo` is **not a standard Canvas 2D API method**. The game will crash on the first draw. Modern browsers support `ctx.roundRect()` (Chrome 84+, Firefox 91+) as a drop-in replacement, or you can implement the rounded rectangle using `ctx.arc()` with proper path construction.

---

## 🟡 Edge Case

**Empty board → frozen game** (`game.js` line 118):
```js
function placeFood(){ const c=freeCells(); food = c.length?c[(Math.random()*c.length)|0]:{x:-1,y:-1}; }
```
If all cells are occupied (snake fills the board), food becomes `{x:-1,y:-1}` and the game freezes — the snake keeps growing without eating. The draw function handles it (`if(food && food.x>=0)`), but the game becomes unplayable.

---

## 🟡 Performance Concern

**Frame loop accumulation** (`game.js` line 209):
```js
while(t-lastStep>=interval){ lastStep+=interval; step(); if(!running) break; }
```
If the tab is hidden for a long time and returns, `t` could be far behind `lastStep`, causing many steps to execute rapidly. This could make the snake grow and die quickly. The `if(!running) break` mitigates game-over cases, but it could still cause a burst of CPU work.

---

## 🟢 Code Quality (Good)

- **IIFE with `"use strict"`** — clean encapsulation, no global pollution
- **Input buffering** — up to 2 queued turns prevents dropped fast key presses; reverse-direction blocking prevents self-kills
- **Frame loop** — `requestAnimationFrame` with time-based step accumulation keeps the game accurate even if frames drop
- **Level system** — clean extensible structure with helper functions (`hline`, `vline`, `square`, `openRing`)
- **Audio** — well-designed Web Audio API usage with oscillator-based tones
- **Responsive design** — canvas scales with `devicePixelRatio`, D-pad auto-shown on touch devices
- **Accessibility** — `aria-label` on level buttons and D-pad, proper keyboard shortcuts
- **Visual polish** — particles, flash effect, pulsing food, scanlines, gradients

---

## 🟢 Minor Issues

- **Formatting** (`game.js` line 120): `function reset()` is missing leading indentation compared to surrounding code
- **`freeCells()`** (`game.js` lines 116-117) iterates all 441 cells each time food is placed — fine for 21×21 but could be optimized with a simpler approach
- **`void s.offsetWidth`** trick (`game.js` line 215) to restart CSS animation — works but could be cleaner with a re-render approach

---

## Summary

The game is well-designed and polished, but the **`ctx.arcTo` bug is fatal** — it needs to be fixed before the game can run. The empty-board edge case is a theoretical issue that's unlikely to occur in practice (the snake would need to fill the entire 21×21 grid). The frame-loop accumulation is a minor concern that's mostly handled by the `if(!running) break` guard.