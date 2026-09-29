# Studio Migrainz content management

The frontend still uses the terminal components and existing URLs. Payload 3.88
runs in the same Next.js app at `/admin`. The public layout lives in
`app/(frontend)`; the CMS has its own `app/(payload)` layout and styles.

## Start development

```powershell
npm.cmd ci
npm.cmd run cms:setup
npm.cmd run cms:types
npm.cmd run cms:importmap
npm.cmd run cms:migrate
npm.cmd run cms:migrate -- --apply
npm.cmd run cms:verify
npm.cmd run dev
```

Run setup only once: it refuses to overwrite `.env.local`. It creates a random
secret and stores the SQLite database and uploaded media under
`%LOCALAPPDATA%/StudioMigrainz/cms/`, outside this Git/OneDrive checkout. Keep that
directory backed up along with the secret. Database backups should be taken with
the app stopped, or with a SQLite-aware backup tool so WAL changes are included.
No long-term media library belongs in Git.

Open **http://127.0.0.1:3000/admin** (or the port printed by Next). On a fresh
database, create your administrator there. No default password or persistent test
account is supplied. All current CMS users are trusted administrators; public
user registration is not implemented. Patreon sessions are separate from CMS accounts. Additional CMS users
can be created by an administrator. Email delivery is not configured locally, so
configure an email adapter before relying on password-reset emails in production.

## Editing and publishing

Projects, Factions, Characters, Equipment, Comics, Chapters, Updates, Tracker Items, Galleries, Archive
Items, Media, Tags and Categories appear in the admin navigation. Each content
record supports drafts and version history. Publication status is independent of
production status (for example, a published project can still be in development).

## Factions and equipment

Create Factions under a Project, select the organization type, and add a short
description, optional full writing, status, emblem and display order. Emblems use
the existing Media library and must be images. Publish the project, media and
faction to expose the record publicly. Slugs are unique within each project.

Characters now have optional `primaryFaction` and multiple `affiliations`.
Select the project first: Payload filters these fields and Equipment's optional
`faction` field to that project, and validates selected relationships on save.
Changing a character/equipment project requires clearing or reselecting any
factions from the previous project. No existing characters are reassigned.
The faction directory includes characters with either a primary or additional
affiliation, once per character. Equipment supports category, description,
ordered media rows and display order. Both collections retain drafts, versions,
listing visibility and content access controls.

Public navigation is Project -> Factions -> Characters / Equipment. The faction
index also links to all characters, including unassigned records. Existing
character URLs and viewer tab IDs are unchanged. Equipment opens the same ART
VIEWER and has `/projects/PROJECT/equipment/ITEM` URLs for direct navigation.
Equipment requires an accessible project and, when assigned, an accessible
faction; characters retain their existing project-based access. Hiding a listing
does not make content or its files private. Unpublishing a faction revokes media
used only by it or its equipment, through the existing media authorization layer.

The additive PostgreSQL migration `20260927_190344_factions_equipment` is generated
but not applied. Apply pending migrations through the existing production
migration workflow before running this schema against PostgreSQL. It adds nullable
character relationships without rewriting records. Development SQLite uses its
existing development schema synchronization; back up the local database before
starting the updated app. No data import or fabricated assignments are required.

For the basic comic workflow:

1. Create a Project with a unique slug and Project ID. Add descriptions, writing,
   optional hero image, categories and galleries. Publish it.
2. Upload images in Media, add descriptive alt text, choose PUBLIC, REDACTED, PATRON or HIDDEN and
   publish the media record. An unattached file is still not publicly retrievable.
3. Create a Comic related to that project and publish it.
4. Create a Chapter related to the comic. Set its slug and chapter number.
5. Add page rows and choose existing Media (or create an upload from the field).
   Rows are displayed in their saved order. Save a draft or publish the chapter.
6. Visit `/comics/PROJECT-SLUG/CHAPTER-SLUG`. No deployment or source edit is needed.

