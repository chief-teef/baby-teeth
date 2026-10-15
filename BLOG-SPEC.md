# Blog specification and implementation plan

## Discord announcement decisions — October 14, 2026

Announce new public entries to one Discord text channel only after successful public deployment and live-permalink verification. The implementation uses an incoming webhook, GitHub Actions, a published-only manifest, and durable state on the separate `codex/discord-announcement-state` branch. It preserves RSS and existing publication behavior. The workflow requires both publishing and announcement enable variables; deployment with delivery disabled does not authorize webhook setup, state initialization or live messages.

First activation explicitly and silently baselines the entire live public list. Baseline and confirmed IDs remain excluded across edits, date changes, unpublishing and republishing. Reconciliation catches every still-public missed entry, oldest publication date then ID, at most three eligible candidates per run. It runs hourly as well as after successful publication. Uncertain delivery retries automatically on later reconciliation; occasional duplicate messages are accepted, including a successful send whose confirmation could not be durably saved. There is no exactly-once or delivery-time guarantee. Pending absent entries wait until public again; existing Discord messages are not removed on unpublish.

Missing/corrupt/conflicting history stops delivery instead of resetting state. Provider rate limits defer attempts; a definitively missing webhook suspends that exact URL until the secret changes. History survives webhook rotation. No bot, paid integration, studio UI, generated summary/image, multiple channels or synthetic production test entries are included. Detailed contract: `docs/discord-announcements-spec.md`; secure owner activation and repair: `SETUP.md`. Implementation and deployment verification are recorded in the handoff; live delivery requires separate owner authorization.

## Latest design direction — October 13, 2026

See [bbyteeth design specification](BBYTEETH-DESIGN-SPEC.md) for the interviewed visual overhaul and implementation acceptance criteria. Confirmed target: lowercase `bbyteeth`; an apple-green/blush, glossy pixel-art diary with clasp and tooth/star/heart charms in animated outer space; closed on arrival, opening to the latest entry; physical page turns with optional sound; close, drag, and smooth page zoom. Public filler copy is removed; real entry titles/dates use uniform handwriting styling.

New entries are limited to one fixed notebook page with the same composition on every device, prioritizing iPad/desktop. This supersedes earlier growing-height pages, stacked feed, and default phone reflow for the new format. The owner authorized deleting disposable pre-launch entries and retiring legacy format/conversion support; v2 fixed pages are now the sole entry contract. Studio styling is delegated. Numerical design/engineering details are implementation defaults, not already tested behavior. Latest owner direction replaces space with a distressed walnut desk, adds a pickup lighter with a bounded flame simulation, simplifies stars, and fixes the menu in viewport coordinates independently of book movement. The local implementation now includes the v2 notebook contract, shared book reader, layered pixel assets, studio overflow checks, a drawing-based tooth stamp, browser-local paper colors and canonical rendered publication gate. Deployment remains unchanged; target-device acceptance remains pending. See `docs/notebook-verification.md` for evidence and remaining checks. Historical checkpoints below describe earlier states and must not override these newer product decisions.

Status: core editor tested successfully by the owner on iPad. Repository persistence, sign-in, and the public blog are implemented and locally checked; live Cloudflare/GitHub App activation remains pending. The existing public prototype remains at https://chief-teef.github.io/baby-teeth/.
Updated: October 12, 2026.

## First test checkpoint

- Implemented: Tiptap rich text, explicit Write/Arrange/Draw modes, photo resizing/rotation/layers/grouping, Pencil/mouse ink, undo/redo, IndexedDB local recovery, JSON backup export/import, and stacked reading previews with automatic phone text reflow.
- Capacity fixture: 20 sample photos and 30 text boxes. Desktop browser checks cover editing, recovery after reload, rotation undo, drawing, capacity fixture, and phone text overflow. Actual iPad keyboard/Pencil feel and real-photo batch memory remain for the owner to test.
- Hosting: free GitHub Pages from `main:/docs`; deployed editor code is public, while test entries/assets remain in each browser's local storage. They are not sent to GitHub or synchronized across devices.
- Prototype limits: no repository saves/public post publishing or full offline reopening; HEIC support depends on browser decoding; each completed ink stroke is its own drawing object (grouping is available), and eraser removes the last stroke of the object under the pointer. Re-editing transformed ink and pressure-sensitive brushes remain pending.
- Owner requested bright green/pink early-2000s girly Myspace styling and older fonts during testing; applied to editor and reading preview.
- First feedback fixes: disable native panning before Pencil gestures in Draw mode, explicitly scroll for fingers, ignore palm contacts during ink, and track the active ink pointer. Movement controls are labeled “Move & resize” with visible Drag labels and larger resize handles. Removed selection's pointer propagation block so the gesture library can start dragging. Regression checks exercise real drag/resize plus trusted pen/touch input in Edge; actual iPad Safari retest remains necessary.

## Confirmed requirements

