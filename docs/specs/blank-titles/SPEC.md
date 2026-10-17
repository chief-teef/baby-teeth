# Blank entry titles

## Status

- **Owner-confirmed 2026-10-17:** an entry may have no title, including when published. Wherever a label is required, a blank title shows the entry's date and never "Untitled".
- **Implemented October 17, 2026.** `entryLabel(post)` in `shared/notebook-format.js` is the shared label rule; evidence is in `docs/desktop-scrapbook-verification.md`.

## Outcome

Owner, 2026-10-17: "I want to be able to have no titles on a post. i don't want it to just be 'untitled' either, i want it to be able to be blank and that be fine."

Acceptance baseline:

- A blank-titled entry saves, publishes and builds.
- Its first notebook page shows only the date.
- No public or studio output for it contains "Untitled" or an empty link, button, heading, RSS title or tab title.
- Titled entries are unchanged.

## Decisions

1. **Blank titles are valid everywhere, including publication.** The Worker and the build both stop requiring a title. *Owner decision*
2. **Notebook header:** a blank title leaves the title line as empty space, and the date stays where it is. The header does not collapse, so first-page geometry and fit never change. *Default*
3. **Date as the label:** wherever a name is needed, a blank-titled entry uses its date and never "Untitled". This covers:
   - the archive
   - the book contents menu
   - the reading-page heading link
   - the browser tab `<title>`
   - RSS item titles
   - the screen-reader page announcement
   - the studio entries sidebar and "Manage entries" list
   - the trash confirmation
   - the GitHub commit message

   *Default*
4. **Discord:** the announcement keeps its wording and uses the date where the title would go. *Default*
5. **Whitespace-only titles count as blank** and are saved as `""`. Titles are never trimmed while typing. *Default*
6. **Which date:**
   - Public places use the publication date.
   - The studio uses the created date for drafts.
   - The existing `entryDate()` already resolves `publishedAt || cloud.publishedAt || created`.
   - Use it, in its existing house format (lowercase, e.g. "oct 16, 2026").

   *Default (format is an assumption: matches what pages already show)*
7. **No doubled dates:** where a date already sits next to the title, a blank-titled entry shows the date once, and that date becomes the link or button text. This applies to the archive rows, contents-menu buttons and the reading-page header. *Default*
8. **Nothing else changes:**
   - titled entries
   - the title box
   - document format and version
   - IDs and URLs

   The "Add a title before publishing" warning is removed. *Default*
9. **Rollout:** test locally, then push to `main`, wait for Publish blog, and deploy the Worker with `SCRAPBOOK_WRITES_ENABLED:true` preserved. Then verify live. No further owner approval is needed unless a check fails. *Owner decision*

## Scope

In scope:

- publication validation (shared, Worker and build)
- the canonical fit title check
- the editor and public notebook header
- every label site listed in Decision 3
- the Discord announcer
- tests and docs

Out of scope:

- a separate "display name" field
- auto-generated titles
- changing titled entries
- header layout changes
- excerpt-based labels

## Current behavior and paths (facts, verified 2026-10-17 at `a7c488a`)

**Validation:**
- `shared/document.js:12`: title must be a string of ≤500 chars. An empty string is already valid, so drafts already save.
- `shared/notebook-format.js:20` `assertPublicationGeometry`: throws "A title is required before publishing." when `!post.title.trim()`. The Worker calls it on publish (`worker/index.js` save route).
- `shared/notebook-renderer.js:25`: canonical fit pushes `'title'` failure when `!post.title.trim()`. This blocks the static build (`scripts/verify-notebook.mjs`).
- `shared/notebook-renderer.js:18`: loads the title font with `post.title||'bbyteeth'`. Already safe.

**Notebook header:**
- `shared/notebook-renderer.js:7`: public header `<h2>${esc(post.title)}</h2><time>`.
- `src/page-composition.js:38`: editor header `h2.textContent=getEntry().title`.

**Studio:**
- `src/main.js:158`: online list uses "Untitled entry".
- `src/main.js:168`: trash confirm uses "Untitled entry".
- `src/main.js:189`: entries sidebar uses "Untitled entry".
- `src/main.js:254`: "Add a title before publishing" / `title-error`.
- `src/main.js:269`: `#title` input stores the raw value.

**Worker:**
- `worker/github.js:22`: commit message `${doc.title||'Untitled entry'}`.

