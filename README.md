# TouchDesigner → Web (three.js) — Particle Model

This project was generated to convert a TouchDesigner particle-style OBJ into an interactive website using three.js. It shows a point-cloud representation of `Untitled.obj` with subtle motion and mouse/trackpad rotation, ready to host on GitHub Pages.

## Files
- `index.html` — main page
- `style.css` — minimal UI styling (black background, Apple Symbols font)
- `main.js` — three.js scene, loader, shader, controls
- `assets/Untitled.obj` — your OBJ model (copied here)

## How to run locally
1. Serve the folder with a static server (Chrome won't load the OBJ via file://). For example, using Python 3:
```
python -m http.server 8000
```
Then open `http://localhost:8000`.

## Deploy to GitHub Pages
1. Create a new repository on GitHub and push the project files.
2. In the repository settings, enable GitHub Pages from the `gh-pages` branch or `main` branch `/docs` folder as you prefer. The simplest is to push to `main` and set the site source to `main` branch `/` (repository root).
3. The page will be available at `https://<your-username>.github.io/<repo-name>/`

## Notes & customizations
- The shader is intentionally lightweight; if you want denser particles or slower/faster drift, tweak `uniforms.uSize` or the velocity factors in the vertex shader.
- If you have textures or a `.mtl`, the loader can be extended to apply them, but the current approach focuses on point-cloud rendering to match your TouchDesigner look.
- Font uses `Apple Symbols` as requested; browsers on non-Apple platforms will fallback to system fonts but maintain minimal aesthetic.

Enjoy — and if you'd like, I can further tweak the particle density, color palette, or animation behavior.
