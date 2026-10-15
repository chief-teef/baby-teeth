# Working on Baby Teeth

## Product constraints
- A free, ad-free scrapbook blog; iPad Pro/Pencil and onscreen keyboard first, desktop second, phone reading supported.
- Preserve direct writing, Google Docs paste, freeform photos/text and retained legacy ink, and recoverable work. Notebook entries retain canonical coordinates at every width; accessibility reading reflows. General stickers, cropping, borders, and full offline reopening are deferred.
- Public repository drafts are accepted. Draft/trash content must never enter the public site output.

## Architecture and sources of truth
- `src/`: Vite studio, Tiptap text, interact.js transforms, IndexedDB recovery.
- `shared/`: document validation, reader/layout, deployment settings validation.
- `worker/`: Cloudflare studio gate, GitHub OAuth, encrypted KV sessions, repository operations.
- `blog/`: Astro static reader; `scripts/build.mjs` copies only published media.
- `config/blog.json`: deployment identity and branding. `wrangler.jsonc`: Worker bindings. `.github/workflows/publish.yml`: public deployment.
- `BLOG-SPEC.md`: product decisions and historical checkpoints; latest explicit decisions win. `SETUP.md`: operational steps. Read relevant scoped AGENTS files before editing.
- `BBYTEETH-DESIGN-SPEC.md` supersedes older visual/layout decisions. `shared/notebook-format.js` and `shared/notebook-renderer.js` own the v2 fixed-page contract; `shared/book/` owns the camera, animation and reader interaction. Original artwork lives in `assets/book/`, exports/license/checksums in `public/book/`.

## Change discipline
- Inspect the working tree first; preserve unrelated changes and repository posts. Never force-push or rewrite content history as routine cleanup.
- Keep changes focused. Share validation/rendering rules rather than duplicating them; extract focused modules when changing large files.
- Maintain stable post/element IDs, URLs, document compatibility, local recovery, atomic saves, and revision conflicts. Add explicit migration for incompatible storage changes.
- Never commit credentials or print tokens. Keep hosting on free plans; no paid upgrades or billable integrations without explicit authorization.
- Verify provider/API claims against current official documentation when changing integrations. App visibility does not grant studio access; repository write permission does.

## Verification and delivery
- Use Node >=22.12 (see `package.json`). Run `npm test`; run `npm run test:server` for backend/security changes; build the affected editor/blog.
- Choose meaningful regression checks for affected behavior. Browser scripts in `tests/` mostly expect the local Vite server; inspect their URL and fixture needs before running. `tests/blog-build.mjs` generates fixtures; rebuild with real content afterward.
- Desktop touch/pen simulation does not verify actual iPad Safari, Pencil, or Google Docs clipboard behavior. Report that distinction.
- GitHub Pages is the public reader; Cloudflare is the authenticated studio. Deploy affected components only when authorized, verify terminal deployment results and live behavior, and distinguish local/committed/deployed state.
- Finish with changes, checks, and remaining limitations. Do not publish synthetic test entries to the real repository.

## Keep guidance current (every feature/fix)
- Treat documentation maintenance as part of the same change, not a later task. Follow `docs/agent-maintenance.md` before handoff.
- Update affected scoped guidance when architecture/contracts/checks change; update SETUP for operational changes and the spec for product decisions.
- Keep instructions concise and current. Replace obsolete guidance; do not append chronological progress logs to AGENTS files.
