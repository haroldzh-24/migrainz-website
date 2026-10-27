# Bugs

## Open Bugs

### 2026-10-27 - Site-health baseline: soft 404s, generic title, placeholder link, accessibility (batch 2)

- Found by the 2026-10-26 audit and recorded by `scripts/verify-site-health.mjs` in `scripts/site-health-baseline.json` (fixture, headless Chrome, 390 and 1366).
- Missing project, character, equipment and faction records (and a character under the wrong project) return HTTP 200 "Record not found" instead of 404. Unknown top-level paths and missing comics already return 404.
- Equipment directory pages use the generic site title. The store link points at `example.com` (labelled as a placeholder).
- Accessibility (axe-core 4.14): headings inside light Win95 windows use the green terminal colour on grey (axe flagged FACTIONS on project pages, the section heading on a faction page and, at 390 px, the character EQUIPMENT heading; a browser probe found the same colour on RELATED COMIC CHAPTERS, ASSIGNED CHARACTERS and equipment card titles), about 1.02:1 on the live FACTIONS heading; "ARCHIVE INDEX AWAITING FILES." 4.23:1; Win95 window buttons 21x19 px and "i" buttons 21x21 px (24 px needed); the brand link is named "Home" but shows "MIGRAINZ"; `aria-label` on a plain div; tracker heading order; the window layer outside landmarks.
- Status: Open; roadmap batch 2 (items 2.1-2.4, 2.6).

### 2026-10-22 - Art Viewer Escape only closes the viewer while it is the focused window (minor, logging only)

- components/ArtViewer.tsx (around line 175) closes on Escape through a document keydown listener, but only while the window manager marks the viewer focused, not minimized and visible. The viewer does take focus when it opens (components/WindowManager.tsx line 271 moves DOM focus to the focused window element), so Escape works straight after opening.
- It stops working once another window (a project window, the comic reader) is clicked or focused: Escape then does nothing until the viewer is clicked. Escape is also ignored when a handler already called preventDefault. This may be what the original "Escape did not close it" report hit; not confirmed with the reporter.
- Not fixed in feature/crt-readability. Status: Open, minor.

### 2026-10-21 - Art Viewer close button off-screen and page shifted left at about 669px (not reproducible; simulated check only)

- Reported in the Claude desktop app built-in browser (Chromium) on Windows, viewport 669x1025: scroll down on the mp510mmcc page, open the Equipment tab, click the card; the viewer's close button was not visible and, after closing, the page looked shifted left with its left edge cut off.
- A JavaScript check in that browser showed no horizontal overflow, so this was most likely a screenshot artifact rather than a layout bug. Also not reproduced by scripts/verify-equipment-navigation.mjs (real components and CSS at 1440, 670 and 390px, a 1440-to-360px resize sweep with eight tabs and a large artwork) or a read-only Chrome check of the live Equipment page at 390-1200px.
- Every check above is simulated (Playwright with real components and CSS, headless Chrome, and a read-only desktop Chrome check of the live page). Nothing was tried on a real phone or in the Claude desktop app browser: recheck there.
- Status: Not reproducible; no code change. Reopen with a screenshot plus document.documentElement.scrollWidth, window.scrollX and the close button's bounding rect if it recurs.

### 2026-10-21 - Art Viewer shows no poster for mp510mmcc (minor)

- Reported on the live site: the Art Viewer opened from the mp510mmcc item page shows no schematic poster. It was opened fresh after the card-navigation fix deployed, with browser storage empty, so it is not a stale persisted tab (an earlier version of this entry guessed that; it was wrong).
- Not reproduced: in Chrome (headless, 1200x800) on the live site the same click opens the viewer with the poster (/api/media/file/mp5-ten-bayonet-poster-1280x720.webp, HTTP 200), the tab data includes the poster, and the caption reads "NO CONCEPT ART FILED. SHOWING SCHEMATIC POSTER." So the poster is passed and fetched correctly; the cause is not yet known and may be specific to the reporter's browser (the Claude desktop app built-in browser, where the viewer canvas image is also hidden until its size is measured).
- Impact is low: on feat/schematic-module, items with no concept art no longer show OPEN IN ART VIEWER, so this path is not reachable from their pages. The same viewer image path still serves concept art, so recheck there if a concept-art image fails to appear.
- Status: Open, minor; needs the reporter's browser console and a screenshot of the viewer when it recurs.