- Simple, ad-free public personal blog. Initially, one owner has editing access; support for a second trusted editor is planned for later.
- Future collaborator does not yet have a GitHub account. Defer invitations and multi-account access until the owner supplies their account and desired permissions; record this as planned scope rather than requiring setup now.
- Strict $0 operating cost. GitHub Pages is the preferred public host. Select only services and libraries usable without payment; paid upgrades are not an acceptable fallback.
- Author from iPhone, iPad, and desktop. Write directly in the editor or paste formatted text from Google Docs.
- Primary authoring device: iPad Pro with the newest Apple Pencil as described by the owner, using the onscreen keyboard; desktop secondary; phone occasional. Confirm exact hardware/OS during device testing rather than inferring a Pencil model. Prioritize iPad composition, Pencil handling, and onscreen keyboard behavior in the prototype.
- Arrange a post once; automatically adapt it to other screen sizes, with optional manual fixes. Maintaining three layouts for every post is not the intended workflow.
- Saving an already published post should automatically update it for readers after a successful deployment. First publication remains explicit.
- Approximately daily posts and a few dozen photos per month.
- Capacity target: comfortably support a single entry containing 20 photos and 30 independently editable rich-text boxes, plus Pencil drawings. This is a supported large-entry scenario, not an estimate of every entry or a hard maximum.
- Owner has created a GitHub account. Connect development access and select/create the repository before online saves and publishing. Local prototype work can proceed before connection.
- Development GitHub connection verified October 12 for `chief-teef` (account ID `341668853`). Selected public repository: `chief-teef/baby-teeth` (repository ID `1416133666`), default branch `main`. Connector reports admin and push access. This developer connection does not configure the future editor's sign-in.
- Freeform composition: drag, resize, layer, and rotate text, photos, and drawings directly on the page.
- Compose with scattered scrapbook text boxes and substantial placement freedom. Each entry can grow vertically; entries stack vertically in the public feed.
- Draw directly on entries with Apple Pencil. Freehand drawing is in scope; automatic handwriting-to-text conversion is not requested.
- Start each new entry blank; reusable entry templates are not required.
- Photos support resizing, rotation, positioning, layering, and grouping. No cropping tool or decorative borders for now.
- Offline writing, arranging, and drawing are nice-to-have features, not launch blockers. Local recovery remains required even if full offline support is deferred.
- Phone adaptation is delegated to implementation judgment; prioritize readable text and preserve related decorations without requiring a separate authored phone layout.
- Preserve the intended composition across device sizes while keeping text readable.
- Stickers are deferred entirely for now, including API search, uploaded sticker tooling, and animated sticker handling.
- Public repository content, including saved drafts and uploaded assets, is acceptable to the owner.
- Confirmed style direction: tacky, bright, early-2000s Myspace girly style in green and pink, with older fonts and an authentic period feel. Use hot pink/lime, tiled sparkle/checker patterns, square beveled controls, and web-safe Comic Sans/Verdana/Times families with device fallbacks. Refine styling during testing; sticker tooling remains deferred.

## Architecture

### Implemented second phase, awaiting live activation

- Cloudflare Workers Free hosts the connected editor and API at one origin. KV Free stores short-lived encrypted GitHub sessions; browser cookies contain random session identifiers only. Keep the account on Free and do not enable chargeable products.
- A private GitHub App uses state plus PKCE, expiring user access tokens restricted to repository ID `1416133666`, and a fixed owner account-ID check. Initial permission requirements: Contents read/write, Actions read, and Metadata read; only `baby-teeth` is installed. Future collaborator access remains deferred.
- Photos are processed on the device and uploaded individually as bounded JPEGs. Server checks dimensions/structure and strips EXIF/comments; uploaded blobs are staged until a signed receipt is included in the atomic document/tree save. The public build fully decodes referenced JPEGs before deployment.
- Draft saving remains separate from first publication. Saving a published entry requests a site update; unpublishing keeps a repository draft but removes its public output on successful deployment. Stable URLs use immutable post IDs.
- Per-entry revisions and non-forced Git ref updates reject stale or racing saves. The editor preserves work, offers a new-copy fallback, and retains a recovery copy when opening a newer online entry.
- Astro generates the feed (five full entries/page), stable post pages, About, archive, RSS, sitemap, and 404. Editor preview and public reader share document HTML/layout code. Narrow screens stack readable text and anchored media; widths below 800 pixels use the readable flow.
- Public builds exclude all draft documents and copy only published media. The Actions workflow is inactive until `BLOG_PUBLISHING_ENABLED=true` and Pages is switched to GitHub Actions, preserving the current editor preview during setup.
- Verified locally: authorization/CSRF/state/PKCE, encrypted sessions and logout, staged assets, draft/publish/update transitions, revision races, editor recovery/copy controls, static page generation, pagination, draft text/media exclusion, JPEG decoding, phone/desktop reader, and Worker packaging.
- Still to verify live: Free plan, account deployment access, GitHub App installation/client credentials, KV binding, iPad sign-in/cookies, actual GitHub writes/build triggers, deployed revision status, and upload CPU usage on Workers Free. Complete [SETUP.md](SETUP.md) before declaring this phase launched.

Public blog: Astro generates static pages deployed to GitHub Pages through GitHub Actions. The reader receives text as real HTML, images, and a lightweight layout renderer; no editor framework is needed for reading.

Custom editor: a browser application with rich-text editing inside a DOM-based freeform canvas. This replaces the previous Pages CMS proposal. Select the rich-text and gesture libraries during a prototype after checking current licenses and compatibility; do not build text editing primitives from scratch.

Saving service: proposed small separately hosted authenticated service exchanges GitHub sign-in credentials and writes posts/assets to the selected repository. GitHub Pages cannot run this service. A genuinely free plan with no chargeable overage is a feasibility gate; verify current quotas, account requirements, and whether billing can be disabled before selection. If no suitable free service qualifies, redesign persistence rather than adding a paid dependency. Keep write tokens server-side; authorize every write against the fixed repository and an explicit allowlist of immutable GitHub account IDs. Initially the allowlist contains only the owner; leave room for per-account draft/publish roles later. Use secure sessions, CSRF protection, upload limits, and validated request bodies.

