# Pixel notebook title

## Status

- **Owner-confirmed 2026-10-17.** Each entry's first notebook page shows its title and date in VT323, the pixel font of the MP3 player screen.
- **Implemented 2026-10-17.** Evidence: `docs/desktop-scrapbook-verification.md` "Pixel notebook title".

## Outcome

Owner, 2026-10-17: "can we make the title font something else, like pixel font that matches something else on the site? how it appears in the actual book."

Acceptance baseline:

- The notebook header title and date render in VT323 in the public book and the studio editor.
- The header layout and the two-line title limit are unchanged.
- Characters VT323 lacks fall back to Georgia/Gelasio, never a handwriting font.
- Everything outside the notebook header is unchanged.

## Decisions

1. **Font: VT323.** It matches the MP3 player screen, and it is narrow enough that titles still fit in two lines. Press Start 2P was rejected because it is wide and would make long titles wrap or overflow. *Default*
2. **Where:** only the first-page notebook header, in the public book and the studio editor. The editor and the canonical fit check must match the book. *Default*
3. **The date switches to VT323 too**, so the header reads as one unit. *Default*
4. **Site-wide:** one style for every entry, including existing ones. There is no per-entry option and no document field. *Owner decision*
5. **Title size: 52px on 52px lines.** VT323 at 44px looks smaller than Kalam. Two lines are still 104px, so the header geometry and the 104.5px two-line fit limit are unchanged. *Default*
6. **Date size: 28px.** It keeps the existing `top:112px` position and stays inside the 152px header. Line height is 32px. *Default*
7. **Color:** keep the current ink color (`var(--ink)`). Only the font matches the MP3 screen, not its green-on-black LCD look. *Default*
8. **Fallback: Georgia/Gelasio**, the site's existing self-hosted serif, never a handwriting font. Courier New/Cousine was considered and dropped, because the owner only cares that the fallback is not handwriting and Gelasio adds no new font. *Owner decision*
9. **Unchanged:**
   - the studio title typing box (`#title`)
   - reading mode, the archive, RSS and the tab title
   - document format and version, IDs and URLs

   *Owner decision (typing box); default (rest)*
10. **Rollout:** run the full local checks, push to `main` as a fast-forward, wait for Publish blog, and redeploy the Worker with `SCRAPBOOK_WRITES_ENABLED:true`. Then verify live. No further owner approval is needed unless a check fails. *Owner decision*

## Scope

In scope:

- the notebook header CSS
- the canonical title-font load in fit measurement and the studio "Retry fonts" action
- making sure VT323 is loaded by every surface that renders or measures the header: the book, the studio and `scripts/verify-notebook.mjs`
- tests and docs

Out of scope:

- per-entry title fonts
- LCD colors or effects
- reading-mode, archive, RSS and tab typography
- the studio's other Kalam uses (the brand and the sidebar heading)
- the studio title input
- header layout changes

## Current behavior and paths (facts, verified 2026-10-17 at `ea45410`)

- `shared/notebook.css:6`: `.notebook-header h2{font:400 44px/52px Kalam,Georgia,serif;...}`
- `shared/notebook.css:7`: `.notebook-header time{position:absolute;top:112px;left:0;font:400 24px/32px Kalam,Georgia,serif}`
- `shared/notebook.css:5`: the header is absolute, 54px from the left and 48px from the top, 792×152px.
- `shared/notebook-renderer.js:18` (`measureNotebook`):
  - It loads `'44px Kalam'` with the trimmed title (or `'bbyteeth'`) and throws "Title font unavailable." if no face is found.
  - Line 25 fails `'title'` when the rendered `h2` has `scrollHeight>104.5`.
  - The `h2` is omitted for blank titles.
- `src/main.js:255` (`showFit`): "Retry fonts" calls `document.fonts.load('44px Kalam')`.
- `src/page-composition.js:38,50`: the editor header is built from DOM elements and uses the shared `.notebook-header` CSS.
- VT323 faces exist twice:
  - `shared/book/theme.css:76` declares `'VT323'` from `public/editor/fonts/vt323.woff2` (17,936 bytes, `font-display:block`). The registry text font uses it.
  - `shared/book/desk.css:1` declares `VT323` from `public/book/VT323-latin.ttf` (93,596 bytes, U+0020-007E and U+00A0-00FF) for the MP3 screen.
- `shared/book/theme.css` declares Kalam and Gelasio. It is imported by `shared/notebook.css` and `scripts/verify-notebook.mjs`.
- `src/notebook-studio.css:8,11`: the studio brand and sidebar heading use Kalam. They are out of scope.
- The repository has no published entries (one draft), so no live title can start failing fit.

