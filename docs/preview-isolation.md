# Preview isolation: steps, each needing Harold's approval

Status: NOT STARTED. Nothing below has been run. Until all steps are done and verified, no branch is pushed (a push creates a Vercel Preview deployment that may have been built with production credentials; see AGENTS.md "Production safety").

Why: today there is no isolated Preview. A preview of any branch could read or write the production database and the private Blob store. Once this is done, every branch gets a preview link for phone checks without touching production.

How to use this file: each step is one approval. Harold either does the step in the Vercel or Neon dashboard, or approves a specific command for Claude to run. `.claude/settings.json` denies `vercel` and `neonctl` for Claude, so a CLI step also needs a visible, temporary rule change. Claude never prints values; variables are named only. The dashboard wording below may differ slightly from the current UI.

## Step 1. Inventory (read-only, names only)

Approval needed to run. In Vercel (Project > Settings > Environment Variables), list every variable and, for each, which environments it is scoped to (Production, Preview, Development). Record names and scopes only, no values. CLI equivalent: `vercel env ls` (names and scopes, no values). Expected variables: `CMS_DATABASE`, `DATABASE_URL`, `CMS_MEDIA_DIR`, `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`, Patreon variables, and any Neon or Blob integration variables.

Done when: a table of name x scope exists in this file (no values). Flag every variable scoped to Preview whose value is a production value.

## Step 2. Neon: one database branch per preview

Approval needed. Confirm the Neon integration is installed on the Vercel project and is set to create a database branch for each preview deployment (and that it injects that branch's connection string as the Preview `DATABASE_URL`). If it is not, enable it, or create one long-lived Neon branch (for example `preview`) from `main` and scope its connection string to Preview only.

Notes for the decision:
- A Neon branch copies production data. Treat preview data as private. Prefer a branch created from a scrubbed or older snapshot if the data is sensitive.
- `npm run build` never migrates. A preview branch has the schema it was copied with. Schema changes are applied to a preview branch by hand, through the normal back up, rehearse, apply routine.

Done when: a test preview resolves to its own database branch (step 7).

## Step 3. Separate Blob store and token for Preview

Approval needed. Create a second private Blob store (for example `migrainz-media-preview`) and scope its `BLOB_READ_WRITE_TOKEN` to Preview only. Production keeps `migrainz-media`. The preview store starts empty, so previews show missing media unless a small, non-sensitive set of files is copied in. Copying files from production is itself a production-lane action and needs its own approval.

Done when: Production and Preview use different tokens, and the Preview token cannot read `migrainz-media`.

## Step 4. Separate `PAYLOAD_SECRET` for Preview

Approval needed. Generate a new random value of at least 32 characters (Claude can generate one but must not print it into the conversation or commit it; Harold pastes it into the Preview scope). Production keeps its existing secret.

Done when: the Preview and Production secrets differ.

## Step 5. Remove old preview deployments built with production credentials

Approval needed, and Harold chooses which. In Vercel (Deployments, filter Preview), list existing preview deployments and delete those built while Preview variables held production values, or while step 1 shows production values in Preview scope. Deleting a deployment is irreversible; production deployments are not touched. Do this after steps 2 to 4, not before, so no new preview is built with the wrong values.

Done when: no preview deployment older than steps 2 to 4 remains, or Harold has accepted the ones that do.

## Step 6. Verify variable scoping

Approval needed to run. Re-run the step 1 inventory. Done when no variable holding a production database URL, production Blob token or production secret is scoped to Preview (or Development), and each Preview-scoped value is the preview one. Names and scopes only.

## Step 7. Test preview

Approval needed to push, one time. Push a harmless branch (for example a one-line docs change on `chore/workflow-setup`). Confirm in the deployment that it connects to its own database branch and preview Blob store, not production: check that a record created or changed only in the preview does not appear on https://migrainzxxl.com, and that preview media requests use the preview store. Do not use real visitor data. Delete the test branch's preview afterwards if wanted.

Done when: the preview works and production is unaffected. After that, update AGENTS.md "Release status" (Preview isolated) and the "Production safety" push rule: pushing a branch is then allowed without a separate approval, while pushing `main` still needs approval because it deploys production. In `.claude/hooks/guard-git-push.mjs` (and its test), change the guard so pushes of non-main branches are allowed or asked instead of denied, and remove the narrow push denies in `.claude/settings.json` that no longer apply. Until then, only `git push origin main` can be requested (it asks every time), and this step's one-off branch push needs a visible, temporary rule change by Harold.

## Order and rollback

Order: 1, 2, 3, 4, 6, 5, 7 (verify before deleting old previews). Each step is reversible except deleting old previews (step 5) and anything copied to a store. If a step breaks Production (it should not, since only Preview scopes change), promote the previous production deployment in Vercel and stop.
