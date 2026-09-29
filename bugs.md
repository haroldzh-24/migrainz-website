# Bugs

## Open Bugs

### 2026-09-29 - Local runtime blocked by SQLite schema synchronization

- Focused recovery browser check timed out loading `/` on the already-running port 3000 server.
- Server log reports failed `INSERT INTO __new_characters ... SELECT ... FROM characters` during development schema synchronization, including `primary_faction_id` and `patreon_tier_i_ds`.
- A SQLite-aware backup exists at ignored `test-results/recovery.db`. The separate recovery server could not start alongside the existing Next dev lock; the existing process was left untouched.
- Status: Runtime validation blocked. Reconcile local development schema against a backup before retrying; this is not evidence of production PostgreSQL schema status. No production writes or migrations performed.

### 2026-09-10 - Vercel production admin initialization

- Evidence: public GET `/admin` returns HTTP 500; reported runtime error indicates one or more missing CMS environment variables.
- Confirmed code issue: build fallbacks masked missing hosted configuration, and runtime validation did not name the missing variable.
- Fix: hosted builds now validate supplied production configuration; runtime errors identify missing names without exposing values.
- Verification: typecheck, production guard and production build pass. Local SQLite `/admin` returns HTTP 200 with first-user setup; live production still returns HTTP 500 before deployment of these changes.
- Status: Code fix verified locally; deployment variable scopes, database connectivity and migration status require authenticated Vercel access. No CLI, token or project link is available in this workspace.

### 2026-09-09 - Upstream CMS dependency advisories

- Description: npm audit reports 12 moderate package entries inherited from Payload/Drizzle dependencies. No high or critical entries remain after updating Sharp and DOMPurify.
- Evidence: `npm audit`; ignored detailed report in test-results/npm-audit.json. Root advisories concern Payload default account-unlock access and older esbuild development-server tooling.
- Mitigation: account unlock is explicitly restricted to CMS staff; this site does not run an esbuild development server. Do not apply npm audit fix --force, which suggests incompatible old Payload packages.
- Status: Open for upstream package updates and production security review.


### Bug Entry Template

- Description / Symptoms:
- Hypothesis or Suspected Cause:
- Evidence:
- Fix:
- Status: Open

## Resolved Bugs

### 2026-09-29 - Public comic media denied by hidden listing metadata

- Local `rcb-001` chapter retains three published PUBLIC Media references (5, 6, 7); all original and thumbnail files exist. HIDDEN listing visibility incorrectly denied their file access and mapper output.
- Fix: Separate attached Media listing visibility from access authorization, preserve missing/classified page positions, and try other authorized derivatives when the preferred file fails. Do not expose originals or weaken protected access.
- Status: Source repair; typecheck and production build pass. Browser validation blocked by the separate local schema issue above. See documentation/recovery-20260929.md.

### 2026-09-28 - Restricted content disappeared from public listings

- Cause: the CMS only offered PUBLIC/PATRON access; all public document queries required PUBLIC, and no safe listing projection existed for restricted content.
- Fix: add distinct REDACTED/HIDDEN access states and a server-only allowlisted metadata path for visible REDACTED/PATRON placeholders. Full document/file reads stay PUBLIC-only; hidden records and inaccessible descendants are omitted.
- Status: Source implemented; PostgreSQL enum migration remains unapplied. `npm.cmd run typecheck` passed; manual access and rendering checks remain.

### 2026-09-28 - Factions/equipment compound index collision

- Cause: Payload 3.88 does not support explicit names for collection compound indexes and derives names from field paths, so Factions, Characters and Equipment competed for `project_slug_idx` and version-index names.
- Fix: Preserve the foundation Characters compound indexes. Replace new Factions/Equipment composites with hidden unique `routeKey` fields derived from project ID and slug, using collection-specific unique indexes. Correct the unapplied migration and schema snapshot without dropping or recreating Character indexes.
- Status: Source and migration corrected; migration remains unapplied. `npm.cmd run typecheck` passed.

### 2026-09-15 - Regression suite depended on editorial publication state

- Cause: the browser suite expected the published legacy BLUSHLAND comic/chapter and STALKER project in the editing database, where these records are now drafts. Anonymous queries correctly omit them, including The Observer's related chapter link.
- Fix: `npm run test:regression` seeds and verifies a fresh private database/media fixture before running the complete browser suite. Editorial records and content authorization are unchanged. Direct browser runs report a missing published chapter fixture explicitly.
- Coverage: the original project/character/chapter path and reader assertions remain, with an added exact chapter-link URL assertion.

### Bug Entry Template

- Description / Symptoms:
- Hypothesis or Suspected Cause:
- Evidence:
- Fix:
- Status: Resolved

### 2026-09-10 - Public page flash before startup

- Cause: closed dialog opened only in a hydration effect; window frame appeared in a later animation stage.
- Fix: public layout initially renders a fixed opaque gate with its window already visible and underlying content hidden/inert. Session dismissal is checked after hydration.
- Status: Resolved. Typecheck, production build and focused browser checks passed (initial HTML without JavaScript, persistent frame, dismissal/session, mobile and reduced motion).
