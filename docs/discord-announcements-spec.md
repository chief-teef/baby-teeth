# Discord announcements for Anna's blog

Status: implementation authorized with delivery disabled. The owner accepted automatic retries with possible duplicates and catch-up of every missed entry in small batches. Secure channel setup, production initialization, activation, and Discord messages still require explicit authorization. Deployment evidence is recorded in `docs/next-chat-handoff.md`.

## Outcome and accepted decisions

Announce new public blog entries in one chosen Discord text channel after their public deployment succeeds. Saving a draft or clicking Publish is not sufficient.

- Prefer eventual delivery over avoiding every duplicate. Retry uncertain sends automatically; rare duplicates are acceptable. Never claim exactly-once delivery.
- Announce every missed entry that is still public, oldest publication date first, with ID as tie-breaker. Process at most three candidate entries per run. An hourly reconciliation run handles failures and remaining backlog, even when no further entry is published.
- First activation silently baselines everything currently live. Do not announce historical entries on activation.
- Editing a confirmed or baselined entry, changing its date, or republishing its ID does not announce it again.
- Unpublishing does not remove an existing Discord message. An unconfirmed entry is retried only while public; if it returns later, retry remains eligible.
- No hard delivery-time guarantee: Actions scheduling, provider availability, rate limits, and Pages propagation can delay delivery. An entry removed before processing may never be announced.

Use a Discord incoming webhook named **Anna's Blog**, executed by GitHub Actions. No persistent bot, bot login/token, Gateway connection, SDK, paid service, or studio UI is needed. [Discord incoming webhooks](https://docs.discord.com/developers/resources/webhook)

## Message

Use this fixed plain-content template, with the current public title and canonical permalink:

```text
Anna just posted a new blog entry!

October afternoons

Go read it here: https://chief-teef.github.io/baby-teeth/posts/<post-id>/
```

