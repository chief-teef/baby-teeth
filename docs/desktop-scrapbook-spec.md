# Desktop scrapbook overhaul — reviewed implementation specification

Date: October 15, 2026. Status: implemented desktop contract; see desktop-scrapbook-verification.md for actual checks and release evidence. The execution assignment supersedes the drafting-only restrictions below. Product requirements below come from the owner interview. Engineering decisions below are resolved against the repository. Implementation and release still require the evidence gates below.

## 1. Outcome and precedence

Make bbyteeth a desktop-first, highly curated scrapbook editor with seamless rich-text editing, freely overlapping images and text, multi-page entries, and a loud Y2K personal-homepage interface. The paper is a truthful preview of published geometry, typography, stacking, headers, and colors. The surrounding interface can be exuberant without obscuring work.

This direction supersedes earlier one-page-only entries, iPad-first authoring, Write/Move & resize modes, two-font styling, the browser-local paper-color picker, and retirement of the specific tooth-stamp authoring tool. It does not restore general pen authoring or add a general sticker system. The public desk/book artwork and its existing interactions remain the visual foundation; the requested wholesale aesthetic overhaul applies to the editor.

Retain free/ad-free hosting, authentication, publication privacy, stable entry/object IDs and URLs, existing content and ink, undo/recovery/export, atomic saves, conflicts, and accessible reading. Desktop is the primary acceptance target; smaller-screen reading and basic authoring must remain usable. No deployment, production-content migration, messages, announcement activation, or paid service is requested by this drafting task.

## 2. Confirmed product contract

### Entries, pages, and automatic growth

- An entry is one publication unit containing one or more ordered paper pages, with one identity, title, date, share URL, and revision. Publishing it publishes its pages together. Its pages remain consecutive in the public book.
- Paper retains canonical 900 × 1200 dimensions at every viewport width. Editor pages are stacked vertically with visible gaps and unobtrusive editor-only page numbers.
- First-page title/date and all other published furniture are visible while composing. Only the first page has the title/date. Continuations retain outer margins and can use the vacated header area.
- Moving an object below the last page reveals another page. There is no arbitrary product page-count limit. Existing resource/security bounds still need an explicit capacity policy; “unlimited” does not mean unbounded requests or memory.
- During drag the object stays attached to the mouse; do not teleport it at a boundary. Edge scrolling keeps dragging usable. On release, place the whole object on a page, without splitting it across a seam. A gap drop snaps inside the top/bottom edge of the closest page.
- Empty pages disappear automatically, including interior pages. They can be recreated by dragging into the space below the remaining pages. Never collapse pages while the pointer is still dragging. Removing pages changes page order, not entry identity.
- Text keeps its definitive authored box and shrinks within it exactly as today. No automatic text flow or paragraph splitting onto new pages.
- Images, text, retained ink, and stamp impressions can freely overlap. Overlap is valid content, not a fit error. Selected objects expose obvious Bring forward and Send backward tools. A compact Layers panel provides access to covered objects.

### Book, colors, and links

- Keep existing oldest-to-newest entry ordering and stable ID tie-break; flatten each entry's pages consecutively in that order. Do not insert blank pages merely to make every entry start on a right-hand face.
- A direct entry URL opens the entry's first page. A plain homepage URL starts closed; opening selects the first page of the latest entry, not its final page.
- Each book corner has a larger inner page control and a smaller outer entry control, sharing a restrained visual treatment. Entry controls jump to the adjacent entry's first page in either direction. Page controls advance/back up one logical paper face; in an overview spread the next selected page can already be visible, so do not animate a fake turn. Both actions need distinct accessible labels, usable hit areas, focus states, and boundaries.
- Keep entry permalinks, archive, RSS, sitemap, notification URLs, Back/Forward, reduced motion, and no-JS/accessible reading working. Exact-page share URLs are not required.
- Every page in an entry has the same paper color. Derive it from entry position in a repeating palette; do not store color on the entry. Removing/reordering an entry can recolor later entries. Remove the manual picker and ignore its old local preference.

### Rich-text authoring

- Remove Write/Arrange switching. Click text to edit/select it; drag its border/handle to move the box; resize with existing handles. Photos drag directly. Selection and drag must not compete.
- Provide a familiar Google Docs-style toolbar: font, preferred size, bold, italic, underline, text color, highlight, and alignment. Expanded controls include line spacing, paragraph spacing before/after, letter spacing, lists, and links. Keep supported existing formatting and keyboard shortcuts.
- Different words in one box may have different fonts, sizes, colors, and highlights. Paragraph settings affect the selected/touched paragraphs. Toolbar changes preserve the text selection and caret, report mixed values honestly, and undo correctly.
- Automatic fit scales the rich composition proportionally within its fixed box, then regrows toward authored sizes when room returns. It never changes saved preferred sizes, content, or box geometry. Show unreadably-small/unfittable feedback; do not silently clip successful publication.
- Normal paste preserves supported Google Docs formatting and editable content. Paste without formatting adopts current styling. Unsupported fonts get a visibly indicated fallback. Never import arbitrary executable HTML/CSS or lose the tail of long text.
- Typing continues current inline styling. New boxes use the user's chosen default font/size/color, with bold, italic, and highlight reset. Clicking + Text creates a focused box near the visible page center; optionally dragging out a box gives precise dimensions. Pasting outside an active editor creates a box on the active visible page; paste into menus/inputs must keep its native meaning.
- Offer a broad curated font collection: conventional essentials plus unusual handwriting, pixel/computer, futuristic, bubbly, script, editorial, typewriter, gothic, and distressed choices. Use actual-font previews, style groups, and favorites. No paid font service or arbitrary remote-font execution.

