# Production stabilization and deployment

This runbook supersedes the earlier ephemeral-storage instructions in CMS.md.
No production migration, bucket creation, upload transfer or reprocessing was
performed by Codex. Credentials and the actual production migration ledger were
not accessed. Back up the database and all available original/derivative files
before the operator performs the steps below.

## Active schema and migration order

1. `20260909_045755_foundation`
2. `20260927_190344_factions_equipment`
3. `20260928_120000_route_key_repair`
4. `20260928_193304_media_derivatives_storage` — NEW
5. `20260928_200000_reconcile_legacy_indexes` — NEW

No previously registered migration was rewritten. The new generated schema
migration adds 24 nullable preview/viewer columns across `media` and `_media_v`,
four filename indexes, and nullable `prefix`/`version_prefix` with empty defaults
for the storage adapter. It does not update media content or require derivatives.

The new index repair handles both known historical faction migration variants.
The original variant used global compound-index names on Factions/Equipment and
renamed Characters indexes. The corrected variant used route keys and retained
the foundation Characters index names. The repair checks route-key coverage and
replacement uniqueness, removes only recognized obsolete faction/equipment
indexes, and restores the canonical Characters indexes. Unexpected definitions
fail rather than being silently removed. Old duplicate Characters indexes may
remain on databases that applied the original variant; they are harmless extra
indexes and can be reviewed separately. No rows or relationships are removed.

Both new migrations are forward-only: their down functions intentionally refuse
to drop stored metadata or reverse production repairs. Roll back application
code while retaining additive columns, or use a tested database/media backup.

The former three-migration chain could not reach even the committed image-size
schema. The new chain reaches the active Payload schema for both known faction
histories. This is not a claim about an uninspected live database: conflicting
manual DDL, duplicate route keys, missing base tables or additional experimental
schema still require reconciliation. Do not reset/fresh/push the database or
edit its migration ledger to force a pass.

## Parked work

Unfinished accessControl/redaction/sections fields and hooks are disconnected.
Exact pre-isolation copies are in `documentation/parked-access-sections/` as
non-executable `.txt` files. Public routes/components remain intact; content
adapters provide compatibility metadata and empty sections. Publication and
authorization again use `_status`/`accessLevel`; `listingVisibility` only filters
listings and does not deny published batch-media files with hidden listings.

No SQL drops experimental columns or tables. If a development database contains
saved experimental data, preserve it and do not accept destructive SQLite schema
push prompts. No production environment flag enables this unfinished system.

## Storage configuration

The existing `@payloadcms/storage-s3` adapter is used; no new application storage
dependency is needed. Use a PRIVATE S3-compatible bucket. Cloudflare R2 is a
supported choice; AWS S3 also works. Disable public bucket access, public custom
domains and R2.dev delivery. Enable bucket versioning/backups where supported.

Configure these server-only variables for the intended Vercel environment:

| Variable | Value |
| --- | --- |
| `CMS_DATABASE` | `postgres` |
| `DATABASE_URL` | Existing managed PostgreSQL connection, preserving TLS settings |
| `PAYLOAD_SECRET` | Existing stable secret; do not rotate during migration |
| `CMS_MEDIA_DIR` | `/tmp/studio-migrainz-media` (scratch/compatibility path only) |
| `CMS_STORAGE` | `s3` |
| `S3_BUCKET` | Private bucket name |
| `S3_REGION` | `auto` for R2, real region for AWS |
| `S3_ENDPOINT` | `https://ACCOUNT_ID.r2.cloudflarestorage.com` for R2; omit for AWS |
| `S3_ACCESS_KEY_ID` | Bucket-scoped server credential |
| `S3_SECRET_ACCESS_KEY` | Matching server secret |

The server credential needs read/write/delete object access for this bucket and
the provider's required bucket lookup/list permissions. Do not use NEXT_PUBLIC
variables. Production fails early if durable storage is not configured.
Development defaults to local files; setting CMS_STORAGE=s3 opts into the same
bucket workflow, so use a separate development bucket and credentials.

Add bucket CORS for each exact trusted admin origin, including a dedicated staging
origin if used. Example (adapt origins, do not paste the example domain):

```json
[{"AllowedOrigins":["https://YOUR_SITE"],"AllowedMethods":["PUT"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]
```

The standard admin upload and custom batch uploader use the adapter's staff-only
signed PUT transport. Their editing/attach/publish workflow is unchanged.
Original bytes go directly to storage; Payload fetches them server-side to
validate and generate derivatives, then stores those derivatives in the bucket.
This avoids Vercel's 4.5MB incoming request limit. Processing large/animated files
can still exhaust function memory/time; the existing 40MB application limit is
not a guarantee that every image fits the hosting plan. Interrupted direct uploads
can leave unattached objects; retain them for investigation rather than adding an
automatic deletion lifecycle that might remove originals.

