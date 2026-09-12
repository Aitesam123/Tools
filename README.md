# Pixel Studio — Image Converter, Enhancer & Optimizer

A real, working image conversion/enhancement/resize/compression tool built with
Next.js (App Router) + TypeScript + Tailwind CSS on the frontend and
[sharp](https://sharp.pixelplumbing.com/) (libvips) on the backend. Every
feature described below actually processes real image bytes — there is no
simulated progress, fake AI button, or mocked conversion.

## What it does

- **Convert** between JPEG, PNG, WEBP, AVIF, TIFF and GIF. The exact list of
  output formats offered in the UI is queried live from the installed
  libvips build (`sharp.format`) via `GET /api/capabilities`, so the app
  never advertises a conversion the engine can't actually perform.
- **Enhance** using real sharp/libvips operations — CLAHE (adaptive local
  contrast), unsharp masking, median denoising, white-balance normalization,
  and modulate/linear adjustments — chosen per enhancement mode (Auto,
  Natural, Sharp, Detailed, Portrait, Product, Low-Quality Recovery, Custom).
  There is no fake "AI enhance" that just bumps CSS filters.
- **Resize** with Fit / Fill / Exact / Crop-to-Fit / Contain modes, optional
  aspect-ratio lock, and conventional (Lanczos) upscaling — explicitly
  labeled as non-AI, since no real super-resolution model is wired in.
- **Crop / rotate / flip** per image, with EXIF auto-orientation applied
  first so crop coordinates match what the user sees.
- **Hit an exact target file size** (custom KB/MB, or presets incl. "Under
  1 MB"). The optimizer does a bounded binary search over the encoder's
  quality parameter, only reducing dimensions as a last resort, and reports
  the real, measured output byte size — never an estimate.
- **Verify dimensions and size from the actual generated file**, not from
  what the user typed in.
- **Batch process** multiple images concurrently (client-orchestrated, 3 at
  a time) with honest per-image status (waiting/analyzing/processing/done/
  error), then bundle the real output bytes into a ZIP client-side.
- **Before/after compare** with a draggable slider using the real original
  and processed images.

## What's intentionally out of scope for this build

This was scoped down from an extremely large spec to "a fully real, working
core tool" rather than a whole SaaS platform. Explicitly not implemented:

- No user accounts, database, or job queue (Redis) — everything processes
  synchronously, in memory, per request. Fine for a single-instance deploy;
  a high-volume production deployment would want a queue for large batches.
- No persistent/cloud storage — nothing is written to disk. Uploads are
  processed in memory and discarded when the request completes.
- No SVG input support — safely sanitizing arbitrary SVG (script/event
  handler stripping) needs vetted tooling this build doesn't include, so
  SVG uploads are rejected with a clear message rather than processed
  unsafely.
- No true HEIC/HEIF output — the bundled libvips has AV1 (AVIF) but not the
  HEVC encoder; HEIC/HEIF are therefore not in the supported output list
  (the capability probe reflects this automatically).
- No marketing/SEO/legal pages, no billing.

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Environment variables (all optional, sensible defaults apply)

| Variable | Purpose | Default |
|---|---|---|
| `MAX_UPLOAD_BYTES` | Max size of a single uploaded file | 45 MB |
| `MAX_INPUT_PIXELS` | Max width×height accepted for a source image (decompression-bomb guard) | 60,000,000 |
| `MAX_OUTPUT_DIMENSION` | Max width/height for requested output | 8000 |
| `MAX_BATCH_FILES` | Max files per batch upload | 30 |
| `PROCESSING_TIMEOUT_MS` | Per-image processing timeout | 30000 |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | In-memory per-IP rate limit | 60000 / 40 |

## Architecture

```
src/
  app/
    api/
      analyze/route.ts     # cheap per-image analysis + format recommendation
      process/route.ts     # the real processing pipeline (single image)
      capabilities/route.ts# live engine capability + preset probe
    page.tsx                # app shell
  components/               # UI (Uploader, SettingsPanel, ImageCard, CropTool, CompareSlider, ...)
  lib/
    image/                   # server-side processing engine (sharp-based, no framework deps)
      validate.ts            # magic-byte sniffing, size/megapixel/security limits
      pipeline.ts            # orchestrates the full validate -> enhance -> transform -> resize -> encode -> verify pipeline
      enhance.ts             # real enhancement operations per mode
      transform.ts           # crop/rotate/flip/resize geometry
      sizeOptimizer.ts        # bounded binary-search quality optimizer for target file size
      encode.ts              # per-format encoder settings
      formats.ts             # runtime capability probe + smart format recommendation
      rateLimit.ts            # in-memory sliding-window rate limiter
    client/                  # browser-side state/helpers (no server-only imports)
```

## Security notes

- Uploads are validated by actual binary signature (magic bytes via
  `file-type`), not filename extension or declared MIME type.
- Decompression-bomb protection via `sharp`'s `limitInputPixels` plus an
  explicit megapixel cap checked before any heavy decoding.
- Per-request processing timeout to bound worst-case CPU usage.
- Filenames are sanitized (path separators and unsafe characters stripped)
  before being used in a download filename or ZIP entry.
- Rate limiting is in-memory and per-process — adequate for a single
  instance; a multi-instance deployment should move this to a shared store.