### Editor atmosphere, Otis, and stamping

- Loud personal-homepage Y2K direction: tiled backgrounds, glitter accents, chunky/beveled controls, pixel icons, decorative frames, playful clutter, apple green and blush. Preserve legible labels, keyboard focus, predictable control placement, and contrast. Decorative CSS must not leak into canonical paper styles.
- Orange pixel cat Otis idles in a corner of the editor window outside the paper. He does not publish, obstruct controls, or change layout. Reduced motion shows a still pose; hidden/disposed views stop animation.
- One pixel-tooth stamp is an authoring prop with a holder. Pick it up, place it over paper, click for a satisfying downward strike/impact and optional sound. It remains active for repeated stamping; Escape or the holder puts it away.
- Every impression is an ordinary independently movable/resizable/rotatable image with transparency. Impressions can overlap one another and everything else. Each impression is undoable; impact affects no neighboring content. No stamps on toolbar/gap clicks, and no accidental impression at pickup. Keyboard users can place an impression without a pointer gesture.
- Transparent-background PNGs are supported for ordinary uploaded photos as well as stamps. Alpha must survive import, resizing, local recovery, backup, upload, save/reload, preview, build, published rendering, and download. No white/black matte or silent JPEG conversion of PNGs.

## 3. Chosen engineering contracts

These are the implemented engineering contracts, subject to the recorded verification limits. Section 2 is the owner contract. No owner product question remains. Runtime feasibility and verification are release gates. See `desktop-scrapbook-execution-prompt.md` for the next assignment.

### 3.1 Version, migration and recovery

Choose nested v3 pages, with the existing `pageFormat` (paper dimensions are unchanged). Reject v3 with root `elements`. Archive envelope remains version 1. Optional pages under v2 is unsafe: the existing cleaner hardcodes v2/root elements and would silently discard pages. A flat array with page references still needs page ordering/dangling-reference checks and does not avoid the consumer migration.

```json
{
  "version":3,"pageFormat":"notebook-900x1200-v1",
  "id":"11111111-1111-4111-8111-111111111111",
  "title":"October scraps","created":"2026-10-15T18:00:00.000Z",
  "pages":[
    {"id":"11111111-1111-4111-8111-111111111111","elements":[
      {"id":"22222222-2222-4222-8222-222222222222","type":"text",
       "x":40,"y":20,"w":360,"h":180,"rotation":0,
       "font":"handwriting","fontSize":32,"fixedHeight":true,
       "doc":{"type":"doc","content":[
         {"type":"paragraph","attrs":{"textAlign":"left","lineHeight":1.25,"spaceBefore":0,"spaceAfter":12,"letterSpacing":0},"content":[
           {"type":"text","text":"Dear diary ","marks":[{"type":"textStyle","attrs":{"font":"serif","fontSize":24,"color":"#402E35","highlight":"#FFF29A"}}]},
           {"type":"text","text":"hello!","marks":[{"type":"bold"}]}
         ]}
       ]}}
    ]},
    {"id":"33333333-3333-4333-8333-333333333333","elements":[
      {"id":"44444444-4444-4444-8444-444444444444","type":"photo","x":20,"y":20,"w":330,"h":330,"rotation":0,"src":"media/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png","alt":"Transparent tooth impression"}
    ]}
  ]
}
```

- Page IDs are stable UUID-shaped values unique within an entry, in a separate namespace from entry/object IDs. Object IDs are unique entry-wide. Array order is page order and back-to-front stacking. A group cannot span pages. Page removal never renumbers surviving IDs.
- `entryPages(post)` returns v2/v3 pages without mutation; the synthetic v2 page ID equals entry ID. `entryElements(post)` flattens page order for enumeration only; writes always target the actual page array. `pageGeometry(pageIndex)` owns geometry. `migratePost(post)` validates/copies v2 into v3, preserving IDs, coordinates, styles, ink, music, local/cloud metadata and revision. Repeated migration is stable. Unknown formats fail before mutation.
- Opening v2 never commits a repository migration. New authoring saves v3 after activation; v2 remains readable. `cleanPost` needs explicit version branches and a recursive rich-text attribute cleaner. Server cleaning omits local/cloud/receipt fields; status, publishedAt, updatedAt and updatedBy still come from the checked previous document/action, not client claims.
- New studio reads/writes a separate IndexedDB `book-v3` key. When absent, validate the old `book`, then transactionally preserve its raw value under immutable `book-before-v3` and initialize `book-v3`; leave `book` untouched. Never overwrite an existing original snapshot or active v3 archive during hydration. Prefer `book-v3` thereafter. This prevents old open tabs, which still write `book`, from overwriting v3 work. Offer exports of current v3, original snapshot and current legacy key; if legacy data changed after migration, show a notice and do not auto-merge. Unknown data in the selected recovery key blocks autosave and stays exportable; never silently fall back to an older key. Validation/preservation failure aborts initialization. Import and all later v3 recovery writes target `book-v3`; no automatic snapshot restore over newer edits.
- Validate a complete copied archive before hydration/import; import adds entries and keeps current entries. Assign a fresh entry ID on collision as today, clear cloud identity; page/object IDs are entry-scoped. Validate the resulting archive limits before mutation. Keep staged media and receipts, not just server-cleaned fields, in local backups.
- Use entry-wide IDs plus active page ID for selection/undo. Keep one global archive undo owner. Asynchronous uploads may attach receipts to matching IDs but cannot replace newer content. Save snapshots remain revision-sensitive. All-page traversal must reach receipt repair, online hydration, export/import and recovery, not only rendering.

