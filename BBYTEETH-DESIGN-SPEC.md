# bbyteeth — pixel diary overhaul

Specification date: October 13, 2026. Status: local implementation following the owner interview; not deployed. Desktop checks and remaining target-device acceptance are recorded in docs/notebook-verification.md. This document specifies the target, not the current behavior. Owner decisions below are confirmed; numerical values and technical choices are designer-selected implementation defaults. Change those defaults only for a demonstrated usability, compatibility, or performance reason, and record the reason here.

## 1. The intended experience

A lightly worn apple-green pixel diary sits on a warm walnut desk, with six movable objects: a lighter, glass herb jar, pink herb grinder, pink glass pipe, pink MP3 player and little yellow Teletubby. Its pink clasp, pale stitching, tiny stickers, dimensional paper edges, and three swinging charms make it feel like a treasured object from a teenage bedroom in 2003. The visitor sees the book, not a conventional website. Opening it reveals the latest writing. Pages physically bend and turn. The visitor can get closer to a page, explore its details, close the diary, and drag it around the desk independently of the fixed menu.

Maximalism lives in the craftsmanship and accumulation of small details on the object. The tabletop gives that object room. Do not substitute a generic green dashboard, a pink scrapbook template, a rectangular card with a rotate animation, or a loading screen filled with nostalgic slogans.

### Confirmed owner decisions

- Name: **bbyteeth**, lowercase, one word; use on the cover.
- Teenage bedroom/personal-homepage Y2K direction: doodles, checkerboard, stars, tiny pixel graphics, playful clutter.
- Apple green is predominant; soft blush is secondary.
- Padded glossy diary, clasp, dangling charms: **tooth, pink star, green heart**.
- Start closed; open to the last/latest published entry.
- Exactly one notebook page per entry. Same page format and arrangement on all devices; prioritize iPad and desktop. Smooth page zoom is wanted.
- Latest owner decision replaces outer space with a complementary, distressed wood desk and peripheral clutter. Keep short sparkle bursts around the diary. Add a draggable lighter that opens, spins and lights when picked up.
- Open, turn pages, close, and move the book. Charms have physics. Page turns make a cute little sound.
- No promotional or decorative copy outside the book. Each entry has its actual title and date, styled consistently as scribbled handwriting. Approved date example: `oct 13, 2026`.
- Studio styling can change under implementation judgment.

### Superseded decisions and retained constraints

This target supersedes the earlier unlimited vertical entry height, stacked public feed, and automatic phone rearrangement **for the new notebook format**. It supersedes old public branding, taglines, and filler copy. Reflow remains available for accessible reading. The owner subsequently authorized a pre-launch reset and retirement of legacy entry formats.

Keep the $0/ad-free operating constraint, existing hosting, publication privacy, IDs, URLs, photos, structured text, drawings, groups, recovery, undo, atomic repository saves, and revision conflicts. Decorative cover stickers are fixed artwork; the requested tooth stamp uses authored drawing strokes. Photo cropping, decorative photo borders, and full offline reopening remain deferred. This specification does not authorize deployment.

## 2. Visual system

Use these named tokens in a dedicated shared theme file. Do not scatter nearly matching greens across components.

| Token | Value | Role |
|---|---|---|
| space-deep | `#07130F` | Studio chrome and photo-viewer backdrop |
| space-mid | `#12291B` | Studio panel background |
| desk-wood | `#86654D` | Muted walnut tabletop |
| ink | `#203524` | Entry text and outlines on paper |
| cover-shadow | `#355C29` | Cover silhouette and deep seams |
| cover-dark | `#608D3C` | Padded edge shading |
| apple | `#A4CA68` | Dominant cover face |
| apple-light | `#CBE89A` | Cover gloss and raised edges |
| blush | `#EDB5C8` | Clasp, star charm, ribbon details |
| blush-light | `#F9DFE8` | Pink highlights |
| pink-shadow | `#A9637E` | Pink outlines and shading; not small body text |
| paper | `#F6F2DC` | Warm uncoated notebook paper |
| paper-shade | `#DDD9B9` | Page edges and fold shading |
| rule | `#B6C5A0` | Faint rules |
| metal | `#CBD7BD` | Small rings and clasp hardware |

Target approximately 65% green, 20% paper/neutral, 10% blush, 5% highlights within the book artwork; this is an art-direction ratio, not a pixel-count test. The public background is now warm muted walnut; this supersedes the green-black space background. Pink never becomes the dominant canvas.

Use fine pixel art with a **4 logical-unit art grid**. A 900 × 1200 page corresponds to 225 × 300 art pixels. Build stepped contours, clustered highlights, and intentional dithering. Render bitmap illustration layers with `image-rendering: pixelated`; text, photography, and authored ink remain sharp normal HTML/images/SVG. Do not pixelate the entire scene with a screen-sized raster or shader. Fractional viewport scaling is unavoidable; prioritize crisp resting frames, allow fractional transforms during motion.

### Cover composition

