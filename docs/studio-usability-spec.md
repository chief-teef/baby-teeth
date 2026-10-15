# bbyteeth studio usability and visual alignment specification

The newer `docs/text-image-studio-spec.md` supersedes this document’s pen creation, typography and transformation-control decisions.

Date: October 14, 2026. Status: P0/P1 implemented locally; target-device acceptance remains open. This specification covers the local editor at `/`; the public notebook and its recent visual fixes remain the reference. Current evidence and limits are in `docs/notebook-verification.md` and the handoff. The diagnosis below records the before-state. Do not commit, push or deploy as part of this specification.

The editor should feel like composing a page in the same green diary on the same walnut desk. Give the editable paper more space, group actions by purpose, and make recovery/publication status clear. Retain labeled functional controls and a stable writing surface. Use the existing vanilla Vite application, Tiptap, interact.js, shared notebook contracts and original artwork.

## Required guidance and starting conditions

Read global/root/scoped AGENTS, `BBYTEETH-DESIGN-SPEC.md`, `docs/agent-maintenance.md`, `docs/next-chat-handoff.md`, `docs/notebook-verification.md`, and relevant latest `BLOG-SPEC.md`/`SETUP.md` guidance before editing. Use Ponytail full. This proposal supplies editor-specific defaults; it does not supersede document, recovery, security or public-reader contracts.

Inspect `git status` first. The repository has substantial tracked and untracked implementation work, artwork and a previously authorized content reset. Never reset/clean the checkout or restore files from HEAD to obtain a baseline. Do not populate real repository entries for testing. Work with disposable browser contexts and existing local fixtures.

The local Vite session reports online saving setup pending. That is an observed local state, not evidence that the deployed service is unconfigured. Verify ports before running browser scripts; current handoff ports are 5175 for the user editor/demo and 5174 for several regressions. Derive runtime/build commands from `package.json` and the existing handoff.

## Current status and diagnosis

Source review and read-only inspection of the user's blank editor establish the following. The observed browser viewport was 756×876 CSS pixels; these measurements are one narrow-window sample, not an iPad benchmark. Write/Arrange modes were inspected and Write restored without adding content.

| Current behavior | Evidence and consequence | Implementation priority |
| --- | --- | --- |
| Most controls appear before the paper | `.top`, `.workhead`, `.cloudbar`, `.toolbar`, `.notice`, then `#fit-status`; the observed toolbar was 170px high and the paper began at y≈559px | P0: compact action hierarchy and contextual tools |
| Empty drafts immediately look invalid | `scheduleFit()` displays the title publication error and `.title-error` while opening a blank entry | P0: separate draft readiness from attempted publication errors |
| Properties state is misleading | `updateSelection()` reports `aria-expanded=true` from `propertiesOpen`, although the inspector is hidden outside Arrange | P0: actual disclosure semantics and closed default |
| The narrow Arrange inspector covers paper | Current portrait CSS fixes it near the viewport bottom, including when nothing is selected | P0: deliberate panel opening; no idle overlay |
| The visual shell is mostly dark green rectangles | `notebook-studio.css` supplies theme colors, but the workspace lacks the public desk and layered diary furniture | P1: shared wood, green page support and restrained pixel detail |
| Entry navigation explains little about save/publication | `renderEntries()` shows title and object count; recovery and cloud status appear in separate distant areas | P0: useful entry metadata and adjacent state/action feedback |
| Formatting looks available without a text target | Formatting buttons remain actionable in Write; handler falls back to “Tap inside a text box first” | P0: clear target and disabled state |
| Empty-page help is inconsistent | `updateCounts()` may reveal `#empty`; `updateStage()` hides it; mode changes expose different results | P0: one external empty-state presentation |
| Preview placement assumes a header height | `.reader.book-scene` uses fixed 56px/100px offsets despite a wrapping header | P0: measured header boundary and reliable return focus |
| Source contains prototype leftovers and layered overrides | Hidden promotional/prototype text, visible stress entry action, and repeated stage/media CSS rules | P1: targeted cleanup; keep test access explicit |