### Shared rendering interfaces

Keep `renderNotebook(post,base,{pageIndex:0,deferMedia:false})` as a one-paper-face renderer: explicit pageIndex at every multi-page caller, header only at index 0, out-of-range page index throws. `measureNotebook(post,element,{pageIndex:0})` measures that face and returns failing object IDs plus `title` only for the first face. Build verification enumerates entryPages and awaits every page; it must not silently skip unsupported formats. `renderComposition(post,base)` renders ALL pages for accessible output. Helpers live in existing notebook-format.js where pure and appropriate; palette values move to a pure shared/paper-colors.js, avoiding browser CSS imports in Node. Entry identity and lifecycle metadata stay on the parent passed to renderers, not fabricated page-as-entry objects.
### 3.2 Capacity

There is no separate product page-count cap. Remove empty pages after commands; only an entirely empty entry retains one empty page. Each other page has at least one object, so the existing 500-object cap bounds saved pages to 500. Validate array length before recursion. Temporary drag paper is view state, not persisted content. Never silently truncate.

Keep current limits: 500 objects per entry; 100 entries per archive; text depth 20, 10,000 nodes per box, 100,000 characters per text leaf; 100,000 total repository ink points; 900,000 bytes for the complete JSON request including receipts; 700,000 bytes per processed image; each image side <=2400 and pixels <=5,760,000. Raw photo input <=35 MiB/80 million pixels; imported archive <=100 MiB. Counters do not reset per page. Aggregate text structure is bounded by the existing 500×10,000 maximum plus request/import byte limits; do not accidentally turn the existing per-box node cap into an entry cap and reject valid v2 work.

Keep relaxed local ink recovery and visible draft overflow. Check serialized UTF-8 request bytes before sending; online-limit errors retain draft/export access. Decode images and measure pages with bounded concurrency, releasing resources rather than decoding 500 images at once. Any lower practical runtime capacity must be measured, documented and recoverable, never hidden behind an “unlimited” claim.

### 3.3 Geometry, promotion and gestures

`pageGeometry(0) = {x:54,y:220,width:792,height:920}`; continuations use `{x:54,y:60,width:792,height:1080}`. Paper stays 900×1200. Coordinates are composition-local. Header/title/date appear only on page 1; continuation ruling begins at its origin. Studio, preview, geometry checks and build proof use the same function.

Remove all empty pages after a completed mutation, including the first. If none remain, retain the previous first page as the single empty page. Empty means zero objects: a blank text box or transparent photo still counts.

**First-page promotion:** preserve the promoted page ID, numeric local object coordinates, sizes, rotations, order and relative arrangement. Its composition moves down 160px because the header is now present. Show a concise promotion status and include it in the same undo command. Content beyond the shorter 920px region stays visible on the draft overflow mat, with actionable feedback and publication blocked. Never keep an empty-first-page exception, silently shrink/clamp individual objects or delete content. This explicitly resolves the furniture/automatic-removal conflict without damaging authored arrangement.

1. Snapshot pregesture pages/geometry/selection. Drag a proxy continuously in stack coordinates with original grab offset. Invert zoom/scroll before deriving local coordinates; edge scrolling keeps the proxy attached to the pointer.
2. Selection is page-local. Expand group selection to the full group. Transfer selected objects as one rigid union using `elementBounds`, including outlying ink; preserve offsets, rotations and relative stacking. Selecting another page replaces selection rather than creating ambiguous cross-page groups.
3. Show at most one trailing candidate page when dragging below the last paper. Resolve target by pointer on paper; gap drop chooses nearest paper edge, ties source then earlier page. If the transformed union fits, translate it wholly inside target composition at release. Cross-page transfer appends in previous relative order; same-page motion preserves z-order.
4. An oversized union stays at pointer-derived coordinates as a visibly invalid draft; never split or scale it. Resize/rotate remain on the owning page and may produce invalid drafts. Dragging creates/transfers pages; resizing does not.
5. Commit insertion/transfer/placement/normalization as one undo command. Escape, pointercancel, capture loss, hide/dispose restore the complete snapshot and remove placeholder without an undo entry. Never collapse pages during drag.
6. Keyboard Move to previous/next page uses the same transfer rules, creating a trailing page when necessary. This provides pointer-free page growth.