See [Payload storage adapters](https://payloadcms.com/docs/upload/storage-adapters)
and [Vercel payload limits](https://vercel.com/docs/errors/function_payload_too_large).

## URLs, original access and existing files

URLs remain `/api/media/file/FILENAME` through Payload. Public image requests
select available preview/viewer/thumbnail sizes, never the original as a fallback.
Anonymous requests for original image filenames are denied. Staff can retrieve
originals; PDFs retain the existing access-checked original delivery. Downloads
are streamed through Payload with private/no-store responses, not redirected to
long-lived public or signed bucket links. The adapter's read handler is pinned to
the authorized record's stored object prefix to prevent a query-string prefix
from selecting a different object in the installed 3.88 adapter.

The empty object prefix keeps existing filenames stable. Enabling the adapter
does NOT copy existing local files. Before switching traffic, copy every available
original AND derivative to the new private bucket using exactly its existing
filename as the root object key. Include files referenced by drafts/versions.
For already populated buckets, compare keys/checksums first; do not overwrite
different content. Never run a sync with --delete. An empty dedicated bucket is
the simplest safe starting point.

Existing IDs, alt text, captions, relationships, publication state and filenames
are untouched. Older thumbnail-only records still display at thumbnail quality.
Files with no known derivative remain omitted; chapter page counts can consequently
shrink until files are reprocessed. SVG/animated inputs need explicit verification.

No regeneration script is added: Payload re-upload can replace/delete previous
files and change filenames, so a bulk automatic re-upload is not a safe additive
operation. After backups and file transfer, reprocess selected existing Media
records through Payload, checking retained IDs, references, metadata and versions.
Do not create replacement records unless deliberately reassigning their references.
Files already lost from Vercel /tmp cannot be reconstructed from database metadata;
recover those from the original source/backup. Do not delete their records.

## Exact deployment sequence (operator only)

1. Pause editorial writes. Export a managed PostgreSQL backup and a full media
   backup. Identify whether any files exist only in a running Vercel instance.
2. Provision the private bucket/credentials and CORS above. Copy available files
   from the verified backup to the bucket with unchanged root keys. Verify counts,
   checksums and representative original/derivative objects. If using AWS CLI,
   inject AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY from the corresponding S3_ values,
   use `aws s3 sync BACKUP_DIRECTORY s3://BUCKET --endpoint-url ENDPOINT --dryrun`,
   review it, then run the same command without --dryrun against the empty bucket.
   Omit --endpoint-url for AWS. Never add --delete.
3. Inject the real production variables into a trusted shell (not .env.local).
   From this repository run:

   ```powershell
   node scripts/verify-production-env.mjs
   node node_modules/payload/bin.js migrate:status
   ```

4. Read the live `payload_migrations` ledger and inspect PostgreSQL columns/indexes
   against this migration order. Restore the backup to a staging database and
   apply pending migrations there first. Confirm route-key uniqueness and media
   fields. If unexpected manual/experimental schema exists, stop and reconcile it
   with a separate reviewed forward migration; do not rewrite applied history.
5. Once staging succeeds, with the production variables still explicitly selected:

   ```powershell
   node node_modules/payload/bin.js migrate
   node node_modules/payload/bin.js migrate:status
   ```

   Do not use `npm run cms:migrate`: that is the legacy content importer, NOT
   the production database migration command. No application build applies DDL.
6. Set the same variables in Vercel Production (and separate staging variables in
   Preview), deploy the stabilized source, then reopen editorial writes after the
   checks below. No storage or migration work was performed automatically here.
7. Verify /admin login, all existing collections, direct URLs and a new upload.
   Check 400/1200/2400 sizes, staff original access, anonymous original denial,
   private bucket denial, batch upload above 4.5MB, saved ordering, and file
   revocation after unpublishing the parent. Verify old files before and after a
   redeployment to demonstrate durable storage. Check that no requests fall back
   to original images or local /tmp delivery.

## Narrow local validation

`npm.cmd run typecheck` and offline Payload schema generation are required.
The disposable PostgreSQL-engine migration check supports both known histories:

```powershell
npm.cmd install --prefix test-results/schema-check --no-save --package-lock=false @electric-sql/pglite
node scripts/check-infrastructure-migrations.mjs
```

It uses only an in-memory PostgreSQL engine and synthetic records; it does not
load .env files or connect to any server. Its dependency is confined to ignored
test-results. Provider credentials, bucket configuration and real production data
still require operator verification.