- Portrait cover, gently rounded stepped corners, visibly padded perimeter and thick spine. Closed cover logical bounds: 988 × 1280; spine appears as a 28-unit strip on the left.
- Two nested stitched paths, inset 24 and 40 units. Stitch rhythm: 12 units of pale thread, 12 units gap. Interrupt naturally around the clasp anchor.
- Upper-center wordmark `bbyteeth`, handwritten and slightly uneven as one designed asset. Its text equivalent remains accessible. No subtitle.
- Upper-left: small blush/cream checkerboard patch, 100 × 76 units, tilted −8°. Lower-left: two overlapping clean five-point star decals, 68 and 40 units. Lower-right: tiny tooth decal, 56 × 68 units. Three small ink-green doodle stars distributed asymmetrically. These are fixed cover art, not UI buttons.
- Gloss consists of an upper-left stepped highlight cluster and narrow lower-right edge reflection. No continuously sweeping shine.
- Clasp sits halfway down the right edge, 140 × 100 units, soft pink with a small metallic tooth-shaped catch. Open state folds it outward; closed state bridges onto the cover.
- Pink ribbon peeks below the book, 28 × 100 units. It acts as the contents tab when open. The fixed viewport menu houses sound, motion, zoom and navigation controls. It does not follow book dragging; page-mounted magnifiers are removed so they do not obscure charms.
- Paper has a 2% opacity tile grain and very faint horizontal rules every 36 units, starting below the title header. No animated paper noise. Margin line uses muted blush at 25% opacity. Content sits above rules.

## 3. Page geometry and text

All dimensions here are logical book units, independent of screen size and device pixel ratio.

| Region | Rectangle or metric |
|---|---|
| Single paper page | 900 × 1200 |
| Header | x=54, y=48, w=792, h=152 |
| Title | x=54, y=48, w=792; 44px/52px Kalam Regular, at most 2 lines |
| Date | x=54, y=160; 24px/32px Kalam Regular |
| Composition region | x=54, y=220, w=792, h=920 |
| Bottom paper margin | 60 |
| Facing paper origins | left=(44,40), right=(968,40) |
| Open cover silhouette | 1912 × 1280, including 24-unit central gutter |
| Stage art envelope | 2120 × 1420 open; 1196 × 1420 closed, including charms/ribbon |

Composition element positions for the new format are relative to the composition region, not the full page. Preserve that distinction in all serialization and pointer conversion functions. Share constants between studio, reader, and validators.

Title and date are live text, not rasterized. Self-host Kalam Regular after recording its distribution license. Use the actual title unchanged; do not lowercase or embellish it automatically. The date uses `publishedAt`, existing America/Chicago date semantics, English abbreviated lowercase month, numeric day and year. Editing an entry does not change its original date. Draft preview uses the created date until publication; label that distinction in the studio only.

No per-letter random rotation, jitter, or handwriting animation. The uniform font and placement provide the scribbled appearance. Body default: Georgia, 28px/38px, ink-green. Retain supported rich-text marks, headings, links, lists, and code with shared deterministic styles. Do not impose handwriting on long body paragraphs. Smallest newly authored body text is 24 logical pixels; custom text scaling is outside this change.

Title is required for new publication. If it cannot fit two lines at 44px, show a studio error and require editing it; do not truncate, shrink, or invent a public title. Preserve the raw title in drafts and recovery regardless of fit. Oversized titles remain recoverable in drafts and cannot publish.

## 4. One page means one page

New entries have a fixed 792 × 920 composition region. No inner scroll pane, second page, automatic shrinking, clipping as a success state, or overflow hidden to disguise excessive content. The author may save an overflowing draft; first publication or a published revision update must wait until it fits. The currently live revision remains unchanged.

Measure text after the production fonts are ready, at canonical dimensions. Account for padding, list indent, long words, links, image dimensions, and rotated bounds. Detect overflow during paste, typing, move, resize, rotation, font load, and import. Mark offending objects with an outline in the studio and use the message `This entry exceeds one page. Move, resize, or shorten the highlighted content before publishing.`

Pasting never discards the tail of text. Permit temporarily overflowing recovered/draft content on a visible studio overflow mat. Draft saving and export remain usable. Drawn strokes and new objects that cross the boundary remain recoverable, are visibly flagged, and cannot publish until corrected. Keep intentional overlaps inside the page legal.

Retain the processing capacity scenario of 20 photos, 30 text boxes, and ink. This is a responsiveness/recovery target, not a promise that arbitrary quantities of text can be made legible on one page. Test both a fitting dense composition and an overflowing draft of that size.

### Existing content and schema

The owner authorized discarding all pre-launch repository entries and retiring legacy format support. Version 2 with allowlisted `pageFormat: 'notebook-900x1200-v1'` is the only entry contract. Archive-envelope version remains 1. Unknown/old documents reject without mutating recovery payloads, which remain exportable. No conversion UI, pre-conversion snapshot, or legacy public expand exception is required. IDs, stable URLs, recovery, atomic saves and revision conflicts remain required for new notebook content.

Client fit checks give immediate feedback; they are not the only publication gate. Shared geometry checks reject obvious bounds violations server-side. The static build must perform canonical rendered fit validation for published version 2 entries using production fonts (headless browser verification before deployment). A failed measurement fails the candidate build, leaving the previous site live. Reuse existing revision-based failure reporting. Drafts need no published fit proof and must never enter measurement pages shipped as artifacts. Delete/exclude all intermediate verification output from the public deployment.

## 5. Viewport, zoom, and moving the object

Keep one identical two-page book model at all widths. Never switch to a rearranged phone column or assign different coordinates to the same entry. A focus view is a camera movement over that model, not another layout.