Bring forward/Send backward are one-layer moves, preserving selected relative order, not the existing move-to-extremes action. Layers exposes covered objects. Text interiors edit/select; only external border/handles move them. Keep keyboard/numeric resize/rotate, touch scrolling outside handles and >=44 screen-pixel targets.

### 3.4 Rich text, selection, paste and fit

Keep installed Tiptap/ProseMirror and StarterKit (`undoRedo:false`); StarterKit already supplies link/underline. Use installed core Mark/Extension and pm APIs for one `textStyle` mark/global paragraph attributes. No separate editing framework or package per toolbar control.

| Field | Contract |
| --- | --- |
| Element font/fontSize | Inherited defaults; omission keeps legacy serif 28px/legacy metrics. New boxes handwriting 32px/fixedHeight true. V3 accepts registry IDs and finite sizes 6–144px; v2 retains historical validation. |
| textStyle | Optional font, fontSize, color, highlight; sizes finite 6–144 canonical px, colors six-digit hex, font registry ID. Missing inherits; absent highlight means none. One textStyle per run. |
| Paragraph/heading attrs | textAlign left/center/right/justify; lineHeight finite unitless .8–3; spaceBefore/spaceAfter finite 0–144px; letterSpacing finite −2–20px. Omitted values retain existing node defaults, not zero. |
| Existing types | Preserve existing nodes/marks, heading levels 1–6, orderedList start integer 1–1,000,000, http(s) links. No arbitrary CSS, HTML or URLs. |

Canonical structured cleaning validates nesting compatible with editor schema, supported types/values and duplicate marks, then emits only allowlisted attributes. Unknown nodes/marks or invalid values fail safely; inert unknown attrs are omitted, never rendered. Keep eight-mark cap; all seven supported mark kinds fit. Preserve validated text verbatim.

Normal paste uses inert parsing without fetching resources, walking supported presentation into JSON before one validated insertion. Discard executable/style contents; retain text/order/breaks from unsupported non-executable wrappers, including table text with separators. No imported remote images, raw CSS or scripts. Normalize pt→px (4/3), RGB→hex, font aliases, weight>=600→bold, underline/highlight and supported block styles. Unsupported fonts use indicated fallback; out-of-range style values clamp to supported bounds with a notice. Content/node/byte overflow rejects the entire paste before mutation, never truncates its tail. Plain paste uses text/plain and current stored marks/context.

Preserve `{entryId,objectId,selectionBookmark}` while toolbar controls receive focus, map through transactions, restore before applying, discard if editor/entry changes. Buttons prevent pointer blur; selects/color controls stay keyboard-focusable. Range commands affect selected text, caret commands set stored marks, block commands affect touched paragraphs; mixed values display as mixed. Each formatting command gets one pre-command snapshot and suppresses duplicate onUpdate history, then starts a fresh typing group. Do not call a full render that destroys editors; preserve IME composition.

Defaults and favorites are separate local preferences. New boxes inherit chosen font/size/color, reset bold/italic/highlight; + Text focuses near visible page center. Outside-editor paste creates a box only from canvas/background focus, never title/input/select/menu/dialog/contenteditable. Active page comes from focus/selection, otherwise greatest visible area, ties earlier.

Fit uses one derived scalar s in (0,1] per fixed box. Multiply every authored typography length: inline sizes, heading/code defaults, pixel line-height, paragraph/letter spacing, list indents and quote borders/spacing. Unitless ratios stay ratios. Preserve existing fixed 12px vertical/14px horizontal padding. Find greatest fitting scale to quarter-pixel-equivalent precision, minimum effective run 1px; recheck actual final scroll bounds. Warn when smallest effective run <12px. Unfittable/minimum or unavailable required font blocks proof/publication; warnings do not change data. Legacy non-fixed text keeps measured auto-height until reshaped. Accessible reading uses scale 1.

Refit on content/box/style and actual font load. Cache includes doc identity/default styles/geometry/typography version and monotonic font-load generation; document.fonts.status alone is insufficient. Await every used family/weight/style and relevant glyphs. Missing font gives provisional preview and preserves editing/export, but cannot pass fit. All pages use identical CSS/render/measurement in studio, preview and build.
### 3.5 Fonts and visual acceptance

Ship 20 curated families covering conventional serif/sans/mono, handwriting, pixel/computer, futuristic, bubbly, script, editorial, typewriter, gothic and distressed. Preserve serif/handwriting IDs and Kalam/Gelasio/Caveat assets. Visual worker chooses exact freely licensed families from official sources, supplies WOFF2/license/source/checksum and available weight/style files; canonical owner registers them. Routine family choice needs no owner interview. Every category needs a real option.

Registry shape: `{id,label,category,family,faces:[{weight,style,src}],fallbackId,aliases,license,source}`. Registry is trusted code/assets; documents store IDs only. Use an explicit shared synthesis policy for unavailable bold/italic variants. Preserve legacy Georgia-first/Gelasio fallback and record OS metric differences; new bundled fonts are deterministic/self-hosted. Load content-used fonts and visible menu previews only, with categories/favorites/actual-font labels. Opening the menu must not fetch the entire catalog. Record cold transfer/loaded-face counts for empty studio, populated content and menu; do not claim old two-font budgets.

