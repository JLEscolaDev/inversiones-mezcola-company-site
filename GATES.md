# Gates: Mezcola first-scroll repair candidate

OWNS: src/components/CinematicExperience*, src/components/MobileScrubStack.tsx, src/components/Scene.tsx, src/components/TransitionVideo.tsx, src/lib/assets.ts, src/lib/sprite-store.ts, src/lib/motion-previews.json, public/motion-mobile-v1/**, public/videos-web-v1/**, scripts/**, tests/**, docs/**, reviews/**, next.config.ts, package.json, GATES.md

Scope: Reproduce and repair cold mobile first-visit media, verify startup and all transitions, and deliver a reviewable candidate with publication state explicit.

- [x] G1: Original code reproduces stale sequence, missed resize, leaked bitmaps and blocked cold motion.
  EVIDENCE: Original5aafeaf6 replay fails all four behavior assertions; baseline-tests.txt in the CompanIA evidence directory. Published cold200KB/s canvas remains300x150 while media layer opacity1.

- [x] G2: Renderer, scheduler, lifecycle, quality-upgrade and desktop startup regressions pass.
  CHECK: pnpm test
  EXPECT: fail 0
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/jltrabajo/Projects/inversiones-mezcola-company-site; path=5a8bf2e38518/25 entries; EXPECT=matched; output-sha256=a86075031bf4fe86892284edf72f37f5425cae88c84ddd27d84dcc8209539cf9; output-bytes=1674

- [x] G3: Production localized routes compile successfully.
  CHECK: pnpm build
  EXPECT: Finalizing page optimization
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/jltrabajo/Projects/inversiones-mezcola-company-site; path=5a8bf2e38518/25 entries; EXPECT=matched; output-sha256=5a32f639df1996a02c785f62c8339e04d3f326d1fb70b942ef1801e7c7795901; output-bytes=936

- [x] G4: Source passes TypeScript and lint without warnings.
  CHECK: node scripts/verify-quality.mjs
  EXPECT: QUALITY_PASS
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/jltrabajo/Projects/inversiones-mezcola-company-site; path=5a8bf2e38518/25 entries; EXPECT=matched; output-sha256=92f5ddffaf02519bbae933e195c8a30c186d2d96328f9349bc79859544bb3040; output-bytes=13

- [x] G5: Generated motion geometry, decoded memory bound and video duration/faststart are valid.
  CHECK: python3 scripts/verify-media.py
  EXPECT: MEDIA_PASS
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/jltrabajo/Projects/inversiones-mezcola-company-site; path=5a8bf2e38518/25 entries; EXPECT=matched; output-sha256=3943e86cbb8f5048232ed39f93a085068625a866f395f0e74f935edfc016ab6c; output-bytes=77

- [x] G6: All seven first-pass transitions render current pixels in cold mobile Chromium, offline-after-preparation WebKit and delayed-start desktop Chromium.
  EVIDENCE: final-browser-run.txt BROWSER_INTEGRATION_PASS; WebKit native/Image fallback offline all7 current opaque/nonblack frames, reduced-motion/resize/idle PASS; desktop all7 native ended events and final-contact with2200ms response delay; chromium-cold-mobile.json all7 at200KB/s+120ms.

- [x] G7: Independent source review resolves release blockers and records limitations.
  EVIDENCE: reviews/2026-10-19-first-scroll.md; independent Claude follow-up PASS after three fixes,16 regression tests. Physical iPhone remains declared unverified.

- [x] G8: Source and diagnostics are reviewable and production publication state is explicit.
  EVIDENCE: codex/fix-mobile-first-scroll-20261019 source diff, docs/first-scroll-diagnosis.md and docs/first-scroll-repair.md; production remains unchanged, no merge/deployment.
