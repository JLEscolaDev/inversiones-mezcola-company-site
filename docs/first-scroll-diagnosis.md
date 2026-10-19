# Mezcola — cold mobile media failure (2026-10-19)

Published site: https://www.inversionesmezcola.es/es
Source: https://github.com/JLEscolaDev/inversiones-mezcola-company-site @ 5aafeaf6.

## Observed

At mobile390×844, cold cache and CDP200000bytes/s,120ms latency, scroll550px during first load: visible media layer opacity1 while canvas retained default300×150 dimensions. After13 sprite requests and2429693bytes transferred it was still unpainted. Removing throttling subsequently allowed375×844 canvas painting. No console warnings/errors; the renderer swallows load/draw promise rejections.

Mobile uses JPG sprite sheets on a single canvas. It does not use HTMLVideoElement. Manifest has386 sheets,51931724bytes (~49.5MiB). Every1800×1600 sheet consumes11.52MB decoded, and12 cache entries nominally consume138.24MB before browser/image/canvas overhead.

## Source defects

1. lastFrameRefs records requested frame before its network/decode completes. onLoad discards every intermediate frame while scrolling faster than network, so nothing paints until the exact still-current frame arrives. Scene fades/canvas opacity proceed regardless of drawable data.
2. One shared canvas but frame identity tracked per sequence: returning to a remembered frame can skip drawing though canvas contains another sequence.
3. Async draw guards only inspect sequence-local frame number, not currently active sequence or effect generation. Prior-sequence callbacks can overwrite the shared canvas after navigation; mount warmup can likewise paint sequence0 late.
4. LRU removes unresolved entries; their later ImageBitmap is neither cached nor closed. Cached callback draws may race with closing. No effect-owned cache cleanup.
5. Background image warmup starts120ms after mount and traverses all386 sheets in fixed order. Foreground loadSprite runs independently with unbounded concurrency, competing with warmup and repeatedly decoding resources.
6. Resize requests a render but equal frame number suppresses drawing to the new canvas dimensions.
7. Desktop TransitionVideo unconditionally completes after1200ms if playback has not started. A slow-but-valid first request is skipped; each video is mounted only when needed and preload=metadata.

## Constraints on remedy

52MB cannot arrive instantly over a mobile connection (~260seconds at200KB/s before overhead). Repeating whole-site preload cannot fix this. Preserve visuals and scroll interaction with a small complete first-pass motion tier, prioritize current data, bound decoded memory/requests, and upgrade detail without hiding scenes before media is drawable. Verify the races independently and the first pass in a browser. Physical iPhone testing must be reported separately.