**Public reader:**
- `blog/src/components/Entry.astro:10`: `post.title||'Untitled entry'`.
- `blog/src/pages/archive.astro:7`: bare `post.title` link.
- `blog/src/pages/posts/[id].astro`: `` title={`${post.title} · bbyteeth`} ``.
- `blog/src/pages/rss.xml.js:4`: `<title>${esc(p.title)}</title>`.
- `blog/src/pages/notifications.json.js:4`: passes `title`. Keep it raw (`""`); the announcer derives the label.
- `shared/book/scene.js:93`: screen-reader announcement `${title}, ${date}, page…`.
- `shared/book/scene.js:108`: contents buttons are `title` plus a `<time>`.

**Discord:**
- `scripts/discord-announcements.mjs:20` accepts any string title.
- `scripts/discord-announcements.mjs:40-41` builds `Anna just posted a new blog entry!\n\n${title}\n\nGo read it here: ${url}`.

**Date helper:**
- `shared/notebook-format.js:21` `entryDate(post)`.

## Constraints

- No document migration or format/version change. Stable IDs and URLs (title is not in URLs).
- Local recovery and revision conflicts stay as they are.
- Keep escaping of rendered user text.
- Accessibility: no empty link, button or heading text; the screen-reader announcement stays meaningful.
- Published-only output; drafts and trash never enter public output.
- `notifications.json` keeps its exact field set.
- Discord ledger and locking rules are untouched (root AGENTS).
- Free plans only. Never print credentials.

## Gates

- **G1 (no "Untitled"):** a fixture build with a published blank-titled entry must succeed. Its HTML, RSS, sitemap and `notifications.json` must contain no "Untitled", no empty `<a>`/`<button>`/`<h2>` label, and no empty `<title>` or RSS `<title>`. If the build or any check fails, fix it before going live. Never fall back to a placeholder word.
- **G2 (deploy):**
  - Deploy only after all checks in Verification pass locally.
  - Push to `main` as a fast-forward, never force. Wait for a successful Publish blog run, with the live `revision.json` showing that exact commit.
  - Then deploy the Worker with `npm run deploy:worker -- --var SCRAPBOOK_WRITES_ENABLED:true`.
  - If any step fails, stop and report. Do not retry destructively.

## Verification

- **Unit/Node:**
  - `npm test` and `npm run test:server`.
  - Add tests that `assertPublicationGeometry` and the Worker publish path accept `title:""` and whitespace-only.
  - Whitespace-only is saved as `""`.
  - A Discord message for a blank title uses the date.
- **Build (local):** extend `tests/blog-build.mjs` with a published blank-titled entry and the G1 assertions. Run `node tests/public-browser.mjs` against it. Afterwards, rebuild real content with `npm run build:blog`.
- **Browser (local, desktop Chrome/Edge):**
  - The studio publishes a blank-titled entry with no title warning.
  - The sidebar and Manage entries lists show the date.
  - The editor header shows only the date.
  - Reader: book contents button and SR announcement use the date.
  - Use the existing desktop/cloud browser suites with mocked APIs.
- **Regression:** `npm run build`, `node tests/cloud-csp.mjs`, `node tests/desktop-pages.mjs`, `node tests/desktop-text.mjs`.
- **Live (after G2):**
  - Publish run succeeds and `revision.json` matches.
  - Worker signed-out gates hold: `/` shows sign-in, `/api/session` reports writes enabled, `/api/posts` returns 401.
  - Do not publish a test entry to the real repository.
- Label evidence as local, simulated or live. Desktop emulation is not iPad evidence.

## Work plan

One owner. The change is small and coupled through the shared label rule.

1. Add one shared label helper beside `entryDate` (e.g. `entryLabel(post)` → trimmed title or `entryDate(post)`), and use it at every label site in Decision 3.
2. Remove the title requirement in `assertPublicationGeometry` and in the canonical fit check, and the studio warning.
3. Normalize whitespace-only titles to `""` where the document is cleaned and saved.
4. Headers render an empty title line. In the date-already-shown spots, render the date once as the link or button.
5. Tests, then docs: `BLOG-SPEC.md`, `docs/desktop-scrapbook-spec.md`, and any scoped AGENTS line that mentions required titles (`worker/AGENTS.md` "reject missing titles"). Record evidence in `docs/desktop-scrapbook-verification.md`.
6. G1, then G2.

## Definition of done

- A blank-titled entry can be saved, published and read.
- It shows the date wherever a label is needed and is never called "Untitled".
- Titled entries are unchanged.
- All checks pass with evidence labels.
- Docs are updated, and the change is live on Pages and the Worker with saving still enabled.