The foundation is already implemented: v2 fixed geometry, authored text/photos/ink, undo/recovery, overflow validation, photo preprocessing, cloud revision/conflict state, published-only builds, per-entry music, local paper palette and the shared public preview. This is an interface improvement, not a storage/schema or renderer replacement.

## Scope and invariants

Implement P0 first, then P1. All requirements in those priorities belong to this change. P2 items below are deferred and must not grow the first implementation.

- Preserve 900×1200 paper and the 792×920 composition at `(54,220)`. Import `PAGE`/format constants; do not repeat geometry in new JavaScript. Coordinates, body typography, line wrapping, IDs, groups, photos and strokes must remain compatible with the shared renderer.
- Preserve Georgia/Gelasio body text, Kalam title/date, rendered-fit checks, draft overflow mat and font-failure handling. Paper palette stays browser-local through `shared/paper.js`; never add it to entry metadata.
- Preserve distinct Write/Arrange/Draw modes, native text selection, Pencil/palm separation, finger navigation, pointer cancellation, undo checkpoints, recovery and pending asset receipts.
- Preserve exact-revision online saves, conflicts, trash/restore, authentication, publication confirmation and deployment monitoring. Display changes must not create an alternative saving path.
- Do not add moving desk props, flame/smoke, cover hinges, charms or page turns while composing. The existing full public preview retains those effects. Authoring geometry controls still need visible selection/resize feedback; the reader's “no drag box on desk props” decision does not remove editor handles.
- No new framework, state library, animation engine, dependency, remote font or service. No document/storage migration is needed.
- Preserve lazy loading: the book renderer loads on Preview and interact.js on first Arrange. Do not eagerly import book effects to obtain icons or pull new art/font packages into the initial editor bundle. Report before/after initial JavaScript transfer with the same measurement method if new presentation modules are introduced.

## P0 layout and action hierarchy

Keep the page in normal document flow with window vertical scrolling. Existing drawing code uses `window.scrollBy()`, preview stores window scroll, and keyboard handling scrolls the window. Do not introduce a viewport-height, independently scrolling canvas pane without rewriting and verifying all three consumers. A horizontal overflow mat may scroll without becoming a bounded vertical scroller.

Use these layout defaults, adjusting only if measured controls do not fit:

| Viewport width | Entries | Properties | Main surface |
| --- | --- | --- | --- |
| ≥1280px | 216px left rail | Optional 240px right rail, initially closed | Single editable paper, width-fitted; reserve rail space only when open |
| 1000–1279px | 180px left rail | Explicitly opened native modal sheet | Paper gets the remaining width; no fixed idle sheet |
| 768–999px | Closed drawer opened by Entries | Explicitly opened native modal sheet | Paper uses full available width |
| <768px | Same drawer | Same sheet | Compact labeled controls; phone editing remains supported without rearranging document content |

Use actual available width, not orientation alone, to select layout. At 756×876 with a fresh blank entry, paper top should be ≤260px from the viewport top; at 834×1194, ≤240px. Main controls use at most two 56px rows. These are acceptance targets for blank/default state; a real error may add a compact message row. Do not hide essential actions merely to reach the target.

The shell has four zones:

1. **App header**, nominal 56px: brand, Entries trigger when needed, current device recovery state, Preview, and account/backup/help menu. Keep branding modest; header text uses normal readable UI type.
2. **Entry bar**, nominal 48px: labeled `#title` input, adjacent online state, primary `#github-save`, and a Publication disclosure containing `#github-publish`/`#github-unpublish`. Keep publication actions visibly distinct from saving a draft. `#github-load` remains reachable from Entries; `#github-copy` is revealed during a conflict. Collapse explanatory account details when signed out, while Sign in stays reachable.
3. **Tool shelf**, one or two rows: persistent Write / Move & resize / Draw controls; direct `+ Text box` and `+ Photos`; Undo/Redo; a small More tools disclosure for Tooth stamp, Music and paper color. Properties is shown in Arrange. Use existing action nodes/handlers exactly once. Menus may move nodes; they must not clone functional controls or IDs.
4. **Context row and workspace**: formatting only for a selected text editor in Write; ink/width/eraser/Finish doodle in Draw; selected-object summary and Properties in Arrange. The paper follows immediately. Replace the permanent multi-sentence notice with one short mode hint outside the page, optionally expanded through Help.

