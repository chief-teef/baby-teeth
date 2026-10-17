# Independent review prompt

Work in the Baby Teeth repository at `C:\Users\chase\OneDrive\Documents\ChatGPT\anna-blog`.

Independently review and revise `docs/specs/r2-media-storage/SPEC.md`. This is a specification review only: do not implement production code, configure Cloudflare, create an R2 bucket, deploy, migrate media, or write live content.

Read root `AGENTS.md`, relevant scoped guidance in `src/AGENTS.md`, `shared/AGENTS.md`, and `worker/AGENTS.md`, then read:

1. `docs/specs/r2-media-storage/SPEC.md`
2. `docs/specs/image-quality/SPEC.md`
3. `docs/desktop-scrapbook-spec.md` section 3.6
4. `BLOG-SPEC.md`
5. `docs/desktop-scrapbook-verification.md`, especially the PNG runtime/resource gate
6. `SETUP.md`
7. `docs/agent-maintenance.md`

Inspect the current media implementation and its callers/tests, especially `src/photo-processing.js`, `src/cloud.js`, media save/hydration in `src/main.js`, `shared/png.js`, media parsing in `shared/document.js`, `worker/index.js`, `worker/security.js`, `scripts/build.mjs`, `.github/workflows/publish.yml`, `wrangler.jsonc`, and focused media/public/recovery tests.

User intent: externally store enough sharp PNGs to avoid current Worker PNG CPU limits and Git repository growth while retaining a free, ad-free blog. PNG transparency, orientation, local recovery, cloud reload, public quality, stable documents, atomic saves, authentication, CSRF, revision conflicts and draft/trash privacy must remain correct. “As many as I want” means a practical large free allowance with a safe capacity stop, not unbounded or billable storage.

Challenge the proposal rather than merely polishing it:

- Verify current Cloudflare R2 free-tier, direct-upload, CORS, binding, public-serving and billing facts using official documentation.
- Determine the smallest secure architecture that keeps large image bodies off the 10ms Worker path without weakening validation.
- Resolve whether publication-time GitHub Actions validation is sufficient and how a failed asset is prevented from becoming publicly readable.
- Choose one durable authority for published-media eligibility that cannot diverge from the exact deployed revision or leak draft/trash assets.
- Check whether presigned S3 URLs require new dependencies/secrets that a Worker R2-binding upload-session design can avoid; do not add machinery without benefit.
- Check object-key/checksum semantics, confirmation races, replay/idempotency, quota reservations, upload abandonment, rollback, unpublish/trash, caching, CSP and failure recovery.
- Challenge the proposed 8MB/12MP/4096px bounds and 8GB high-water mark. Keep them proposals unless evidence makes them safe; preserve 2x quality at 330px width for portrait PNGs when source detail exists.
- Verify that the proposed `r2/<sha256>.<ext>` reference is compatible with current document validation/readers and define the reader-first rollout precisely. Avoid a schema version change unless evidence requires one.
- Ensure old Git-backed media remains readable and no eager migration is necessary.
- Check that “private bucket” and the public Worker route are workable without a custom domain and without relying on rate-limited `r2.dev` production traffic.
- Preserve the checkout's unrelated text-drag changes and existing spec artifacts. Recheck branch, HEAD and status before edits; do not reset or create a worktree without first checking task artifacts.

Two product decisions remain intentionally unresolved. Keep the spec blocked and request the owner's choice if they cannot safely be defaults:

1. A zero-charge upload hard stop, proposed at 8GB beneath R2's 10GB-month free allowance.
2. Publication/update waiting for asynchronous GitHub Actions validation, consistent with the existing deployment wait.

Review the parallel ownership plan for shared-file conflicts, sequencing, race conditions and missing integration checks. One coordinator must own shared media references, receipts, configuration, eligibility and integration. Production lanes may begin only after that contract is acknowledged. Prefer fewer moving parts and the existing save/deployment patterns.

Deliverables:

1. Revise `docs/specs/r2-media-storage/SPEC.md` directly so it becomes the single authoritative proposal. Remove contradictions and label facts, assumptions, owner decisions and implementation gates accurately.
2. Create `docs/specs/r2-media-storage/IMPLEMENT_PROMPT.md` containing a complete, self-contained prompt for a fresh implementation chat. If a material owner decision remains unresolved, begin that prompt with the specific decision gate and forbid dependent production changes until resolved.
3. Do not create another review prompt.
4. Finish with a brief material-change summary and remaining blockers.

The implementation prompt must instruct the next chat to execute the reviewed parallel lanes where delegation is available and permitted, with the same sequence as a fallback; preserve unrelated work; implement the entire authorized scope; run actual unit/server/media browser/Miniflare/editor/blog/public checks; distinguish local from provider evidence; avoid synthetic live content; and not deploy, create billable resources or mutate production without explicit authorization.