New image uploads preserve the original and generate WebP
derivatives: a 400px thumbnail, 1200px preview and 2400px viewer image at quality
84. The shared public mapper selects viewer, preview, thumbnail, then legacy
thumbnail; thumbnail strips prefer thumbnails. For published PUBLIC images only,
the original URL is the final compatibility fallback. Every file request still
passes the existing media and accessible-parent authorization. PDFs continue
using their existing authorized download behavior.

Existing Media files are not rewritten when these sizes are added. Public
rendering uses the ordered candidates above. ART VIEWER and COMIC READER share
the same canvas, which tries the next candidate after an image-load error,
including a 404/500 for derivative metadata whose file is missing on disk. A
PUBLIC original is tried only after the derivative candidates fail. If all files
are unavailable, the existing unavailable state remains and comic page positions
and ordering are preserved. This fallback cannot recover an original that is also
missing from temporary storage.

Protected image originals are never included in the fallback candidates. Even
entitled PATRON images remain derivative-only, and nonstaff direct original
requests require published PUBLIC media plus the existing accessible reference
checks. REDACTED, HIDDEN, drafts, locked PATRON records and inaccessible parents
remain denied. Staff retain their admin file access.

Media listing visibility does not authorize attached files: published PUBLIC
media can have a HIDDEN listing and still render through an accessible parent.
Media accessLevel HIDDEN/REDACTED, drafts, unentitled PATRON files, and files without
an accessible reference remain denied. Classified comic slots keep their saved
positions and safe placeholders without exposing protected image metadata.

For missing resized copies with an existing source, the smallest reprocessing
path is a staff-authorized Payload update of that **same Media ID**, supplying
the backed-up source via `filePath` (or `file`) with `overwriteExistingFiles: true`.
Preserve publication/access fields, captions and all parent relationships; verify
the resulting filenames and bytes before proceeding to another record. Back up
the record and files first, and obtain approval before running this write. Do not
create replacement records, bulk regenerate, or re-upload the archive. The
2026-09-29 recovery performed no reprocessing or migration execution.

Project writing, update writing, character writing, hero images, attached galleries
and archive files render through the existing terminal styles. The reader retains
its controls and boundary behavior. Keep slugs stable once links are shared;
changing a slug changes its URL. Chapter slugs are unique across their project,
including projects with multiple comics.

The chapter and gallery forms also include **Add multiple pages/images**:

- Each selected batch is naturally sorted by filename (1, 2, 10).
- Review previews and add alt text before upload.
- Upload files; progress and failures appear per file. Retry reuses an upload key
  so a completed upload with a lost response is recovered instead of duplicated.
- Attach uploaded files to the form, then use the existing row handles or the
  up/down buttons to arrange the final order. Save draft or publish afterward.
- You can cancel uploads. Completed files remain in Media; leaving an unsaved
  form does not delete them. Unattached files remain inaccessible to visitors.
- The local limit is 40 MB per image. Uploads run sequentially to bound memory and
  make failures recoverable. The queue itself is not persisted across a reload.

Publishing validates referenced media. Documents must reference published media;
chapter pages must be images. PUBLIC and entitled PATRON media render normally;
REDACTED and unentitled PATRON media use safe placeholders, and HIDDEN media is
omitted. Removing a page row does not delete
its media. Referenced records cannot be deleted until live/draft references are
removed. Historical versions are not a substitute for backing up uploaded files.

## Access model

`listingVisibility` and `listingSummary` are separate from `accessLevel`:

- **Listing fields:** control whether a record appears and its optional explicitly safe placeholder label.
- **Access level:** controls access to the actual record and its files.

The access selector distinguishes PUBLIC (normal content), REDACTED (green censor
bars), PATRON (membership/tier access or a locked placeholder), and HIDDEN (omitted). The separate HIDDEN
listing setting also omits the record, regardless of access. Existing values are
not rewritten. Drafts and children of inaccessible parents remain omitted.

