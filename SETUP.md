# Connect saving and publishing — $0 setup

## Current desktop scrapbook operations

The studio writes nested v3 pages while readers and the service retain v2 compatibility. Canonical dimensions remain 900×1200. Authoring is mode-free; page transfer, Layers, rich typography and transparent PNG tooth impressions use the same document/recovery/save pipeline. Entry colors derive from published ordering; draft/offline colors are marked provisional. Historical mode/v2-only/private-verification sections below describe earlier releases and are superseded by this section and the current configuration.

Local recovery uses IndexedDB `book-v3`. First hydration validates legacy `book`, then atomically preserves its raw contents once at `book-before-v3` and initializes v3. It leaves `book` untouched. A changed legacy tab produces a notice; export current/original/legacy backups separately. Unknown selected recovery or snapshot-preservation failure blocks autosave. Never replace newer v3 with the old snapshot or auto-merge divergent legacy work. Imports add validated copied entries and validate resulting limits before mutation.

The PNG path is static RGBA8 with preserved alpha. Free-runtime measurements reduced its processed bound to 512px per side / 262,144 pixels / 300,000 bytes; retry resampling stays transparent. JPEG retains its existing 700,000-byte / 2400px validation limits. The local workerd profile is an estimate, not production CPU telemetry. Keep full request JSON including receipts within 900,000 UTF-8 bytes; failures preserve local work/export. No paid service is needed.

`SCRAPBOOK_WRITES_ENABLED` defaults false in Wrangler. Session capabilities expose readVersions `[2,3]`, writeVersion `3`, and the actual write flag. The new studio sends `X-Studio-Contract: 3`; this is compatibility, never authorization. With the flag false, legacy v2/JPEG writes remain available, while v3/PNG and lifecycle mutations of existing v3 are rejected. With it true, stale tabs are rejected before mutation and must export/reload. A current revision never permits downgrading existing v3 to v2. Preserve `PRIVATE_VERIFICATION=false` and all authentication/CSRF/repository-write checks.

Release order: run unit/server/build/browser/privacy checks, restore real-content output, reconcile remote content without overwriting it, commit/push scoped code, then wait for successful Publish blog and exact SHA in live revision.json. Build the normal studio, deploy once with writes disabled, verify the gate/capabilities/version, then activate using `npm run deploy:worker -- --var SCRAPBOOK_WRITES_ENABLED:true` and verify again. A later ordinary deploy defaults back to disabled; explicitly activate only after the same compatibility gates. Never deploy fixture output or publish an owner draft as a test. Existing Discord settings and state are preserved.

Rollback: after local v3 migration/edits retain a v3 read/export client; original recovery does not include newer edits. After any repository v3/PNG reference retain compatible readers/cleaners and forward-fix. Disabling new writes is safe; bulk down-conversion or resetting recovery is not. Current desktop verification commands/evidence and actual device/auth limitations are recorded in `docs/desktop-scrapbook-verification.md`.


## Fresh deployment checklist

For another independently owned blog, use a separate checkout and repository. Update `config/blog.json` with its repository name, numeric repository ID, numeric owner account ID, branch, HTTPS public URL ending in `/`, title, and tagline. These settings are validated by the editor, public build, and saving service; incomplete identity fails before repository writes. The studio header and public link use this configuration. Numeric IDs must come from GitHub, not guesses.

Use a unique Worker name in `wrangler.jsonc`, create a new SESSIONS KV namespace in the intended Cloudflare account, and replace the namespace binding and rate-limit namespace. Register a separate repository-restricted GitHub App with the new studio callback URL. Replace its client ID and upload new client/session secrets through secret prompts. Never copy the original blog's KV binding, credentials, or sessions into another deployment.

Build and test with Node.js 22.12 or newer. Run `npm test`, `npm run test:server`, `npm run build`, and `npm run build:blog`. Complete the live checks below before enabling `BLOG_PUBLISHING_ENABLED`. Browser storage is per studio origin; transfer work using Export/Import backup when changing origins. Existing storage keys remain stable to preserve current drafts.

