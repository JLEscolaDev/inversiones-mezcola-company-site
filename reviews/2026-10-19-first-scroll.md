# First-scroll media — independent review and validation

Reviewer: Claude CLI, read-only. Initial review: FAIL; three identified defects were repaired (cancellation cooldown/re-entry, immediate decoder fallback, progress-driven timeout during playback). Follow-up verdict: **PASS**. Reviewer did not execute browsers; browser results below were independently exercised by the Builder.

Final follow-up text is retained in the CompanIA evidence directory as `reviewer-followup.txt`; initial findings remain in `reviewer-claude.txt`. The first Codex CLI attempt failed at provider/model startup and provided no review clearance.

Validation:16 regression checks; four original-renderer negative controls fail for their intended assertions. TypeScript, lint without warnings, production build, and media geometry/duration/faststart validator pass. Chromium mobile cold200KB/s+120ms renders all seven first-pass transitions. WebKit26.4 renders all seven with network disabled before the first scroll, both native bitmap and HTMLImageElement/object-URL decoder paths. Unsupported decoder fixture falls back to eight static scenes in11ms. Desktop deliberately delays each video response2200ms; native ended events prove all seven clips complete and final-contact is reached.

Review limitations: no physical iPhone, total application/GPU memory or appearance sign-off. Decoded sprite working set132433920bytes under128MiB; the base motion is144px and can appear soft while original900px detail arrives. Startup progress is deliberate (6641ms in the cold Chromium run). Non-blocking follow-up observations: silent playback stalls that omit standard waiting events; future oversized asset geometry must continue to pass the media budget validator. No production deployment or merge is authorized by this review file.

Reviewed critical source fingerprints:

- src/components/MobileScrubStack.tsx: 077c5510de2453e777efe115a5ec08eab0403777d613221e699fe1f52de459e4
- src/lib/sprite-store.ts: cb74c0b899ca6442947cd0ce530be51fa3990ac45183f57010b9a841f19cd5e6
- src/components/TransitionVideo.tsx: 9525fbf9273ed1847e4f080e3ca2189671c0738303e23e406f6079937b2a40b7
