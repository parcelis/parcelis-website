# Parcy HD website animation kit

The live avatar animates the original SVG directly. It remains sharp at any display size and pixel density. The downloadable raster animations are rendered from that vector artwork at 768 × 832 pixels, four times the previous width and height (16 times the pixel area).

The motions have been rebuilt as vector transforms rather than enlarged from the original pet sprites. Every state shares the same panel geometry, gradients, eye design, and face. These are website assets; the stored ChatGPT pet has not been changed.

## Embed

Copy both JavaScript files and the `assets` folder to `/parcy/` on your website:

```html
<script type="module" src="/parcy/parcy-avatar.js"></script>
<parcy-avatar id="parcy" state="idle" size="224"
  aria-label="Parcy, your chat companion"></parcy-avatar>
```

The module loads `parcy-motion.js` and `assets/parcy-vector.svg` relative to its own URL. Keep their folder structure. The player has no runtime dependencies or external service calls.

```js
const parcy = document.querySelector('#parcy');
parcy.state = 'greeting'; // Chat opened
parcy.state = 'thinking'; // Waiting for a response
parcy.state = 'waiting';  // Waiting for visitor input
parcy.state = 'ready';    // Response completed
parcy.state = 'error';    // Request failed
parcy.state = 'idle';     // Resting
```

Also available: `jumping`, `move-left`, `move-right`, and `look-around`. States loop until changed. `parcy.lookAt(dx, dy)` takes a screen-space vector from the avatar's center to the pointer. `parcy.resetLook()` resumes the current animation. Reduced-motion preferences are respected. The player stops its animation callback when removed from the page.

## Image-only use

```html
<img src="/parcy/assets/webp/greeting.webp"
  width="224" height="243" alt="Parcy waving">
```

For crisp raster playback on a 2× screen, display these 768-pixel-wide files at 384 CSS pixels or less. Use the live SVG player for larger sizes or higher-density displays. For a static avatar, use `assets/parcy-vector.svg` or `assets/parcy-static.png`.

## Files

- `parcy-avatar.js`, `parcy-motion.js`: scalable live SVG player and animation logic.
- `assets/parcy-vector.svg`: original vector artwork prepared with animation groups.
- `assets/webp/`: lossless transparent 768 × 832 animated WebP files.
- `assets/apng/`: transparent 768 × 832 animated PNG files (`.png` extension).
- `assets/frames/`: full-resolution transparent PNG frames.
- `assets/manifest.json`: state names, frame counts, and timing.
- `index.html`: interactive state and pointer-gaze preview.
- `resolution-comparison.png`: previous export beside the new vector rendering.
- `browser-validation.json`, `export-validation.json`: browser and export checks.

This kit supplies the visual avatar. Connect its state changes to your existing chatbot backend. It does not implement voice lip-sync.

## Preview locally

Run in this folder and open `http://localhost:8000`:

```sh
python3 -m http.server 8000
```

Serve JavaScript as `text/javascript` and SVG as `image/svg+xml`. The live SVG player uses the browser's native vector rendering, so a canvas pixel-density setting is not needed.