Public listing adapters use a server-only, depth-zero metadata projection for
REDACTED/PATRON records. It selects classification, the optional safe public
placeholder label, IDs and relationships needed for placement, and tracker kind.
It never selects source titles, slugs, writing, filenames or image URLs. Generic
bar lengths and media dimensions do not depend on protected text or images.
Do not put secrets in the safe public placeholder label: it is public by design.

REDACTED placeholders remain inert. Unentitled PATRON placeholders use black text
bars or CLASSIFIED image blocks; activation opens the existing gray-window
ACCESS DENIED presentation. Known patron page URLs display safe locked shells,
while document APIs and file delivery still deny unauthorized reads. Only
authorized media is passed to art/comic viewers; classified page placeholders
appear separately on the chapter route.

Patreon API v2 now verifies the configured campaign and current paid membership
on the server. Optional `patreonTierIDs` is a JSON array of tier ID strings;
empty/null allows any active paid studio patron, otherwise one ID must match.
Each parent, record and Media item has independent requirements. CMS staff
authentication remains separate. Missing Patreon configuration leaves sign-in
unavailable and patron content locked. See [Patreon setup and manual tests](PATREON.md)
for exact OAuth, session, tier and media-security behavior.

PostgreSQL requires the new additive `20260928_180000_classified_access` migration
before using these access states. It adds enum values to live and version tables
without changing existing records. `20260928_190000_patreon_tier_access` also adds
nullable tier-policy fields to all eleven content collections and their version
tables. Both migrations are registered but have not been applied locally or to production.

Public API reads require published PUBLIC or entitled PATRON content and accessible
parents. Media also requires its own access/tier authorization and a reference from accessible
content. Unpublishing a chapter or its parent removes access to files used only by
that content, including derivatives. Media still referenced by another public
document remains public. Public-to-private conversion cannot recall copies that
someone already downloaded while a file was public.

Full-content frontend queries are server-only and use `overrideAccess: false` with
the encrypted Patreon session. Only allowlisted placeholder and tier-policy
metadata projections bypass document access; these never expose protected bodies.
They do not
fall back to the old source data if CMS content is absent or unpublished. File
responses use `private, no-store`; a later CDN/storage integration must preserve
authorization and revocation behavior.

## Migration and rollback

`data/projects.ts` and the original `public/comics` samples are preserved as the
legacy fixture. The import script defaults to a dry run. `--apply` creates only
missing legacy keys; reruns do not duplicate records or overwrite editorial
changes. The verification script compares legacy text, relationships, page order,
alt text, file checksums and counts. Run it immediately after import; subsequent
intentional editorial changes can understandably differ from the legacy fixture.

Git's deleted old route paths represent moves into `(frontend)`, not discarded
content. The preserved `index.html` has not been changed. Rollback consists of
restoring the previous code checkpoint and the matching database/media backup;
do not use source-data fallback as an automatic response to CMS errors.

## Production requirements

**SQLite is development only.** `NODE_ENV=production` rejects SQLite in the CMS
configuration. A public deployment must use a **managed PostgreSQL** connection
with appropriate TLS configuration. Schema pushing is disabled for PostgreSQL.
Generate/review migrations with `npm run cms:postgres:schema -- NAME`; apply them
using Payload's migration CLI against the intended managed database before launch.

`npm run build` compiles all CMS routes against the PostgreSQL adapter without
connecting to a database. Its placeholder connection is build-only. A successful
build is not proof of a working production database or production deployment.
`npm start` needs real production environment values and will reject the local
SQLite `.env.local` configuration.

Before public production deployment:

1. Provision managed PostgreSQL, apply reviewed migrations, and perform a tested
   transfer from development with record-ID/relationship reconciliation and backups.
   The legacy importer is not a general SQLite-to-PostgreSQL transfer tool.
2. Configure private object storage (S3 or R2 via the S3 adapter; evaluate private
   delivery carefully for Vercel Blob). Copy originals and derivatives, verify
   checksums, preserve Media relationships, then switch the adapter. No cloud
   storage adapter or service has been provisioned in this foundation.