## Constraints

- **Canonical fit:** the editor, the reader and `scripts/verify-notebook.mjs` measure with the same self-hosted fonts. Font-load failure blocks the fit proof but keeps drafts recoverable (`shared/AGENTS.md`).
- **No new font files:** reuse an existing self-hosted VT323 face and the existing Gelasio. Do not load remote fonts or relax CSP.
- **Compatibility:** no document migration or format change; stable IDs and URLs.
- **Blank titles** keep working (`docs/specs/blank-titles/SPEC.md`). A blank header still omits the `h2` and shows only the date.
- **Escaping and accessibility:** keep escaping of rendered text and keep the semantic `h2` and `time` elements.
- **Publishing:** drafts and trash never enter public output. Free plans only. Never print credentials.

## Gates

- **G1 (fonts load everywhere):**
  - `measureNotebook` must actually load VT323 in the studio, the book and `scripts/verify-notebook.mjs`. Use the `theme.css` woff2 face so every surface that imports `theme.css` gets it.
  - If a surface cannot load VT323, fix the stylesheet import. Never fall back to skipping the font check.
- **G2 (fit unchanged for realistic titles):**
  - In the fixture build, a two-line title that fits passes.
  - A title long enough to need three lines at 52px still fails with `'title'`.
  - A blank title still passes.
  - If the 52/52 metrics put a fitting title over 104.5px, report the measurement and ask before changing the size or limit.
- **G3 (deploy):** the same as `docs/specs/blank-titles/SPEC.md`. Use a fast-forward push only and wait for a successful Publish blog run whose live `revision.json` shows the commit. Then run `npm run deploy:worker -- --var SCRAPBOOK_WRITES_ENABLED:true`. If any step fails, stop and report.

## Verification

- **Unit/Node:** `npm test` and `npm run test:server`. Add or adjust a contract test asserting the header CSS uses VT323 at 52px/52px and 28px/32px with a Georgia/Gelasio fallback, and no Kalam.
- **Build (local):**
  - Run `node tests/blog-build.mjs`, including a G2 overflow negative if the fixture can express it.
  - Then run `node tests/public-browser.mjs`.
  - In the public book, assert the computed font-family of the `.notebook-header h2` and `time` starts with VT323 and that `document.fonts.check('52px VT323')` is true.
  - Rebuild real content with `npm run build:blog` afterwards.
- **Browser (local, Edge/Chrome, mocked APIs):**
  - Run `tests/cloud-browser.mjs`, `tests/desktop-pages.mjs` and `tests/desktop-text.mjs` against Vite at `127.0.0.1:5175`.
  - The studio header shows VT323.
  - The `#title` input font is unchanged.
- **Regression:** `npm run build` and `node tests/cloud-csp.mjs`.
- **Visual:**
  - Take screenshots of a titled first page and a blank-titled first page in the book and in the studio. Save them under `test-results/`.
  - The owner judges the look. Desktop emulation is not iPad evidence.
- **Live (after G3):**
  - The Publish run succeeds and `revision.json` matches.
  - The Worker's signed-out gates hold: `/` and a compiled asset show sign-in, `/api/session` reports writes enabled, and `/api/posts` returns 401.
  - Do not publish test entries.
- Label evidence as local, simulated or live.

## Work plan

One owner; the change is small and coupled through the shared header CSS and fit measurement.

1. Change the `shared/notebook.css` header rules (Decisions 1, 3, 5–8).
2. Switch the canonical title-font load in `measureNotebook` and the studio "Retry fonts" to VT323 at 52px. Confirm the face resolves through `theme.css` (G1).
3. Tests and screenshots (G2).
4. Docs:
   - `BLOG-SPEC.md` (new decision section)
   - `BBYTEETH-DESIGN-SPEC.md` (mark the Kalam title rule as superseded)
   - `docs/desktop-scrapbook-spec.md`
   - `shared/AGENTS.md` ("self-hosted Kalam after fonts load" becomes VT323 for the header)
   - the evidence in `docs/desktop-scrapbook-verification.md`
5. G3 deploy and the deployment record.

## Definition of done

- The title and date are VT323 at the agreed sizes in ink color, with a Georgia/Gelasio fallback, in the book and the studio for every entry.
- Fit, the two-line limit and blank titles behave as before.
- All checks pass with evidence labels and screenshots.
- Docs are updated.
- The change is live on Pages and the Worker with saving still enabled.