Compute safe viewport from available width/height and safe-area insets; use dynamic viewport units with fallback and observe resize. Padding is 24 CSS pixels at widths ≥768, otherwise 12. `fitScale = min(availableWidth / envelopeWidth, availableHeight / envelopeHeight, 0.72)`. Center the envelope. No breakpoint changes the page aspect ratio. Clamp all interactive targets to at least 44 × 44 **screen** pixels independently of artwork scale.

Examples before safe-area/browser-chrome deductions: at 1440 × 900 the open envelope fits at about 0.60, a page around 540 × 720; at 1024 × 1366 it fits around 0.47, a page around 422 × 563; at 390 × 844 it fits around 0.18, a page around 158 × 211. The phone overview is an object overview, not the reading size. Do not claim otherwise.

Opening stays in overview at every width. Page clicks do not zoom. Wheel/trackpad and two-finger gestures provide continuous anchored zoom; keep explicit keyboard-accessible Zoom in/out and Reset view. The explicit focus control uses `min((safeWidth - 2*padding)/900, 1.2)`, aligns the page beneath a 52px control strip, and offers a second 1:1 step. Never disable user scaling in viewport metadata.

Camera transitions: 280ms cubic-bezier(.2,1.12,.35,1), interpolate translation and scale together around the selected page. Enter/exit focus without remounting the page or reloading media. When changing pages in focus, pull back to the active spread in 140ms, turn, then focus the selected destination in 220ms; reduced motion updates instantly. Never turn a clipped sheet entirely offscreen.

Owner feedback permits dragging from the whole open page, including authored text, ink and photos, after 6 screen pixels of travel. In overview this moves the book; in focus this pans the camera. Links and controls retain their actions. A recognized drag suppresses the following photo click and clears incidental selection; use reading mode for long text selection. Clicking the clasp opens the book. Pointer capture only after a recognized drag. Page clicks never magnify the book, and phone opening stays in overview. Mouse wheel/trackpad and two-finger pinch continuously zoom around the pointer or finger midpoint, bounded from fitted overview to 1.5 canonical scale; moving the pinch midpoint pans. Scope `touch-action:none` to the book surfaces only, leaving the rest of the document, controls and photo dialog native. Retain explicit zoom/reset controls for keyboard access. Pinch capture ends on release, cancellation, hide, resize or disposal; it must not trigger photo clicks or page turns.

Book translation is separate from camera translation. Clamp the book so the clasp/close control and at least 120 × 120 screen pixels remain reachable. On resize or rotation, cancel the active gesture, preserve entry ID, recompute camera/clamps, and keep the book accessible. Use no thrown-book inertia. Store optional normalized position for this tab session only. A reset-position control is always available in the fixed menu. Do not persist physics state.

## 6. Physical pages, ordering, routes, and book state

Published entries are ordered oldest to newest, using the existing date semantics and a stable ID tie-break. Page 1 is a right-hand page facing blank inside front cover; pages 2/3 form the next spread, then 4/5. Each entry occupies one physical page face. An even final page faces a blank right endpaper. Empty surfaces get paper texture only, no fabricated entry or message. The latest entry can therefore be on either side.

Home starts closed. Clasp click opens directly to the spread containing the latest published entry; do not animate through the entire archive. Closing and reopening within that visit restores the current entry. A fresh home visit resets to latest. A direct existing entry URL opens to that entry immediately, without forcing a cover interaction; no opening sound without user input.

Overview edge arrows turn one physical spread: right goes newer, left goes older. Focused navigation advances one entry; selecting the neighbor already visible in a spread only moves the camera, with no fake turn or sound. Page-corner drag follows the same physical spread model. Contents ribbon opens an index inside the book, with actual titles and dates only; selecting one opens its spread/focus. Maintain current archive/about/RSS/sitemap and permalink URLs. Render archive/about as book surfaces where practical; retain usable static routes. No extra marketing copy or visible website navbar.

First/last shortcuts live in the contents control. At boundaries disable the corresponding turn target without wraparound. Zero entries opens blank paper. One entry opens page 1 with no turn controls. Preserve real link destinations and browser Back/Forward. On deliberate navigation push the selected existing permalink once after settling; initial hydration and camera changes use replace/no history. Resolve `popstate` by stable ID without pushing another record. Do not encode transient drag coordinates or camera scale in URLs.

Implement an explicit state machine: `closed`, `opening`, `open-idle`, `dragging-book`, `dragging-charm`, `turning`, `zooming`, `closing`. Camera mode (`overview`/`focus`) is separate. Only one gesture/transition owns the scene at a time. While turning, retain at most one pending navigation intent; ignore repeated auto-repeat, replace the pending intent with the most recent. A close request cancels queued turns, settles the active turn, then closes. Pointer cancellation/visibility loss releases captures and settles to a valid page without duplicate history or sounds.

## 7. Animation that sells the book

### Opening and closing