The implementation is prepared locally. The current public editor remains usable while these account steps are completed. The new saving service must be activated and tested before changing the public Pages site into the blog.

## 1. Connect Cloudflare Free

Create and verify a Cloudflare account. Keep **Workers Free**; do not enable a paid Workers plan, R2, Images, paid builds, or any subscription. No custom domain is needed. Public readers stay on GitHub Pages; the authenticated studio uses a free `workers.dev` address.

With Node.js 22.12+ available, the implementation agent can run:

```sh
npx wrangler login
```

Complete Cloudflare's browser sign-in and review/authorize its deployment access yourself. Do not paste account credentials or tokens into chat. Then verify the selected account and its Free plan in the dashboard before deployment.

Create the session namespace and bind it to the Worker configuration:

```sh
npx wrangler kv namespace create SESSIONS --binding SESSIONS --update-config
npm run build
npx wrangler deploy
```

Wrangler adds the returned namespace ID to `wrangler.jsonc`. The first deployment is deliberately unconfigured for GitHub: `/api/session` reports `configured: false`. It cannot accept writes yet. Record the exact returned `workers.dev` URL; never guess the account subdomain.

## 2. Register the restricted GitHub App

Open GitHub **Settings → Developer settings → GitHub Apps → New GitHub App**. This is separate from Codex's GitHub connection.

- Name: an available name such as `Baby Teeth Studio chief-teef`.
- Homepage: the exact deployed studio URL.
- Callback URL: `<studio URL>/auth/callback`.
- Leave device flow disabled; the app uses the web OAuth flow with PKCE.
- Keep user access token expiration enabled (8-hour sign-in sessions; sign in again after expiry).
- Disable webhooks; none are needed.
- Repository permissions: **Contents: Read and write**, **Actions: Read-only**, and the automatically required **Metadata: Read-only**. No administration, organization, issues, or workflow-write permissions are needed by the editor.
- Choose installation only on your account, and install it on **Only select repositories → baby-teeth**.

The owner performs/reviews the final registration and installation permission grant. Registration produces the client ID; generate a client secret. No GitHub App private key is needed for this user-token design. Additional editors remain deferred.

## 3. Configure server secrets

Add the public client ID to `vars.GITHUB_CLIENT_ID` in `wrangler.jsonc`. It is not a secret.

Store **GITHUB_CLIENT_SECRET** as a Worker secret in the Cloudflare dashboard or with `wrangler secret put GITHUB_CLIENT_SECRET`. Enter the value directly into the secret field/prompt, never chat, a shell argument, or a tracked file.

Generate **SESSION_SECRET** with at least 32 random bytes and store it as a Worker secret. The implementation agent can generate and pipe it directly into `wrangler secret put SESSION_SECRET` without displaying or writing it to disk. This encrypts session credentials in KV and signs/encrypts login state and upload receipts. Rotating it invalidates existing sessions and receipts.

Redeploy the Worker after updating its client ID. Sign in at the studio URL and verify that it accepts `chief-teef` only. The browser cookie contains a random session identifier; GitHub access tokens stay encrypted in server-side KV. No refresh token is retained. Signing out revokes the GitHub token and removes the session.

## 4. Move existing local work

Studio backup/import and Help are in **Account & tools**; Music, Tooth stamp and the paper palette are in **More tools**. **Entries** opens local navigation on narrow screens and contains **Manage entries** for repository drafts/trash. **Publication** contains Publish/Unpublish; the adjacent Save action remains distinct. Unknown recovery exposes **Export recovery** directly in the header. For local UI verification, build the editor first, then run `node tests/studio-shell.mjs http://127.0.0.1:5175/` against Vite; the test also serves the production artifact to verify development controls are absent.

On the iPad, use **Export backup** in the current Pages editor. Open the new studio URL and use **Import backup**. Different origins cannot automatically read each other's browser storage. Confirm the entry and photos before saving the first draft online.

**Save draft online** commits JSON and processed photos to the public repository, but excludes them from the public blog output. Repository visibility of drafts is still intentional and accepted. Open the saved draft on a second device to verify cross-device recovery.

