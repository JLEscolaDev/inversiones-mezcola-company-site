# First-scroll media repair — review candidate

Original source: `5aafeaf6` (August12). Local branch: `codex/fix-mobile-first-scroll-20261019`.

The mobile renderer could fade to an empty canvas while async sprite loads missed their scroll frame. Sequence-local frame tracking also allowed old transitions to overwrite the shared canvas. Its eager warmup downloaded386 JPG sheets (51,931,724bytes), with uncapped concurrent foreground decodes and leaked bitmaps when pending entries were evicted. Desktop separately skipped valid cold video starts after1200ms.

## Behavior

- The hero remains visible with an ES/EN preparation indicator. First scroll opens only after all scene images and all seven complete base-motion sequences are downloaded **and decoded**. A failed download/decoder or20s timeout returns the eight static readable scenes.
- The base motion contains the original771 frames, packed in seven144×256 AVIF atlases totaling973,821bytes. All base frames remain decoded, so the first visit to any section can render without waiting on the network or a new atlas decode.
- Original900×1600 detail is fetched for the current position and upgrades the canvas when ready. Thus the base tier can look soft on a slow connection; this is a reviewable quality tradeoff, not a claim of instant original-detail readiness.
- The base atlases occupy120,913,920 decoded bytes including padding. With one current original sheet the cache has132,433,920bytes, below its128MiB bound. Network concurrency is2, decode concurrency1; late/disposed bitmaps close explicitly.
- A shared canvas identity includes sequence, frame, quality and dimensions. Async completion schedules the current render rather than painting its obsolete request. Idle drawing stops; resize redraws.
- Desktop uses versioned720p H.264 faststart videos (originals preserved), preloads the next scene image and transition, and allows slow starts. A progress-aware20s stall watchdog replaces the unconditional1.2s skip.
- Reduced-motion mode preserves the static eight-scene page and requests no motion sprites.

## Validation

`pnpm test` (16 checks), `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `python3 scripts/verify-media.py`.

Four renderer regressions fail on the original source and pass after repair. Browser evidence lives in the CompanIA research directory referenced in the working state.

Chromium mobile390×844/DPR2 with empty cache,200000bytes/s and120ms latency: preparation6641ms after canvas mount; seven first-pass transitions render their correct sequence; no JavaScript errors. Startup time is measured, not a fixed promise.

WebKit26.4 mobile: delayed preview completion per request at200KB/s+120ms (not aggregate throttling), then actual network disabled before the first scroll. All seven transitions render opaque nonblack current-sequence pixels on first visit. Idle stops, resize redraws, reduced-motion downloads no sprites. This is not a physical iPhone claim.

Chromium desktop: every video response deliberately delayed2200ms; the first remains pending beyond1500ms and all seven play and reach the final contact scene. No JavaScript errors.

Physical iPhone appearance, startup feel and memory pressure remain unverified. No production deployment has been made.

## Rebuild media

Existing local prerequisites: Pillow with AVIF support, ffmpeg/ffprobe. No new runtime packages.

```
python3 scripts/generate-motion-previews.py
python3 scripts/optimize-videos.py
python3 scripts/verify-media.py
```

Version the output directory before changing bytes after publication because the URLs use immutable caching.

Codec support: the animated AVIF tier targets Safari/iOS16+. Unsupported or failed decoders immediately return the static scene page; they do not hold the preparation indicator until the timeout. iPhone hardware behavior still requires validation.