Storage: versioned JSON post documents containing rich-text nodes and layout data, plus processed photo files. Shared renderer and schema between editor and public site prevent divergent rendering. Generate plain-text excerpts, RSS, sharing metadata, and search-engine-readable content from the document model.

Flow for a new post: sign in → create post → write/paste → upload photos → arrange and decorate → preview sizes → save draft → publish → automated build → public post. For an already published post, explicit Save also requests an updated deployment; local recovery autosave never publishes.

## Writing and editing

- Tap or click an empty area to create a text box; type directly inside it.
- Distinct writing, arranging, and drawing modes. Writing mode makes selection, cursor movement, scrolling, and onscreen keyboards reliable; arranging mode enables dragging/resizing handles; drawing mode captures ink without accidentally creating text boxes or moving objects. On iPad, keep the active text and essential toolbar visible when the keyboard opens, including split-screen and orientation changes.
- Rich-text toolbar for headings, bold, italic, links, and lists. Normalize Google Docs fonts and spacing to the blog's own text styles while retaining semantic formatting.
- Preserve supported formatting from Google Docs on all actual devices. Upload photos separately; embedded Docs images and complex tables are not assumed to transfer.
- Undo/redo for text and canvas changes, duplicate/delete, rotation, layer order, grouping, alignment guides, optional snapping, and keyboard controls.
- Local recovery autosave with a clear saved/unsaved state; explicit repository save and explicit first publication. Save on an already published post requests an update to the live site. Never present local-only changes as saved to GitHub or repository saves as already live.
- Detect stale document revisions to prevent a phone save overwriting newer desktop changes. Warn before navigating away with unsaved changes.
- iPad touch and Pencil support include arranging and direct freehand drawing; handwriting recognition is deferred.
- Post metadata: stable ID/slug, title, publication date, summary, cover image, draft/published state, and optional tags.

## Responsive freeform layout contract

Arbitrary desktop coordinates cannot both scale identically and keep long text comfortably readable on a phone. Provide intentional responsive layouts instead of promising pixel-identical rendering everywhere.

- Each post is a vertically expanding canvas with arbitrary placement, overlap, size, rotation, and z-order.
- Compute each entry's height from its content bounds, including rotated elements and ink, with bottom padding. Entries must not overlap neighboring entries in the feed; no fixed page-height cutoff.
- Chosen phone approach: stack text boxes and anchored media groups in reading order. Preserve drawing placement within each group, reflow typed text at readable sizes, and retain overlap where it fits. When text-over-photo placement cannot stay readable, move the text adjacent to the group. Offer optional corrections in preview.
- Store coordinates relative to a reference canvas, not the editor window. Group elements to preserve relationships such as a doodle attached to a photo.
- One authored layout is the normal workflow. Desktop, tablet, and phone views share text/assets and derive their arrangement automatically; optional manual placement overrides must not require maintaining three independent compositions.
- Generate narrow-screen arrangements using reading order and anchored groups, then allow optional adjustments. Automatic adaptation must be good enough for typical posts without recurring repairs; prove this during the prototype. Unrestricted overlap with long text remains a feasibility risk, not a solved conversion problem.
- Within each variant, adapt positions and widths to the available width, enforce readable text sizes, and measure text height. Detect overflow and unintended collisions after text edits or viewport changes; offer manual correction rather than silently destroying intentional overlaps.
- Provide an optional proportional-scaling preview for faithful collage appearance; warn when text becomes too small. It is not the default long-form reading strategy.
- A phone-authored layout can be the primary layout; derive wider layouts from it. Device preview controls show the actual published renderer.
- Preserve a logical reading order independent of visual coordinates. Expose meaningful text and alt text to accessibility tools; decorative drawings are excluded from that reading order.
- Respect reduced motion for any interface or site animation. Animated media tooling is deferred with stickers.

## Direct drawing

Confirmed: draw directly on the scrapbook entry with Apple Pencil. Proposed initial tools: pen with color and width controls, stroke eraser, and undo/redo. Pressure-sensitive width is an enhancement to test on the actual device; advanced brushes and handwriting recognition are deferred.

- Store editable strokes as validated points and brush properties in local drawing-object coordinates. Render the saved geometry consistently in the editor and public site; do not flatten the whole post into an image.
- Treat a completed doodle as an object that can be moved, resized, rotated, layered, and grouped with a photo or text box. Allow returning to its drawing mode for edits.
- Drawings attached to a photo move and scale with that photo on phones. Independent doodles participate in reading order as their own objects. Cross-object drawings such as an arrow spanning two unrelated boxes may lose their meaning after reflow; encourage grouping and flag affected compositions in preview.
- In drawing mode, Pencil draws and fingers navigate by default. Test palm contacts, interrupted strokes, scrolling near the bottom, zoom, and device rotation. Use explicit mode controls rather than relying solely on device-specific Pencil gestures.
- Include strokes in local recovery, revision checks, save/reopen, and undo history. Keep long drawings responsive through measured point simplification and bounded document complexity.
- Decorative ink is excluded from screen-reader order. Meaningful drawings or handwritten words need a text description; ink alone does not provide searchable or accessible text.

## Photos

