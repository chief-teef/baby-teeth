# Approved decisions

Implement a zero-charge design with a hard stop at 8,000,000,000 accounted R2 bytes. If account-wide storage/operation usage, current free allowances or accounting correctness cannot be verified, fail closed for new R2 work rather than risk a charge. Keep publish, published update, unpublish and published-entry trash asynchronous until GitHub Actions validates and deploys the exact revision. These decisions are recorded in `docs/specs/r2-media-storage/SPEC.md`.

**These decisions are final for this implementation. Do not ask the owner to choose the quota, publication behavior, public-serving architecture or whether to proceed. Use best engineering judgment for ordinary implementation details. Implement and verify the complete local code/configuration changes, but do not create provider resources, deploy, change production secrets/settings, migrate media or mutate live content. Leave provider-dependent capabilities disabled until a separately authorized deployment task.**

# Implementation task

Work in the Baby Teeth repository. Read root and scoped `AGENTS.md`, `docs/specs/r2-media-storage/SPEC.md`, `docs/specs/image-quality/SPEC.md`, `docs/desktop-scrapbook-spec.md` section 3.6, `BLOG-SPEC.md`, `docs/desktop-scrapbook-verification.md`, `SETUP.md` and `docs/agent-maintenance.md`. Treat the reviewed R2 spec and recorded owner decisions as authoritative. Do not promote proposals without their named evidence.

Inspect branch, HEAD, status and task artifacts first. Preserve unrelated work, especially text-drag changes and existing spec artifacts. Do not reset, force-push, create a worktree or overwrite user changes. Never print credentials or presigned URLs.

Implement the full authorized scope:

- Keep Git-backed `media/<40-hex>.(jpg|png)` readable and add reader-first `r2/<64-hex>.(jpg|png)` support without a notebook/archive version change. Deploy/read compatibility must precede an advertised R2-write capability.
- Process media once in the browser, preserving orientation, PNG alpha, metadata removal, no upscaling, local recovery and the 2× quality baseline. Start with 8 MiB / 12 MP / 4096 px and validate them with fixtures. If evidence requires stricter bounds, choose the smallest safe values and document the evidence; do not stop to ask the owner. Never relax those bounds or risk charges without explicit authorization.
- Use a short-lived, one-key presigned S3 `PUT` for browser-to-R2 transport. Do not proxy large bodies through an R2-binding Worker upload. Prefer the documented lightweight `aws4fetch` signer and bucket-scoped Worker secrets. Configure exact-origin CORS only when separately authorized.
- Require exact key, MIME, size and stored SHA-256 at confirmation. ETag/client claims are not SHA-256. If signed checksum storage cannot be proven against R2, stop dependent write work and report the integrity blocker.
- Use one SQLite Durable Object for atomic byte reservations, confirmed-byte accounting, dedupe, expiry and fail-closed reconciliation. Preserve current authentication, repository-write authorization, origin/CSRF, rate limits, receipt binding, revision conflicts and recovery.
- Make the currently deployed Pages artifact the sole public-media authority. Do not add a public Worker media route or KV/R2 promotion ledger.
- The publication workflow fetches only exact-candidate published references using read-only credentials, bounds aggregate work, verifies SHA-256/key/type, fully decodes static JPEG/PNG with Sharp, rejects malformed/animated/truncated/metadata-bearing/out-of-bound assets, copies accepted bytes unchanged into deterministic `dist-blog` media paths, and emits `published-media.json` beside matching `revision.json`. Failure leaves the previous deployment/assets live.
- Keep draft/trash/orphans out of Pages output. Unpublish/trash removes copied assets only after replacement deployment; retain private R2 objects. Do not add destructive GC or eager migration.
- Use one shared resolver for studio preview, physical/accessibility readers, cover/OG, viewer and download. Keep CSP narrow; preserve Git hydration and IndexedDB/export/import behavior.
- Update relevant AGENTS guidance, SETUP, durable decisions and verification documentation per `docs/agent-maintenance.md`; replace contradictions rather than append a progress diary.

# Ownership and sequence

Where delegation is available and permitted, use the reviewed lanes. One coordinator exclusively owns shared references/resolvers, receipts, checksum/bounds, quota schema, configuration, capability gates, publication manifest, lockfiles and integration. Lane owners acknowledge that frozen contract before dependent edits.

Run in this dependency order, concurrently only after contract acknowledgement:

1. coordinator: shared/read compatibility and tests;
2. Worker/storage: presigning, confirmation, authenticated private reads, quota and receipts;
3. studio: processing, direct upload, hydration and recovery;
4. publication: private fetch, validation, deterministic Pages copies and deployed manifest;
5. regression: fixtures and cross-lane failure/privacy tests;
6. coordinator: integrate once, resolve shared-file conflicts, update docs and verify.

If delegation is unavailable, use the same sequence serially. Publication must not invent a second storage authority, nor Worker/studio separate receipt semantics.

# Required verification and evidence

Run actual combined checks:

- `npm test` and `npm run test:server`;
- parser/document/import compatibility for both forms;
- deterministic JPEG, EXIF, WebP, opaque/alpha/high-frequency PNG, animation, truncation, mismatch and bound tests;
- IndexedDB recovery/export/import plus interruption, expiry, confirmation, quota, replay/dedupe and conflict browser flows;
- Miniflare local R2 + SQLite Durable Object tests including concurrent reservations, abandonment, reconciliation failure and authenticated reads;
- instrumentation proving upload bodies bypass the Worker;
- compiled CSP test, editor build and 330 px DPR 1/2 plus enlarged screenshots;
- fixture blog build, Sharp rejection, byte-identical Pages copying, manifest/revision match, failed-build preservation and public browser coverage for both readers, viewer/download, RSS/sitemap/notifications and draft/trash absence;
- real-content rebuild after fixtures.

Distinguish local/Miniflare evidence from actual Cloudflare, R2 CORS/checksum, GitHub Actions and billing evidence. Implement the provider-facing code and configuration locally, using placeholders/disabled capability flags where necessary. Account-wide usage and current allowances are deployment acceptance checks, not reasons to ask the owner another design question. Bound studio operations and Actions downloads conservatively, and fail closed if usage/accounting is uncertain or approaches a free limit. Public Pages reads must not access R2. Do not publish synthetic content. Do not deploy, create buckets/tokens/Durable Objects, enable billable resources, change production secrets/settings, migrate media or mutate live repository content. Leave dependent capability disabled when a provider-only gate is unverified and report that limitation at handoff.

Finish with changed files, checks/results, provider checks not performed and remaining blockers.