Use native buttons and existing dialog/popover patterns. Menus have accessible names, visible focus, Escape/outside dismissal, and focus restoration. Keep primary actions labeled; pixel icons supplement labels. Avoid hover-only discoverability, tooltips as the sole labels, and custom menus requiring a large keyboard-navigation framework.

Entry drawer and modal Properties sheet must not open automatically on selection. Open only by their buttons, support Escape, and return focus to the opener. On width changes, close/reconcile the old presentation and remove stale inert/scroll-lock state. Carry selection and property values across the change. Do not close an active property input midway through typing merely because the keyboard shrinks available height.

## P0 state and authoring behavior

### Entry navigation and recovery

Retain existing entry order and stable IDs. Each entry row displays title, existing date semantics, and a concise state label such as Device draft, Online draft, Local changes, Update pending or Live. Derive this from current post/cloud fields; do not store duplicate lifecycle state. Mark selection with an edge/tab and `aria-current`, plus a color change. Long titles wrap to two lines with full accessible text.

Keep local recovery and repository/publication state distinct. Device recovery should be continuously visible; entry-specific online state sits beside its action. Reuse `status()`, `persist()`, `updateCloudControls()` and `monitorDeployment()`. Use one live announcement per channel; do not announce the same save through new duplicate live regions.

| State | Required presentation and behavior |
| --- | --- |
| Saving locally | Device status shows Saving on this device; editing remains available |
| Local recovery saved | Saved on this device; no implication of online backup or publication |
| Storage failure or unknown recovery | Persistent actionable recovery message and Export; preserve unread payload and explicit discard/start-fresh path |
| Signed out or service unavailable | Sign in/retry details are reachable; draft editing and backup remain available |
| Online save current | Online draft saved, or published status qualified by actual deployment revision |
| Unsaved online changes | Local changes; primary label follows draft versus published save behavior |
| Publication pending/failure/unknown | Update pending or failed/unconfirmed; never Live until the tracked revision succeeds |
| Conflict | Prominent conflict state, preserved local content, existing keep-as-copy/reload choices; no silent overwrite |
| Trash | Existing management/restore contract; no normal save or publication while trashed |

Backup and Help are normal user tools. Rename “How to test” to Help. Keep unsupported recovery Export prominent even if the normal backup action moves into a menu.

### Draft readiness and fit messages

Keep `checkFit()` as the single fit proof used by existing save/publication boundaries. Do not suppress actual validation, drop pasted content or weaken server/build checks.

For an untouched blank draft, show a neutral readiness hint such as “Add a title before publishing” outside the paper. Do not show a red title outline/banner on first load. Missing-title readiness becomes an actionable error after an explicit Publish/Save & update site attempt, or a title interaction followed by leaving that input. A nonempty oversized title, font failure, or overflowing authored object still gets timely visible feedback.

Implement a small view-only disclosure/touched state keyed to the active entry ID; it does not belong in post JSON, recovery or undo. `scheduleFit()` still updates the real error set and object overflow marks. Only the message treatment changes. At an explicit publish/update attempt, await a fresh fit check, reveal/focus or scroll to the first relevant issue, and block the write as today. Draft save and export remain enabled for overflow. Do not turn every fit result into an alert that interrupts typing.

Give errors a short heading/action beside the explanation: Edit title, View overflowing object, Retry fonts. A single selected overflow target can scroll into view using existing bounds/selection. Its outlined draft stays editable on the overflow mat. Do not auto-shrink or reflow it.

### Mode controls and properties

