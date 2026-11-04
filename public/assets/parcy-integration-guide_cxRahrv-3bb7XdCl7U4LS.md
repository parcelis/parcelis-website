# Parcy website animation kit

Self-host these files with your website. The avatar renders locally; it makes no chatbot or third-party requests.

## Quick embed

Copy `parcy-avatar.js` and the `assets` folder together into `/parcy/` on your site:

```html
<script type="module" src="/parcy/parcy-avatar.js"></script>
<parcy-avatar id="parcy" state="idle" size="144"
  aria-label="Parcy, your chat companion"></parcy-avatar>
```

Call these from your existing chatbot's event handlers:

```js
const parcy = document.querySelector('#parcy');
parcy.state = 'greeting'; // Chat opened
parcy.state = 'thinking'; // Request sent or response streaming
parcy.state = 'waiting';  // Waiting for visitor input
parcy.state = 'ready';    // Response completed
parcy.state = 'error';    // Request failed
parcy.state = 'idle';     // Return to resting state
```

States loop until changed. `jumping` is also available. This kit provides the animated avatar, not the chatbot backend or voice lip-sync. Keep your existing chatbot service and wire its callbacks to these state changes. The `thinking` state corresponds to the original pet sheet's active-work row named `running`; it does not depict locomotion.

Optional gaze: `parcy.lookAt(dx, dy)` accepts a vector from the avatar center to the pointer, in screen coordinates (positive x right, positive y down). `parcy.resetLook()` resumes the current state. The widget respects the visitor's reduced-motion preference and stops its animation loop when removed from the page.

## Image-only use

```html
<img src="/parcy/assets/webp/greeting.webp"
  width="192" height="208" alt="Parcy waving">
```

Swap the image `src` from your chatbot callbacks to select an animation. Use the JavaScript component when you need reduced-motion handling and precise frame control.

## Included files

- `assets/webp/`: transparent animated WebP, lossless.
- `assets/apng/`: transparent animated PNG (APNG, `.png` extension).
- `assets/gif/`: transparent GIF; indexed-color format may reduce gradient quality.
- `assets/frames/`: individual transparent 192×208 PNG frames.
- `assets/parcy-spritesheet.png`: complete 1536×2288 atlas.
- `assets/parcy-static.png`: idle frame for static or reduced-motion use.
- `assets/manifest.json`: frame counts, durations, row mapping, gaze directions, and known issues.
- `index.html`: interactive preview with state and gaze controls.
- `export-validation.json`: frame-count and transparency checks.

The `move-left` and `move-right` assets retain the original pose and color inconsistencies identified during review. They need an artwork revision before production use. The preview defaults to the other states. No stored ChatGPT pet was changed during this export.

## Local preview

Run from this folder, then visit `http://localhost:8000`:

```sh
python3 -m http.server 8000
```

Serve JavaScript as `text/javascript` and the PNG/WebP assets with their normal image MIME types. Keep the folder structure or pass a custom `src` attribute pointing to the atlas. Paths are relative to the module, so the component can be hosted in a subdirectory.