Owner feedback supersedes the earlier slow physical pacing: make opening, latch and turns quick, exaggerated and bouncy. Opening lasts 600ms: the latch snaps out with recoil over 260ms; the rigid padded cover springs open over 480ms after a 40ms release delay; the camera moves with it over 440ms; the whole object squashes to 95% and expands to about 106.5% before settling. Closing lasts 480ms: cover/paper fold over 420ms, latch contacts during the final 180ms, and the object has a smaller squash/recoil. The cover thickness is a true edge-on side plane, and its reverse face is clipped at the canonical gutter so no dark bar disappears when the cover drops below the pages. The visible left paper rides the inside of the hinged cover as an inert HTML face; it lands at the canonical page coordinates before handing off to the resting semantic page. The right page is visible underneath from the start. Keep cover and paper deformation separate. Clip the exposed stationary page-stack backing during opening, retain only its gutter/right portion, end the reverse-cover face at the gutter and separate the mounted paper from its backing; no striped flash or cover overlap across the right page. Twenty-four small pixel particles briefly burst at the latch and around the book perimeter on explicit opening/closing; they are inert, finite, and absent on immediate deep links or reduced motion.

### Page turn

Committed button turn: 420ms, with a short pickup, fast sweep, exaggerated flexible curl and a separate 180ms landing bounce. Latest owner feedback asks for a retro pixel finish: sample the committed/return easing in 24 steps, quantize curl amplitude to the 4-unit art grid, use restrained hard-stop paper/contact-shadow bands and six-step landing timing. Keep text/photos at normal fidelity and pointer curl tracking continuous. Drag starts only in a 64 × 64 screen-pixel outer bottom corner target when not in focus panning. Curl follows the pointer continuously. Commit if the pointer crosses 35% of page width toward the spine or releases at ≥0.5 screen px/ms in the correct direction after 12px travel; otherwise return in 180ms. Clamp velocity to avoid accidental fling classification. No sound on canceled curls.

Required visual properties: curved fold, visible reverse face, moving contact shadow, a narrowing spine shadow, page-stack occlusion, and a subtle landing settle. Fold shadow max opacity .20, gutter .16, edge shadow .12. Text bends with the sheet during the turn and becomes completely sharp at rest. No mirrored readable text on the wrong face, translucent double text, detached corner, stationary content while paper moves, or flash of unstyled pages. The visible folded-corner icon belongs to each eligible paper face and rides its opening/closing/turn clones; only resting root hit targets are interactive, retaining 64 screen pixels and accessible direction names.

### Engine decision

Prototype **StPageFlip HTML mode** behind a small adapter first. Its official repository documents HTML pages, hard/soft page types, shadow controls, and optional portrait mode. Configure fixed canonical dimensions and disable automatic portrait switching; the application camera owns scaling and focus. The adapter must own event/history integration and gesture arbitration. Verify the exact installed API and pin the tested dependency; do not copy unverified method casing from snippets.

Gate the engine choice on a two-spread local prototype with real text, links, a photo, and SVG ink. It must pass corner drag, camera scale conversion, text selection, iPad touch, cancellation, and reverse-face tests. If it cannot satisfy them, document the concrete failure and replace the adapter; do not ship a flat rotateY transition as equivalent. Do not add React, a PDF viewer, WebGL, a physics framework, or a second application shell simply to animate the book. HTML content remains the source of truth. Library evaluation is a feasibility gate, not a claim that its defaults already meet this spec.

## 8. Charms and sound

Three charms attach to the lower edge of one stepped metal ring at the outer upper-right cover edge. A rivet/connector touches the cover, every chain begins on the ring, and a small metal loop bridges each chain to its charm artwork. The complete assembly follows the book transform. Tooth: 72 × 88 units, cream enamel, green outline. Star: 72 × 72, translucent blush. Heart: 68 × 64, green enamel with pale gloss. Owner feedback asks for more separation and a larger swing. Chain lengths are now tooth 208, star 104, heart 312 units, with starting angles −12°, 24°, 8°. Keep them off entry text when open.

Implement three lightweight constrained chains (5 nodes each, final node carries the charm). Verlet integration, fixed 1/120-second steps, maximum 4 steps/frame, 6 distance-constraint iterations, gravity 1000 logical units/s², velocity damping .985 per step. Clamp impulse from book acceleration. Anchor nodes follow the cover transform; use canonical units so changing camera zoom does not change gravity. A 78-unit separation between terminal nodes avoids obvious clustering; no full rigid-body engine. Clamp frame delta and discard accumulated time on tab return. Sleep after speed stays below 1 logical unit/s for 600ms; wake on drag, book movement, or cover hinge motion.

Dragging a charm captures its terminal node and stretches only within chain constraints. Release produces a bounded swing. Tooth is the largest visual focal point. After a normal book drag, charms should visibly trail, overshoot, then settle in roughly 5–7 seconds with the longer chains. Tune damping only against that acceptance target; record any adjusted constants. They do not swing forever or react to mere hover. Under reduced motion they remain at their resting positions.

Audio: one self-hosted 100–160ms soft paper tick with a tiny high chime tail, no music or continuous ambience. Use two subtle variations selected deterministically on alternate committed turns, maximum playback gain .18 with a 5ms attack/release envelope. One sound per actual committed sheet turn, at its midpoint; no sounds during initial deep-link opening, failed gestures, or camera changes. No simultaneous overlapping turn sounds.

Initialize/resume audio only from a user gesture; failure to unlock is silent and cannot block interaction. Default enabled after the first explicit book interaction; persist mute preference locally, tolerating unavailable storage. Pixel speaker button is always reachable on the book lip/control rail. Do not use autoplay background audio or make audio the only feedback. Keep asset source/license in the manifest.