Set `aria-pressed` on mode buttons. `aria-expanded` on Properties must reflect actual panel visibility, with `aria-controls=inspector`, rather than the hidden open preference. Default Properties closed. Arrange with no selection shows a compact external hint, not a full sheet over the paper.

Keep X/Y/Width/Rotate, photo description, Duplicate, Front/Back, Group/Ungroup, Multi-select and Delete. Retain numerical limits, aspect ratios, checkpoints and existing grouping behavior. Label Delete as destructive; preserve its existing undo path. Numerical/alt inputs require visible labels. Group selection remains distinguishable from a single object.

Only enable formatting when selection refers to an active text editor. Give B/I/H2/List/Link accessible descriptive names and pressed state from that editor. Preserve `onpointerdown.preventDefault()` and the editor's text selection when toolbar actions run. Never remount Tiptap just to update the shelf, status, panel visibility or theme.

Scale Arrange grab/resize hit regions to at least 44 screen pixels while leaving element dimensions unchanged. Reuse the existing `scale` and `point()` coordinate conversion. Handle visuals can be smaller than their hit regions. Do not reinterpret screen dimensions as stored dimensions or extend a handle over unrelated controls.

Remove `#empty` helper prose from canonical paper. One outside-the-paper prompt should offer the existing Text/Photos actions when the entry has no objects; it must not appear in rendering, measurement, export or public preview. Keep initial authored content empty. Do not change insertion placement or automatically reorganize existing/new objects in this pass.

### Zoom keyboard and preview

Add only Fit width and 100% view presets if necessary to make writing readable after freeing layout space. The zoom value is view-only, initial Fit width. Apply it through the existing stage scale and wrapper dimensions. Keep overflow-mat offsets and pointer conversion shared; no CSS transform on individual text editors. Native browser zoom/pinch remains available.

If presets are implemented, preserve the selected object/caret's visible position when changing scale, test canonical coordinates before/after drawing and arranging at both presets, and expose the active preset accessibly. Omit arbitrary zoom sliders, new touch gesture recognizers and a second camera module.

Keep `visualViewport` handling outside document coordinates. The keyboard rail uses the existing save/update action and status; disable it under the same conditions as the primary button. Keep the caret, title input and property fields visible above the reported keyboard and rail. Respect safe-area insets. Do not force viewport meta scaling restrictions or change pen/finger event ownership.

Measure the actual app header height with one ResizeObserver and expose a CSS custom property used by preview top/height. Remove the hardcoded 56px/100px preview offsets. Preview mounts the same `mountBook()` with the active unsaved entry, `history:false`, `preview:true` and existing reading fallback. It must not publish, modify entry content or use demo defaults.

On return, dispose the book/effects, restore editor window scroll and focus to the previously focused surviving input/editor with its existing selection. Restore only if the same entry/element still exists; otherwise focus Entry title. Avoid recovery mutations/undo checkpoints caused solely by returning. Keep the editor DOM mounted during preview. Failed lazy loading must return to a usable editor with unsaved content intact.

## P1 visual direction and asset reuse

Use `shared/book/theme.css` tokens, `shared/notebook.css`, existing grain and `public/book/desk-wood.png`. The editable page sits on warm pixel wood with a restrained apple-green backing edge/spine and pale stitching. The desk is static, with low visual contrast; controls sit on cream/apple/blush surfaces instead of a wall of dark panels.