## 5. Activate public publishing

First merge the implementation branch containing `.github/workflows/publish.yml`. Then in the repository:

1. **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: set the non-secret variable **BLOG_PUBLISHING_ENABLED** to `true`.
3. Run **Actions → Publish blog → Run workflow** once to verify the build and publish the initial empty feed.

The workflow is gated until this explicit activation. This preserves the current prototype link while account setup is pending. Builds validate only published documents, fully decode published JPEGs, and copy only published photos. Failed builds leave the last successful site deployment available.

## Discord announcements: secure setup and activation

Current deployment: the owner authorized activation on October 15, 2026. The existing **the town crier** webhook targets **BBY TEETH → #oh-no-my-teeth-fell-out**; its URL is stored only in the repository Actions secret. Announcements are enabled and the empty public site was silently initialized with zero sends. Do not initialize again. The next real publication is the remaining live-delivery acceptance check; deployment/run evidence is in `docs/next-chat-handoff.md`.

The public `/notifications.json` manifest contains only public entry IDs, titles, permalinks and publication dates, with the same build revision as `/revision.json`. **Discord announcements** runs after successful **Publish blog**, hourly at minute 23, and manually. It verifies deployment provenance and live permalinks before delivery. Leave the repository Actions variable `DISCORD_ANNOUNCEMENTS_ENABLED` absent or `false` while deploying and verifying the manifest. `BLOG_PUBLISHING_ENABLED` must also be `true` for initialization or delivery; existing publishing is otherwise unchanged.

Activation and live Discord testing require the owner's explicit authorization. Never paste a webhook URL into chat, command arguments, source, logs or screenshots.

1. Deploy tested code to the default branch with announcements disabled. Verify the live manifest and matching revision. Confirm repository rules permit the notifier's `contents: write` access to `codex/discord-announcement-state` and `actions: read` deployment checks; do not weaken unrelated protections. It uses `GITHUB_TOKEN`; no personal access token is needed.
2. The owner creates an incoming webhook named **Anna's Blog** in the intended standard Discord text channel, using **Manage Webhooks** permission. The webhook selects the channel. Confirm the intended destination before activation. In GitHub **Settings → Secrets and variables → Actions → Secrets → New repository secret**, store the complete URL as `DISCORD_WEBHOOK_URL` directly in the secret field. Do not send a test message unless separately authorized.
3. Pause author publication while leaving `BLOG_PUBLISHING_ENABLED=true`. Set the repository Actions variable `DISCORD_ANNOUNCEMENTS_ENABLED=true`. In **Actions → Discord announcements → Run workflow**, select the default branch and **initialize** mode. This silently baselines every currently live entry, including an empty site, and creates the independent-root state branch containing only `state.json`. It sends zero messages and refuses an existing ledger. Automatic runs before initialization fail safely.
4. Verify initialization succeeded with zero sends and inspect the baseline records in `state.json` on `codex/discord-announcement-state`. Then resume publication. Use the next authorized real entry to verify its live permalink and confirmed announcement; never create synthetic production entries for testing.

Reconciliation processes at most three eligible entries, oldest publication date then ID, per run. Hourly reconciliation retries uncertain delivery and drains backlog independently of later publication. Schedule/provider delays mean there is no delivery-time guarantee. A timeout or failed confirmation write may cause a duplicate on retry; this is accepted. Edits, date changes or republishing an already baselined/confirmed ID do not announce it again. Unpublishing preserves history and pauses pending delivery; it does not remove an existing Discord message.

To pause, set `DISCORD_ANNOUNCEMENTS_ENABLED=false`; an in-flight request may finish. Do not delete the ledger. To rotate, pause, replace `DISCORD_WEBHOOK_URL` through the secret field, confirm the new destination, then re-enable. Baseline/sent history remains intact. A definitive webhook 404 holds requests to that exact configuration; replacing the secret releases the hold. Fix 401/403 permissions/configuration before retrying. Rate limits preserve the requested delay; network/5xx/uncertain responses remain pending for later reconciliation. GitHub Actions failures are the diagnostic surface; never log webhook tokens or raw provider errors.

