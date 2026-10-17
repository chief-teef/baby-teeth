# Image quality in the scrapbook editor

## Status

- **Implemented (fact):** JPEG/WebP photos are processed once in the browser (≤1600 px long edge, JPEG) and the same bytes are reused through cloud save/reload.
- **Proposed (owner-approved 2026-10-16):** full-quality transparent PNGs up to 1600 px / 3 MB on the free stack. The deep PNG decode check moves from the Worker to the GitHub Actions publish build. The studio also gets a storage-usage meter.
- **Gated:** the larger PNG bound is final only after it is measured inside the local Workerd 10 ms CPU budget (Gate G1). Not deployed. Deployment needs separate owner authorization (Gate G4).
- **Implemented locally (2026-10-16):** G1 passed (6.25 / 8.44 ms process CPU) after an owner-approved lean Worker path: native framed-body read, no Worker CRC, zero-copy, string-built base64 body. G2: Sharp missed several negatives, so the build runs the shared full `cleanPng` decode. G3 sheets await owner review. G4 is not started. Evidence is in `docs/desktop-scrapbook-verification.md`.

## Outcome

Owner, 2026-10-16: "I don't like how my png images are pixelated when I put them in the editor. I need full quality without it becoming paid. I also need transparent backgrounds where applicable."

Acceptance baseline: a PNG placed at the default 330-canonical-px width looks sharp at DPR 2 in the editor, after local recovery, after cloud save/reload, and in the published reader. Any source ≥660 px wide keeps at least 660 px of intrinsic width. Transparency, including semi-transparent edges, survives every stage. No paid plan or service is involved.

## Decisions

1. **Scope is PNG.** JPEG/WebP behavior stays as implemented; the implementer re-checks one JPEG for regressions. *Default*
2. **PNG max side is 1600 px**, matching JPEG. No upscaling; smaller sources keep their size. *Default*
3. **Split validation.** The Worker performs only cheap structural checks on PNG uploads and skips the full IDAT inflate. The full decode runs in the GitHub Actions publish build with the existing Sharp step, before anything becomes public. This was chosen because the Workers Free 10 ms CPU budget cannot absorb a full 1600 px RGBA inflate. Rejected alternatives: keeping the Worker inflate and remeasuring (≈600–700 px, too little gain) and lossy palette quantization (banding, rough alpha). *Default*
4. **Every PNG stays PNG.** Alpha is kept where present. Opaque PNGs (screenshots, line art) also stay lossless PNG. PNGs are never matted, flattened onto white, or converted to JPEG. *Default*
5. **3 MB per processed PNG.** Oversize results step down in dimensions (existing ×0.8 retry pattern) until they fit. They are never converted. *Default, subject to G1*
6. **No migration of existing PNGs.** Older PNGs are stored only as 512 px derivatives, so the originals cannot be recovered from the blog. The owner re-adds the ones that matter from their originals. *Owner decision*
7. **Storage meter.** The studio shows approximate repository/media storage used and shows a non-blocking warning at 500 MB. Saving continues. *Default*
8. **Rollout.** Build and verify locally, show the owner sharpness screenshots, then ask before deploying the Worker or the public site. *Default*

## Scope

In scope: `pngForUpload` bounds and retry, shared PNG limits, the Worker PNG upload path, the build-time PNG validation bounds, the storage meter, tests, and the affected docs.

Out of scope or deferred: migrating existing 512 px PNGs; a "replace image keeping position/size" feature (possible later task); cropping and editing controls; R2 or any external storage (see `docs/specs/r2-media-storage/`, still blocked); new formats; tooth-stamp changes beyond inheriting the shared PNG pipeline.

## Current behavior and paths (facts, verified 2026-10-16)

- `shared/png.js:3`: `PNG_MAX_BYTES=300000, PNG_MAX_SIDE=512, PNG_MAX_PIXELS=262144`. `cleanPng` validates chunk order and lengths, computes a JS CRC32 per chunk, enforces IHDR RGBA8 non-interlaced, rejects APNG and unknown critical chunks, strips ancillary chunks, then fully inflates IDAT through `DecompressionStream` and checks the exact size and filter bytes. `encodePng` emits RGBA8 through `CompressionStream`.
- `src/cloud.js:47-50` `pngForUpload`: scales to `PNG_MAX_SIDE`, then retries ×0.8 up to 8 times until it fits under `PNG_MAX_BYTES`. `src/photo-processing.js` calls it at import, so the editor shows the 512 px copy immediately. That is the source of the pixelation.
- `src/cloud.js:42-46` `jpegFromImage`: 1600 px, quality 0.8 → 0.65, ≤700 KB.
- `worker/index.js:90-96` `/api/assets`: `limitedBody(PNG_MAX_BYTES)` → `cleanPng` → `base64(bytes)` → GitHub `git/blobs` → sealed receipt.
- `scripts/build.mjs:32-37`: Sharp decodes published media (`limitInputPixels` 5,760,000 for Git media) and rejects PNGs over `PNG_MAX_*`.
- `docs/desktop-scrapbook-verification.md` § "PNG runtime/resource gate": the local workerd run with 1600² RGBA exceeded the 10 ms CPU allowance.
- Provider limits (official docs, checked 2026-10-16): Workers Free gives 10 ms CPU per request, 128 MB memory, and a 100 MB request body. GitHub Pages limits the published site to 1 GB, recommends at most 1 GB for the source repo, and has a 100 GB/month soft bandwidth limit. GitHub repositories should ideally stay under 1 GB and are strongly recommended to stay under 5 GB; files over 100 MiB are blocked.

