# First-scroll media repair — full-detail candidate

Original source: `5aafeaf6`. Branch: `codex/fix-mobile-first-scroll-20261019`. Draft PR1; production unchanged.

The published mobile renderer discarded asynchronous results while scrolling, let old transitions overwrite a shared canvas and leaked large decoded sheets. Desktop separately skipped valid cold video starts after1200ms. The initial144px atlas candidate solved readiness by visibly sacrificing quality; the owner rejected it on a physical phone. That candidate and its quality acceptance are withdrawn.

## Current behavior

- Mobile motion uses the same771 original portrait frames at900×1600, encoded as seven H.264 MP4 files. No resizing or144px fallback. Short12-frame GOPs, no B-frames, and faststart support bidirectional native seeking.
- Before enabling the animation, the hero shows preparation progress while all scene photos decode and all seven compressed clips download. Motion bytes total31,190,659. Progress follows actual bytes;30 seconds without transfer progress aborts to the eight static scenes. Slow transfers keep progressing rather than hitting a fixed total-time cutoff.
- At most two native video elements exist: current and next. Other video surfaces are released; compressed blobs remain available. This bounds decoder count, not the browser's private native memory. Physical iPhone memory pressure remains unmeasured.
- Scroll updates a desired frame. A decoder completes its current seek, paints a full-resolution frame, and then seeks to the latest desired frame. Repeated scroll events cannot continually cancel decoder work. Old or disposed sequences cannot draw. Idle stops and resize redraws.
- Download, codec or initial decoder failure returns the readable eight-scene page. Reduced-motion requests no mobile motion resources.
- Desktop retains the previously tested720p faststart videos, upcoming media preloads and progress-aware startup watchdog. Original source photos, videos and portrait sheets remain unchanged.

## Validation

`pnpm test`, `node scripts/verify-quality.mjs`, `pnpm build`, `python3 scripts/verify-media.py`.

The media validator checks every video's geometry, frame count/order, short GOPs, no B-frames, duration and faststart. All771 frames are compared against the original sprite frames: per-sequence SSIM0.981858–0.987642; threshold0.97. SSIM is a similarity measure, not a percentage of human-perceived quality.

Mobile390×844/DPR2 Chromium and WebKit exercise continuous first-pass scrolling through all seven transitions, with every drawn source900×1600. Chromium runs offline after preparation. WebKit runs with all subsequent HTTP requests blocked: Playwright's global offline mode also breaks loading a new local blob video, so that mode is not claimed to pass. Both verify idle and resize. Browser-native decoding is tested; a physical iPhone retest remains necessary.

Browser captures are also compared to the original same-position frame after viewport cropping: Chromium SSIM0.975110, WebKit0.964473. Tests now examine source resolution and fidelity, beyond the old opaque/nonblack criterion.

A cold Chromium run at200,000bytes/s aggregate throughput and120ms latency took160.556s to prepare. On a local connection, measured preparation was about1–2s. Native-memory limits remain unmeasured on a physical iPhone. Detailed evidence is in the CompanIA evidence directory. Loading full-detail clips has a real initial transfer cost; fast local preparation must not be represented as mobile-network startup speed.

## Rebuild media

Existing ffmpeg/ffprobe are required; no new runtime packages.

```
python3 scripts/generate-mobile-video.py
python3 scripts/optimize-videos.py
python3 scripts/verify-media.py
```

Version asset directories before changing published bytes because these URLs use immutable caching.