Missing, corrupt or conflicting state stops delivery. Never reinitialize, reset history, force-push the state branch or copy repository content onto it to recover. Pause announcements and wait for the current run to finish. Repair only through a reviewed trusted workflow using the same `discord-announcements` concurrency group (`queue: max`, `cancel-in-progress: false`), preserving every baseline/sent record and known confirmation ID. Reads/writes explicitly target the state branch and use the current **file blob SHA** for `state.json`, not the branch commit SHA. Restore trusted state history if the branch/file was lost; do not infer missing confirmations from current public entries. Resume with **reconcile** after repair is verified.

Provider contracts: [GitHub workflow_run trust/events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run), [concurrency queue/lock](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [Discord webhooks](https://docs.discord.com/developers/resources/webhook), and [Discord rate limits](https://docs.discord.com/developers/topics/rate-limits). The workflow executes default-branch notifier code; manual dispatch from another branch fails before checkout or the secret-bearing step.

## Final live checks before handoff

- Create a draft with text, photos, and ink; save and open it on a second device.
- Try an unauthorized account and logged-out write; both must be rejected.
- Change the same saved draft on two devices; the stale save must preserve local work and show a conflict.
- Publish a new entry, confirm the correct revision is deployed, and visit its stable `/posts/<id>/` URL and the feed on the iPad.
- Edit a published entry and use **Save & update site**; verify the update appears after the build succeeds.
- Unpublish and verify its route, RSS entry, sitemap entry, and draft-only media disappear after the next successful build. Git history is not erased.
- Check real photo uploads against Workers Free's 10 ms CPU budget and confirm quota failures preserve local work. If necessary, reduce photo upload size rather than upgrade to Paid.
- Export a backup and demonstrate restoring it before deleting any local copies.

## Verified provider constraints (October 12, 2026)

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): Free includes 100,000 requests/day and 10 ms CPU per request; static asset requests are free and unlimited.
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/): Free permits 50 external subrequests per invocation. Photos upload individually; saving performs a bounded atomic Git tree/commit update.
- [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/): Free includes 100,000 reads/day, 1,000 writes/day, 1,000 deletes/day, and 1 GB storage; exceeding a free operation limit causes that operation to fail. KV is used only for short-lived encrypted sessions, not photos or posts.
- [GitHub App user authorization](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app): web OAuth supports PKCE and further token restriction to a repository ID.

Remaining live verification: actual account plan, deployed URL, GitHub App setup, iPad cookies/redirects, and CPU usage. Do not describe online saving as deployed until those checks pass.

## Deployment progress — October 12, 2026

Cloudflare OAuth is connected through Windows Credential Manager. Verified Free account request allowance: 100,000/day. Created the SESSIONS KV binding and deployed https://baby-teeth-studio.aucourantfilms.workers.dev. SESSION_SECRET was generated and uploaded without displaying it. GitHub App registration is prepared but not submitted; GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET remain pending. Initial public URL verification encountered a TLS provisioning error; do not claim the studio is reachable or online saving works yet. The existing GitHub Pages prototype remains unchanged.


Studio update deployed: CMS Entries/Trash with safe draft restoration, configurable repository identity, and shared scrapbook navigation in Reading preview. Public GitHub Pages activation remains pending. Tests passed: 15 server/model cases, CMS browser lifecycle, scrapbook navigation including empty/single/reduced motion, published-only build with trash exclusion, phone and desktop public layout.


## Live studio verification — October 13, 2026

The studio update is deployed at https://baby-teeth-studio.aucourantfilms.workers.dev (version a0efd0ef-e963-4973-be77-17b7c4a187fa). Both required secret names are present, and the live session endpoint reports configured=true. Earlier notes about pending secrets or unreachable TLS describe historical state.

