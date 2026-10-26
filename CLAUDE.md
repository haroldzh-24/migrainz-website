# CLAUDE.md

@AGENTS.md

AGENTS.md is authoritative for conventions. This file adds production-safety rules and current status.

## Production safety: never without explicit approval in the current conversation
- Connecting to, querying, migrating or writing the production database (Neon `migrainz-db`, branch `main`), even read-only.
- `payload migrate`, `migrate:fresh|reset|refresh`, `push: true`, or any migration `down`.
- Reading, writing, copying or deleting objects in the private Blob store `migrainz-media`, or running `scripts/recover-blob-media.mjs --apply`.
- Pushing any branch (a push creates a Vercel Preview deployment), pushing to `main`, deploying/promoting, or changing Vercel/Neon settings or env vars.
- Printing, copying or committing `.env*` values. Refer to variables by name only.
- Starting the dev server against the existing local SQLite database after a schema change (dev schema sync writes on startup; see bugs.md). Use isolated fixtures under `test-results/`.
- Rewriting Git history, deleting branches or dropping stashes.

The Vercel build command is `npm run build` and must not run migrations. Migrations are applied manually: back up, rehearse on a Neon branch copy, then apply.

## Release status (update when it changes)
- Status as of 2026-10-25 (from docs/redesign-plan.md "Current state"). `origin/main` (`88913ea`) is the deployed line and already contains the Equipment expansion (`feature/equipment-schematics-assignments`, migration `20261015_080148_equipment_schematics_assignments`). Whether that migration has been applied to the production database has NOT been verified in this repo; do not assume either way.
- 2026-10-25: `main` (`10b1ddf`) was pushed with Harold's approval and production served it about 36 s later: the CRT restyle, the laptop fit and faction poster cards, and the docs. No schema, migration, Blob or env change. Pushing `main` deploys production; it needs explicit approval every time.
- `feature/crt-readability` is merged (local branch only, never pushed). Later docs commits on `main` (this release-status update) are unpushed until approved.
- There is no isolated Preview yet (a push creates a Vercel Preview built with production credentials), so no branch is pushed. Preview isolation is listed in docs/redesign-plan.md "Workflow setup".
- Blockers before any further production schema work: production `payload_migrations` ledger and schema verified; Neon and Blob backups taken; restore tested in isolation; Preview confirmed on a separate DB branch; pending migrations rehearsed against a production copy.
- The review server (`node scripts/serve-fixture.mjs`) runs in dev mode on a throwaway SQLite fixture; production builds on SQLite are refused by design.

## Commands (PowerShell: use npm.cmd)
- `npm.cmd run typecheck` and `npm.cmd run build` (offline build; does not prove DB or migration state)
- `npm.cmd run test:regression` (fresh private SQLite fixture plus Playwright; stop the dev server first)
- Isolated checks that never load `.env.local`: `node --import tsx scripts/verify-equipment.ts`, `node --import tsx scripts/check-blob-storage.mjs`, `node --import tsx scripts/verify-equipment-migration.mjs`, `node scripts/verify-equipment-browser.mjs`

## Architecture invariants
- Payload 3.88 packages are pinned together; upgrade them only as a set.
- PostgreSQL migrations are hand-reviewed, additive, registered in `migrations/postgres/index.ts`, with no automatic destructive `down`. Regenerate `payload-types.ts` after schema changes.
- Listing visibility is never authorization. Full-content queries are server-only with `overrideAccess: false`; only allowlisted placeholder projections bypass access.
- Media bytes are served only via `/api/media/file/...` after `mediaRead`. No public Blob URLs, signed links or client tokens. Protected originals never enter fallback candidates.
- `Characters.equipmentAssignments` is the only source of equipment assignments; equipment pages derive the reverse.

## Working style
- One feature branch per change off `main`; small focused commits.
- Update features.md and changelog.md; log bugs in bugs.md with evidence and status.
- Report validation honestly: separate simulated/synthetic checks from real-device or live checks.
