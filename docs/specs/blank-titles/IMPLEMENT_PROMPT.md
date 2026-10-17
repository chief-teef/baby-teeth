# Implement: blank entry titles

Implement `docs/specs/blank-titles/SPEC.md` in the Baby Teeth repository at `C:\Users\chase\OneDrive\Documents\ChatGPT\anna-blog`. The spec is authoritative and the owner has settled its decisions. Do not reopen them.

## Checkout

At handoff (2026-10-17) the branch was `codex/repository-publishing` at `a7c488a`, which equals `origin/main`, with a clean tree. Recheck the branch, HEAD and status before editing, and preserve any unrelated work.

Tooling:
- The system `git` and Node 20 on PATH are not usable for this repo.
- Use `C:\Users\chase\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe`.
- Use Node 24 from `C:\Users\chase\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`. The repo needs Node >=22.12.
- Run Wrangler through that Node: `node node_modules/wrangler/bin/wrangler.js`. It is already logged in.

## Read first

- Root `AGENTS.md`, `src/AGENTS.md`, `shared/AGENTS.md`, `worker/AGENTS.md`, `blog/AGENTS.md`, `docs/agent-maintenance.md`.
- Then `docs/specs/blank-titles/SPEC.md`.
- Inspect every path in its "Current behavior and paths" section, especially:
  - `shared/notebook-format.js` (`assertPublicationGeometry`, `entryDate`)
  - `shared/notebook-renderer.js` (header, canonical fit title check)
  - `src/page-composition.js:38`
  - `src/main.js` (lines ~158, 168, 189, 254, 269)
  - `worker/github.js:22`
  - `blog/src/components/Entry.astro`, `blog/src/pages/archive.astro`, `blog/src/pages/posts/[id].astro`, `blog/src/pages/rss.xml.js`
  - `shared/book/scene.js` (announcement, contents buttons)
  - `scripts/discord-announcements.mjs`
  - `tests/blog-build.mjs`

## Owner decisions (summary; the spec has detail)

1. Blank titles are valid everywhere, including publication. Remove the title requirement from publication validation, from the canonical fit check, and from the studio warning.
2. The notebook header keeps an empty title line and the date. It never collapses, so geometry and fit don't change.
3. Wherever a label is needed, a blank title shows the entry's date and never "Untitled". This covers:
   - archive
   - contents menu
   - reading heading link
   - tab `<title>`
   - RSS
   - screen-reader announcement
   - studio lists
   - trash confirm
   - commit message
4. Discord keeps its wording and uses the date in place of the title.
5. Whitespace-only titles count as blank and are saved as `""`. Never trim while typing.
6. Use the existing `entryDate()` and its house format: publication date in public places, created date for studio drafts.
7. Where a date already sits beside the title, show it once and make it the link or button text.
8. Nothing else changes: no format/version migration, the same IDs/URLs, titled entries unchanged.
9. Deployment is pre-authorized once all local tests pass.

## Order and gates

1. Add one shared label helper beside `entryDate` and use it at every label site. Make the validation/fit changes and the whitespace normalization.
2. Update tests: unit, server, the build fixture with a published blank-titled entry, and browser checks with mocked APIs.
3. **G1:** the fixture build succeeds. Its output (HTML/RSS/sitemap/`notifications.json`) contains no "Untitled" and no empty link/button/heading/tab/RSS title. If it fails, fix it. Never substitute a placeholder word.
4. Update docs: `BLOG-SPEC.md`, `docs/desktop-scrapbook-spec.md`, and stale AGENTS lines (e.g. `worker/AGENTS.md` "reject missing titles"). Record evidence in `docs/desktop-scrapbook-verification.md`.
5. **G2 (deploy):**
   - Commit.
   - Fetch, and confirm `origin/main` is an ancestor of HEAD.
   - Push `HEAD:main` with no force.
   - Wait for the Publish blog run for that SHA to succeed and the live `https://chief-teef.github.io/baby-teeth/revision.json` to show that SHA.
   - Run `npm run build`, then `npm run deploy:worker -- --var SCRAPBOOK_WRITES_ENABLED:true`.
   - Verify signed-out live behavior on `https://baby-teeth-studio.aucourantfilms.workers.dev`: `/` and a compiled asset return the sign-in page, `/api/session` shows writes enabled, and `/api/posts` returns 401.
   - Commit and push the deployment record (docs only).
   - If any step fails, stop and report instead of retrying destructively.

## Checks

Run all of these:
- `npm test`
- `npm run test:server`
- `npm run build`
- `node tests/blog-build.mjs`, then `node tests/public-browser.mjs`
- the relevant studio browser suites against local Vite at `127.0.0.1:5175`: `tests/cloud-browser.mjs`, `tests/desktop-pages.mjs`, `tests/desktop-text.mjs`
- `node tests/cloud-csp.mjs`

Then rebuild real content with `npm run build:blog` and confirm draft/trash exclusion. Label all evidence as local, simulated or live.

Do not:
- publish synthetic test entries or media to the real repository
- force-push
- create paid resources
- print or commit credentials
- weaken auth/CSRF/receipt/revision protections
- deploy with `SCRAPBOOK_WRITES_ENABLED` left false

## Final report

- the changed files
- every check run, with its result
- the G1 assertions
- the commit SHA, the Publish run URL, the Worker version ID and the live verification results
- remaining limitations (no real iPad/device evidence; no live blank-titled entry was published as a test)