Send `allowed_mentions: { "parse": [] }`. Normalize title whitespace, remove control characters, truncate to 200 Unicode code points, then escape Discord Markdown. Keep the complete message within 2,000 characters without truncating the URL. Use the configured webhook name/avatar; add no generated summaries or images. [Execute Webhook](https://docs.discord.com/developers/resources/webhook#execute-webhook)

A timeout can mean Discord accepted a message but the confirmation was lost. A later automatic retry may therefore create a duplicate. The same applies if delivery succeeded but recording confirmation failed. This is an accepted behavior, not a reason to stop all future announcements for manual investigation.

## Existing integration points

- `config/blog.json`: repository identity, publication branch, branding, and public URL. Read these values rather than duplicating them in scripts.
- `.github/workflows/publish.yml` (**Publish blog**): builds and deploys the reader; publishing concurrency can cancel older runs.
- `blog/src/lib/posts.js`: `allPosts()`, `postUrl()`, and `siteOrigin` produce validated published-only data. Preserve the existing RSS feed.
- `scripts/build.mjs`: emits `revision.json` with `process.env.GITHUB_SHA || null`. The notification manifest must use the same build revision.
- Stable entry IDs identify announcements. Git diffs, workflow order, and timestamps alone cannot reliably identify all missed entries.

## Public manifest

Add `blog/src/pages/notifications.json.js`, served under the configured blog base path, using the existing published-post helpers:

```json
{
  "version": 1,
  "commit": "<build GITHUB_SHA or null locally>",
  "posts": [
    {
      "id": "<stable post UUID>",
      "title": "October afternoons",
      "url": "https://chief-teef.github.io/baby-teeth/posts/<post-id>/",
      "publishedAt": "<publication timestamp>"
    }
  ]
}
```

Include the full current published list. Exclude bodies, photos, draft/trash IDs, and private settings. Do not replace RSS or introduce a recent-post cutoff.

Validate version, a non-null live commit SHA, unique valid entry IDs, field types, parseable dates, and canonical HTTPS URLs matching the configured origin, base path, and `/posts/<id>/` route. Reject credentials, queries, fragments, external URLs, and redirects. Bound fetched JSON to 2 MiB and each fetch to 15 seconds. Invalid, unavailable, or oversized data is a failed read, never an empty feed.

## Workflow and trust

Add `.github/workflows/discord-announcements.yml` and `scripts/discord-announcements.mjs`. Use the existing Node requirement/version, native fetch/JSON, and existing validation/helpers. No new runtime dependency or generic notification framework is expected.

Triggers:

- `workflow_run` for completion of **Publish blog**, using `types: [completed]`, expected repository/branch, permitted upstream events (`push` or `workflow_dispatch`), and an explicit successful-conclusion check.
- An hourly schedule to reconcile missed entries and retry delivery independently of new publications.
- `workflow_dispatch` with explicit `initialize` or `reconcile` mode.

All paths require `BLOG_PUBLISHING_ENABLED=true` and `DISCORD_ANNOUNCEMENTS_ENABLED=true`. A failed upstream completion must not send; a scheduled reconciliation may still process an earlier independently verified successful live deployment.

Run trusted notifier code from the repository's default branch. Manual dispatch from another branch must fail before reading secrets or writing state. Scheduled execution and initialization use the same trusted code. Do not execute upstream artifacts or check out the triggering SHA as notifier code. `workflow_run` can receive secrets/write privileges, and the workflow must exist on the default branch. Its downstream `GITHUB_SHA` is not the upstream deployed revision: use `github.event.workflow_run.head_sha` for upstream comparisons. [GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)

Use a dedicated `discord-announcements` concurrency group with `cancel-in-progress: false` and `queue: max`. Acquire the lock before reading or changing the ledger. GitHub currently permits up to 100 pending queued runs; overflow or ordering differences must not lose entries because every execution reconciles the full live list and an hourly run remains available. No overlapping delivery or initialization/recovery writer is allowed. [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

Grant `contents: write` and `actions: read` only to the notifier job for ledger updates and publishing-run verification. Keep state off the publication branch and outside public build inputs.

## Durable ledger

Store `state.json` on `codex/discord-announcement-state`, containing only versioned announcement state. Do not copy repository content into that branch, rewrite its history, store secrets, or use an expiring cache/artifact as the ledger.

Explicit initialization bootstraps an independent-root branch: create a Git tree containing only `state.json` without `base_tree`, create a commit with `parents: []`, then create the branch reference. Subsequent Contents API reads/writes explicitly target that branch. Compare the existing **file blob SHA**, not the branch commit SHA, when replacing `state.json`. Initialization races or conflicting writes must fail safely. [Trees](https://docs.github.com/en/rest/git/trees#create-a-tree), [commits](https://docs.github.com/en/rest/git/commits#create-a-commit), [references](https://docs.github.com/en/rest/git/refs#create-a-reference), [Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)

Record version, initialization time, and a record per known public entry ID:

| State | Meaning | Later reconciliation |
| --- | --- | --- |
| `baseline` | Already public when initialization completed | Never announce this ID. |
| `pending` | Delivery is unconfirmed, deferred, or rejected | Retry when eligible and still public. |
| `sent` | Discord returned a confirmed message ID and it was saved | Never automatically announce this ID again. |

Records contain public URL, observed deployed commit, attempt time/count, next eligible attempt time when deferred, outcome category, and Discord message ID when confirmed. Baselines need no attempt fields. The ledger may also hold a rejected-webhook fingerprint: a SHA-256 digest of the complete configured URL, never the URL or token. A definitive webhook404 suspends use of that exact configuration; replacing the secret changes the fingerprint and allows reconciliation to resume automatically. Retain baseline/sent records permanently across unpublishing, webhook rotation, and retries. Pending records retain attempts while the entry is absent but do not cause a send until it returns publicly.

Missing state is allowed only in explicit initialization, which silently baselines the full live list, including an empty site. Refuse reinitialization. Corrupt/missing initialized state, permissions failures, and conflicting writes must stop delivery without resetting history. Any deliberate manual ledger repair must use the same lock and SHA checks and preserve unrelated records.

## Processing a run

1. Check gates and trusted execution context. Validate the secret webhook URL: HTTPS, exact `discord.com` host, expected API webhook path, no credentials/fragment or unapproved query. Pass it through an environment secret, never a CLI argument.
2. Fetch the live manifest and `revision.json` with cache-busting requests; allow bounded propagation retries for up to five minutes. Require matching commits. Verify that live SHA belongs to the configured publication branch and has a completed successful trusted **Publish blog** run for that exact SHA and permitted event. A newer live deployment is acceptable only after these checks.
3. For upstream-triggered runs, additionally require the triggering `head_sha` to equal or be an ancestor of the verified live SHA. Verify the live SHA equals or is an ancestor of the current publication-branch head. Use compare status rather than a potentially truncated commit list; divergent, behind, or unavailable comparisons stop processing. Do not announce a stale deployment while a newer triggering deployment propagates. [Compare API](https://docs.github.com/en/rest/commits/commits#compare-two-commits)
4. Read and validate the locked ledger. Initialize and exit silently only in explicit initialization mode; normal runs require initialized state.
5. Select absent IDs and eligible pending IDs that are still public; exclude baseline/sent IDs. Sort oldest publication date then ID and process no more than three candidate IDs per run. Skip deferred pending IDs until their recorded time without blocking other eligible entries.
6. Before each candidate send, refetch and revalidate the live snapshot, using the latest title/URL. Recheck deployment identity if it changed. Confirm the candidate's exact public route returns HTTP200 without redirect; if it disappeared or cannot be verified, do not send it. A failed candidate route must not silently mark it sent. Public availability checks are best effort: unpublishing can still race a later webhook request.
7. Persist `pending` with the attempt metadata before calling Discord. If the write fails, make no webhook request. Execute with `wait=true`, JSON, redirect rejection, and a 15-second timeout. Require a valid returned message ID for confirmed success.
8. Save `sent` and the message ID immediately before processing another entry. If that write fails, stop the run; future reconciliation may repeat the message because success was not durably recorded. Never discard a known message ID from diagnostic context that can be safely recorded.

### Retry behavior

- Confirmed success: save `sent`; no more delivery attempts for this ID.
- Confirmed HTTP429: honor `Retry-After` or `retry_after` in seconds, including fractional values. Allow at most three retries within two minutes. Never shorten the provider's delay to fit that budget; persist a pending/deferred record with its next eligible time and stop sending for that rate-limited run. Retry on a later reconciliation. [Discord rate limits](https://docs.discord.com/developers/topics/rate-limits)
- Timeout, network loss, HTTP5xx, or malformed success body: keep `pending`, log the uncertainty, and retry automatically on a subsequent reconciliation, not immediately in the same run. Continue with other eligible entries within the batch cap; confirmed rate limits, definitive webhook rejections, and ledger failures stop the run as specified below.
- Other definitive HTTP4xx: keep `pending` with a rejection category and fail the run. A webhook401/403 needs configuration/permissions fixed; do not loop on the same bad request within a run. For webhook404, persist the rejected-configuration fingerprint and make no further requests to that URL on later runs; the owner must replace the secret. This is a confirmed invalid destination, distinct from an uncertain delivery. Never mark a rejection sent or erase entry history to retry it. [Discord invalid-request guidance](https://docs.discord.com/developers/topics/rate-limits#invalid-request-limit-aka-cloudflare-bans)
- Ledger failure before the POST: zero sends. Failure after the POST: stop; preserve pending state and accept possible duplicate delivery later. Ledger failure or corruption must never be interpreted as permission to send without state.

Log counts, public entry IDs, outcome categories, and actionable HTTP status information. Never log the webhook URL/token, raw provider bodies, or unredacted fetch errors that might contain secrets. GitHub run failures are the operator's diagnostic surface; do not add another notification integration.

## Configuration and activation

The owner provides one incoming webhook for a standard Discord text channel, requiring Manage Webhooks permission. The webhook selects its destination; no separate channel ID is needed. Forum/media channels, threads, commands, reactions, subscriptions, and multiple destinations are outside this version.

Store the complete URL as the repository Actions secret `DISCORD_WEBHOOK_URL`. Do not ask for it in chat or place it in source, frontend code, public output, ledger, command arguments, screenshots, or logs. If exposed, recreate the webhook and replace the secret.

Setup order:

1. Merge tested code with announcements disabled. Verify repository policy permits the scoped state writes without weakening unrelated protections.
2. Deploy and verify the published-only manifest. No announcement is sent merely to prove this endpoint works.
3. The owner creates the webhook and stores the secret securely. Confirm the destination with the owner before activation or a live test.
4. Pause author publication without disabling `BLOG_PUBLISHING_ENABLED`, enable announcements, and explicitly initialize the baseline. Other runs must fail safely until initialization completes. Verify zero announcements, then resume publication. A missed/racing run is reconciled by the hourly schedule after initialization.
5. Use a disposable channel/webhook only if delivery testing is separately authorized. Never publish synthetic entries to the real blog or send test messages to the destination without authorization.
6. Use the next authorized real publication for production acceptance: its page is live and a matching announcement is confirmed. Disabling the enable variable pauses new runs; an in-flight request may finish. Webhook rotation preserves baseline/sent history and releases a hold tied to the old URL; pending delivery resumes to the newly configured destination.

## Tests and delivery stages

Add import-safe `scripts/discord-announcements.mjs` and `tests/discord-announcements.test.js` to `npm test`. Mock HTTP, clock/backoff, and storage with native Node test facilities. Avoid a generic notification framework.

Required cases:

- Empty/nonempty baseline sends nothing; missing/corrupt state and reinitialization fail safely; independent-root bootstrap and file-SHA conflicts behave correctly.
- New IDs produce the exact message and disabled mentions. Confirmed/baselined edits, reruns, date changes, and republishing do not reannounce.
- Full-history catch-up, backdated entries, oldest-first batches of three, and later scheduled processing of the remainder. A missing or reordered upstream run loses no still-public entry.
- Pending uncertainty retries automatically, even without a new publication; confirmed success stops retries. Unpublishing pauses pending retries; republishing an unconfirmed ID resumes them. A confirmed delivery followed by ledger failure can duplicate, as documented.
- State failure before POST causes zero sends; state failure afterward stops further candidates. Corruption and conflicting writers never bypass the ledger.
- HTTP429 honors fractional/excessive delay and persisted deferral. HTTP4xx remains pending; a webhook404 prevents further calls to that same configuration until the secret is replaced, without erasing entry history. HTTP5xx/timeouts do not require manual resolution and do not immediately loop. Correct confirmed-message-ID handling.
- Published-only manifest output and configured project/custom-domain URLs; no drafts, trash, bodies, media metadata, or secrets. Validate host/path/UUID/commit/date/duplicates, title escaping/truncation, size bounds, redirects, failed routes, and snapshot changes.
- Disabled gates, untrusted upstream events/branches, failed publishing runs, missing exact-SHA deployment proof, and divergent/older live revisions cannot cause a send. Schedule/manual paths retain equivalent trust and activation checks.
- Webhook secret redaction in every failure category. No actual Discord calls in automated tests.

Run `npm test`, `npm run build:blog`, and the published/draft/trash regression `tests/blog-build.mjs`, extended for the manifest; rebuild actual content afterward. Run server tests if backend/security code changes. Validate workflow structure/permissions and the live manifest before enabling delivery. No iPad simulation or studio UI change is needed.

Update `SETUP.md` with secrets, initialization, hourly retries, pause, rotation, ledger failure repair, and the accepted duplicate policy. Update `blog/AGENTS.md` for the endpoint, root guidance only if deployment boundaries change, and `BLOG-SPEC.md` when implementation establishes accepted behavior. Follow `docs/agent-maintenance.md`.

Report stages separately: specification reviewed; implementation/tests complete; code deployed with delivery disabled; secure destination configured; silent initialization verified; first authorized real delivery verified. Delivering or accepting this specification does not authorize later stages. Do not describe the feature as implemented or live until evidence supports that stage.
