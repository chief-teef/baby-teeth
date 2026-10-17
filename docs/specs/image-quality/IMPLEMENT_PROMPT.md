# Implement: full-quality transparent PNGs

Work in the Baby Teeth repository at `C:\Users\chase\OneDrive\Documents\ChatGPT\anna-blog`.

Implement `docs/specs/image-quality/SPEC.md`. It is authoritative and its decisions are settled by the owner. Do not reopen them.

## Checkout

At handoff (2026-10-16) the branch was `codex/repository-publishing` with a clean tree. `git` was not on PATH in the handoff shell, so locate it, then recheck branch, HEAD, and status before editing. Preserve all unrelated work. Do not reset, force-push, or create a worktree without checking the existing state first.

## Read first

Root `AGENTS.md`, `src/AGENTS.md`, `shared/AGENTS.md`, `worker/AGENTS.md`, `docs/agent-maintenance.md`, then `docs/specs/image-quality/SPEC.md`, `docs/desktop-scrapbook-spec.md` §3.6, the "PNG runtime/resource gate" section of `docs/desktop-scrapbook-verification.md`, `BLOG-SPEC.md` (photo storage), and `SETUP.md`.

Inspect `shared/png.js`, `src/cloud.js` (`pngForUpload`, `jpegFromImage`), `src/photo-processing.js`, media save/hydration in `src/main.js`, `worker/index.js` (`/api/assets`), `worker/security.js` (`base64`, `limitedBody`), `scripts/build.mjs` (Sharp media validation), and the tests `tests/desktop-media.test.js`, `tests/desktop-media-fixtures.js`, `tests/desktop-media-workerd.mjs`, and `tests/desktop-media-browser.mjs`.

## Owner decisions (summary; the spec has detail)

1. PNG only; JPEG/WebP unchanged (re-check one JPEG for regressions).
2. PNG max side 1600 px, never upscaled.
3. Split validation: the Worker does cheap structural checks only (no IDAT inflate). The full decode runs in the GitHub Actions publish build, which must reject bad PNGs before anything is public.
4. Every PNG stays PNG; alpha is preserved; no matte or JPEG conversion.
5. 3 MB cap per processed PNG; oversize results step down in dimensions, never format.
6. No migration of existing 512 px PNGs.
7. The studio shows storage used, with a non-blocking warning at 500 MB.
8. Local build and verification first; ask before any deploy.

## Order and gates

1. **G1 first:** measure worst-case 3 MB / 1600² PNG upload CPU in the local workerd harness (structural checks + Git blob SHA + base64) before changing production constants. If it is over 10 ms, drop the Worker's per-chunk JS CRC (the build validates it) and remeasure. If it is still over, STOP: report measured CPU at several sizes and ask the owner before lowering the 3 MB or 1600 px bound.
2. Implement the shared limits, browser encoder bounds, the structural-only Worker path, and the build decode bounds, as one owner.
3. **G2:** make sure the build rejects inflate bombs, truncated IDAT, invalid filters, and size mismatches. If Sharp misses any of them, add an explicit build-time inflate check.
4. Add the storage meter and the 500 MB warning.
5. Update tests, then update the docs listed in the spec's Work plan step 5.
6. **G3:** produce DPR 1/2 screenshots at 330 px and an enlarged box, covering opaque, transparent, and semi-transparent-edge PNGs, for the owner to review.
7. **G4:** do NOT deploy the Worker or the public site. Ask the owner for deployment authorization after reporting.

## Checks

Run `npm test`, `npm run test:server`, `node tests/desktop-media-workerd.mjs`, the focused media browser suite (start the local Vite server it expects), the editor build, and the fixture-backed blog build and browser checks. Then rebuild with real content. Confirm draft/trash media stays out of public output. Label all evidence as local, simulated, or live.

Do not: deploy, write synthetic entries or media to the live repository, create paid or billable resources, enable R2, print or commit credentials, or weaken auth/CSRF/receipt/revision protections.

## Final report

List the changed files, every check run with its result, the G1 CPU measurements, the G3 screenshot paths, any blocked item and its measured limit, and the remaining limitations (no real iPad/device evidence; local workerd is not production proof). Then ask for deploy authorization.