Keep photo aspect ratio when resizing by default; allow free rotation, placement, layering, and grouping with text or drawings. Preserve the whole image rather than cropping it to fill a box. Cropping and decorative borders are out of scope for now. Captions can use ordinary scrapbook text boxes grouped with the photo; no dedicated caption tool is required by default.

Test actual iPhone photo selection, HEIC, Live Photo stills, orientation, and batch upload. Convert and compress before files enter the public repository; remove location metadata before upload. Aim for approximately 200–500 KB per ordinary displayed photo, adjusted for quality. Keep original photos in the owner's existing backup.

Produce responsive derivatives and explicit image dimensions. At 30–50 photos/month, 200–500 KB originals add roughly 72–300 MB/year before derivatives and Git history. Monitor repository and published-site size; build-time compression does not shrink already committed originals.

The monthly estimate above is separate from the 20-photo per-entry capacity target. If 20 photos were uploaded daily, at 200–500 KB each that would add approximately 1.46–3.65 GB/year before derivatives and Git history. Do not assume that frequency; monitor actual usage and define a zero-cost storage migration or archival plan before capacity is exhausted.

For a 20-photo entry, process uploads with bounded concurrency rather than decoding all full-resolution images at once. Use smaller editor previews, release unused decoded images, show per-file progress/failures, and allow failed files to be retried without restarting the batch. Keep the whole composition editable without requiring all photos to be loaded at original resolution.

## Deferred stickers

Owner decision October 12: abandon stickers for now. No provider selection, API keys, search drawer, dedicated sticker uploads, attribution integration, or sticker acceptance gates in the initial release. Revisit only if requested later and compatible with the strict $0 requirement. Direct Pencil drawings provide the initial decoration tools.

## Hosting, security, and recovery

- GitHub Free Pages uses a public source repository in the straightforward arrangement. Draft exclusion hides posts from the blog, not from repository files/history; owner accepts this.
- Use a free github.io address. A paid custom domain is excluded under the strict $0 requirement.
- Prior proposal records a 1 GB published-site limit, recommended 1 GB source repository limit, and soft 100 GB/month bandwidth limit. Reverify current GitHub limits before provisioning; these figures were not rechecked in this specification review. Review capacity annually or when either site/repository reaches 500 MB.
- Enable HTTPS enforcement and protect owner sign-in with two-factor authentication/passkey and recovery access.
- Editor controls may be publicly reachable; authorization of writes is the security boundary. Use least-privilege repository access, no tokens in browser bundles or post documents, and minimal build permissions.
- Validate document schemas; sanitize pasted rich text, reject executable content and unsafe URLs, validate/decode uploads, and constrain media source domains.
- Actions publishes only validated content; failed builds leave the last successfully deployed site available. Distinguish saved, publishing, published, and failed states.
- Maintain independent content/repository backups. Deleting a file does not remove it from public Git history.
- The custom editor adds maintenance beyond a hosted CMS. Strict $0 is a selection and launch gate: verify free quotas, prevent chargeable overages, and document behavior at quota exhaustion. Preserve local work and explain retry/export options when online saving is unavailable; never silently upgrade or enable billing. Future provider changes may require migration or reduced scope to maintain $0.