## 9. Desk and small interactions

The wood desk replaces the former starfield with a low-resolution walnut bitmap, stepped grain clusters, a knot and scratches. Replace loose stationery with six intentional, movable pixel sprites: lighter, glass herb jar, pink metal herb grinder, larger pink glass pipe, pink MP3 player and a little yellow Teletubby (routine character/color default). Use nearest-neighbor bitmap rendering, stepped contours, clustered highlights and dither; normal text/photos remain sharp. Give the book sparse corner scuffs and a worn seam while preserving its green face, stitching and content. Stars keep five-point enamel silhouettes without faces or heavy outlines.

Desk props/effects leave the visible scene while the camera focuses a page; Zoom out returns to the interactive desk. This keeps photo/text targets unobstructed, particularly on phones.

All props share native pointer pickup, movement, capture cancellation, keyboard Enter/Space pickup, arrow-key movement and Escape put-down. Positions live only in the scene, stay reachable on resize, and do not alter book/menu coordinates. Pickup is quick and bouncy: the lighter opens/spins/lights, grinder lid twists, pipe participates in the herb sequence below, player housing bounces as one object, figurine hops twice on pickup, with a small alternating tilt; no idle loop. Desk dragging has no selection box, blue selection or tap flash. Keyboard focus follows the sprite silhouette rather than a rectangular frame. The yellow figurine has a curled antenna, prominent ears, pale smiling face, round body and framed belly screen; retain its existing sprite size and shared movement lifecycle. Pause/reduced motion disables effects; hidden tabs/resize/disposal release captures. On phones the little player housing opens a separate dismissible screen with the heart button, leaving the book/menu usable when closed. The MP3 housing can be picked up from all non-control areas; its heart button toggles the music screen. Controls and links retain their actions. Its labels use self-hosted VT323 digital type, a dark green LCD, tiny status pixels and glossy pink housing. The player shows three artwork/title/link rows with no scrolling; long titles wrap to two lines with their complete accessible text and tooltip. Spotify artwork stays unmodified. Attribution fits the pink housing as a light pink panel with the unmodified official black full logo, at least 70 screen pixels wide and with half-icon-height clear space; do not recreate the wordmark in VT323. Its panel hugs the LCD bottom with a 5px inset; reserve space to retain three rows without scrolling.

Music is optional metadata saved with each notebook entry, not a global account chart. Studio Music has Artists/Songs controls and three ordered slots per list (older saved five-row lists remain editable and recoverable), names, optional full Spotify links, add/remove/reorder and automatic title/artwork lookup on pasting a matching full Spotify link, plus retry. Save lists uses existing undo/recovery/backup/online paths. Empty entries get no fabricated favorites; the local diary demo has the owner’s six supplied Spotify selections. The selected entry supplies the player, and accessible/no-JS reading includes the same top-three lists. Only published entries enter public data.

