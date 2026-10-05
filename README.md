# Snorwider 3D

An endless 3D sledding game that runs entirely in the browser (three.js, no build step), with power-ups.
All models are original low-poly assets built from primitives in code.

## Controls
- **← / → or A / D** steer (touch: hold left/right side of the screen)
- **P / Esc** pause, **M** mute, **Space / Enter** start or restart

## Gameplay
Dodge trees, rocks, snowmen and logs. Hit ramps to jump over obstacles. Collect gifts for points.

## Power-ups
| Power-up | Effect |
|---|---|
| Shield | Absorbs one crash |
| Magnet | Pulls nearby gifts to you |
| Turbo | Speed boost, smash through obstacles |
| 2X | Double points |
| Slow-Mo | Slows the pace for a while |

## Run locally
`python3 -m http.server` and open http://localhost:8000 (ES modules need a server, not `file://`).

## GitHub Pages
A workflow in `.github/workflows/pages.yml` deploys the site on pushes to `main`.
In the repo go to **Settings → Pages → Source: GitHub Actions**.