- Workspace: reuse the repeating wood tile at a stable scale, not a stretched photograph. Keep the overflow mat distinguishable from canonical paper. Borders and ornaments live outside the 900×1200 page and never block pointers.
- Paper support: a 12–20 screen-pixel green edge and a small stepped shadow suggest the diary, without the full reader cover or animated opening. Preserve overflow visibility and mat offsets; decorative layers must have `pointer-events:none`, `aria-hidden=true`, and no effect on fit bounds.
- Tool shelf: flat green/cream surfaces, 2px seams, restrained pixel corners and a small blush active marker. Selected mode has text/pressed state as well as color. Prefer 14–16px system sans for functional UI; Kalam for brand and modest section headings. Do not use handwriting or VT323 for all controls, warnings or long form descriptions.
- Entries: resemble plain index tabs, not miniature rendered page screenshots. Reuse one tiny tooth/star ornament in the shelf/brand at most. Keep entry title/date/state readable and normal-resolution.
- Dialogs: align Help, Entries, Properties and Music with the same cream surface, green seams and blush accents. Keep remote Spotify artwork/logo unchanged with the existing official attribution. Do not import the public MP3 interaction into authoring.
- Motion: brief 120–160ms opacity/translation for a deliberately opened menu or panel; no page/caret/toolbar movement while typing. Reduced motion switches instantly. No idle particles, glow, decorative loops or bouncy input fields.

These defaults are the creative direction for implementation; additional interviews are unnecessary unless a proposed change alters authored content, saving behavior or the scope above. Use existing PNGs or CSS for furniture. New artwork is unnecessary for the first pass; if an asset truly changes, follow the original sprite/manifest/license pipeline rather than overwriting an export alone.

Keep new styles under `.studio`/a dedicated studio-shell class. Public preview inside the studio must continue to use book/desk styles; avoid broad selectors affecting all nested buttons, articles or images. Consolidate only obsolete rules in touched studio files. Preserve shared canonical typography. No whole-project CSS rewrite.

## Implementation map and sequence

| Area | Existing source and entry points | Required reach |
| --- | --- | --- |
| Shell and action nodes | `src/main.js` initial markup and handler wiring | Move/reuse stable IDs, contextual shelves, native disclosures, prototype/help cleanup |
| Entry and status display | `renderEntries`, `status`, `updateCloudControls`, `openOnlineEntries` | Entry labels, recovery/online distinction, account/publication grouping; preserve save service |
| Mode and selection | `updateMode`, `updateSelection`, `mount` | Pressed/expanded semantics, panel state, selection target, screen-size handles |
| Layout and camera scale | `updateStage`, `setObjectStyle`, `point`, `paths`, `updateKeyboardViewport` | Available-width layout, optional presets, caret visibility, unchanged canonical offsets |
| Fit and publication | `scheduleFit`, `checkFit`, `saveOnline` | Neutral untouched draft readiness, fresh action-time proof, actionable error display |
| Preview | `showPreview`, `showReadingPreview`, `#preview` handler | Measured header offset, lifecycle disposal, focus/scroll restoration |
| Styling | `src/notebook-studio.css`, affected `src/style.css`, `src/cloud.css` | One coherent breakpoint scheme and scoped furniture/dialogs; preserve canonical CSS |
| Shared reusable surfaces | `shared/paper.js`, `shared/paper.css`, notebook/theme files | Reuse; change shared contracts only for a demonstrated consistency issue |
| Documentation and checks | Relevant tests below and scoped guidance | Update selectors/contracts and record actual verification, then refresh handoff |

Recommended implementation order:

1. Record baseline screenshots, serialized fixture content and current recovery/save paths. Fix disclosure semantics, contextual controls and blank-draft readiness first.
2. Reorganize stable action nodes and implement responsive Entries/Properties presentation. Verify focused editing and save labels before visual polish.
3. Reconcile `updateStage()` available width, optional zoom presets, screen-size handles, keyboard rail and measured preview header. Keep live editors mounted for presentation-only updates.
4. Apply desk/furniture/shelf/dialog styling and remove only corresponding legacy CSS/prototype copy. Check the editor and mounted public preview together.
5. Run regression and visual checks, fix failures, update guidance made stale by the actual implementation and leave a precise local handoff.

Do not extract the entire application, cloud state or storage into a new architecture. If shell construction becomes hard to read, extract only its markup/control construction to a focused `src/studio-ui.js` using callbacks to existing handlers. Keep `book`, active ID, editors, selection, save chain and undo as their current single sources of truth. No speculative event bus or duplicated state store.