Spotify preview uses its no-key oEmbed endpoint through the authenticated/rate-limited studio service. Canonicalize full artist/track links (including localized paths), strip query/fragment, reject short links, fetch only the fixed endpoint with redirects rejected, seven-second timeout and bounded body. Allow artwork only from exact observed/documented hosts `i.scdn.co` and `image-cdn-fa.spotifycdn.com`, with hex image paths. Preserve artwork without cropping, pixelation, animation or overlays; show unmodified official attribution and link metadata back to Spotify. Manual names work when lookup fails or has no artwork. No audio streaming, autoplay or account sync. See [oEmbed reference](https://developer.spotify.com/documentation/embeds/reference/oembed) and [display guidance](https://developer.spotify.com/documentation/design); real local provider/image checks are recorded in the verification report.

No visible instruction box, explanatory captions or herb-control text. Retain accessible button names and screen-reader-only state announcements. Visual lids/materials/lighting communicate the sequence. The newest owner interaction replaces automatic pipe filling: drag green buds out of a glass jar into the grinder, let the grinder open/close around the bud, then click its closed lid to spin (never grind on drag), reveal the open bowl with liftable dust, then drag dust into the larger pipe. Filling the pipe summons the actual lighter to ignite its bowl and begins a finite 2.2-second smoke effect, then resets jar/grinder/pipe for another round. Smoke rises with bounded buoyancy, coherent drift and inherited drag velocity, expands/fades and leaves a sleeping finite tail. Wrong/cancelled drops keep the source; keyboard transfer/grind buttons perform the same actions. Pause/tab hide/resize stops the smoke and retains a packed pipe; reduced motion completes the cycle instantly. These are scene-local visual objects, separate from entry/recovery documents. The actual lighter automatically flies to a filled pipe, ignites it, extinguishes and returns to its exact resting position; it remains manually usable outside that short flight. This is a responsive stylized simulation, not calibrated combustion/fluid physics.

The lighter is independent of the book/menu. Pointer pickup opens its lid, gives the housing a short spin and ignites the flame after that 420ms spin settles; dragging moves it and tilts it with velocity. Release/cancel extinguishes it. Enter/Space toggle pickup for keyboard users, Escape puts it down, and blur/visibility loss/resize/disposal stop it safely. A low-resolution canvas with expanded transparent bounds and edge fade simulates short-lived pixel particles with buoyancy, tilt and movement-driven turbulence, capped at 90 particles. This is a stylized physical simulation, not measured combustion fluid dynamics. A local warm light responds to the flame. The burner, flame canvas and smooth circular glow share a rigid tilt frame, while local buoyancy compensates for tilt to rise upward. Position the shell images explicitly so the flame meets the central metal vent. Center the glow on that burner, fade it fully before its rectangle edge and use gentle intensity variation instead of lateral glow drift. The book contact shadow changes footprint with the cover and reaches resting geometry before the state class disappears. Run no flame loop when unlit, paused, hidden or reduced-motion; reduced motion gets a stationary flame while held.

The motion control pauses continuous charm/flame work. Reduced motion disables continuous swing, spin and hinge/curl motion, and applies state/camera changes instantly. Retain finite inert sparkle/heart bursts only for explicit book actions under normal motion; do not add animated clutter or background flicker.

## 10. Copy and access

Public overview visible text is limited to the cover name and genuine page content/title/date. Remove old tagline, reader heading, footer slogan, `home ♥`, and invented emotional copy. The authored Artists/Songs display on the MP3 player is explicitly requested; no visitor counters, fake guestbook or decorative browser-window prose.

Functional labels are permitted in accessible names, focus/hover tooltips, the opened contents surface, and genuine error/fallback states. Use plain labels: `Open book`, `Close book`, `Older pages`, `Newer pages`, `Zoom in`, `Zoom out`, `Reset view`, `Contents`, `Mute sound`, `Unmute sound`, `Pause animation`, `Resume animation`. Do not make mystery depend on unlabeled controls. Controls use real buttons/links, visible keyboard focus, and a 44px minimum target without covering text. At very small widths, group controls into a compact fixed rail that stays inside the safe viewport.

Keyboard: Enter/Space activate focused controls; arrows turn when focus is on the book navigation, never while editing/selecting body content; Escape exits contents/focus before closing the book. Provide a focused skip link to the current entry. Announce title/date once after a committed entry change. Only the visible readable pages participate in accessibility navigation; animated duplicates are inert and aria-hidden. Restore focus after turns and dialog closure.

Preserve semantic HTML text, headings, links, alt text, and source reading order. Provide a reading-mode menu icon leading to a plain, reflowable view of the same entry for enlarged text and assistive access. This is an explicit accessibility escape hatch, not the default phone layout. Without JS, serve that readable HTML with working entry navigation. Print outputs the entry, not the desk. Test contrast (4.5:1 body, 3:1 large text and meaningful controls), 200%/400% browser zoom, and text selection. Do not assume palette choices alone prove conformance.

### Photo view

Tapping a photo opens a native modal showing the whole available image with pixel close/download controls. Tapping anywhere outside the image or controls, or pressing Escape, returns to the book. Restore focus to the source photo; Enter/Space open it. Download the published image file (the uploaded JPEG), not an unavailable original. Photo drags move/pan the book rather than opening the viewer. Keep the viewer within the safe viewport and preserve browser pinch zoom.

## 11. Studio overhaul

The implemented `docs/studio-usability-spec.md` supersedes this section's older dark chrome and orientation-based layout defaults. Authoring now uses cream/apple/blush controls over static walnut, width-based Entries/Properties presentation and a green paper backing. The canonical typography, page geometry, preview and recovery contracts below remain.

Use the same apple/blush/paper tokens and fixed page, but keep visible functional labels. Existing Write/Arrange/Draw modes, publication status, recovery warnings, and conflict handling take priority over decorative minimalism. No desk effects, swinging charms, or page curl while composing. Studio outer chrome uses space-deep; paper defaults to cream with subtle static fiber texture. A browser-local palette (cream, blush, mint, blue, lavender) applies consistently to studio and public pages. Use a wordless page-shaped trigger that reveals five small page swatches, with hidden accessible names, checkmark/pressed selection, keyboard/touch activation and native light/Escape dismissal. It does not change document geometry or publication data. Selected controls are apple; destructive actions remain unmistakable. A tooth stamp adds a small smiling tooth as editable drawing strokes.

Desktop/landscape iPad: single canonical page centered with a 56px top toolbar and collapsible 240px properties panel. Portrait iPad: toolbar wraps into two rows when necessary; properties open in a bottom sheet. The onscreen keyboard must not hide the active text selection or recovery/save actions. Use viewport-aware scrolling and zoom without changing canonical content positions. Retain existing tested Pencil/finger separation. An explicit preview enters the public book renderer at the current entry; returning restores selection and unsaved work.

Display an overflow status only when necessary. Keep new pages blank except the uniform title/date furniture and faint rules. Do not add default sample prose, photo frames, or randomized decorations to authored entries.

## 12. Implementation boundaries and sequence

Suggested module boundaries (new names are proposals, not claims they exist):

- `shared/notebook-format.js`: constants, supported format identifiers, pure bounds/format checks.
- `shared/notebook-renderer.js` and `shared/notebook.css`: canonical entry/header rendering, shared between preview/public.
- `shared/book/controller.js`: entry/spread mapping, state machine, navigation events.
- `shared/book/camera.js`: viewport fit, zoom, pan, inverse pointer transforms.
- `shared/book/page-turn.js`: replaceable engine adapter; never owns repository state.
- `shared/book/charms.js`, `audio.js`, `desk.js`, `lighter.js`: isolated effects with explicit start/stop/dispose.
- `shared/book/theme.css`: tokens and book furniture.
- `blog/src/reader.js`: mounts the shared experience; no independent duplicate layout rules.
- `src/`: adopt fixed-page editing and shared preview without broad rewrites of storage/cloud code.
- Keep `shared/reading-layout.js` for accessible reflow; do not run its width-based rearrangement on notebook pages. Retire `shared/scrapbook.js` only after preview and public consumers have migrated.

Proceed in this order:

1. Inventory real content formats and measured bounds without writing repository posts. Use version 2 fixtures and round-trip/rejection tests.
2. Build a local two-spread engine/camera feasibility fixture; test on actual iPad early. Resolve curl, zoom, link selection, and gesture conflicts before polishing assets.
3. Build final layered artwork and token system. Review closed/open/focused screenshots at desktop, iPad, phone. Replace placeholder rectangles before calling the visual work complete.
4. Implement canonical renderer, version 2 validation, draft overflow recovery, studio fit checks, and build publication gate. Reject unsupported formats without overwriting local recovery.
5. Implement complete controller, URL/history behavior, contents, close/move, focus, accessibility/no-JS reading mode.
6. Add charms, audio, desk artwork and the bounded lighter effect through isolated modules. Verify pausing/disposal and reduced motion.
7. Run regression/device checks, update current guidance, and hand off local changes. Commit/deploy only under the applicable authorization. Do not publish test entries.

Do not spend effort replatforming Astro/Vite, adding services, changing OAuth, moving content storage, or making a generic reusable animation framework. Avoid loading every full-resolution photo just to build the book: preload visible and adjacent spread media only; keep other page shells lightweight. A library that requires all page shells is acceptable only if it does not eagerly decode all media.

### Required asset handoff

Store self-hosted assets under an appropriate public asset path shared by the builds, with a manifest recording logical size, source pixel size, pivot, attachment point, intended layer, license/source, and export checksum. Required layers: front/back cover, inside cover, spine, paper edge stack, clasp segments, ring/chains, separate tooth/star/heart, ribbon, control icon atlas, paper grain, star atlas, turn audio variants, and font files/license. Keep editable originals. Do not bake paper text or interactive controls into a single flattened book image. Asset creation method is flexible, but consistency and these layer contracts are mandatory. References below are inspiration, not permission to copy their assets.

## 13. Quality gates and acceptance checks

Performance targets are budgets to measure, not existing claims: on the target iPad aim for 60Hz turn/drag motion with 95th-percentile frame duration ≤20ms and no interaction task >100ms; no accumulating memory/listeners after 100 turns. Initial application JS ≤150KB gzip excluding existing authored content, visual shell assets ≤800KB transferred, audio ≤80KB, fonts ≤120KB. Load visible post media separately and report its weight. If a target fails, optimize or document the measured exception before release; do not claim success from a desktop trace alone.

Required viewports: 1440×900, 1280×800, 1024×1366, 1366×1024, 834×1194, 1194×834, 390×844, 360×800, 320×568. Also test actual owner's iPad Safari/Pencil/onscreen keyboard, desktop Chromium and Firefox, and real mobile Safari where available. Record device/OS/browser. Use intermediate widths and rotate while open/focused.

| Check | Passing behavior |
|---|---|
| First visit | Closed green diary, pixel wood desk and movable objects; no flash of old navbar/feed; cover reads bbyteeth |
| Open | Clasp and thick cover animate to latest entry; no archive-length wait |
| Physical turns | Both directions curl correctly; actual opposite face; no mirror text or raster blur at rest |
| Single page | Title/date/content fit canonical rectangles; no hidden overflow on new published pages |
| Identical format | Same entry coordinates, line breaks, grouping, and aspect ratio at every viewport |
| Phone | Opens to page focus; zoom/pan reaches all content; reset and close remain reachable |
| Drag | Paper/text/photos move or pan the book; links and controls keep their actions |
| Charms | Tooth/star/heart remain attached, respond to drag, settle, sleep; zoom does not alter gravity |
| Sound | Only committed sheet turns after user interaction; mute persists; audio failure harmless |
| Reduced motion | No continuous background or swing; instant usable navigation and zoom |
| Content edge cases | Empty, one, two, odd/even count, long title, large draft, missing media, unbroken URL |
| Navigation | Latest correct, boundaries disabled, contents accurate, stable deep links, Back/Forward correct |
| Interrupted input | Rapid taps, pointercancel, resize, rotation, tab hide, close during turn settle coherently |
| Persistence | Version 2 round-trips; unknown recovery stays exportable; drawing undo/recovery; stale save conflict intact |
| Publication | Overflow blocks candidate output; last live revision intact; draft/trash/media excluded |
| Accessible fallback | JS disabled/reflow view readable; focus order correct; no duplicate animated text |
| Studio | Real Docs paste, Pencil ink, keyboard focus, undo, local recovery and publication states retained |

Capture closed cover; latest spread; both page-turn directions at 25/50/75% progress; phone focus; long-title error; overflow draft; reduced-motion state. Inspect screenshots for pixel alignment, seams, clasp attachment, charm anchors, text fidelity, and clipping. A plausible still screenshot is not proof of a good page-turn interaction; record short on-device motion clips.

Use Node ≥22.12 per package.json. Run `npm test`, `npm run test:server` for the schema/backend changes, `npm run build`, and `npm run build:blog`. Inspect fixture/server requirements before browser scripts. Extend meaningful model/server, scrapbook/public, drawing, and recovery tests. Run the published-output privacy fixture checks and rebuild actual content afterward. No deployment of synthetic fixtures. Report local, committed, and deployed status separately.

Update scoped AGENTS when the new contracts actually land; update SETUP for any new build/browser dependency or conversion operation. The fixed-page and rendered-fit workflows are documented in SETUP.md; deployment and target-device acceptance remain separate.

## 14. References and their specific use

Reviewed October 13, 2026. These inform implementation; the owner decisions above take priority.

- [Cameron's World](https://www.cameronsworld.net/): primary visual reference for dense personal-web pixel collage and celestial nostalgia. Borrow the density and tiny-art language; omit its text-heavy layout and do not reuse collected art without permission.
- [Codrops: Page Flip Layout](https://tympanus.net/codrops/2018/11/12/page-flip-layout/): reference for organizing content around a two-sided surface. Its flat turn is below this project's required physical finish.
- [StPageFlip source and documentation](https://github.com/Nodlik/StPageFlip): first engine candidate; official descriptions of HTML mode, soft/hard pages, fixed sizing, shadows, and portrait switching. Validate against this project's touch/zoom requirements before committing to it.
- [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) and [autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay): user-initiated sound and graceful blocked-audio handling.
- [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion): system motion preference and equivalent usable states.
- [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action): gesture ownership must be declared before pointer handling; preserve browser zoom outside narrowly scoped interactions.
- [Google Fonts: Kalam](https://fonts.google.com/specimen/Kalam): selected consistent handwriting face; verify and retain the actual downloaded license before bundling.

The successful result feels like handling one specific, lovingly detailed diary on its desk. Its finish comes from coherent art, convincing physical transitions, readable pages, and reliable interaction—not from adding more unrelated effects.

## Local implementation notes

The pinned StPageFlip 2.0.7 HTML adapter disables native handlers, inverts camera coordinates for corner gestures, owns a sleeping render loop, clamps frame timestamps, and defers completion work to avoid reentrant navigation. Its default soft leaf is augmented with sixteen connected HTML bands so paper and text curve together; the original semantic face stays mounted and animated copies are inert. Engine feasibility has desktop Chromium and Firefox evidence, but no actual iPad evidence yet. This is not an assertion that the on-device motion gate has passed.

Kalam uses official Latin, extended Latin and Devanagari WOFF2 subsets, with SIL OFL license retained. Latin content transfers 22,336 bytes; extended Latin adds 12,140. A page requiring all three subsets can transfer 143,796 bytes, exceeding the 120KB font target. Keeping original-language titles instead of stripping supported characters is the documented exception pending further subsetting.

Charm tuning: keep five nodes, 1/120-second steps, four-step frame cap, six constraint passes and gravity 1000. Damping is .985 per step; the longer, more reactive chains measured approximately 5.9 seconds to sleep after a normal desktop drag. Book motion sets a bounded relative velocity (maximum 4.8 logical units per step), weighted by chain depth and charm, instead of accumulating pointer-sample impulses. Terminal x stays within −12–220 local units, additionally clamped against rotated enamel bounds, with a damped rebound to keep enamel off entry text and inside the art envelope; dragging stays within chain reach. The ring is attached to the back-cover fore-edge, preserving its attachment while the front cover hinges. Actual iPad tuning remains pending.

Body fallback compatibility: Georgia remains the preferred 28px/38px face. Self-hosted Gelasio supplies Regular/Bold/Italic/Bold Italic where Georgia is unavailable (including Linux verification environments). Google Fonts documents its Georgia metric compatibility; a desktop width probe of sixteen Latin samples/styles differed by at most .014 logical pixels. This avoids relying on an unrelated system serif for candidate fit. Font-face subsets load by character/style; mixed extended alphabets/italic/Devanagari can exceed the 120KB transfer target. Normal Latin on a Georgia system transfers Kalam only; Latin with both Gelasio styles plus Kalam is about 97KB. All bundled font subsets together total about 328KB; this is a conditional budget exception, not the normal initial transfer.

## Text/photo authoring refinement — October 14, 2026

The owner superseded pen authoring with text and photos only. The editor retains Write and Move & resize; new drawing and stamp creation is removed, while existing ink stays readable, recoverable and editable as an existing object. `docs/text-image-studio-spec.md` defines the reviewed text-shaping, photo rotation, prominent deletion and modern icon/label controls. New text uses licensed natural handwriting; older missing-style text keeps Georgia/Gelasio. Explicitly shaped boxes retain their authored dimensions with content overflow feedback and Fit text. No silent geometry/font conversion of existing entries or changes to public book animation direction.

Definitive-box correction: fixed text boxes automatically resize/reflow their rich contents, not their boundaries. Preserve preferred fontSize and full content in storage; the effective size is derived identically in editor and physical reader. Shrink as needed, regrow to preferred size when room returns, retain proportional formatting, report unreadably small/impossible fits, and retain legacy auto-height until explicit reshape. This supersedes the height-expanding Fit text action and visible overflow behavior above.
