# Features

## Implemented - 2026-09-15 / Isolated browser regression fixtures

- `npm run test:regression` imports and verifies the preserved demo fixture in a fresh ignored database and media directory, runs the complete browser suite on a dedicated local server, and stops that server afterward.
- Editing database drafts no longer determine whether BLUSHLAND reader and project checks can execute. Startup behavior and public content authorization are unchanged.

## Implemented - 2026-09-15 / Startup announcement dismissal

- Preserved the existing BIOS/install/virus log, SYSTEM COMPROMISED and three ASCII eye blinks in the 5.2-second boot.
- Boot alone hides and makes public content inert; completion reveals the page underneath the same floating, nonmodal retro announcement window.
- Enter and Escape dismiss from the announcement or homepage; X and the configured button also dismiss. Per-ID session storage and the separate admin layout remain intact.
- Browser verification covers initial hidden/inert HTML, boot keyboard protection, eye animation, floating page interaction, all dismissal methods, session persistence, another announcement ID and admin bypass.

## Implemented - 2026-09-10 / Production configuration diagnostics

- Vercel builds require real production configuration; missing settings are reported by name only.
- Added a presence-only production environment check and isolated production guard fixtures.
- Documented production variable scopes, redeployment, existing PostgreSQL migration commands and temporary private `/tmp` demo media.
- Live deployment and production database validation remain pending authenticated Vercel access.

## Implemented — 2026-09-08

- Next.js + React + TypeScript foundation, reusable components and pinned dependencies.
- Original terminal styling, responsive layout, CRT overlay, live clock and cursor-reactive placeholder.
- Data-driven project index, directories, characters, chapters and public production tracker.
- Complete BLUSHLAND sample path: project → characters → The Observer → chapter 01 → three-page reader → project.
- Reader page controls, boundary handling, page selection, arrow keys and described sample artwork.
- SHOP/Patreon promotional windows with mouse hover, touch/keyboard activation and close/Escape/outside dismissal.
- External placeholder store and explicitly future Patreon account connection.
- Reduced-motion support, skip link, visible focus and missing-record handling.

## Planned Features

Recorded 2026-09-08. Owner: Studio Migrainz. Milestones describe future phases, not delivery commitments.

- Feature: Replace sample artwork, copy, production data and store URL with studio content.
  - Target milestone: Content preparation. Priority: High.
- Feature: Full artwork, environment, development and archive directories.
  - Target milestone: Archive expansion. Priority: Medium.
- Feature: Spread/vertical comic modes, chapter continuation and persistent reading position.
  - Target milestone: Reader expansion. Priority: Medium.
- Feature: Patreon OAuth and membership access using private storage and server-side authorization for each protected request.
  - Target milestone: Membership phase. Priority: Later.
  - Notes: Never hide public files as a substitute for access control.

## 2026-09-08 / Terminal-only homepage

- Homepage now ends after the primary terminal interface, with dedicated route navigation.
- Added `/archive` and `/about` using existing content, directory components and styles, retaining system activity and external store information.
- Existing project/tracker content remains on its dedicated pages; menu IDs, cursor interaction and SHOP/Patreon promotional behavior are preserved.
- Updated README and browser verification for homepage navigation and content boundaries.

## 2026-09-08 / Startup takeover gag

- Added a homepage-only, once-per-tab fictional boot/install/error/takeover sequence lasting 3.9 seconds.
- Original ASCII helmet girl with ear protection and lowered dual-tube goggles blinks once for 120ms.
- Click, tap, Enter, Space and Escape dismiss; reduced motion skips the sequence. Timers and listeners clean up on exit.
- Main watcher artwork and terminal styling retained. No audio, alerts, downloads or new dependencies.

## 2026-09-08 / Japanese AA startup preparation

- Removed the simplified portrait; final detailed AA is explicitly pending in `data/startup-art.ts`, as requested when convincing generation is unreliable.
- Added open/closed frame slots and three 120ms blink intervals; identical placeholders intentionally show no eye animation until artwork is supplied.
- Both preformatted frames share a fixed canvas, measured and scaled proportionally without wrapping or layout jumps.
- Added Windows-style SYSTEM COMPROMISED framing using existing promo title controls. Existing skip, reduced-motion and homepage-only behavior retained.

## 2026-09-08 / Face-first startup layout

- Kept the explicit AA placeholder fallback; revised artwork guidance to prioritize a readable feminine anime face, bangs and eyes over simplified gear.
- Centered the proportionally scaled portrait in a dedicated stage, with small external OPS-CORE, PELTOR and PVS-31 / STOWED labels.
- Corrected Windows title-bar glyphs and separated the gag caption from the portrait. Three-blink scheduling, fixed frames, skip controls and reduced motion are unchanged.

## 2026-09-08 / Patreon popup positioning

- Patreon opens directly above its navigation item with viewport clamping on scroll/resize and an internal scroll area on short screens.
- Shop positioning and shared hover/touch behavior remain unchanged.

## Implemented - 2026-09-09 / Payload CMS

- Payload 3.88 admin, authentication, rich text, draft/version publishing, projects, comics, chapters, characters, updates, tracker items, galleries, archive items, media and taxonomy.
- Existing terminal frontend reads access-checked CMS data through server-only adapters; original data and prototype remain migration fixtures.
- Development-only SQLite and private local media outside Git; production startup requires PostgreSQL. Offline PostgreSQL schema migration included.
- Listing visibility/safe teaser fields are separate from content access. Patron records remain staff-only; parent, file and derivative checks are enforced without Patreon OAuth.
- Repeatable dry-run/import/checksum verification, admin publishing workflow checks and frontend regression coverage.
- After the basic workflow passed: batch chapter/gallery uploads, natural filename sorting, alt text, progress, retry recovery, explicit attachment and manual ordering.
- Remaining production work: managed PostgreSQL data transfer/validation, private object-storage adapter, email delivery, operational backups and upstream dependency advisory review.

## 2026-09-10 / Persistent boot and announcement window

- Public layout renders an opaque gate and hidden/inert page before hydration; admin bypasses it.
- The same retro window transitions after 2.6 seconds to an announcement, dismissed by ENTER, X or Escape.
- Announcement config: data/announcement.ts; graphics: public/announcements/. Dismissal is stored per ID in sessionStorage.
- Reduced motion stops blinking while keeping the gate and announcement visible.

## 2026-09-10 / Compromised boot into floating ad

- Restored fake BIOS/package infection sequence and three 120ms eye blinks using the existing StartupArt two-frame renderer; supplied ASCII eyes because the historic portrait frames are placeholders.
- One unchanged window runs a 5.2-second boot, then reveals and unlocks the public page behind its nonmodal announcement. Background pointer, keyboard and scroll access resume.
- The announcement floats at the lower right with viewport bounds on mobile; X, ENTER and Escape dismiss per announcement ID.
- Config uses id, enabled, image, title, copy and buttonLabel in data/announcement.ts; graphics remain in public/announcements/.
- Reduced motion keeps the eyes static and disables status blinking. Admin and infrastructure are unchanged.