Sources:
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Astro GitHub Pages deployment](https://docs.astro.build/en/guides/deploy/github/)

## Public blog scope

Home page with newest scrapbook entries stacked vertically and pagination, individual stable post URLs, About page, archive, RSS, sharing metadata, and a not-found page. Default to displaying full entry compositions in the feed, with lazy-loaded offscreen media; page size remains an implementation choice based on performance. No reader account required. Comments, newsletters, video hosting, scheduling, private posts, and collaborative editing are deferred.

## Later: a second trusted editor

Owner request October 12: allow another person to edit the blog later. Their GitHub account has not been created yet, so this feature is deferred while owner saving and publishing are implemented.

- Each person signs in with their own GitHub account; do not share the owner's credentials or a browser session.
- Repository write access and editor authorization are separate requirements. Use a repository collaborator invitation for normal writing access; transferring repository ownership is not required for editing.
- Before inviting or enabling the account, confirm its username/immutable account ID and whether it may publish or only save drafts. Repository collaboration alone must not automatically authorize editor access.
- Proposed editor roles: owner (drafts and publishing), publisher (drafts and publishing), and draft editor (drafts only). For draft-only access, saving edits to a published entry must retain them as unpublished changes; it must not trigger the owner's confirmed “Save & update site” behavior. Resolve repository permissions as part of this role design, since unrestricted repository write access can bypass editor-only restrictions.
- Record the authenticated account responsible for saves and publication in server-generated audit metadata. Do not trust client-supplied author IDs as proof of authorization.
- Preserve revision conflict detection across accounts as well as devices. This is sequential shared editing; simultaneous live co-editing is a separate deferred feature.
- Document removing repository access and editor access, and invalidate that person's active sessions when removing editor authorization.
- Maintain the strict $0 operating requirement when adding a second editor.

## Implementation plan

1. **Prove the custom editor locally.** Neutral sample post with scattered text boxes, Google Docs paste, photos, Pencil drawing, layers, touch controls, onscreen keyboard, undo/redo, recovery, and three device previews. Test a short daily post, a long post, and multiple vertically stacked entries. No final styling yet.
2. **Resolve dependencies and feasibility.** Choose editor libraries and authenticated save-service host based on licenses, verified zero-cost operation, quotas, and iPhone/iPad behavior. Confirm GitHub account/repository. Do not call the architecture settled until these checks pass.
3. **Connect persistence and publishing.** Implement owner-only sign-in, validated JSON/assets, revision conflict checks, draft state, explicit publishing, GitHub Actions, and status feedback. Verify image preprocessing before repository upload.
4. **Complete blog foundation.** Shared responsive renderer, public pages, stable URLs, metadata/RSS, accessibility, reduced motion, capacity monitoring, backups, and recovery guide.
5. **Styling interview.** Discuss blog identity, references, fonts, colors, background, navigation, and collage defaults once the hard implementation details are settled.
6. **Apply design and launch.** Test representative real posts on iPhone, iPad, and desktop and deliver a short publishing guide.

## Acceptance gates

- Comfortable direct writing with iPad Pro onscreen keyboard and Pencil, plus occasional phone use; reliable separation of typing, arranging, and drawing.
- Supported Google Docs formatting survives paste/save/reopen/publish on all devices.
- Photos, text, and drawings can be placed, resized, layered, grouped, and rotated; editor preview matches the published renderer.
- A test entry with 20 photos, 30 text boxes, and representative Pencil drawings can be composed, scrolled, transformed, saved, reopened, and published on the actual iPad Pro. Typing and drawing remain responsive during photo processing; no browser crash, lost input, or clipped entry content. Measure behavior on-device before setting formal performance budgets or upper limits.
- Pencil ink survives save/reopen/publish; drawing objects can be edited and transformed. Phone adaptation preserves attached doodles, and entry height includes drawings without clipping or overlap into the next entry.
- Long text stays readable; edits flag responsive overflow rather than causing silent clipping.
- Phone/tablet/desktop variants share content and preserve authored overrides.
- Autosave recovery, undo/redo, and cross-device revision conflicts work.
- Only the owner can write; logged-out readers cannot mutate content.
- Drafts absent from public blog routes, RSS, sitemap, and deployment output; repository visibility documented.
- Zero-cost hosting, authentication, storage, and build operation verified; no chargeable overage enabled. Quota exhaustion preserves recoverable work and the last successfully deployed site.
- Aim for five minutes of hands-on publishing for a prepared short post and three photos, excluding composition and background deployment; freeform decorating may take longer.
- Successful backup restoration and failed-build recovery demonstrated.

## Remaining technical inputs

Owner has created a GitHub account; development authentication and repository setup follow. Remaining technical work: verify a free saving-service arrangement, record browser/OS and exact device details during testing, choose an independent backup destination before launch, and prove the 20-photo/30-text-box capacity target. iPad Pro with newest Pencil and onscreen keyboard is confirmed as the main setup. Drawing and scattered text boxes are confirmed; phone adaptation is delegated to implementation judgment. Offline support is desirable but optional for launch; stickers are deferred. The next milestone is the local editor feasibility prototype, not a styling interview.

## Implementation review: proposed details and concerns

The following details are engineering proposals unless explicitly identified above as confirmed. User-facing tradeoffs remain open for the interview; do not silently treat proposals as approved requirements.

### Arrange-once feasibility

- The main technical risk is combining arbitrary overlapping elements, changing text height, and automatic responsive adaptation. Test this before implementing the full editor or choosing a final schema.
- Chosen adaptation model under delegated implementation judgment: preserve local arrangements within anchored photo/drawing groups; place text and groups in a logical vertical sequence when space becomes narrow. Verify text-over-photo behavior with representative examples using the phone contract above.
- Store stable element IDs, explicit reading order, anchors, group membership, intrinsic media dimensions, rotation, and optional per-view overrides. Avoid deriving reading order from coordinates alone.
- Changing text updates all views. Manual overrides survive regeneration; edits that invalidate them produce a targeted warning. Deleting an element also removes its overrides and group references.
- Text boxes grow vertically as text changes. Resizing width reflows text; proposed default is that resizing does not shrink the font. Clarify whether intentional text scaling is also wanted.
- Bound nested groups and define their resize/rotation behavior. Detect clipping using transformed bounds; intentional overlap is allowed. Provide non-drag controls for position, size, rotation, and layer order.
- Render readable HTML without waiting for client-side measurement. Prototype font loading, image loading, browser zoom, and intermediate widths to verify that later measurements do not hide or overlap essential text.

### iPad and Pencil interaction

- Pencil arranging and freehand drawing are in scope. Implement and test the direct-drawing contract above; handwriting-to-text conversion remains deferred.
- Prototype Pencil selection and handles, finger scrolling, pinch zoom, text selection, keyboard appearance, portrait/landscape rotation, and accidental touches on the actual iPad.
- Define how to create a text box without accidentally creating one while scrolling. Make mode state obvious and keep a clear escape from editing to arranging.
- New entries start blank. Photo cropping, decorative borders, and reusable entry templates are excluded from initial scope. Use grouped text boxes for captions by default; retain element duplication as an arranging tool.

### Save, publish, and recovery semantics

- Confirmed: local autosave is recovery only; new posts need explicit first publication; explicit Save on a published post requests a live update. Label the latter action clearly, for example “Save & update site.”
- Saving a draft must never publish it, including when another post triggers a whole-site rebuild. Export only published documents and their referenced assets; do not copy the entire upload directory into the deployment.
- Commit each document and its referenced new assets atomically, or stage assets until a complete save is possible. A canceled or failed upload must not leave a saved post pointing at missing media.
- Associate save and deployment states with a revision ID. Show “Live” only when that revision is deployed. Queue/coalesce updates so an older build cannot overwrite a newer successful deployment.
- Reject stale saves on the server. Preserve unsaved work and offer reload, export, or save-as-copy; never silently replace newer content. Test two tabs as well as two devices.
- Persist recovery data continuously in browser storage, including pending asset references. Mobile app termination may provide no navigation warning. Show recovery age and distinguish this-device recovery from cross-device repository saves.
- Browser storage can be cleared or evicted; it is not a backup. Proposed fallback is an exportable document plus assets when online saving fails. Offline editing is a nice-to-have governed by the contract below.
- Define unpublish, delete, and restore separately. Unpublishing removes generated routes/feed entries on the next successful deployment; repository history, caches, and external copies may retain prior content.
- Keep slugs stable when titles change. Specify collision handling, timezone for publication dates, ordering of same-day posts, and whether a changed slug requires a redirect.

### Optional offline editing contract

- Target writing, arranging, and drawing in a previously loaded editor, using locally available entries/assets, plus creating blank entries. First-time loading, sign-in, fetching uncached posts, and publishing require connectivity.
- Cache the editor shell with versioned assets and store documents and pending media locally. Do not cache authentication responses or credentials. An editor update must preserve recoverable work and migrate document versions safely.
- Show whether work is saved on this device, saved to the repository, or live. Offline work is only on that device until a successful online save; reconnecting alone does not make it available on another device.
- Proposed initial reconnection behavior: prompt the author to save online rather than automatically publish queued changes. Explicit online Save on a published entry still updates the site as confirmed. Retry the same save safely without creating duplicate posts or uploads.
- Compare the offline document's base revision against the latest repository revision before saving. On conflict, preserve both versions and offer recovery/copy controls; do not silently overwrite either one.
- Local photo insertion works only when the selected file is available on the device and supported preprocessing can run locally. Cloud-only photos and server-dependent conversions wait for connectivity with a clear pending state.
- If included, verify offline reopening after an initial online visit, drawing/text recovery after closing the browser, pending media recovery, reconnect after session expiry, and a conflicting edit from another device. If this proves too costly for the first release, retain required local recovery and defer offline reopening/sync features.

### Media, security, and operating limits

- Choose where HEIC conversion and metadata stripping happen after testing real device uploads. Browser conversion may be memory-heavy; server conversion may exceed the saving service's runtime limits. Do not commit originals while waiting for conversion.
- Establish maximum input file size, decoded pixel count, batch size, post length, and element count from prototype measurements. Avoid inventing limits before representative posts are available.
- Treat 20 photos and 30 text boxes as the minimum large-entry capacity scenario to demonstrate, not a hard maximum. Also test substantial text in some boxes, grouped drawings, and rotated overlapping photos. Bound image-processing concurrency and avoid rerendering every rich-text editor for each drag or pen movement.
- Content-address processed assets for safe reuse. Removing an image from a draft must not remove a file used by a live post. Treat history cleanup as separate maintenance.
- Uploaded SVGs require sanitization or rasterization; ordinary image validation alone is insufficient. Constrain URL schemes and post paths on the server as well as in the editor.
- Choose editor/service origins together with authentication. Verify sign-in and session cookies on iPad Safari; avoid dependence on third-party cookies. Authorize an explicit account-ID allowlist containing only the owner initially, validate the sign-in callback, and rate-limit writes. Later collaborator roles must be enforced server-side.
- Document who owns hosting/API accounts, how credentials are rotated, and how the owner restores content. A backup must include documents and assets; test restoring to a fresh checkout. Choose backup frequency and destination before launch.

### Additional prototype and launch gates

- On the actual iPad Pro/Pencil setup with onscreen keyboard, create a representative post, paste from the actual Google Docs workflow, arrange photos/drawings, save, reopen, and update it successfully.
- Demonstrate one short post, one long post, and one dense collage at narrow phone, tablet, and desktop widths plus widths between previews. Typical posts should need no manual responsive repairs.
- The dense collage includes at least 20 photos and 30 text boxes, plus drawings; verify the public feed with several entries stacked together and lazy-load offscreen photos. Record input responsiveness, photo-processing time, memory-related failures, save/reopen time, and public loading behavior. Use measurements to decide page size and optional offline scope.
- Test enlarged text, keyboard-only controls, screen-reader order, reduced motion, and missing media. Warn or provide a usable reading fallback when a composition cannot adapt.
- Simulate interrupted upload, network loss, expired login, browser restart, stale save, and failed deployment. Preserve recoverable work and accurately identify which revision is live.
- Verify that saving a draft does not publish it, saving a published post does request deployment, and a failed update leaves the previous live revision available.
- Record dependency/provider selections, license checks, verified pricing date, and demonstrated limitations before calling the architecture settled.

## Interview queue

## Reusable system and CMS — October 12, 2026

Build toward independently deployable blogs using shared editor, document schema, reading renderer, content lifecycle, and repository adapter modules. Each deployment has its own repository, owner identity, public URL, Cloudflare resources, and secrets. This is initially one blog per deployment; a hosted multi-blog account system and deletion of whole repositories are deferred. Here “delete blogs” means delete blog entries in the CMS. Never delete hosting accounts or repositories as an entry operation.

The CMS lists active entries and a separate Trash view. Move to trash preserves the full document, photos, ink, identity, and Git history. Trashed entries cannot be edited, saved, or published until restored. Trashing a published entry requests a public rebuild; removal is effective only after successful deployment. Restore returns the entry as a draft, preserving its original publication date and URL identity, and requires explicit publication to go live again. No automatic expiry or permanent-delete control in this release. Photos are retained for restoration and reuse.

All lifecycle writes require owner authorization, CSRF checks, rate limiting, and an exact base revision. Stale saves cannot resurrect trashed entries. Local unsaved work remains available as a recovery copy. Server state controls lifecycle; client-supplied status cannot override it.

Implementation action items:

1. Extract deployment identity into configuration and isolate lifecycle transitions from transport/storage code.
2. Add atomic trash/restore endpoints and CMS Active/Trash views with clear confirmation and safe draft restoration.
3. Test lifecycle transitions, access rejection, stale edits, racing writes, public exclusion, content preservation, and CMS interactions.
4. Verify locally, then deploy the tested studio update; keep public publishing activation as a separate launch gate.
5. Finish removing presentation/deployment assumptions from build metadata and provide a fresh-deployment checklist before advertising the system as reusable. Future multi-blog dashboards and collaborator permissions remain separate work.

Clean code requirements: small focused modules, explicit lifecycle operations, shared validation, no duplicated rendering rules, meaningful behavior tests, and configuration errors that fail closed. Avoid broad refactoring of tested Pencil/text interactions solely for style.

Answered October 12: iPad with Pencil is primary; desktop secondary and phone rare. Arrange once with automatic adaptation and optional fixes. Saving published posts updates the live site. Direct drawing is wanted. Composition uses scattered scrapbook text boxes with substantial freedom; entries expand vertically and stack. Phone layout decisions are delegated to implementation judgment.

Additional answers: start entries blank; no cropping or borders for now; resizing and rotation are wanted. Offline support would be nice to have. Dedicated captions were not requested; grouped text boxes are the implementation default.

Latest answers: $0 is strict; abandon stickers for now. Main setup is iPad Pro with the newest Pencil as described by the owner and onscreen keyboard. Exact model/OS can be checked during testing.

Capacity/account answers: owner will need to create a GitHub account. Easily support 20 photos and 30 text boxes in an entry; these counts describe desired headroom rather than typical usage.

Core implementation preferences are sufficiently defined for a feasibility prototype. No further interview answers are needed to specify that prototype.

Follow-ups when relevant:

1. GitHub account creation is complete. Before online integration, connect development access and set up the repository; never request passwords, recovery codes, or tokens in chat. Development authentication is separate from the future editor's owner sign-in. Research service selection under the strict $0 constraint.
2. At device testing, record browser/OS and exact iPad/Pencil details. Onscreen keyboard is confirmed; no attached keyboard prerequisite.
3. Before launch, choose an independent backup destination and demonstrate restoration. An exportable document-and-assets archive is the proposed portable fallback.
4. Use simple publishing defaults: title and first-publication date, stable URLs, newest-first feed, and unpublish/delete with recovery. Confirm specific controls only if prototype use reveals a material preference.

Resolve these in short interview rounds. Library selection, schema details, and hosting comparisons are implementation work; ask the owner about consequences and preferences rather than requiring technical selections without context.

## Scrapbook navigation — October 12, 2026

The primary reading experience is now an interactive scrapbook, replacing the stacked home feed. Each entry is one flexible-height page; long entries scroll within the normal document flow. Start on the last page (newest published entry), with First (oldest), Previous (older), Next (newer), and Last (newest) navigation. Disable controls at boundaries. Preserve chronological order, readable phone reflow, stable individual entry URLs, archive, RSS, and sitemap. Apply a subtle page-turn animation with no animation for reduced-motion users. Controls remain visible while scrolling; provide page number announcements and keyboard-operable buttons. Local Reading preview uses the same navigation including unsaved work; trash is excluded.

Action items: implement shared navigation and styling; test initial newest page, backwards navigation, first/last jumps, boundaries, empty/single entries, reduced motion, and responsive layout; deploy the studio preview for owner testing. Public activation still requires finishing the publishing launch gate.

## Implementation checkpoint — October 13, 2026

Deployment settings now validate repository/owner IDs, branch, HTTPS public URL, and branding before the editor, Worker repository adapter, and Astro build initialize. Studio branding and public link use configuration; the shared reader no longer defaults to the original repository path. Added an independent-deployment checklist to SETUP.md without changing existing browser storage keys.

Verified with bundled Node 24: 17 model/security/lifecycle/configuration tests; editor production build; published-only blog fixture build; browser editing/recovery/transform/drawing/20-photo-and-30-text-box checks; cloud CMS save/publish/conflict checks; scrapbook navigation/boundaries/reduced-motion checks. These changes are local, not deployed. Live GitHub App sign-in, publishing activation, and actual iPad testing remain launch gates.

## Live implementation checkpoint — October 13, 2026

Deployed the validated reusable configuration and revision-pinned save/lifecycle reads to the existing Cloudflare studio. Live testing discovered missing security headers on direct static responses; added public/_headers and redeployed. The studio reports GitHub sign-in configured and rejects logged-out mutations and invalid OAuth callbacks. 18 model/security/configuration tests and public build/reader checks passed. Live editor and simulated pen/touch tests passed. Owner sign-in, actual iPad testing, and public publishing activation remain launch checks, not reasons to defer independent implementation/testing.

## Reliability completion — October 13, 2026

Implemented per-entry publication monitoring that resumes on reopening, reconnecting, and returning to the visible studio. Temporary status errors retry; expired authentication keeps the revision unconfirmed until sign-in. Failed saves persist staged asset paths/receipts before reload and explain retry steps without discarding local work.

New browser regression verifies Docs-style HTML headings, bold/italic, links, bulleted/numbered lists; exported/imported text/photo/ink content and transforms; upload interruption; expired login; photo receipt reuse; and resumed publishing after reload. Existing cloud-save lifecycle tests and all 18 model/server/settings tests pass. Live authorization checks pass after deployment of version a20a95d9-ad5b-4f1b-bf90-bbde6564a377. No repository test content published. Actual Google Docs clipboard and Pencil behavior on iPad remain device checks. Full offline reopening remains deferred.

## Current desk and entry music decisions — October 14, 2026

The latest owner request supersedes static stationery and the prohibition on a decorative music player. The desk and objects use whole-pixel graphics. Six intentional props are movable: lighter with attached flame/glow and automatic pipe ignition, glass jar of green buds, pink metal grinder with twisting lid, larger pink glass pipe, pink MP3 player and yellow Teletubby (implementation default). The newest owner request replaces automatic pipe filling with an authored interaction sequence: drag jar buds into the opening grinder, let it close, click its lid (dragging does not grind), lift the dust from the reopened grinder and drag it into the pipe, automatic lighter ignition/return, smoke, then reset. The finite smoke effect responds to movement with buoyancy/drift; cancellation and hidden/resize retain packed herbs. Reduced motion completes without particles. All use quick bouncy pickup, keyboard movement, cancellation, resize and reduced-motion handling. No smoking instructions or audio streaming are part of the objects.

Artists/Songs lists are saved per notebook entry through the existing undo, local recovery, backup/import and online revision paths. The studio labels that scope. Each list has three slots; pasting a full matching Spotify artist/track link automatically fills its title/artwork, with retry and manual names available on failure. Older five-row metadata remains recoverable and editable, while the player and accessible reading display the first three. Missing oEmbed artwork is looked up from the validated Spotify page with bounded fetching. The public player follows the selected published entry; drafts/trash music stays out of output. Only the local demo is prefilled with the owner’s six supplied Spotify links; new entries have no defaults. Spotify artwork stays unmodified with official attribution and links back. The MP3 housing can be picked up from non-control areas; the heart button toggles its dismissible screen. VT323 digital text, a dark green LCD and glossy pink pixel housing show three artwork/title/link rows without scrolling; the player bounces as one object. No Spotify account sync or autoplay.

This change is local and undeployed. Verification evidence and remaining actual iPad/Safari/Pencil/keyboard acceptance gates are in `docs/notebook-verification.md`.

The next owner refinements are also implemented locally: retro stepped page turns with banded paper/contact shadows, folded-corner icons attached to the moving paper, and a more recognizable yellow Teletubby with curled antenna, ears, smiling face and belly screen. Page color uses a wordless page-shaped button and five accessible swatches with a selected checkmark, native dismissal and the existing browser-local preference. The player integrates an unmodified official black Spotify full logo into a light pink panel, preserving its minimum size/clear space and unchanged linked artwork. Text/photos remain normal resolution; physical face mapping, shared studio/public rendering and document geometry are unchanged. No deployment is authorized. Subsequent owner polish removes exposed striped backing and reverse-cover overlap during opening, anchors the Spotify badge near the LCD bottom, removes rectangular/blue drag feedback and adds a finite two-hop figurine pickup. Keyboard focus remains visible around sprite silhouettes. The subsequent lighter correction aligns the shell and flame on the central burner and uses a smooth, centered warm glow that follows tilt and fades before its bounds; it keeps the existing pickup/ignition/release and automatic pipe lifecycle.

## Current studio usability decisions — October 14, 2026

P0/P1 in `docs/studio-usability-spec.md` are implemented locally. Authoring uses compact labeled cream/apple controls on static walnut with a green diary edge; Entries/Properties choose rail versus explicit native modal by available width, and Properties defaults closed. Blank drafts show neutral title readiness, while publication/update still awaits fresh rendered fit. Formatting is contextual; empty prompts and all furniture stay outside authored content. Device recovery and exact-revision online/publication state remain distinct. Native menus group backup/help/account, extra authoring tools and publication. Preview retains the mounted editor and restores focus/selection/scroll without content or undo mutations. Optional view presets were omitted; existing Fit width and native zoom/pinch remain. No new dependency/schema/service or public reader change; no deployment authorization. Local evidence and device/accessibility limits are in `docs/notebook-verification.md`.

## Text/photo studio decision — October 14, 2026

The owner retired new pen/stamp authoring in favor of text and images with modern visual controls. Eight independent text resize targets, fixed authored dimensions, visible overflow feedback, Fit text, natural handwriting, external photo rotation and prominent Undo-able deletion are implemented under docs/text-image-studio-spec.md. Optional allowlisted font/fontSize/fixedHeight metadata extends v2 compatibly; absent values retain legacy appearance/layout. Existing ink and groups are retained across import, recovery, display and saves. Private verification remains authenticated and publication-blocked.

The owner clarified definitive text boxes: fixed-height text now automatically scales/reflows into its chosen dimensions, regrowing to its preferred maximum size, without modifying text/formatting or expanding the box. shared/text-fit.js supplies the same result to editor/reader/canonical verification. Height-expanding Fit text is retired; dense/impossible boxes expose feedback. This supersedes that action in the earlier studio decision.
