# Post-faction audit — 2026-09-28

Scope: source/history review and `npm.cmd run typecheck` only. No database queries,
migrations, media reprocessing, builds, browser checks, commits or pushes were run.
Existing uncommitted work was preserved. No Patreon/redaction feature was completed.

## History

Baseline: `519daa1ece1ea65dddd21508792671e19e595b92` (factions/equipment).
Reviewed all five later commits:

- `42afcec`: upload guidance and batch MIME validation.
- `53c1b47`: faction/equipment route-key/index correction, including edits to the
  original migration and its snapshot, documented at that time as unapplied.
- `5b36ecd`: shared monitor comic reader and initial page flip.
- `f7aaffb`: separate forward route-key repair migration.
- `98cf3ba`: compact viewer chrome, removal of page flip, public image derivatives.

At audit entry there were 16 modified tracked files and untracked
`components/PublicContent.tsx`; no staged changes. These contain additional
access-control/redaction and page-section work beyond the five commits.

## Feature assessment

| Feature | Assessment |
| --- | --- |
| Upload instructions | Correct in the committed implementation: matches existing single-file and batch workflows, sorts each selection naturally, checks accepted MIME types before upload. Uncommitted access changes make the legacy access-level guidance stale. |
| Monitor comic reader | Correct architecture: existing route, RetroWindow, WindowManager and shared ArtworkCanvas. Bounded page selection, disabled boundaries, FIT/100%, pointer/keyboard pan and cleanup remain. Runtime interaction still needs manual checks. |
| Page-flip removal | Complete for animation/state; no flip state or CSS remains. Old terminal reader CSS (`reader-toolbar`, `reader-controls`, `comic-figure`, `reader-end`) is unused by current components. |
| Compact chrome | Reuses existing windows, portals and taskbar. Repaired duplicate mobile reader rule, conflicting desktop maximize size caps, and hidden mobile dock after desktop maximization. Desktop dock intentionally hides while a window is maximized; restore/minimize it to switch windows. |
| Derivatives/original blocking | Implemented in code, incomplete for production schema and existing media. See below. |
| Faction index correction | Current schema uses unique collection-specific route keys; Characters keeps the foundation compound index. No collection/content replacement. |
| Forward route-key repair | Correct separate, additive repair with no-op down. Does not reconcile older compound-index names if the original pre-fix migration was deployed. |
| Admin isolation | Public CSS, sound, CRT, monitor and providers remain exclusively in the frontend layout. Existing core collections and staff access remain registered. Repaired taxonomy read access, which incorrectly queried nonexistent draft/legacy publishing fields and also affected staff. |
| Uncommitted access/sections work | Partial and architecturally unsafe to deploy as-is. Preserved, not completed. Details below. |

## Repairs made in this audit

- Taxonomy access now bypasses public filters for staff and uses only fields that
  exist on Tags/Categories for anonymous queries.
- Guard missing timestamps in faction contents, equipment detail and homepage
  adapters. The existing afterRead redaction hook removes these fields; calling
  `.slice()` on them could crash these routes.
- Correct maximized viewer/reader CSS constraints and preserve the mobile dock
  when resizing a maximized desktop window; remove the duplicate mobile rule.
- Remove unused comic-route imports and the now-unused collection import.

## Migration state and production blockers

Registered order: foundation (`20260909_045755`), factions/equipment
(`20260927_190344`), route-key repair (`20260928_120000`). Actual applied production
history cannot be inferred from Git and was not queried. Existing statements in
CMS.md/bugs.md that the faction migration is unapplied are historical claims,
not current production evidence.

The checked-in migrations do NOT match the current Payload schema:

- No migration adds `sizes_preview_*` / `sizes_viewer_*` to `media` or their
  version equivalents to `_media_v`.
- The uncommitted `accessControl` and `sections` fields have no migrations and
  are also absent from generated Payload types. Broad records/casts allow the
  typecheck to pass despite that discrepancy.
- If production applied the original faction migration, its compound indexes
  differ from today's snapshot. The route-key repair adds/backfills keys but
  does not restore the Characters index names or remove old faction/equipment
  composites. If production applied the corrected migration, this mismatch does
  not arise. Inspect actual index definitions before preparing a forward repair.
- Duplicate non-null project/slug pairs cause the repair's unique index creation
  to fail rather than silently discard records. Its table-existence guards can
  also skip absent tables; it is not a replacement for the creation migration.

No historical migration was edited during this audit. Any remaining production
fix needs a separate reviewed forward migration, with actual deployed history
and existing data checked first. Do not reset migrations or databases.

## Media state

New raster uploads configure 400/1200/2400px inside-fit WebP derivatives, quality
84, without enlargement. Originals are retained. Galleries choose preview URLs;
the shared canvas uses viewer URLs and ART VIEWER thumbnails use thumbnail URLs.
The upload handler blocks anonymous original-image filenames after Payload's
file-access check; staff retains originals. PDF originals remain allowed under
normal publication/reference access. API GET responses use private/no-store.

Existing media is not automatically regenerated. Thumbnail-only files remain
low resolution; files without derivatives disappear from the public adapter,
including chapter page arrays (so page counts can shrink). Verify SVG and animated
GIF behavior separately rather than assuming raster output/animation. The
`thumbnailURL` fallback is an admin-thumbnail hook, not a guaranteed derivative.
`PublicContent.tsx` duplicates the image-selection logic instead of sharing it.

No durable object-storage adapter is configured. Vercel `/tmp` remains ephemeral
and instance-local. Installing the S3 package alone does not solve storage.

## Uncommitted work requiring a separate decision

- New default `accessControl.state = public` takes precedence over legacy
  `accessLevel = patron`. There is no reviewed migration preserving old access
  classifications. Batch upload still writes the legacy fields. This is an
  unsafe transition for existing restricted content.
- `publishedPublic` now requires legacy listing visibility for older records,
  conflating metadata listing with file authorization. Previously batch-uploaded
  media deliberately had hidden listings; this can hide their public files.
- Section media is missing from publication validation, reference-delete guards
  and media attachment authorization. Section-only images may fail to load;
  references do not receive the protections of the existing fixed fields.
- Homepage and faction queries lost their focused `select` projections. The
  homepage now fetches full records and archive attachments; its prior payload
  reduction is regressed. No hover-triggered queries were introduced.
- The placeholder/section classes have no corresponding public styles, the
  desktopFiles block renders ordinary links rather than DesktopFile, and
  `canAccessPatronContent` always returns false. These are unfinished features,
  not a functioning membership system.

## Manual checks next

1. Inspect production `payload_migrations` and PostgreSQL columns/indexes using
   read-only access; compare against the three registered migrations and schema
   gaps above before deployment.
2. In a backed-up development environment, edit/publish Projects, Factions,
   Characters, Equipment, Media, Comics and Chapters; test taxonomy selectors,
   faction project filtering, batch attach/order and existing unassigned records.
3. Test direct comic URLs, first/last page, page selection, arrow navigation,
   FIT/100%, zoom/pan, close/minimize/reopen, and chapter-to-chapter navigation.
4. Open art and reader together; test maximize/restore, tab persistence and
   duplicate prevention, desktop-to-mobile resize, keyboard/touch and reduced motion.
5. Check new and existing media as anonymous and staff: derivative dimensions,
   original denial/staff access, PDFs, small images, SVG/GIF, and revocation after
   unpublishing the parent. Reprocess existing media only with backups and an
   explicit media-preserving procedure.

Validation: `npm.cmd run typecheck` passed before and after repairs. Browser and
production behavior are not claimed verified.
