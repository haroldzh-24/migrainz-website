# Private Vercel Blob media

This repair uses the existing `migrainz-media` Vercel Blob store. It does not
provision a provider/store, change Media records, add database fields, or run
migrations. Existing media fallback and access classification remain unchanged.

## Implementation

Payload and its packages are pinned to 3.88.0. That version's official
[`@payloadcms/storage-vercel-blob` adapter](https://github.com/payloadcms/payload/blob/v3.88.0/packages/storage-vercel-blob/src/index.ts)
only supports public blobs. It cannot protect this site's files against direct
Blob URL access. `cms/blob-storage.ts` instead implements the small adapter
interface from the already-installed `@payloadcms/plugin-cloud-storage@3.88.0`
using the official `@vercel/blob@2.8.0` SDK's
[private storage API](https://vercel.com/docs/vercel-blob/private-storage).
The cloud-storage package is now an explicit dependency; the Blob SDK is new.
The pre-existing S3 dependency is not configured or used by this repair.

The Payload plugin receives original and generated-size buffers through its
upload hooks. All are stored with `access: 'private'`, deterministic keys
`media/<existing-filename>`, and no random suffix. No per-record prefix field is
added. The plugin handles file replacement/deletion through the normal authorized
Payload lifecycle. The recovery tool never overwrites existing Blob objects.

Generated URLs stay `/api/media/file/<encoded-filename>`, including URLs mapped
from existing records. Payload performs `mediaRead` first, enforcing publication,
access/tier policy and an accessible parent reference. The existing PUBLIC-only
original-image guard runs next, then the Blob handler streams private bytes.
There are no public Blob redirects, signed download links, or client tokens.
Responses use `private, no-store`, `Vary: Cookie`, and `nosniff`; SVG responses
retain the script restriction. Missing objects return 404; provider failures
return 502 so the existing viewer can try the next candidate. Byte-range requests
currently receive the complete authorized response (HTTP 200).

The existing fallback remains viewer -> preview -> thumbnail -> legacy thumbnail
-> authorized PUBLIC original -> unavailable. Protected originals never join the
candidate list. Media listing visibility alone still does not deny attached PUBLIC
files. No UI or batch uploader redesign is included.

## Environment and store requirements

- `BLOB_READ_WRITE_TOKEN` is the only Blob variable required by this integration.
  It selects the existing store and stays server-side. It is already configured
  for Production and Preview; local `.env.local` currently has no Blob variables.
- `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY` were also confirmed in Production
  and Preview. Leave them in place; these server-side SDK calls do not require
  them. No new mandatory environment variable is introduced.
- Read-only Vercel inspection confirmed the existing `migrainz-media` store is
  **Private**. Preserve that access mode. This repair never downgrades to public
  writes; no replacement store has been created.
- Without a token, local development uses the existing SQLite/filesystem setup.
  Setting the token locally explicitly opts into Blob. On Vercel (`VERCEL=1`), a
  missing token fails configuration instead of falling back to ephemeral storage.
- Keep the existing PostgreSQL, Payload secret and `CMS_MEDIA_DIR` settings.
  The compatibility directory remains configured, but hosted Media has
  `disableLocalStorage: true`; durable bytes are in Blob, not `/tmp`.

Server uploads preserve the existing admin and batch multipart workflow. Vercel
functions still have a 4.5 MB request-body limit (including multipart overhead),
even though the CMS accepts 40 MB locally. Uploading larger files through hosted
admin/batch requires a separately scoped client-upload workflow; this repair
does not silently add a token endpoint or bypass authentication to achieve it.
Generated outputs are sent from the server to Blob and do not count toward the
incoming request body. See [Payload's storage documentation](https://payloadcms.com/docs/upload/storage-adapters).

## Existing files and recovery

The store listing reported zero objects. Blob cannot restore lost `/tmp` bytes.
The read-only local inventory is in
[`documentation/blob-media-recovery.md`](../documentation/blob-media-recovery.md).
It found seven originals and four recorded thumbnails. Production IDs/filenames
must be reconciled using an export from the target database, not assumed to match
the local development database.

`scripts/recover-blob-media.mjs` accepts a complete **staff-exported Media JSON
array** or a complete Payload `{ docs, totalDocs, hasNextPage: false }` response.
Retain `id`, `filename`, `mimeType`, `filesize`, and `sizes` in that export. Keep
the export private/outside Git. A paginated/incomplete response is rejected.
Export via an authenticated existing admin session; the script does not handle
or store CMS login credentials.

It reads only filenames recorded in that export, rejects path escapes and
ambiguous filenames, reports missing files, and checks recorded byte sizes when
available. SHA-256 hashes identify the local bytes being proposed. No resizing,
filename substitution, Media create/update, or database initialization occurs.
Dry-run requires no Blob credentials and makes no network requests.

1. Keep the verified Private store connected to both deployment scopes with its
   existing token. Do not switch to a public store for recovery.
2. Review the code and Vercel build override. The earlier deployment inspection
   found `node node_modules/payload/bin.js migrate && npm run build`. This storage
   repair needs no migration: remove the migration portion before a storage-only
   deployment, rather than accidentally executing unrelated pending migrations.
3. Export all target Media records privately and review IDs/filenames against the
   local report. Back up the export and local files.
4. Run the dry-run explicitly (it has **not** been executed by this repair):

   ```powershell
   node --import tsx scripts/recover-blob-media.mjs --records C:/PRIVATE/production-media.json --media-dir C:/Users/brrrr/AppData/Local/StudioMigrainz/cms/media
   ```

5. Review missing/mismatched entries. For local recovery, use the fresh
   `VERCEL_OIDC_TOKEN` downloaded by Vercel CLI in `.env.local`; no long-lived
   `BLOB_READ_WRITE_TOKEN` is required or used by this script. Explicitly apply:

   ```powershell
   node --env-file=.env.local --import tsx scripts/recover-blob-media.mjs --records C:/PRIVATE/production-media.json --media-dir C:/Users/brrrr/AppData/Local/StudioMigrainz/cms/media --apply --confirm-store-id store_oQfoWmWeYUIujVns
   ```

   Replace `C:/PRIVATE/production-media.json` with your complete target export.
   The script passes explicit `oidcToken` and `storeId` options supported by the
   installed `@vercel/blob@2.8.0`. `--confirm-store-id` is both the explicit
   destination selection and confirmation, with the optional `store_` prefix
   normalized. If `BLOB_STORE_ID` is set, it must match exactly after normalization.
   If it is absent, the CLI confirmation supplies the destination. OIDC tokens
   do not embed a Blob store ID; Vercel enforces the linked project's access to
   the selected store. The script neither decodes nor prints credentials and
   does not fall back to an ambient read/write token. SDK failures are reported
   without raw errors or credential-bearing causes.

   This local command uses a token snapshot, not an automatic refresh loop. If
   it expires, refresh it through the linked Vercel CLI project and rerun the
   command; already-present objects remain skipped. See
   [Vercel's local OIDC guidance](https://vercel.com/docs/oidc#in-local-development).
   This change affects recovery only; the Payload storage adapter is unchanged.

   Existing Blob keys are skipped, never overwritten. Missing files are reported,
   not regenerated. Re-running copies only still-missing objects. Blob URLs and
   tokens are not printed; no database write is performed. An interrupted apply
   can leave a partial copy; its per-file output identifies progress.
6. Deploy the reviewed code separately. Verify a small new admin/batch image and
   its generated sizes persist across deployments; verify original/derivative API
   requests for PUBLIC, locked PATRON, REDACTED, HIDDEN, draft and inaccessible
   parent records. Confirm direct private Blob URLs cannot anonymously download
   bytes. Open the actual RCB chapter and check all saved page positions.

No recovery, upload, deployment, migration, commit or push was performed here.

## Read-only OIDC diagnostics

Run `node --env-file=.env.local scripts/diagnose-blob-oidc.mjs` to test anonymous
HTTPS to the private file host/API, followed by authenticated SDK list/head calls.
The tool prints sanitized error names/messages/codes, nested causes, and HTTP
statuses. It never prints request headers, token claims, response bodies, or Blob
object metadata, and cannot upload/delete files. SDK Undici transport events are
observed before errors are wrapped.

On 2026-09-30, anonymous HTTPS returned 400 from the private host and 403 from the
Blob API. Authenticated SDK list/head both returned HTTP 403 and reported that OIDC was enabled for the
project but **not for the development environment**. No Node TLS/fetch failure
was reproduced. `.env.local` variable names were CMS_DATABASE, DATABASE_URL,
CMS_MEDIA_DIR, PAYLOAD_SECRET, and VERCEL_OIDC_TOKEN; values were not printed.

The installed SDK 2.8.0 requires an OIDC credential **and** a target store:
`oidcToken`/VERCEL_OIDC_TOKEN plus `storeId`/BLOB_STORE_ID. Recovery already passes
both explicitly. `head()` and `list()` use the Blob control API and do not accept
or need `access: 'private'`; the SDK uses that option for byte retrieval/uploads.
Their current invocation is correct. No recovery-code change is needed.

For local CLI tokens, enable **Development** on the existing Private Blob store's
connection to `migrainz-website` (Preview/Production alone do not authorize a
development token). Do not change store visibility or restore a read/write token.
Refresh the local token after that dashboard change, then repeat the read-only
check. To avoid overwriting local SQLite settings, pull into an ignored diagnostic
file from the already-linked project root:

```powershell
vercel env pull test-results/blob-oidc.env --environment=development
node --env-file=test-results/blob-oidc.env scripts/diagnose-blob-oidc.mjs
```

A missing-object response from head is expected if `media/01.svg` has not been
copied yet; list should succeed once authentication is configured. This is not an
instruction to run recovery apply. Vercel documents local OIDC tokens in its
[OIDC guide](https://vercel.com/docs/oidc#in-local-development).

## Validation and changed files

`npm.cmd run typecheck` passed. The permitted narrow check
`node --import tsx scripts/check-blob-storage.mjs` passed with in-memory SDK mocks:
local/hosted configuration, identical sanitized database field paths, retained
access handler order, private upload options, protected-original denial, proxy
streaming/cache headers and missing-file responses. No real Blob write or runtime
deployment behavior was tested. The check required running outside the Windows
sandbox because its TypeScript loader could not read OS user information there.

Changed files: `cms/blob-files.ts`, `cms/blob-storage.ts`, `payload.config.ts`,
`scripts/production-env.mjs`, `scripts/recover-blob-media.mjs`,
`scripts/check-blob-storage.mjs`, `package.json`, `package-lock.json`, `.env.example`,
`docs/CMS.md`, this document, `documentation/blob-media-recovery.md`, `features.md`,
and `changelog.md`. Read-only inventory helper/output are ignored under
`test-results/`. No UI, access-policy, fallback, Media-record or migration files
were changed.
