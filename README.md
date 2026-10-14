# Baby Teeth — editor prototype

A scrapbook editor and static blog for iPad Pro, Apple Pencil, and an onscreen keyboard.

## Try it

Public preview: https://chief-teef.github.io/baby-teeth/

Use **Write** for rich text, **Move & resize** for dragging/resizing/rotation/layers/grouping, and **Draw** for Pencil or mouse ink. In Move & resize, drag any photo/text box or its visible Drag label; select an object and drag its corner handle to resize. Pencil strokes keep the page still; fingers scroll in drawing mode, and touch contacts during a pen stroke are ignored. Open **Reading preview** to inspect phone, tablet, and desktop arrangements. The large test entry adds 20 sample photos and 30 text boxes without replacing existing entries.

The Pages prototype keeps drafts/photos in this browser's IndexedDB. The connected studio is deployed at https://baby-teeth-studio.aucourantfilms.workers.dev and reports GitHub sign-in configured. It adds owner-only GitHub sign-in, repository-backed drafts, atomic photo/document saves, revision conflicts, publishing, unpublishing, and entry trash/restoration. Completing an actual owner sign-in and activating the public blog still require the live checks in [SETUP.md](SETUP.md). Export a backup before moving existing work to the new studio origin.

## First checkpoint limits

- Online saving/publishing is implemented and locally tested, but not activated until Cloudflare/GitHub App setup is complete. Full offline reopening is still pending.
- Publishing checks resume after reopening, reconnecting, or returning to the editor. Failed saves preserve local work and staged photo receipts so you can sign in again and retry.
- `npm run test:reliability` (with the local dev server running) checks Docs-style formatted paste, text/photo/ink backup restoration, interrupted upload, expired login, and publishing recovery. Actual Google Docs clipboard behavior on iPad Safari still needs device testing.
- Photo decoding depends on the browser; if HEIC fails, use JPEG/PNG/WebP. Photos are re-encoded as JPEG, at a maximum 1600-pixel long edge, before local storage.
- Ink currently creates a separate drawing object per completed stroke; grouping can keep multiple strokes with a photo. The eraser removes the last stroke of the drawing object under the pointer.
- No cropping, borders, stickers, or reusable entry templates.
- Mobile keyboard/Pencil behavior and photo memory usage must be tested on the actual iPad.
- Styling direction: bright green and pink, tacky early-2000s girly Myspace, old web-safe fonts, tiled backgrounds, and beveled controls. Refine through owner testing.

## Develop

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:server
npm run build:blog
```

`npm run test:browser` runs the browser checkpoint suite using Microsoft Edge at its default Windows installation path. The production build uses relative asset URLs so it works under the repository's GitHub Pages path.

## Preview hosting

The first preview uses a checked-in production build in `docs/`. Configure GitHub Pages to **Deploy from a branch**, branch **main**, folder **/docs**. `.nojekyll` prevents Jekyll processing. For future previews, rebuild and replace `docs/` with the contents of `dist/`, retaining `.nojekyll`.

The connected studio uses Cloudflare Workers Free plus KV for encrypted server-side sessions. Its static editor assets and API share an origin for iPad cookies. GitHub Pages runs the public Astro blog, with `.github/workflows/publish.yml` gated by `BLOG_PUBLISHING_ENABLED=true` until activation. The builder copies only media referenced by published entries; draft JSON, draft-only media, and session data are never deployed to the public blog.

The final blog architecture and future collaborator plan are described in [BLOG-SPEC.md](BLOG-SPEC.md).

## Dependencies

Tiptap (rich text), interact.js (drag/resize), and Vite (bundling) are MIT-licensed open-source dependencies. No paid extensions or external runtime APIs are used in this checkpoint.