`#stress`/`stressEntry()` is used by existing capacity checks. Hide that user-facing action behind `import.meta.env.DEV` and a development-only controls disclosure; keep the same ID for fixtures or update every caller. It must not appear in production UI. Do not disable stress/overflow tests or remove their fixture capacity. Replace stale claims such as “Nothing is published yet” with derived state or remove them; do not reintroduce hidden marketing copy.

## Verification and completion criteria

A layout-only change still needs input, recovery and lifecycle regressions. Inspect test URLs/fixture requirements before running; pass URL arguments where supported rather than changing ports globally. Preserve existing semantic labels or update all affected callers when labels change.

| Gate | Evidence required |
| --- | --- |
| Content integrity | Unchanged serialized coordinates, IDs, groups, music and supported rich-text marks before/after panel toggles, viewport changes, optional zoom and preview return; no presentation-only undo entries |
| Writing | New/long text, real supported Docs-style HTML fixture, selection-preserving formatting, focus states, reload and recovery |
| Arrange | Text/photo/ink selection, group movement, numerical edits, aspect-preserving resize, duplicate/delete/undo; ≥44px screen hit regions at narrow and 100% views |
| Draw | Existing pen/palm/finger and pointercancel tests; stored points remain canonical at changed viewport/scale; finger navigation reaches overflow content |
| Keyboard | All menus/dialogs reachable and dismissible; truthful pressed/expanded state; focus restored; no focus trapped in a hidden drawer after resize |
| Fit | Fresh blank draft uses neutral readiness; attempted invalid publication is blocked; overflowing/long-title drafts remain recoverable/exportable; fonts failure does not become fit success |
| Save and privacy | Mock signed-out/save/conflict/build-failure paths preserve local work and receipts; exact-revision deployment labels remain truthful; draft/trash exclusion unchanged |
| Preview | Unsaved title/text/ink/photos/music match shared notebook; measured header never obscures close/back; return restores scroll/focus/selection; no route/history or content mutation |
| Visual | 1440×900, 1280×800, 1024×1366, 1366×1024, 834×1194, 1194×834, 756×876, 390×844 and 320×568; blank, selected text/photo, Arrange, Draw, open menus/dialogs, recovery/error, keyboard simulation, preview and reduced motion |

Run `npm test`, `npm run build`, `npm run build:blog`. Run affected `tests/browser.mjs`, `drawing.mjs`, `notebook-studio.mjs`, `reliability-browser.mjs`, `cloud-browser.mjs`, `music-browser.mjs` and `music-editor-races.mjs`; use the existing tests as the behavior baseline. Add one focused `tests/studio-shell.mjs` for readiness/disclosure state, responsive action reachability, presentation-only content invariance, preview return and production/development controls. Extend coordinate or keyboard checks where behavior changed, rather than testing CSS class names alone.

If shared rendering/output changes, run `tests/blog-build.mjs` and `tests/public-browser.mjs`, then rebuild real content. If backend/security changes unexpectedly become necessary, stop expanding scope silently, explain the need, and run `npm run test:server`; this spec requires no such changes. Always check `git diff --check` and final actual-content output. Do not leave synthetic fixtures in the release output.

Visually inspect every required layout state, control contrast, 200%/400% zoom and focused error targets. Use mock keyboard metrics only as simulation. Actual iPad Safari/Pencil/onscreen keyboard, actual Google Docs clipboard and mobile Safari remain device gates; desktop touch simulation does not prove them. Record failures and limits without marking them as passes. No claim of device performance or accessibility conformance follows from screenshots alone.

Completion means the P0/P1 behavior and visual system are implemented, tests/builds pass, the public view has no regression, documentation matches the actual change, and content/unknown recovery are preserved. Keep any unfinished criterion explicit in the handoff. Deployment remains separate and unauthorized.

## Deferred work

P2: free zoom sliders/custom pinch, full animated editor book, moving desk props, page templates, auto-placement/rearrangement, new stickers/cropping/borders, music playback/account sync, full offline reopening, schema/storage changes, new services and broad application refactors. None is necessary to make this editor clearer or visually consistent with the notebook.
