# Gates: Mezcola full-detail first-scroll candidate

OWNS: src/components/CinematicExperience*, src/components/MobileScrubStack.tsx, src/components/Scene.tsx, src/components/TransitionVideo.tsx, src/lib/assets.ts, src/lib/video-scrubber.ts, src/lib/mobile-motion.json, public/motion-mobile-v2/**, public/videos-web-v1/**, scripts/**, tests/**, docs/**, reviews/**, next.config.ts, package.json, GATES.md

Scope: Fix cold mobile media without the severe pixelation rejected by the owner. Previous144px quality acceptance is invalid. Original sprite assets remain preserved. This ledger covers a local device-test candidate; production release and a new independent release review are separate, pending work.

- [x] G1: Original code reproduces stale sequence, missed resize, leaked bitmaps and blocked cold motion.
  EVIDENCE: Original5aafeaf6 replay fails four behavior assertions; preserved baseline-tests.txt in CompanIA evidence directory.

- [x] G2: Native seeking, continuous-scroll backpressure, stale completion, resize, disposal, low-resolution rejection and desktop startup regressions pass.
  CHECK: pnpm test
  EXPECT: fail 0
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/jltrabajo/Projects/inversiones-mezcola-company-site; path=5a8bf2e38518/25 entries; EXPECT=matched; output-sha256=f02c32f51d57eee8e224109be982f918a94ee1feba950d129f64d92d5fd32e39; output-bytes=1154

- [x] G3: Production localized routes compile successfully.
  CHECK: pnpm build
  EXPECT: Finalizing page optimization
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/jltrabajo/Projects/inversiones-mezcola-company-site; path=5a8bf2e38518/25 entries; EXPECT=matched; output-sha256=bdc50fd5d944969f9642eb7ee56cb5414a4af29e0d45d10226ce6df253d893e0; output-bytes=938

- [x] G4: Source passes TypeScript and lint without warnings.
  CHECK: node scripts/verify-quality.mjs
  EXPECT: QUALITY_PASS
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/jltrabajo/Projects/inversiones-mezcola-company-site; path=5a8bf2e38518/25 entries; EXPECT=matched; output-sha256=92f5ddffaf02519bbae933e195c8a30c186d2d96328f9349bc79859544bb3040; output-bytes=13

- [x] G5: All771 full-resolution frames retain order and similarity with the original; short GOPs and faststart are valid.
  CHECK: python3 scripts/verify-media.py
  EXPECT: MEDIA_PASS
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/jltrabajo/Projects/inversiones-mezcola-company-site; path=5a8bf2e38518/25 entries; EXPECT=matched; output-sha256=3c679481b394ae2f557f8612ec5ac5f72d400beea646e45036d33c71b866f00b; output-bytes=279

- [x] G6: Continuous first-pass native Chromium and WebKit scrolling renders all seven full-detail transitions; idle and resize pass, and failure/reduced-motion remain readable.
  EVIDENCE: native-browser-run.txt: all7 Chromium/WebKit first-pass continuous transitions, changing actual pixels, every source900x1600, idle/resize PASS. Native failure/reduced-motion: network-failure PASS2requests, low-resolution PASS7requests, reduced-motion PASS0requests. CompanIA evidence directory; new compiled implementation.

- [x] G7: Source and evidence review describes actual release limitations and does not inherit obsolete independent clearance.
  EVIDENCE: reviews/2026-10-19-full-detail.md; implementing-agent review. Independent review of144px implementation is explicitly invalid for this revision; new independent release review and owner physical retest remain pending.

- [x] G8: Current changes, real cold-network preparation cost and publication state are reviewable in the draft PR.
  EVIDENCE: native-cold-network.json:160556ms at aggregate200000bytes/s+120ms,31,190,659motion bytes. Current source/docs prepared for existing draft PR1; production remains unchanged. Publication requires separate release review and owner acceptance.

- [x] G9: Every drawn motion source is900x1600, and browser captures preserve the original same-frame detail; no144px tier ships.
  EVIDENCE: native-canvas-quality.json: Chromium0.975110/WebKit0.964473 same-frame SSIM, threshold0.95. Negative144px controls0.846783/0.848597 fail. Native draw logs show900x1600 in all7 continuous transitions. Old144px files deleted; media validator asserts their absence.