Visual acceptance: tiled pixel background, apple-green/blush chrome, beveled primary controls, pixel icons with legible labels, decorative rail frames and small glitter accents, distinct Entries/typography/Layers/paper-stack areas. Save/recovery state and controls stay predictable. Decoration never covers paper, focus rings or status. Normal text contrast >=4.5:1, control/focus contrast >=3:1; keyboard/200% zoom usable. Inspect 1440×900, 1280×800, 834×1194 and 390px width; narrow rails become drawers rather than unreadably tiny labels.

Scope shell styles under the editor shell excluding paper and public preview. Only canonical owner edits notebook/theme CSS. Otis occupies a reserved editor-only corner, still under reduced motion, asleep hidden/disposed. Holder/impact are editor props; each tooth impression is an ordinary photo using the same transparent PNG pipeline and shared processed bytes/receipt. Pickup never stamps; repeated stamps stop with Escape/holder, toolbar/gaps never stamp. Keyboard placement selects page/position with visible feedback. One undo per impression. Optional sound defaults off and needs a user control; no autoplay. Impact never moves neighboring content.

### 3.6 Media and PNG

PNG alpha survives import/resizing/recovery/export/upload/reload/build/download. JPEG remains JPEG; existing WebP import may retain its prior JPEG behavior. Change BOTH processPhoto and jpegForUpload, plus cloud MIME. Decode data URLs into Blobs directly; preserve the current CSP fix, not a connect-src data: relaxation.

Canonical PNG upload is static non-interlaced RGBA8, metadata-free. Browser decodes source to pixels retaining alpha; APNG import becomes an explicitly indicated still. Ensure encoding actually produces RGBA8: verified canvas output is acceptable; otherwise emit RGBA scanlines through platform CompressionStream and a small shared chunk/CRC utility. Do not assume every canvas encoder emits color type 6. PNG retries reduce dimensions from the measured processed max-side 512 by factor .8, at most eight attempts, never matte/JPEG. On failure preserve local work and explain the online bound. Cache processed bytes by source, including repeated stamps; do not repeatedly resample already accepted media.

