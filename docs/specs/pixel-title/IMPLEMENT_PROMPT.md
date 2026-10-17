# Implement: pixel notebook title

Implement `docs/specs/pixel-title/SPEC.md` in the Baby Teeth repository at `C:\Users\chase\OneDrive\Documents\ChatGPT\anna-blog`. The spec is authoritative and the owner has settled its decisions. Do not reopen them.

## Checkout

At handoff (2026-10-17) the branch was `codex/repository-publishing` at `ea45410`, which equals `origin/main`, with a clean tree. Recheck the branch, HEAD, status and `origin/main` before editing. The owner saves drafts through the studio, so `origin/main` may have moved; rebase only your own unpushed commits. Preserve any unrelated work.

Tooling:
- The system `git` and Node 20 on PATH are not usable for this repo.
- Use `C:\Users\chase\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe`.
- Use Node 24 from `C:\Users\chase\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`.
- Run Wrangler through that Node: `node node_modules/wrangler/bin/wrangler.js`. It is already logged in.

## Read first

- Root `AGENTS.md`, `src/AGENTS.md`, `shared/AGENTS.md`, `blog/AGENTS.md`, `docs/agent-maintenance.md`.
- Then `docs/specs/pixel-title/SPEC.md`, and `docs/specs/blank-titles/SPEC.md` (blank titles must keep working).
- Inspect:
  - `shared/notebook.css` lines 5–7 (the header rules)
  - `shared/notebook-renderer.js` (`measureNotebook` title-font load and the 104.5px title check)
  - `src/main.js` (`showFit` "Retry fonts")
  - `src/page-composition.js` (the editor header)
  - `shared/book/theme.css` (the Kalam, Gelasio and `'VT323'` woff2 faces)
  - `shared/book/desk.css:1` (the MP3 VT323 ttf face)
  - `scripts/verify-notebook.mjs`
  - `tests/blog-build.mjs`, `tests/public-browser.mjs`, `tests/desktop-contract.test.js`

## Owner decisions (summary; the spec has detail)

1. The title and date on each entry's first notebook page use **VT323**, the MP3 screen font.
2. This applies only in the public book and the studio editor header, the same canonical renderer. Reading mode, the archive, RSS, the tab title and the studio `#title` typing box are unchanged.
3. It is one site-wide style for every entry. There is no per-entry option and no document field.
4. The title is **52px on 52px lines**. The two-line limit (104.5px) and the header geometry are unchanged.
5. The date is **28px on 32px lines** at its existing position.
6. Keep the ink color. Do not use LCD colors.
7. The fallback for missing characters is **Georgia/Gelasio**, never a handwriting font. Add no new font files.
8. Nothing else changes: no format/version migration, the same IDs/URLs.
9. Deployment is pre-authorized once all local checks pass.

## Order and gates

1. Change the header CSS.
2. Switch the canonical title-font load in `measureNotebook` and the studio "Retry fonts" to VT323 at 52px. Use the existing `theme.css` woff2 face.
3. **G1:** VT323 must actually load in the studio, the book and `scripts/verify-notebook.mjs`. If it doesn't, fix the stylesheet import. Never skip the font check.
4. Update tests:
   - a contract test for the header CSS
   - fixture build checks: a two-line title passes, a three-line title fails `'title'` if the fixture can express it, and a blank title passes
   - a public-browser computed-font check
5. **G2:** if a title that fits at 52/52 measures over 104.5px, stop, report the measurements and ask. Do not change the size or limit yourself.
6. Take screenshots of titled and blank-titled first pages in the book and the studio. Save them under `test-results/` for the owner.
7. Update docs:
   - `BLOG-SPEC.md` (new decision section)
   - `BBYTEETH-DESIGN-SPEC.md` (mark the Kalam title rule superseded)
   - `docs/desktop-scrapbook-spec.md`
   - the `shared/AGENTS.md` "self-hosted Kalam" header wording
   - the evidence in `docs/desktop-scrapbook-verification.md`
   - the spec status
8. **G3 (deploy):**
   - Commit.
   - Fetch, and confirm `origin/main` is an ancestor of HEAD.
   - Push `HEAD:main` with no force.
   - Wait for the Publish blog run for that SHA to succeed and the live `https://chief-teef.github.io/baby-teeth/revision.json` to show it.
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
- the studio browser suites against local Vite at `127.0.0.1:5175`: `tests/cloud-browser.mjs`, `tests/desktop-pages.mjs`, `tests/desktop-text.mjs`
- `node tests/cloud-csp.mjs`

Then rebuild real content with `npm run build:blog` and confirm draft/trash exclusion. Label all evidence as local, simulated or live.

Known: `tests/studio-shell.mjs` already fails at its bold-toolbar step on unchanged code. Report it; don't treat it as caused by this change unless it is.

Do not:
- publish synthetic test entries or media to the real repository
- force-push
- create paid resources
- load remote fonts or relax CSP
- print or commit credentials
- weaken auth/CSRF/receipt/revision protections
- deploy with `SCRAPBOOK_WRITES_ENABLED` left false

## Final report

- the changed files
- every check run, with its result
- the G1 and G2 results
- the screenshot paths
- the commit SHA, the Publish run URL, the Worker version ID and the live verification results
- remaining limitations (no real iPad/device evidence; the visual judgment is the owner's)
