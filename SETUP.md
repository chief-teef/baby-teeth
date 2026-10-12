# Connect saving and publishing — $0 setup

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
