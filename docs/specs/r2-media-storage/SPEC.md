# R2 media storage for Baby Teeth

## Status and decision gate

**Reviewed and owner-approved proposal. Reader compatibility is implemented locally; provider activation is blocked by the verified checksum and zero-charge limitations below.**

The confirmed outcome is to keep many sharp PNGs outside Git, avoiding the current Workers Free PNG-processing limit and repository growth while retaining a free, ad-free blog. “As many as I want” means a practical free allowance with a hard capacity stop, not unlimited or billable storage.

Owner decisions:

1. Enforce a zero-charge policy with a hard stop at **8,000,000,000 accounted bytes**, below R2 Standard's 10 GB-month free allowance. If accounting, provider terms, account-wide usage or operation usage cannot be proven safely below free allowances, reject new R2 work rather than risk a charge.
2. Keep Publish, Save & update site, Unpublish and published-entry trash asynchronous. They complete only after GitHub Actions validates and deploys the exact revision.

If approved, this supersedes only the repository-storage and Workers-PNG-validation portions of `docs/specs/image-quality/SPEC.md`. Its visual-quality requirements remain authoritative. Existing Git-backed media remains supported without migration.

## Verified facts and proposals

### Provider facts verified October 16, 2026

- R2 Standard includes 10 GB-month storage, one million Class A operations, ten million Class B operations and free internet egress monthly. Usage above those amounts is billable; the allowance is not a provider hard stop. Infrequent Access is excluded. [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- An R2 binding performs `put()` inside the Worker. Cloudflare directs browsers that must bypass the Worker body path to presigned S3 `PUT` URLs. Presigning requires a bucket-scoped Access Key ID/Secret; `aws4fetch` is Cloudflare's lightweight documented JavaScript option. [Upload objects](https://developers.cloudflare.com/r2/objects/upload-objects/), [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [aws4fetch](https://developers.cloudflare.com/r2/examples/aws/aws4fetch/)
- Browser presigned uploads require bucket CORS. CORS is not authorization; a presigned URL is a bearer credential for one operation/key until expiry. Signing `Content-Type` binds it. [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- Buckets are private by default. `r2.dev` is rate-limited and for development. This design enables neither public-bucket option; it serves eligible objects through the existing `workers.dev` Worker and private binding. [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [limits](https://developers.cloudflare.com/r2/platform/limits/)
- R2 metadata exposes stored checksums, size, type and ETag; binding writes support SHA-256 integrity checks. Direct S3 upload must prove equivalent signed-checksum storage before writes ship. [Workers R2 API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- R2's S3 compatibility table marks full-object SHA-256 unsupported for `PutObject`; SHA-256 is supported only as a composite checksum. This does not prove the required one-request presigned upload produces the stored SHA-256 used by confirmation, so direct writes remain disabled. [S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- Cloudflare's free allowance is not a hard cap. R2 usage above the allowance is billable, while budget alerts are informational and do not pause usage. The application can fail closed below its own counters, but cannot guarantee account-wide zero cost when unrelated activity or provider-side accounting is outside its control. [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/)
- SQLite-backed Durable Objects are available on Workers Free and provide strongly consistent transactional storage. They are the proposed minimal atomic quota coordinator; KV is not a safe compare-and-set ledger. Actual-account limits remain an activation check. [Durable Objects storage](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)

### Current repository facts

- `src/photo-processing.js` creates the durable data URL; PNG immediately uses the 512 px / 300 KB path.
- `src/cloud.js` uploads bodies to `/api/assets`. `src/main.js` preserves local bytes and receipt state while saving a media reference in the snapshot.
- `worker/index.js` authenticates, applies origin/CSRF/rate checks, validates bytes, stages Git blobs and issues user/path/expiry-bound receipts. Git assets and document save are atomic and revision-sensitive.
- `shared/document.js` accepts only `media/<40 lowercase hex>.(jpg|png)`; the Worker/build share its parser.
- `scripts/build.mjs` selects published documents, validates with Sharp, copies only referenced assets and writes `revision.json`. The workflow deploys only after that build passes.
- Local recovery retains data URLs and upload receipts; deployed readers know only Git media.

### Proposals requiring evidence

- Processed ceiling: 8 MiB, 12 million decoded pixels and 4096 px per side. These are test bounds, not approved facts. Keep the existing 35 MB source-file and 80-million source-pixel guards.
- Capacity stop: 8,000,000,000 accounted bytes. This is approved, but R2 bills average daily peak GB-month; activation must also verify account-wide usage and current terms. Uncertainty fails closed.
- Presigned `PUT`: at most five minutes, one content-addressed key, exact MIME and exact byte length/checksum where signing supports them.
- Publication copies only validated, currently published R2 assets into the Pages artifact. Public reads therefore consume no R2 Class B operations and require no public Worker route.

## Scope and durable media contract

Included: browser processing; direct private upload; authenticated hydration; atomic reservations; receipts; exact-deployment validation and Pages copying; dual-reference compatibility; focused tests. Excluded: Cloudflare Images, public buckets, public Worker media delivery, `r2.dev` production traffic, paid transforms, Infrequent Access, custom-domain purchase, originals, new formats/video/cropping/UI, eager migration and destructive garbage collection.

Accept exactly:

```text
media/<40-lowercase-hex>.(jpg|png)   # existing Git blob SHA
r2/<64-lowercase-hex>.(jpg|png)      # SHA-256 of final bytes
```

The R2 reference is also its immutable object key; extension and MIME agree. WebP input continues to become JPEG. Photo `src` remains a string, so notebook versions 2/3 and archive envelope 1 do not change. Local `src` remains a data URL; `assetPath`/receipt fields keep their recovery role.

Roll out reader-first: land and deploy dual parsing/resolution everywhere, verify it, then advertise the R2-write capability. No R2 document may be committed before deployed studio/public readers support both forms. Old Git media remains readable; no eager migration is needed.

## Chosen architecture

### Direct upload, confirmation and save

1. The browser processes once, computes SHA-256 over final bytes and retains them in recovery.
2. The Worker checks session, current repository write permission, origin, CSRF, rate limits, key/MIME/size and quota state.
3. A confirmed identical object is reused without reserving bytes. Otherwise one SQLite Durable Object transaction reserves exact bytes under `(user, key, nonce, expiry)`; duplicate retries reuse the reservation and concurrent uploads cannot cross the stop.
4. The Worker signs a five-minute S3 `PUT` for that key/type using bucket-scoped secrets. Use `aws4fetch` unless evidence finds a smaller installed signer. A binding upload is forbidden here because it proxies the large body through the Worker.
5. CORS allows `PUT` and only required headers from the exact production studio origin and explicit local development origins. No wildcard origin/credentials.
6. The browser uploads directly to R2 and never receives reusable credentials.
7. Confirmation uses the binding to require exact key, size, MIME and stored SHA-256. ETag and client claims are not SHA-256. Shipping writes is blocked until a signed checksum header is proven to survive the S3 PUT and appear in R2 metadata; do not fall back to Worker body hashing.
8. One transaction converts the reservation to confirmed bytes exactly once and the Worker returns a sealed user/key/expiry receipt.
9. Exact-revision save accepts a new R2 reference only with that receipt or coordinator-confirmed object, and commits only document/index. Missing/expired proof rejects before mutation.

A replay can target only the same key during its short lifetime. Application state refuses overwriting a confirmed key; checksum proof prevents different bytes receiving a receipt. Authorization never grants list/read/delete/another key.

### Capacity accounting

The single SQLite Durable Object stores only key, bytes, status, nonce/owner and expiry—no images or personal metadata.

- Authorization expires old reservations, deduplicates confirmed keys, and accepts only when `confirmed + active reservations + requested <= high-water`.
- Confirmation is idempotent. Expired/failed attempts release reservations. An uploaded but unconfirmed object stays private and becomes an orphan candidate.
- Failed document save does not delete/subtract a confirmed object because another entry or retry may use it.
- Reconcile conservatively against paginated R2 listings. Drift, coordinator loss or incomplete reconciliation fails closed for new authorizations; never guess usage downward.
- Activation requires checking unrelated account R2 use and that paid overage is not relied upon. Provider alerts are defense in depth, not correctness.

### Publication and the sole public authority

The **currently deployed GitHub Pages artifact** is the only public-media authority. Do not add a Worker public route or KV/R2 promotion ledger.

For one candidate commit, the Actions build selects only published documents, bounds aggregate count/bytes before download, fetches referenced R2 objects with read-only credentials, verifies SHA-256/key/MIME/extension, and fully decodes one static JPEG/PNG with Sharp within approved limits. It rejects missing, malformed, animated, truncated, metadata-bearing or mismatched objects. Each accepted object is copied unchanged to a deterministic path inside `dist-blog`; public HTML references that Pages path. The artifact also contains matching `revision.json` and deterministic `published-media.json` (commit plus sorted keys and non-sensitive type/size/checksum). Any failure prevents deployment, leaving the previous artifact and public assets live.

GitHub Actions validation is sufficient because only its validated published subset enters the deployed artifact. Candidate, draft, trash and orphan assets never enter Pages output. A failed candidate cannot alter the live artifact. Unpublish/trash removes the asset from the replacement artifact unless another published entry references it. Previously downloaded or external-cached public bytes cannot be recalled.

This needs no public R2 endpoint, custom domain or public Worker media route. Keep both bucket public-access switches off. The bucket contains private durable media; GitHub Pages serves only deployed published copies. This also avoids unbounded public R2 Class B reads.

### Studio/readers and CSP

- Authenticated `/api/media/<sha256>.<ext>` rechecks repository write access and streams the private object. The client converts it to the existing data-URL recovery form without re-encoding.
- A shared resolver covers editor preview, physical reader, accessible reading, cover/OG selection, photo viewer/download. The static build resolves both Git and R2 references to copied Pages media. Git references keep current hydration/Pages-copy behavior.
- CSP adds only the exact R2 S3 origin needed for authenticated studio upload; public reading needs no R2/Worker media origin. Never allow arbitrary `https:` or `data:` connections.
- Assets already in IndexedDB reopen offline; first-time offline retrieval remains out of scope.

## Image quality

- Correct EXIF orientation before sizing. Strip EXIF, XMP, comments, PNG text and nonessential metadata.
- Preserve aspect ratio and semitransparent PNG edges. Animated PNG/WebP may become one still only with the existing notice; public validation rejects animation.
- Never upscale. Preserve at least 660 intrinsic **width** for a 330-canonical-pixel portrait placement when available, and test enlarged authored placements separately.
- Ordinary JPEGs should remain near 200–500 KB when quality permits. Detailed/transparent PNGs may be larger; never matte or degrade them merely to meet that target.
- Keep 8 MiB / 12 MP / 4096 px provisional until deterministic browser-memory, import, Actions-decode, upload/reload and visual tests pass, including a high-frequency alpha portrait at 330 px on DPR 1/2. Changed bounds return to the owner before writes are enabled.

## Failure, lifecycle and privacy

- Every failure preserves local bytes/document/export and useful receipts. Async completion never replaces newer authored content.
- Retry interruption/expiry with the same key without reprocessing. Confirmation failure yields no savable reference. Revision conflicts preserve current local media state.
- Quota failure explains approximate accounted/requested bytes. Confirmed assets remain readable/reusable.
- Draft save never changes public output. Publish/update appears only after exact candidate deployment. Failed validation/deploy leaves prior public content/assets live.
- Unpublish or trash removes a copied asset only after successful replacement deployment; shared keys remain while any published entry references them. The private object remains recoverable.
- Release one never deletes objects. Later GC needs separate retention approval and proof across drafts, trash, published state, in-flight saves and recovery. Git history/external caches cannot be erased.
- R2/Worker/GitHub outages leave local editing, recovery and export; cloud status stays truthful.
- Never store/log original filenames, location, post titles, account data, image bytes, credentials, presigned URLs, cookies or secrets.

## Rollout gates

1. Record the approved zero-charge stop and asynchronous publication decisions (done in this revision).
2. Freeze and acknowledge shared path/receipt/checksum/quota/publication/bounds contracts.
3. Land and deploy read-only dual-reference support before writes.
4. Separately authorized setup creates a private Standard bucket, binding, SQLite Durable Object, bucket-scoped write token, Actions read token, exact CORS and secrets. Keep public access off.
5. Verify direct transport, checksum confirmation, quota races, authenticated hydration and public denial with local/staging fixtures.
6. Enable R2 writes behind a distinct capability; leave Git media unchanged.
7. Enable publication only after exact-artifact copying/manifest, failed-build, rollback and unpublish checks pass.

No resource creation, provider configuration, deployment, migration, live-content mutation or billing authorization is granted by this specification.

## Required implementation evidence

- Contract/security: both path forms; traversal/case/URL/type rejection; deterministic hashes; receipt binding; expiry/replay; presigned one-key/method/type/expiry; exact CORS; no secret logging.
- Quota: simultaneous boundary reservations, duplicate authorization, abandonment, double confirmation, restart/loss, reconciliation drift and fail-closed behavior.
- Media/recovery: deterministic JPEG, EXIF JPEG, WebP, opaque/alpha/high-frequency PNG, animation, truncation, mismatch and over-limit fixtures; orientation, alpha, metadata, exact bytes/hash, no upscaling/re-encoding across IndexedDB/export/import/hydration.
- Browser: interruption, expiry, confirmation/quota failure, conflict/retry; screenshots at 330 px DPR 1/2 and enlarged editor/physical/accessibility/viewer placements.
- Worker/Miniflare: local R2 + SQLite Durable Object, authentication, confirmation, receipts, reads, denial, headers/ranges if used; instrument that upload bodies bypass Worker.
- Publication: Actions-equivalent local fixture adapter, Sharp failures, byte-identical Pages copies, matching manifests, draft/trash absence from Pages/RSS/sitemap/notifications/media output, and failed-candidate preservation of the previous deployment.
- Run `npm test`, `npm run test:server`, focused media/recovery/CSP browser suites, new Miniflare/R2/quota suites, editor build, fixture blog build and public browser checks; restore real-content output afterward. Provider acceptance is separately authorized evidence, not implied by Miniflare.

## Parallel ownership and integration

One coordinator exclusively owns shared reference/resolver, receipt/checksum/bounds contract, quota schema, configuration, capability gates, publication manifest, lockfiles, guidance and integration. Production lanes start only after acknowledging that frozen contract.

1. **Coordinator:** shared/read compatibility and tests.
2. **Worker/storage:** storage modules plus coordinated `worker/index.js`/`worker/security.js`; presigning, confirmation, reads, quota and receipts.
3. **Studio:** `src/photo-processing.js`, `src/cloud.js`, coordinated media sections of `src/main.js`; processing, upload, hydration and recovery.
4. **Publication:** `scripts/build.mjs`, helpers and workflow; private fetch, Sharp validation, exact manifest and Pages copies.
5. **Regression:** fixtures/tests after contracts freeze; no interface changes.

Worker/studio receipt state and publication copying are shared coordinator contracts. Integrate once in the order above, then tests/docs. If delegation is unavailable, use the same sequence serially. Preserve unrelated text-drag changes/spec artifacts; do not reset or duplicate integration.

## Zero-charge invariant

“Free” never authorizes paid overage. Before provider activation, verify current Cloudflare terms, actual account-wide R2 storage/operations and any account billing controls. Keep conservative application counters for storage and mutation/read operations initiated by the studio; bound Actions downloads per build and workflow concurrency. If current usage cannot be measured, a counter is inconsistent, an allowance changes, or projected use approaches any free limit, disable new upload/publication work and preserve local recovery. Public Pages reads do not touch R2. No design can control unrelated account activity, so the operational prerequisite is a dedicated/known account scope or verified absence of other R2 consumers.