## Constraints

- Free plans only: Workers Free, GitHub Pages/Actions, no Cloudflare Images or other billable integration.
- Keep the 35 MB input guard and the 80-million decoded-pixel guard. Strip metadata before upload. Never upscale.
- The Worker must still reject non-PNG/JPEG MIME types, wrong signatures, malformed or out-of-order chunks, IHDR other than static non-interlaced RGBA8, dimensions above the new bound, APNG/unknown critical chunks, and trailing bytes. Only the full inflate (and, if G1 requires, per-chunk CRC) moves to the build.
- Unvalidated-in-Worker bytes must never become public without passing the build's full Sharp decode. A failing asset fails the publish build, and the deployed site stays on its prior revision. Drafts and trash remain excluded from public output.
- Keep media paths (`media/<git-blob-sha>.png`), receipts, atomic asset/document saves, revision conflicts, auth/CSRF, local recovery, document version, and stable IDs/URLs unchanged.
- Keep the existing CSP. Do not add a `connect-src data:` relaxation.

## Gates

- **G1 (CPU):** the worst-case accepted 3 MB / 1600² PNG upload must run within 10 ms CPU in the local workerd harness (`tests/desktop-media-workerd.mjs`), counting structural checks, Git blob SHA, and `base64` for the GitHub request. If it exceeds the budget, first drop per-chunk JS CRC from the Worker (Sharp/libpng validates CRC at build time) and remeasure. If it still exceeds, **stop and report the measured CPU at several byte sizes** to the owner before lowering the 3 MB cap or the 1600 px side.
- **G2 (build decode):** the publish build must reject the negative fixtures that the Worker no longer inflates (inflate bomb, truncated IDAT, invalid filter, size mismatch). If Sharp misses any of them, add an explicit inflate check to the build rather than accepting the gap.
- **G3 (visual):** owner review of DPR 1/2 screenshots at 330 px and an enlarged box, for opaque, transparent, and semi-transparent-edge PNGs.
- **G4 (deploy):** do not deploy the Worker or the public site without explicit owner authorization after G1–G3.

## Verification

- Unit/Node: `npm test`, `npm run test:server`. Update `tests/desktop-media.test.js` and `tests/desktop-media-fixtures.js` for the new bounds, the structural-only Worker path, and the build-time negatives.
- Local workerd: `node tests/desktop-media-workerd.mjs`, with CPU numbers recorded in `docs/desktop-scrapbook-verification.md` (G1). This is not proof of production behavior.
- Browser: extend `tests/desktop-media-browser.mjs` with import → recovery → mocked upload/reload. Assert intrinsic dimensions, PNG type, alpha preserved, a single encode, and no matte. Take screenshots at DPR 1/2.
- Build/public: run the fixture-backed blog build; confirm that bad PNGs fail the build and good ones are copied byte-identical. Afterwards, rebuild with real content. Confirm draft/trash exclusion.
- Storage meter: test the display and the 500 MB warning with mocked sizes; saving must not be blocked.
- Label every result as local, simulated, or live. Desktop emulation is not iPad or real-device evidence.

## Work plan

One owner for production code. The pipeline is coupled across `shared/png.js`, `src/cloud.js`, `src/photo-processing.js`, `worker/index.js`, and `scripts/build.mjs`.

1. Measure G1 first, using candidate bounds in the workerd harness before changing production constants.
2. Implement the shared limits, the browser encoder bounds, the Worker structural-only path, and the build decode bounds.
3. Add the storage meter. Use the GitHub repo `size` field or the summed media sizes; *assumption:* the API's repo size is approximate and cached, which is acceptable for a soft warning.
4. Tests (a separate test-only lane is allowed after step 2's contract is fixed).
5. Docs: update `docs/desktop-scrapbook-spec.md` §3.6, `docs/desktop-scrapbook-verification.md`, the `src/`/`shared/`/`worker/` AGENTS PNG bullets, `BLOG-SPEC.md` photo storage, and `SETUP.md` if the operational behavior changes.
6. Present the G3 screenshots and ask for G4.

## Definition of done

PNGs up to 1600 px / 3 MB (or the owner-approved G1 fallback) keep full quality and transparency through import, recovery, cloud save/reload, and publication. The Worker stays within Free CPU, verified locally. The build rejects malformed PNGs before publication. The storage meter warns at 500 MB. All checks are reported with their evidence level, the docs are updated, and nothing has been deployed without authorization.