### 2026-10-15 - Watcher stutter on other devices

- 2026-10-26 (fix/crt-glow): the Watcher now has a stepped opacity flicker and a rare 2px jitter when CRT is "on" (Harold's request). Headless profile: no extra paints, but the running flicker costs a style recalculation every frame while the Watcher is in view (so it pauses off-screen). The Macs need rechecking with CRT on and with CRT off; CRT off removes the motion.
- 2026-10-22: the recolour filter that was briefly on the moving container is gone; the recolour and glow are baked into the PNGs (scripts/bake-watcher-crt.mjs), so the per-frame cost is back to the original. Recheck on the affected Macs.
- User reports smooth deployed animation on one Windows laptop but stutter on Macs and a Raider HX 14V-class machine. Exact affected-browser/GPU/refresh-rate configuration is unknown.
- Public deployment matches the pre-optimization watcher behavior. Isolated throttled Chrome profiling confirms near-per-event React rerenders and repeated style/layout work; these are removed/reduced locally using an elapsed-time frame loop. Preserve effects, clipping, touch and scrolling; no deployment performed.
- Status: Local optimization verified by typecheck/build, Chrome/Edge interaction tests and simulated 60/120Hz timing. The original hardware-specific stutter is not reproduced or confirmed fixed. Safari/GPU/full-page interactions remain hypotheses. Measurements and next device checks: documentation/watcher-performance-20261015.md.
- Update 2026-10-15: Vercel deployment inspection confirmed production (migrainzxxl.com) now runs `main` commit 6c18bb5, which includes the optimization; each recent production deployment was created seconds after its `main` commit via the git-main alias. Re-test on the originally affected Mac and Raider HX 14V-class devices against the live site to confirm or close.

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
- Update 2026-10-25 (Harold, live check): `/admin` on the live site returns 200 with the Payload login page. Login page loads; logged-in use not verified.

### 2026-09-09 - Upstream CMS dependency advisories

- Description (state on 2026-09-09): npm audit reported 12 moderate package entries inherited from Payload/Drizzle dependencies, and no high or critical entries after updating Sharp and DOMPurify. That is no longer true; see the 2026-10-26 update below.
- Evidence: `npm audit`; ignored detailed report in test-results/npm-audit.json. Root advisories concern Payload default account-unlock access and older esbuild development-server tooling.
- Mitigation: account unlock is explicitly restricted to CMS staff; this site does not run an esbuild development server. Do not apply npm audit fix --force, which suggests incompatible old Payload packages.
- Status: Open for upstream package updates and production security review. Plan (2026-10-25, Harold): a small dependency-update branch after phase 1 ships.
- Update 2026-10-26 (chore/dependency-updates): the audit had grown to 26 entries (3 critical, 12 high, 11 moderate) in Next and Payload, including remote-code-execution advisories. The live site runs the affected versions. Report: test-results/npm-audit-before.json.
- Fixed on the branch (patch/minor only): next 16.3.4 -> 16.4.3 (all Next advisories, incl. the image-optimization SVG and `use cache` RCEs), sharp 0.35.5, and within existing ranges fast-uri 3.1.9, source-map-js 1.2.2, undici 6.29.1 under `@vercel/blob`. Audit 26 -> 21 (test-results/npm-audit-after.json).
- Audit-only, not a real fix: the `dompurify` override (now `^3.4.17`; the old exact `3.4.15` pin sat inside the critical range) only changes the npm copy, which nothing loads. The DOMPurify that runs is bundled inside monaco-editor (3.4.8 in 0.56.0), and Payload’s admin loads monaco 0.55.1 from jsDelivr. Staff-only admin; the real fix comes with a Payload/monaco update. A zod override was tried and removed: `@vercel/cli-config` bundles zod 4.1.11 into its own dist, so overriding the npm copy changed nothing.
- Accepted for now: zod < 4.6.6 (memory exhaustion on oversized collections) inside `@vercel/cli-config`, reached via `@vercel/blob` -> `@vercel/oidc` (4 audit entries). No fixed release exists (the latest cli-config still bundles 4.1.11); npm’s only fix is downgrading `@vercel/blob` to 2.4.0. The path reads the local Vercel CLI config for token lookup, not request input; the app passes an explicit Blob token. Recheck when `@vercel/cli-config` updates.
- Remaining 17 all need the Payload set upgrade (payload, every `@payloadcms/*` package, Payload’s pinned undici, happy-dom under lexical, drizzle-kit/esbuild dev tooling, the unused `@payloadcms/storage-s3`). By target: 3.90.2 clears every Payload-core advisory (all three criticals and the first-register RCE) but leaves happy-dom code execution (8.8), all Payload-undici issues and the dev tooling; 3.91.0 also clears happy-dom/lexical and most undici (pins 7.29.1), leaving three undici DoS/SRI advisories (need 7.30.1) and the dev tooling, Node >=20.18.1; 3.92.0 clears everything (pins undici 7.30.1) but needs Node ^22.23.4 or >=24.22.1 (local is 24.20.0; Vercel’s Node version not checked).
- Live exposure, judged from each advisory’s stated preconditions against this repo (code reading only, not tested): GHSA-f7hx (unauthorized update, 9.8) needs `orderable: true` - not used here; GHSA-97rh (first-register RCE) needs a site with no user yet - the live /admin shows the login page; GHSA-66wr (auth token) needs a field mapped to a reserved JWT claim - no `saveToJWT` here; GHSA-vc4h (duplicate copies hidden fields) needs duplicate/create access - create is staff-only; GHSA-pj7x (SQL injection) affects db-postgres only below 3.73 - production runs Postgres 3.88 (local SQLite is affected, dev only). Several high-severity upload and access issues (SVG/XML uploads, upload lifecycle validation, API key disclosure, token-refresh field exposure) list no such precondition.
- Any Payload 3.90+ upgrade needs a database migration (Payload release notes: new `resetPasswordRequestedAt` on users, `_objectKey` on upload collections; 3.91 adds `_parent_id` indexes on localized tables) and a check of the private Blob adapter against 3.90’s upload changes (`_objectKey`, filename hardening; the official adapters change storage paths, cms/blob-storage.ts builds its own). Production-lane work behind the AGENTS.md schema blockers, which Preview isolation helps clear.
- Update 2026-10-26: the Next fixes are live (`086c592`; the live client reports Next 16.4.3). The live `/admin` redirects to the login form with no create-first-user screen (headless browser, read-only), consistent with GHSA-97rh’s precondition not being met. Decided (Harold): Payload upgrade after Preview isolation and before phase 2, production lane with the equipment-migration steps (backup, tested restore, rehearsal on a Neon copy, apply, deploy); target 3.92.0 if Vercel’s Node is >=24.22.1, otherwise 3.91.0; remove `@payloadcms/storage-s3` in that branch. Status: Next part resolved; Payload part open until that branch ships.


### Bug Entry Template

- Description / Symptoms:
- Hypothesis or Suspected Cause:
- Evidence:
- Fix:
- Status: Open

## Resolved Bugs

### 2026-10-27 - Regression fixture could inherit production credentials (found in plan review, no evidence it happened)

- `scripts/regression.mjs` copied the shell environment into its `next dev` fixture server without blanking anything. `next dev` fills undefined variables from `.env.local`, and `cms/blob-storage.ts` switches to the private Blob store whenever `BLOB_READ_WRITE_TOKEN` is set. If `.env.local` held a Blob token, fixture media requests would have gone to `migrainz-media`. The review server already blanked these.
- Not reproduced: `.env.local` is never read by rule, so whether it holds a token is unknown.
- Fix (batch 1): one shared fail-closed environment (`scripts/fixture-env.mjs`) for both runners; they refuse to start if anything points at a remote database, storage or credential. Unit checks in `scripts/verify-fixture-env.mjs` (a mutation that stops blanking the Blob token makes them fail). Status: Resolved.

### 2026-10-26 - CRT vignette contrast (fix/crt-glow)

- As a fixed overlay above the text, the spec's radial vignette (up to .55 black) dropped `--crt-dim` text from 4.94:1 to ~3.2:1 (menu file label 02), ~2.6:1 (label 03) and ~2.4:1 (footer) at 1366x768 (calculated).
- Fix (Harold's decision, 2026-10-26): the vignette moved, values unchanged, into the fixed background layer under all content (`body::before`); the scanlines stay the overlay. Measured from screenshot pixels (brightest text pixel vs local background, 1366x768, CRT on, animations frozen): green 4.68 / 4.84 / 4.72:1 (labels 02, 03, footer), amber 4.49 / 4.82 / 4.51:1. The 4.94:1 nominal contrast is reduced a little by the scanlines; amber label 02 and the footer sit right at the 4.5 line. Rough method (subpixel text antialiasing), not a formal audit.
- Status: Resolved; recheck on a real screen. (Before the fix, the overlay was also calculated at ~2.2:1 for footer text at 390x844; that width was not re-measured after the fix.)

### 2026-10-25 - Boot checklist doubles the project name on live data (cosmetic)

- Live `/boot-status` after the phase 1 deploy: the tracker phase titled with the project name prints as `blushland_blushland_ch1`. lib/content/boot.ts always prefixes the project slug.
- Fix (chore/dependency-updates, deployed 2026-10-26 in `086c592`; live `/boot-status` now shows `blushland_ch1`): phase labels skip the prefix when the title already starts with the project slug as a whole word (compared with the slug, not the project title) (lib/content/boot-labels.ts; scripts/verify-boot-labels.ts). Status: Resolved.

### 2026-10-25 - SND toggle never played its confirmation tone

- Found while planning phase 1: the header button called `setEnabled(true)` and then `playSound("toggle")` in the same handler, and `playSound` still saw the old `enabled = false`, so turning sound on was silent. Each tone also created a new AudioContext.
- Fix (feature/interaction-polish): `setEnabled(true)` plays the toggle tone itself; `playSound` reads a ref; one shared AudioContext, resumed on the first pointer or key gesture.
- Status: Resolved in code. Not yet heard on a real device (headless tests cannot check audio).

### 2026-10-25 - Boot checklist: a skipped boot rewrote its session key seconds later (found and fixed before review)

- verify.cjs (skip loop) timed out waiting for the checklist after clearing the session and reloading. Cause: skipping did not cancel the end-of-boot timer, which fired ~3s after the boot started and set `migrainz-boot-seen` again while the slow dev reload was still in flight, so the reloaded page went straight to the ad.
- Fix: skipping clears every pending boot timer. Status: Resolved; regression rerun.

### 2026-10-25 - Reticle widened pages (found and fixed before review)

- At 390px the invisible reticle (then resting at scale 1.3) widened the homepage to 438px; later the -3px reticle on full-width equipment cards overflowed a margin-less page by 3px (verify-equipment-browser.mjs). Fix: no scale at rest; full-width cards and rows draw the reticle at inset 0. Status: Resolved.

### 2026-09-29 - Public comic media denied by hidden listing metadata

- Local `rcb-001` chapter retains three published PUBLIC Media references (5, 6, 7); all original and thumbnail files exist. HIDDEN listing visibility incorrectly denied their file access and mapper output.
- Fix: Separate attached Media listing visibility from access authorization, preserve missing/classified page positions, and try other authorized derivatives when the preferred file fails. Do not expose originals or weaken protected access.
- Status: Source repair; typecheck and production build pass. Browser validation blocked by the separate local schema issue above. See documentation/recovery-20260929.md.

### 2026-09-28 - Restricted content disappeared from public listings

- Cause: the CMS only offered PUBLIC/PATRON access; all public document queries required PUBLIC, and no safe listing projection existed for restricted content.
- Fix: add distinct REDACTED/HIDDEN access states and a server-only allowlisted metadata path for visible REDACTED/PATRON placeholders. Full document/file reads stay PUBLIC-only; hidden records and inaccessible descendants are omitted.
- Status: Source implemented; PostgreSQL enum migration remains unapplied. `npm.cmd run typecheck` passed; manual access and rendering checks remain.
- Update 2026-10-27: production's migration ledger (read 2026-10-16 on a Neon copy, equipment release runbook in the claude.ai Project) lists `20260928_180000_classified_access` as applied (2026-09-30 build).

### 2026-09-28 - Factions/equipment compound index collision

- Cause: Payload 3.88 does not support explicit names for collection compound indexes and derives names from field paths, so Factions, Characters and Equipment competed for `project_slug_idx` and version-index names.
- Fix: Preserve the foundation Characters compound indexes. Replace new Factions/Equipment composites with hidden unique `routeKey` fields derived from project ID and slug, using collection-specific unique indexes. Correct the unapplied migration and schema snapshot without dropping or recreating Character indexes.
- Status: Source and migration corrected; migration remains unapplied. `npm.cmd run typecheck` passed.
- Update 2026-10-27: production's migration ledger (read 2026-10-16 on a Neon copy, equipment release runbook) lists the factions/equipment and route-key repair migrations as applied.

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
