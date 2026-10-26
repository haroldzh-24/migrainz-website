# Bugs

## Open Bugs

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