Verified live without signing in or writing repository content: HTTPS editor responds, static security headers apply, logged-out entry/asset writes and reads are rejected, sign-in redirects to GitHub with PKCE and the correct callback, secure HttpOnly state cookie is set, and an invalid callback is rejected. A static _headers file fixes Cloudflare's direct asset responses bypassing Worker response headers. Revision-sensitive saves and lifecycle operations now read the checked commit snapshot.

Desktop browser automation against the deployed studio passes editing, recovery, transforms, drawing, 20-photo/30-text-box capacity, and phone reflow; simulated pen/palm/finger checks pass. Actual owner authentication, cross-device repository saving, real iPad/Pencil input, and public blog activation are still unverified. Public GitHub Pages remains the existing prototype. No test content was published.

## Public activation and studio gate — October 13, 2026

Pushed the implementation to main while preserving the owner's saved published entry. Enabled BLOG_PUBLISHING_ENABLED and switched Pages to GitHub Actions; dispatched the first public blog deployment. Studio static HTML/assets now pass through owner session checks and logged-out visitors receive only a sign-in screen with a public-blog link. Sign-out persists recovery data and reloads into that screen. Server tests cover gated assets and unconfigured fail-closed behavior; 19 tests pass. Live logged-out gate verified. Studio version a22dce88-fc55-47ca-ae98-fcfc48ce0242.

## Collaborator sign-in — October 13, 2026

Owner authorized repository write collaborators to use the studio. Deployed server version 1b72a3f0-1d64-4fdd-97ea-c12fbc2a521f. Session authorization now checks current write permission on the fixed repository for every authenticated request. Read-only and removed collaborators are rejected, including existing sessions. All 15 server tests pass. GitHub App visibility still needs updating for non-owner sign-in; GitHub requires owner email verification before its settings can be opened. Do not claim collaborator sign-in works end-to-end until that setting and a real collaborator login are verified.

GitHub App visibility completed: owner explicitly approved public installability, and GitHub confirmed the App is now public. Collaborators can now attempt OAuth authorization; studio access remains limited to current write permission on chief-teef/baby-teeth. A real collaborator end-to-end login remains to be confirmed by the collaborator.

## Notebook pages and local verification

Entries use document version 2 with `pageFormat: notebook-900x1200-v1`; archive backups retain envelope version 1. The owner authorized a pre-launch content reset: v1 entries and conversion support are retired. Unsupported browser recovery remains untouched and exportable. If this pre-launch browser contains v1 drafts, export the original backup if wanted, then select **Discard old recovery & start fresh**. Until that explicit action, unread recovery cannot be overwritten by new drafts. The wordless page-shaped color button opens five swatches (accessible color names and selected checkmark). Escape or tapping outside dismisses them. The palette persists per browser/origin and applies to studio and public book pages. It is not synced or stored in posts. Tooth stamps are normal drawings with undo, resize and recovery.

Overflowing drafts can be saved/exported. Publication and updates to published notebooks require a nonempty two-line title and fitting content. The Worker checks obvious geometry; `npm run build:blog` additionally launches a headless browser to measure the canonical HTML/CSS with self-hosted fonts before Astro output. Install its free runtime with `npx playwright install --with-deps chromium` on Linux (without `--with-deps` on Windows); GitHub Actions does this before the build. On Windows the verifier can use installed Edge; `NOTEBOOK_BROWSER` can point to another compatible Chromium executable. A failed candidate build leaves the previously deployed site in place and reports through the existing revision monitor. Measurement uses an ephemeral localhost server and writes no public verification pages.

Assets are self-hosted in `public/book/`; editable pixel-grid SVG originals and the original licensed font are in `assets/book/`. Regenerate original art/audio/manifest with `node scripts/book-assets.mjs`. Preserve the official font subset files and `OFL.txt` when regenerating. No network font dependency is used at runtime.

