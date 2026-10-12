# Baby Teeth — editor prototype

A scrapbook editor prototype for iPad Pro, Apple Pencil, and an onscreen keyboard.

## Try it

Public preview: https://chief-teef.github.io/baby-teeth/

Use **Write** for rich text, **Arrange** for dragging/resizing/rotation/layers/grouping, and **Draw** for Pencil or mouse ink. Fingers scroll in drawing mode. Open **Reading preview** to inspect phone, tablet, and desktop arrangements. The large test entry adds 20 sample photos and 30 text boxes without replacing existing entries.

Drafts and photos are stored only in this browser's IndexedDB. They are not uploaded to GitHub or shared across devices. Export a backup before clearing browser data. Public access is to the editor application, not to anyone else's local drafts.

## First checkpoint limits

- GitHub saving, authentication inside the editor, public post publishing, and full offline reopening are not implemented.
- Photo decoding depends on the browser; if HEIC fails, use JPEG/PNG/WebP. Photos are re-encoded as JPEG, at a maximum 1600-pixel long edge, before local storage.
- Ink currently creates a separate drawing object per completed stroke; grouping can keep multiple strokes with a photo. The eraser removes the last stroke of the drawing object under the pointer.
- No cropping, borders, stickers, or reusable entry templates.
- Mobile keyboard/Pencil behavior and photo memory usage must be tested on the actual iPad.
- This neutral prototype styling is temporary; the styling interview comes later.

## Develop

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm run test:browser` runs the browser checkpoint suite using Microsoft Edge at its default Windows installation path. The production build uses relative asset URLs so it works under the repository's GitHub Pages path.

## Preview hosting

The first preview uses a checked-in production build in `docs/`. Configure GitHub Pages to **Deploy from a branch**, branch **main**, folder **/docs**. `.nojekyll` prevents Jekyll processing. For future previews, rebuild and replace `docs/` with the contents of `dist/`, retaining `.nojekyll`.

The final blog architecture is described in [BLOG-SPEC.md](BLOG-SPEC.md); this prototype tests editor feasibility before committing to the publishing-service architecture.

## Dependencies

Tiptap (rich text), interact.js (drag/resize), and Vite (bundling) are MIT-licensed open-source dependencies. No paid extensions or external runtime APIs are used in this checkpoint.