3. Verify anonymous denial for patron originals/derivatives, draft access, parent
   publication, and cache behavior on the actual host. Public bucket URLs must
   never bypass Payload's authorization.
4. Configure administrator credentials, secret management, email, backups and
   upload limits for the hosting provider. Review outstanding dependency advisories.

## Vercel class-demo deployment

Vercel runs Next.js functions directly; `scripts/start.mjs` is not its startup
hook. Variables supplied only to the build script's child process do not configure
those functions. Hosted builds now fail on missing production configuration
instead of substituting offline placeholders. Local offline builds still work.

1. Open the Vercel project whose Settings > Domains contains
   `migrainz-website.vercel.app`. Confirm Settings > Git uses the intended repository
   and production branch `main`, with the repository root as Root Directory.
2. In Settings > Environment Variables, confirm all four exact names are enabled
   for **Production**: `CMS_DATABASE`, `DATABASE_URL`, `PAYLOAD_SECRET`,
   `CMS_MEDIA_DIR`. Use `postgres` and `/tmp/studio-migrainz-media` for the two
   nonsecret settings. Preserve the existing managed PostgreSQL URL and stable
   secret; do not copy local SQLite values or add `NEXT_PUBLIC_` prefixes.
   Shared variables must be linked to this project. Preview-only settings do not
   apply to Production.
3. In Build and Deployment, use the Next.js framework preset and `npm run build`.
   Leave Output Directory at its framework default. Deploy the verified source
   changes to Production. Changing dashboard variables does not update an old
   deployment: create a new deployment, then confirm the production domain points
   to it. Do not merely promote an older deployment with stale variables.
4. Inspect the new deployment's runtime logs while opening `/admin`. Configuration
   failures now name missing variables without printing values. A successful build
   still does not prove database connectivity or that migrations have been applied.

For a trusted shell already supplied with the production variables, run
`npm run cms:verify-env`. This prints presence only, validates configuration, and
does not connect to the database. It intentionally does not load `.env.local`.
Do not publish an environment-debug API endpoint.

If logs report missing PostgreSQL tables, use the existing reviewed foundation
migration, not schema pushing or the legacy content importer. From a trusted
shell with production variables injected (not the local SQLite `.env.local`):

```powershell
node scripts/verify-production-env.mjs
# Continue only if verification passed.
node node_modules/payload/bin.js migrate:status
# Review status and confirm the intended database before applying pending up migrations.
node node_modules/payload/bin.js migrate
node node_modules/payload/bin.js migrate:status
```

The checked-in foundation `up` creates tables, enums, indexes and foreign keys;
its `down` is destructive and must not be run for deployment. Do not use
`migrate:fresh`, `migrate:reset`, `migrate:refresh` or `push:true`. If an existing
schema conflicts with migration history, reconcile it before applying migrations.
No production migration is automatically run by a build or function startup.

After schema initialization, `/admin` should offer Payload's first-user setup on
an empty database or login on an existing database. Create the real administrator
interactively; no default user is provisioned. Existing staff access rules remain.

`/tmp/studio-migrainz-media` is only a temporary class-demo filesystem location.
Payload creates the directory on upload. Files can disappear on restart and are
not shared across functions/instances; database records can outlive them. Keep
originals elsewhere. Existing file authorization remains in force. R2 integration
and durable production media remain deferred.

## Local verification commands

```powershell
npm.cmd run typecheck
npm.cmd run cms:verify
npm.cmd run build
npm.cmd exec --yes --package=playwright -- node scripts/verify.cjs
npm.cmd exec --yes --package=playwright -- node scripts/verify-cms.cjs
```

Browser checks require the local dev server and Chrome. The CMS workflow check
uses temporary records and a temporary administrator, removes them afterward,
and refuses to run against a non-local server. It currently requires a database
with no administrator; run it before creating your real account or against a
separate development test database. It never replaces an existing administrator.
Screenshots and audit output are written under ignored `test-results/`.