Run `npm test`, `npm run test:server`, `npm run build` and `npm run build:blog`. Additional local checks: `node tests/notebook-fit.mjs`; with Vite on port 5173, `node tests/notebook-studio.mjs` and the existing drawing/recovery scripts. `prototypes/book.html` is a local engine fixture (Vite port 5174 for `tests/book-feasibility.mjs` and `tests/book-navigation.mjs`). `tests/blog-build.mjs` generates published/draft/trash fixtures only under ignored `test-results`; run `tests/public-browser.mjs` against that output, then rebuild real content with `npm run build:blog`. Never deploy the fixture output. `tests/book-browser.mjs` expects the real single-entry repository build. See `docs/notebook-verification.md` for device limitations and current evidence.

The body stack keeps Georgia first and uses self-hosted Gelasio as a metric-compatible fallback on systems without it. Both licenses and original variable font files are retained. Font transfer varies by script/style; mixed subsets exceed the design's 120KB font target and are recorded in the verification report. Studio preview and Arrange dependencies load on demand. When `visualViewport` reports an onscreen keyboard, the studio exposes current recovery status and the normal online-save action above it; actual Safari keyboard behavior still requires device acceptance.

### Local diary demo

Run `npm run dev -- --port 5174`, then open `http://127.0.0.1:5174/prototypes/diary.html`. It mounts five fictional entries in memory, using the real reader, with photos for testing the full-image/download view. Nothing is written to browser recovery or repository posts. Production builds do not include these prototype sources.

### Entry music and desk objects (local implementation)

**Music** edits the top three Artists and top three Songs on the selected entry. **Save lists to entry** checkpoints undo and local recovery; use the existing online Save to sync/publish that metadata. Backups include it. Full `https://open.spotify.com/artist/...` or `/track/...` links (also localized paths) automatically fetch titles and artwork when pasted. **Fetch preview** retries a failed lookup. Short `spotify.link` links need opening/copying the full link first. Older saved lists of up to five are retained and editable; only the first three display. Names can be entered manually without a provider; no streaming or Spotify account is connected.

The deployed lookup is authenticated GET `/api/spotify?url=...`, with current repository write permission, rate limiting, fixed oEmbed host, rejected redirects, a seven-second timeout and 32KB response bound. Invalid URLs return 400; service failures return 502 without changing authored lists. Artwork loads only from `i.scdn.co` or `image-cdn-fa.spotifycdn.com`; both the Worker CSP and `public/_headers` must retain those exact image hosts. No API key or new subscription is required. Artwork availability is provider-dependent. Official attribution is a separate trademark asset, not CC0; see `assets/book/README.md`.

Vite's `vite.config.js` has a development-only preview endpoint restricted to loopback requests. Restart Vite after adding/changing this configuration. Start with `npm run dev -- --host 127.0.0.1 --port 5175`; root is the studio and `/prototypes/diary.html` is the disposable in-memory demo. The running server at port 5174 may predate this config; port 5175 was used for complete lookup verification. No Worker deployment is needed for local lookup.

All six desk objects can be picked up and moved. Enter/Space toggles pickup, arrow keys move (Shift moves farther), Escape puts down. Pick up/drag the MP3 from its housing; the heart button toggles its Artists/Songs screen. Close player/Escape dismisses it. Controls and Spotify links keep their actions. Manual lists and player links work when lookup/artwork fails. Local regressions: `node tests/music-browser.mjs`, `node tests/book-desk.mjs`, and published-only fixture/browser checks. Rebuild actual repository content after fixtures. This implementation has not been deployed; iPad/Pencil/keyboard acceptance is still required.

The herb interaction is local to the desk: drag jar buds into the grinder, click its twist button, drag dust into the pipe, then watch the actual lighter ignite the pipe and return to its previous position. A short smoke cycle resets the objects. Keyboard buttons perform the same transfers. Invalid drops keep the source; resize/hidden/pause interruptions retain packed herbs; reduced motion finishes instantly. Manual lighter pickup still ignites after its spin and extinguishes on release; automatic ignition uses a cancellable flight and returns exactly without storing a new position. No herb state is stored in entries, backups or repository content. Run `node tests/herbs-browser.mjs` for the cycle/lifecycle regression.

Zooming into a page clears desk props from its reading/photo targets. Use Zoom out to return to the interactive desk.