Worker accepts only image/jpeg or image/png and bounds bytes before processing. The measured PNG online/build bound is 512px per side, 262,144 pixels and 300,000 bytes; JPEG retains 2400px/5,760,000 pixels/700,000 bytes. Local workerd profiling of 1600px exceeded the Free CPU budget; the smaller PNG bound is intentional and recoverable. PNG validation checks complete chunk lengths/CRC/order, unique first IHDR and RGBA8 parameters, contiguous IDAT, final empty IEND/no trailing bytes; max 2048 chunks. Reject animation/unknown critical chunks and strip ancillary metadata. Stream IDAT deflate, cap exact output to `height*(1+4*width)`, require completed stream and row-filter bytes 0–4; cancel on excess. Keep dimensions/pixel bounds above. This constrained path validates compressed payload, not merely a signature. [PNG defines the format](https://www.w3.org/TR/png/); [Cloudflare documents deflate streams](https://developers.cloudflare.com/workers/runtime-apis/web-standards/). Actual workerd/free-runtime resource cost is an activation gate, not established by those docs.

Paths are exactly `media/<40 lowercase hex Git blob SHA>.jpg` or `.png`. SHA is Git's blob SHA of final sanitized bytes, not a bare-content hash. Receipts bind final SHA/path/user/expiry as today; extension derives from validated format. Use a shared path predicate/parser; no arbitrary suffix slicing. Keep existing blob reuse, atomic assets/document saves and receipts on failure. No SVG upload, arbitrary path, external decoder service or authorization change.

Build uses existing Sharp: match extension/decoded format, bound dimensions/pixels, fully decode raw().toBuffer sequentially, then copy validated original bytes; reject malformed/truncated or animated media. Downloads and OG/cover metadata use actual format. Test transparent/semitransparent edges over cream/mint/blush; CRC/order/truncated IDAT/invalid filter/inflate bomb/MIME mismatch/APNG/pixel-limit negatives. Tests must run in workerd as well as Node; never claim untested deployed decoding capability.

### 3.7 Reader, color, music and accessibility

Keep page-flip and its adapter. `orderedEntries` stays oldest-to-newest by publishedAt/cloud.publishedAt/created then ID. Blog allPosts is newest-first; apply book order only before flattening, preserving archive/RSS order.

Flatten descriptors `{entryId,pageId,pageIndex,entryIndex,faceIndex}`, faceIndex zero-based authored face, entryIndex from the full ordered public list. Maintain entry and first-face maps. Adapter index = faceIndex+1; 0 is blank inside cover, final padding is not authored. Spread=floor((faceIndex+1)/2); even authored face is right, odd left. No inter-entry padding.

Page buttons select faceIndex±1; if already visible, change selection/focus/labels/music without fake turning (scene already has a same-spread branch). Entry buttons select adjacent entry's first face. Distinct accessible names and nonoverlapping >=44px hit areas; visually larger inner page and smaller outer entry control. Disable boundaries. Announce entry title and page X of Y. Initial homepage closed; first open selects latest ENTRY's first face. Direct links open first face. Closing/reopening retains selection. Contents remains entry-based; first/last entry actions select their first faces.

History changes only when selected entry changes; same-entry page moves create no entries. Contents selecting current entry resets to page 1 without duplicate history. popstate resolves entry ID to first face without pushing, preserving base/query/reading handling. No exact-page URLs. Empty book remains usable without invented content; clones/padding inert, semantic visible faces accessible.

Color is entryIndex modulo cream/blush/mint/blue/lavender (existing hex values). Put color on each page/entry wrapper, not book root. Extract pure palette/ordering helpers without importing paper.js's browser CSS into Node. Remove picker callers and ignore old local preference; never store color in JSON.

Reuse authenticated GET /api/posts summaries/head for preview context. Published preview replaces its entry retaining publishedAt. Draft preview inserts only active draft: preserve prior publishedAt for republishing, otherwise hypothetical current time, tie ID. Exclude other drafts/trash. Label draft/stale/offline/missing-context color provisional, refresh before preview/publication and after save/lifecycle. Full public build order wins after concurrent changes; no new endpoint.

Keep current desk music player attached to the selected ENTRY across every page (`desk.update(entry)`), not a new first-page-only UI. Accessible rendering includes heading/date/music once per entry and every page/object in order. Explicit reading/no-JS/print reflows at ALL widths at scale 1, with page section labels, alt text and grouped media relationships. Retire accessible desktop absolute positioning: reading-layout.js currently replaces cssText and erases styles. Physical paper retains authored overlap.

Excerpts traverse all pages; cover image is first photo in page order. Permalinks/archive/RSS/sitemap/notifications remain entry-based. Adding pages never creates another announcement or resets publication identity.

## 4. Repository reach and practical parallel ownership

Source/scoped guidance were inspected, not runtime-tested. Current code is v2. Latest October 15 handoff records public release and announcements already enabled/initialized; recheck during execution, never reset their history.

| Consumers | Required reach |
| --- | --- |
| shared/document.js, notebook-format.js | v2/v3 cleaning, traversal, excerpt, geometry, IDs; current cleaner hardcodes v2 and passes text attrs through |
| src/model.js, storage.js | v3 defaults, staged migration/original backup, archive/import limits |
| src/main.js | all root elements access: selection/mount, undo/counts, receipt repair, hydration/save, import/export, preview/fit; revision-safe asynchronous updates |
| notebook-renderer.js, notebook.css, text-fit.js, book/theme.css | page header/origin, rich styles, fonts/all-page proof, cache invalidation |
| shared/renderer.js, reading-layout.js, blog reader CSS | whole-entry flowing accessibility/print, grouping/styles without cssText destruction |
| src/cloud.js, photo processing in main | both JPEG conversions, MIME, staged receipts |
| worker/index.js, security.js, lifecycle.js, github.js | all-page asset refs, processed PNG, client/version guard, lifecycle recognized-format validation; preserve checked snapshots/atomic commits/index metadata |
| scripts/build.mjs, verify-notebook.mjs | all-page fit/font serving, remove v2-only proof bypass, all referenced media decoded/copied, published-only output |
| book/controller.js, scene.js, page-turn.js, book.css, photos.js | entries/faces, fit/lazy media/color, selection/history, MIME download; keep adapter internals isolated |
| blog Book.astro, Entry.astro, posts/[id].astro, lib/posts.js and routes | whole-entry fallback, full-list color, first-face links/cover metadata, unchanged RSS/archive/sitemap/notification cardinality |
| prototypes/diary.js, tests | blankPost/root elements fixtures, obsolete modes/picker assumptions |
| public/_headers, fonts/art manifests | keep gated assets/CSP and license integrity; Otis never embedded into entry/public paper |

Search all `.elements`, version/format tests, renderNotebook callers, media suffixes and serialization before declaring migration complete. Preserve notification protocol/ledger; no new messaging work.

### Phase 0: coordinator freezes seams

At most four agents: one coordinator, three implementation subagents, never separate sidebar chats. Coordinator owns all Markdown, manifests/lockfile, config/workflows, src/main.js, src/style.css, src/notebook-studio.css, scripts/build.mjs, all existing test files and test entrypoints throughout. No simultaneous writes to these files.

Record baseline/dirty tree first. Make only needed behavior-preserving extractions into src/text-editor.js, src/photo-processing.js and src/page-composition.js; src/text-toolbar.js is the new toolbar module. Check original behavior before handing off files. Freeze these hooks:

- getEntry/getPage(pageId)/findElement(id)/getActivePageId and selection read/set access CURRENT state, not stale captured snapshots.
- Coordinator runCommand(label,mutate) snapshots, commits one undo entry on success, normalizes pages and notifies/rerenders affected surfaces/persists; failure restores snapshot.
- Begin/commit/cancel gesture retains pregesture snapshot; pointer preview is not a persisted mutation. Existing typing coalescing remains separate.
- Text supplies editor creation, bookmarks, formatting and content-change callback. Composition supplies stable hosts/external handles/page coordinates. Text owns interiors, composition handles. Toolbar changes never replace active editor hosts.
- Media processing returns Blob/data URL/dimensions; coordinator owns insertion/target-entry race checks. Props attach outside paper; modules dispose listeners/animations.

These are narrow local functions, not an event bus/plugin framework. Adjust signatures once before dependent workers begin.

### Wave 1: foundations

| Owner | Exclusive files | Delivery |
| --- | --- | --- |
| A canonical contract | shared/document.js, notebook-format.js, notebook-renderer.js, notebook.css, text-fit.js, renderer.js, reading-layout.js, book/theme.css; src/model.js, storage.js; scripts/verify-notebook.mjs; new shared/font-registry.js and pure page/palette helpers; new tests/desktop-contract.test.js | v2/v3 migration/recovery, rich cleaning/render/fit, traversal/page rules, canonical font registration |
| B media/server | src/cloud.js, src/photo-processing.js; worker/index.js, security.js, lifecycle.js (github.js only if necessary); new shared/png.js; new tests/desktop-media.test.js | PNG pipeline, bounded validation, all-page receipts/saves, session/version guards, local workerd proof |
| C visuals/assets | new src/desktop-shell.css, src/editor-props.js; assets/editor/**, public/editor/**; new tests/desktop-shell.mjs | shell/Otis/tooth props, original art and font candidates/license inventory for A |

Coordinator integrates A traversal/B media helper into build.mjs, main and existing tests. A owns shared path predicate and canonical CSS; C cannot modify paper. Coordinator integrates supplied font binaries/manifests under public/book/assets/book. Workers request shared corrections instead of cross-owner edits. No worker deploys. Wave 1 gate: v2/v3 validation/clean/round-trip, original recovery retained on failure, all-page save/media/build, mixed-style font/fit and malformed PNG rejection in local workerd. Fix foundation failures before consumers.

### Wave 2: consumers (same three slots)

| Owner | Exclusive files | Delivery |
| --- | --- | --- |
| A composition | src/page-composition.js; new src/page-composition.css and tests/desktop-pages.mjs | stack gestures/promotion/normalization, layers, stamp insertion via command hooks |
| B text | src/text-editor.js, text-toolbar.js; new src/text-toolbar.css and tests/desktop-text.mjs | mode-free editor, toolbar/bookmarks/paste/defaults/favorites/undo |
| C reader | shared/book/controller.js, scene.js, book.css, photos.js; page-turn.js only if needed; blog/src/**; new tests/desktop-reader.mjs | descriptors/navigation/history/colors, metadata/reflow/music/downloads |

Wave 1 foundations transfer to coordinator ownership and freeze; consumers request corrections. Coordinator wires props/shell/cloud/recovery, removes retired modes/picker, edits existing tests/docs. Unlisted existing files default to coordinator, including src/music-editor.js and asset-generation scripts. Avoid changes to unrelated desk interactions. Shared workspace plus exclusive writers is sufficient; isolated checkouts only if repository setup warrants them. Workers report files/checks/gaps; coordinator records exact integrated commits when execution is authorized.

### Wave 3: integration and independent review

Complete LOCAL end-to-end slice: multiple pages, mixed typography, transparent ordinary photo, repeated overlapping stamps, retained ink/music, migration/recovery/import/export, mocked-cloud draft save/reload and publication build/navigation. Use a free subagent slot for read-only integrated review, then fix findings under ownership. Update AGENTS to describe implemented contracts only; do not leave v2-only/mode-based instructions after the change lands.
## 5. Acceptance and release gates

| Area | Required evidence |
| --- | --- |
| Compatibility | V2 IDs/geometry/styles/ink/music preserved, repeated migration stable; all-page v3 clean/backup/import; failed snapshot preservation blocks replacement; unknown recovery untouched/exportable; stale v2 writer rejected |
| Pages | Bottom growth without jump; seam ties, edge scroll/zoom/grab offset; rotated/ink group union; oversized draft; cancel/no phantom page; first/interior/trailing removal and promotion overflow; undo restores exact IDs/order |
| Text | Range/caret selection through every focusable control, mixed values/styles/lists/links, one-command undo/IME, realistic Docs HTML/plain paste, long tail retained and native inputs unaffected |
| Fit | Mixed fonts/sizes/spacing scale/regrow together; studio/reader/build agree; missing-font/unfittable proof rejected; legacy auto-height and readable accessible scale retained |
| PNG | Ordinary transparent images/stamps through every stage; semitransparent edges; JPEG regression; expiry/retry/dedup; malformed/bomb/APNG rejection; bounded real local workerd execution |
| Reader | Older one-page plus six-page latest fixture; homepage closed/latest first face, direct first face, same-spread next, entry jumps, odd/even/padding/final/empty boundaries, contents/Back/Forward/reduced motion |
| Context/output | Full-list colors, provisional draft/offline, recolor after deletion; music on each selected entry's pages; all-page fallback; no draft/trash document/media/music output; one RSS/sitemap/notification record; base paths/PNG covers |
| Visual/access | Screenshots at specified sizes, keyboard-only text/layers/stamp/page growth, 44px targets/200% zoom/contrast, Otis/effect stop, no pickup/gap accidents |
| Capacity | Existing 20-photo/30-text workload; 50-page navigation; 500-object boundary/501 rejection; cold fonts/transfer counts and interaction trace; no unbounded decode/fit or idle animation loop |
| Release | Old client/new server, disabled-write flag, real-content exact-SHA Pages artifact, Worker version/gating/capabilities, normal editor artifact, no synthetic production content |

Use package.json's Node minimum. Run npm test, npm run test:server, npm run build and npm run build:blog. Coordinator registers new node suites and runs new browser suites explicitly. Inspect ports/fixtures before running existing scripts. Relevant regressions: auto-text-fit, text-fonts, text-image-studio, notebook-studio/fit, reliability-browser, cloud-browser/CSP, book-navigation/motion/responsive, public-browser and blog-build. Update obsolete assertions without disabling coverage. Run notification tests because shared excerpt/build output changes. Rebuild real content after fixture tests, normal editor after verification builds. Never deploy fixture output.

Keep screenshots/traces under ignored test-results and concise release evidence with commands/results/revisions. Realistic Docs paste fixtures are regression evidence, not actual Google Docs clipboard verification. Unavailable iPad/Pencil hardware is not a desktop release blocker; report the gap. Mocked saves or signed-out checks do not prove authenticated live saving. Failed required gates must be fixed, not waived as a naming change.

### 5.1 Rollout and activation

No release happens during this review. Submitting the execution prompt authorizes the next agent's scoped implementation/release. Deploy code, not unpublished owner content. Preserve current announcement settings/history: latest handoff says enabled/initialized. No reset, silent reinitialization, test message or ledger edit belongs here.

1. Record working tree/current remote head and release identity, protecting existing user/content changes. Inspect credential/session availability early without exposing secrets. Read current config/SETUP; historical private-only notes are superseded by the latest release state. Do not reset work to achieve a clean tree.
2. Add session capabilities `{readVersions:[2,3],writeVersion:3,scrapbookWritesEnabled:false}` and server `SCRAPBOOK_WRITES_ENABLED`, default false until activation. New client sends `X-Studio-Contract: 3` for asset/save/lifecycle writes. Flag false permits old v2 operations but rejects v3/PNG writes clearly, retaining local draft/export. For lifecycle actions inspect the checked previous document first and reject mutation if it is v3; those requests have no incoming document version. Existing v3 can NEVER be replaced by v2, even with current revision. Flag true requires header 3 for writes and rejects stale tabs with actionable reload/export message before mutation. Header signals compatibility, not authorization; auth/CSRF/current-repository-write checks stay unchanged.
3. Finish local gates, commit/push only scoped reviewed changes and reconcile newer remote content without overwriting it. Deploy compatible public reader/build FIRST via existing Publish blog workflow. Wait for terminal success and matching exact release SHA in live revision.json; a push is not deployment proof.
4. Deploy compatible Worker AND normal studio assets with new writes disabled. Verify version, capabilities, signed-out HTML/JS/image gate and unauthorized API rejection. Use an existing authorized session for nonmutating load when available. Profile maximal accepted PNG fixtures in local workerd against the current free-runtime resource budget before activation; Node-only success is insufficient. If bounds/cost fail, optimize or document a smaller recoverable processed-image bound consistently across client/server/build, re-run affected tests, and keep activation disabled until passing. No paid upgrade or synthetic production uploads. Distinguish local runtime profile from observed production limits.
5. Once both consumers are live and all gates pass, deploy SCRAPBOOK_WRITES_ENABLED=true and verify capabilities. Preserve PRIVATE_VERIFICATION=false for the authorized public release and all existing security/publication policies. New client preserves drafts/receipts across transitions; stale tabs get upgrade errors.
6. Verify live public desktop/narrow behavior, studio assets/gate/version. With available authenticated session inspect editor and nonmutating preview/reload. Do not save/publish an owner draft merely to prove testing; actual live save requires an explicitly designated intended draft. Otherwise report local mocked save coverage and live-write gap. If production is empty, report live empty-book coverage and local fixture multi-page evidence separately.
7. Record exact code SHA, Pages run/conclusion/live revision SHA, Worker version, activation state, smoke results and device/auth gaps. Continue to deployed completion when gates pass; do not stop at a plan, local build or queued workflow.

Rollback has separate local and repository cutoffs. Once any studio has migrated/edited local v3 recovery, retain a v3-capable client/read/export path even if server writes remain disabled; the old snapshot cannot recover subsequent edits, and the legacy book key may contain divergent old-tab work. Never automatically restore either over v3. Public reader/server rollback to v2-only is safe only while repository content remains v2/JPEG; after the first remote v3/PNG reference, retain compatible readers/cleaners and forward-fix. Disabling new writes is safe but does not undo migration. Never bulk down-convert/reset repository or recovery. Failed Pages candidates leave the previous live deployment; track release code SHA separately from later content commits.

## 6. Review disposition

Resolved: nested v3 vs additive v2; migration/IDs/archive preservation; first-page promotion; group/gap/rotation/cancel rules; style units/selection/paste/fit; constrained PNG representation; page navigation and per-entry music; draft color context; accessible reflow; missing consumers; one-writer ownership and compatible rollout/rollback.

No remaining owner product decision. PNG resource cost, actual clipboard/device behavior and credential availability require execution evidence, not assumptions. Start coordinator baseline/seam extraction, then A canonical contract, B media/server and C visuals/assets. Review changed documentation only: no application tests/builds, content writes, commit/push or deployment.
