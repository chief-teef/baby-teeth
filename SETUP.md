# Connect saving and publishing — $0 setup

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

On the iPad, use **Export backup** in the current Pages editor. Open the new studio URL and use **Import backup**. Different origins cannot automatically read each other's browser storage. Confirm the entry and photos before saving the first draft online.

**Save draft online** commits JSON and processed photos to the public repository, but excludes them from the public blog output. Repository visibility of drafts is still intentional and accepted. Open the saved draft on a second device to verify cross-device recovery.

## 5. Activate public publishing

First merge the implementation branch containing `.github/workflows/publish.yml`. Then in the repository:

1. **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: set the non-secret variable **BLOG_PUBLISHING_ENABLED** to `true`.
3. Run **Actions → Publish blog → Run workflow** once to verify the build and publish the initial empty feed.

The workflow is gated until this explicit activation. This preserves the current prototype link while account setup is pending. Builds validate only published documents, fully decode published JPEGs, and copy only published photos. Failed builds leave the last successful site deployment available.

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