The herb flow has no visible instruction text: the grinder opens to receive a bud, closes with it inside, spins on a subsequent lid click (drag does not grind), and reopens with dust to lift. Filling the pipe automatically summons the actual lighter; after ignition it returns exactly to where it was. Pause/hide/resize cancels the flight, restores the lighter and retains a packed pipe. Accessible names and state announcements remain.

## Private iPad verification deployment — October 14, 2026

The owner authorized private deployment because desktop localhost is unreachable from the iPad. Deployed the current authenticated studio to https://baby-teeth-studio.aucourantfilms.workers.dev, Worker version `e06d6198-cd5c-4205-90ce-341550a757c7`. Sign in at `/`, then open `/prototypes/diary.html` for the in-memory book demo. The demo is included only by `npm run build:verification`; regular editor/public builds still exclude prototypes. It does not write entries or browser recovery.

`PRIVATE_VERIFICATION="true"` in Wrangler blocks publish/unpublish, saves of published entries, and trashing published entries. Draft saves and draft trash/restore remain available; this is still connected to the existing real repository/main, not an isolated test repository. Keep synthetic test entries local; use a real intended draft for authenticated/cross-device save checks. Do not disable verification mode or publish publicly without explicit authorization. No commit, push, repository content mutation or Pages deployment occurred.

Verification: 10 model tests, 19 server tests (including the private-publication guard), editor build and production studio-shell regression passed; verification artifact build/deploy succeeded. Live signed-out requests to studio HTML, diary HTML, actual JS and sprite assets returned the sign-in gate; posts/Spotify APIs returned 401 and session configuration was ready. Public Pages still returned the older site. Authenticated owner/iPad/save checks remain for the owner; logged-out checks do not prove them. No secrets were displayed.

## Text and photo authoring

New entries use Write or Move & resize; pen and tooth-stamp creation are retired. Existing drawings/groups remain readable, movable and recoverable through imports/backups and online saves. Selected text has eight edge/corner handles and retains chosen width/height; its contents automatically shrink/reflow to fit and regrow up to Maximum text size. Small-text feedback suggests enlarging dense boxes. The old height-expanding Fit text action is retired. Properties retains exact coordinates/size, text style/maximum size and rotation. Photos preserve aspect ratio and expose an external rotation handle with snapping, keyboard arrows, numeric rotation and reset. Delete is a prominent selected-object action with Undo. New text uses self-hosted Caveat; legacy text keeps its original font/auto-height until explicitly reshaped. Regression commands include tests/text-image-studio.mjs, text-fonts.mjs and the repurposed drawing.mjs legacy test. Private verification still blocks publishing.

Latest private studio version: `0df5dbfc-21a6-48fc-bdfd-c5216a13bf97` (October 14 text/photo refinement). Refresh Safari at the existing studio URL for new controls; choose Handwriting in Properties to opt older text into Caveat. New text defaults to handwriting. Keep PRIVATE_VERIFICATION=true until public-release authorization. Publication checks are intentionally blocked during this phase.

Photo upload CSP regression: after building, run node tests/cloud-csp.mjs to test the actual compiled editor under the deployed CSP. Local image data URLs are decoded into a Blob rather than fetched. Private version8b875ac0-5205-49e0-ad16-528dbd20bf5c contains the fix; refresh only after local recovery reports Saved on this device, then retry the draft save.

## Current public release

The current notebook reader is live at https://chief-teef.github.io/baby-teeth/ and the authenticated studio at https://baby-teeth-studio.aucourantfilms.workers.dev. PRIVATE_VERIFICATION is false; Publish entry, published updates and Unpublish are available under existing authorization/fit checks. The owner’s saved draft/photo were preserved and remain unpublished until the owner selects Publish entry. The release used the normal editor artifact, not build:verification. Public code revision9b2f5df5783add09dbc1d45629130fd8b6802955 was verified against revision.json; Worker version70c4ec2d-261c-4ec5-9a30-ebb58161a700 deployed successfully. Prior private-only restrictions in historical sections are superseded by the owner’s go-live request.
