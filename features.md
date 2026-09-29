# Features

## Implemented - 2026-09-29 / PUBLIC original compatibility fallback

- Append original image URLs after viewer, preview, thumbnail and legacy thumbnail only for access-checked published PUBLIC Media. The shared art/comic canvas continues past runtime image failures and retains the unavailable state after all candidates fail.
- Permit those original requests through the existing file handler after Payload media/parent authorization; protected image originals remain denied to nonstaff, including entitled PATRON originals.
- Preserve Media records, comic positions, listing-visibility independence, storage and migrations. No regeneration, upload or database writes.
- Validation: `npm.cmd run typecheck` only.

## Implemented - 2026-09-29 / Legacy public image selection

- Select nonempty safe URLs once in the shared mapper: viewer, preview, thumbnail, legacy thumbnail, then unavailable. Reject original-image aliases in derivative fields; preserve the separate PDF download behavior.
- Pass the ordered candidates to the shared art/comic canvas so failed derivative requests can reach legacy thumbnails. Galleries use the same primary selection.
- Preserve chapter slots, Media records and the existing separation between Media listing visibility and file access. No storage, migration or upload changes.
- Validation: `npm.cmd run typecheck` only.

## Implemented - 2026-09-29 / Targeted reader recovery

- Preserve the existing uncommitted homepage heading and two-target WindowManager.
- Separate attached Media listing visibility from publication/access/parent authorization; existing PUBLIC images with hidden listings can render.
- Preserve saved comic positions for missing derivatives or unresolved media, show safe classified/unavailable states in place, and try remaining authorized derivatives when a file fails.
- Keep original-image denial, protected media rules, saved relationships and migration history intact. No media reprocessing or production writes.
- Validation: typecheck and production build passed. Runtime/deployment findings are recorded in documentation/recovery-20260929.md.

## Implemented - 2026-09-28 / Announcement dragging and Patreon OAuth v2

- Drag the post-startup announcement by its title bar within desktop viewport bounds. Keep its original dismissal/session lifecycle, visuals and mobile stacking; no WindowManager registration.
- Add server-side OAuth v2 with CSRF state, an encrypted HttpOnly session, verified campaign/paid membership and optional tier-ID requirements. Missing configuration leaves public content usable and patron records locked.
- Reuse existing content/Media access checks, safe metadata projections and WindowManager for black patron censor bars, CLASSIFIED image blocks, locked page shells and ACCESS DENIED actions. REDACTED stays green; HIDDEN stays omitted.
- Register an unapplied additive tier-field migration for live/version tables. No storage change or record rewrite. Setup and exact manual tests: docs/PATREON.md.
- Validation: `npm.cmd run typecheck` passed. Live OAuth, browser interaction and deployment migration checks remain manual.

## Implemented - 2026-09-28 / Safe REDACTED and PATRON listings

- Distinguish PUBLIC, REDACTED, PATRON and HIDDEN in the CMS. Keep existing records unchanged and register an unapplied additive PostgreSQL enum migration for live/version access fields.
- Merge access-checked public records with an explicit server-only safe metadata projection. Preserve listing order, omit hidden/draft records, and respect inaccessible parents. Restricted documents and files remain inaccessible through public APIs and direct routes.
- Reuse inert green censor placeholders across directories, homepage, logs, tracker, galleries and media. No restricted source titles, slugs, text, URLs or captions reach client props; optional explicitly safe labels remain public.
- Keep protected media out of existing art/comic viewers; chapter routes show classified page placeholders separately. Validation: `npm.cmd run typecheck` passed; manual CMS/access and browser checks remain.

## Implemented - 2026-09-28 / Homepage display text

- Change the hero heading to MIGRAINZ ARCHIVE & PROJECTS, retaining its three-line structure and existing styling.

## Implemented - 2026-09-28 / Public artwork workspace and SYSTEM monitor

- Keep one WindowManager with a public terminal window layer and a separate SYSTEM monitor render target. ART VIEWER, COMIC READER, character/equipment artwork and LATEST open over the terminal without opening the monitor.
- Size artwork/comic windows to 78% of workspace width and 80% of height; maximize within small viewport margins above the persistent public dock. Mobile windows fill the usable workspace without free dragging.
- SYSTEM explicitly opens/focuses the monitor; closing, minimizing or hiding SYSTEM hides it without clearing unrelated tabs or reader state. Keep SYSTEM mounted across public routes and retain its internal dock.
- Validation: `npm.cmd run typecheck` passed; manual window, keyboard, comic navigation and mobile checks remain.

## Implemented - 2026-09-28 / PostgreSQL Media image-size repair

- Register a new additive forward migration for preview/viewer metadata on Media and its versions table, including Payload filename indexes.
- All 24 columns are nullable with no defaults or backfill; existing rows and thumbnail fields remain unchanged. No storage, environment, viewer UI or faction/equipment changes.
- Migration remains unapplied. Validation: `npm.cmd run typecheck` passed; no build or regression run.

## Implemented - 2026-09-28 / Art-first monitor and public image sizes

- Compact monitor/window chrome and maximize ART VIEWER or COMIC READER within the internal screen; collapse the dock while maximized and keep viewer tabs in its titlebar.
- Generate 400px thumbnail, 1200px preview and 2400px viewer WebP derivatives at quality 84. Public rendering selects the matching derivative; older media falls back to an existing thumbnail and omits images with no derivative rather than sending originals.
- Preserve uploaded originals for staff/admin; anonymous original-image requests are blocked. Existing records need regeneration to receive the new sizes.
- Validation: `npm.cmd run typecheck` only; manual UI and media checks remain.

## Implemented - 2026-09-28 / PostgreSQL route-key repair

- Add a new forward migration to repair route-key fields for existing Factions and Equipment tables without changing migration history or content relationships.
- Backfill live and version records using the collection hook format (`projectID/slug`); add collection-specific unique indexes and version lookup indexes.
- Validation: `npm.cmd run typecheck` only; production migration is not applied locally.

## Implemented - 2026-09-28 / Monitor comic reader

- Open existing comic routes inside the shared PixelMonitorDesktop using the existing WindowManager, RetroWindow styling and taskbar; clean up the route window on navigation.
- Retain CMS chapter/page data, add Comic title and chapter number, and add page controls, page selection, keyboard navigation, fullscreen window controls, and the ART VIEWER's zoom/pan canvas.
- Switch pages immediately with reduced-motion-safe navigation. Preserve page colors and aspect ratio without CRT tint.
- Validation: `npm.cmd run typecheck` passed; browser/manual checks remain.

## Implemented - 2026-09-28 / Payload media upload guidance

- Clarify single-file Media uploads and the existing Chapter batch workflow in the admin, including Comic/Project assignment, alt text, natural filename sorting, saved page order and publishing.
- Reject unsupported batch image MIME types with a direct list of accepted formats before sending the upload request.
- Validation: `npm.cmd run typecheck` passed. Admin browser review remains manual.

## Implemented - 2026-09-27 / Factions and equipment

- Add published/versioned Factions and Equipment collections, project-scoped slugs, media attachments and display order.
- Add optional character primaryFaction and affiliations; filter faction choices by the selected project in Payload.
- Replace project-level CHARACTERS navigation with FACTIONS and add faction index/detail and equipment detail routes with focused public queries.
- Reuse DesktopFile, existing character tab IDs and ART VIEWER; retain all character routes and access to unassigned characters.
- Extend media authorization, publishing validation and reference deletion guards. Generate an additive PostgreSQL migration without applying it or changing content.
- Validation: `npm.cmd run typecheck` passed. Build, regression and browser checks omitted as requested; manual CMS/viewer checks remain.

## Implemented - 2026-09-24 / Pixel monitor desktop

- Add a reusable public PixelMonitorDesktop with a stepped hardware shell, neutral internal workspace and the existing taskbar inside the screen.
- Portal all RetroWindow instances into the shared monitor; use workspace width/height for drag clamping, resize correction and viewer maximize bounds. Keep the existing manager and focus/minimize/restore state.
- Open LATEST and SYSTEM from terminal launchers; artwork opens the same persistent ART VIEWER. Hide with RETURN TO TERMINAL or Escape within the monitor; reopen through OPEN DESKTOP without unmounting windows or clearing tabs.
- Preserve the outer terminal, startup/promotional windows, sound, CMS and admin boundaries. Artwork receives no pixel rendering or CRT tint.
- Simplify the bezel on mobile, stack non-draggable windows in a scrollable workspace, and keep the taskbar below that workspace.
- Validation: `npm.cmd run typecheck` passed. Build, regression and browser validation omitted as requested; manual visual/interaction review remains.

## Implemented - 2026-09-21 / Art viewer zoom and maximize

- Extend the existing ART VIEWER with FIT, native-size 100%, bounded zoom buttons and canvas-only Pointer Events panning; arrow keys also pan overflowing artwork.
- Measure available canvas space and decoded image dimensions to preserve aspect ratio. Keep artwork in the existing neutral window layer.
- Add opt-in MAXIMIZE/RESTORE to RetroWindow using WindowManager state; preserve normal geometry and restore normal-size artwork zoom/pan settings. Mobile retains its near-fullscreen, non-draggable window without redundant maximize controls.
- Keep tab/session persistence, duplicate prevention and close behavior unchanged. New view settings are in-memory only; buttons use the existing delegated sound handling.
- Validation: `npm.cmd run typecheck` passed; broader manual validation is delegated to the user.

## Implemented - 2026-09-20 / Phase 5 desktop files and inspectors

- Continue the interrupted file styling and project/character integration with reusable DesktopFile and DesktopFolder components.
- Character files and CMS gallery artwork reuse the existing ART VIEWER and stable tab IDs; real character routes and gallery anchors remain available.
- Add delayed hover/focus properties and a touch properties toggle, viewport clamping, Escape/outside dismissal, and timer/listener cleanup. Metadata comes from existing access-checked server queries; hover does not fetch or prefetch CMS data.
- Correct the existing viewer canvas sizing so tall artwork fits without clipping.
- Show actual character update dates and public chapter/page counts; omit unsupported current-phase and tracker-state assumptions.
- Preserve the existing window manager, viewer persistence, CRT, sound, startup, promotional windows and isolated Payload admin. Extend browser regression coverage for files, properties, persistence and mobile widths.
- Validation completed 2026-09-21: typecheck, production build and isolated regression pass; desktop/mobile screenshots reviewed, with an additional artwork-fit check at 1440/390/320px.

## Implemented - 2026-09-19 / Public art viewer tabs

- Added a large neutral gray art viewer built on the existing public window manager, with bounded desktop dragging, focus, minimize, restore and close behavior.
- Added persistent browser-like artwork tabs with deduplication, switching, individual close behavior and final-tab viewer closure.
- Integrated character-directory links and direct character pages with existing public CMS character/image data while preserving real route URLs and lightweight sessionStorage tab persistence.

## Implemented - 2026-09-19 / Public retro window manager

- Added a public-only reusable gray-window manager with pointer dragging, focus and z-order, minimize, restore, close and bounded positions.
- Converted the homepage LATEST and SYSTEM panels into managed windows with a restrained taskbar that can reopen closed or minimized windows.
- Desktop windows stack into stable full-width mobile windows with dragging disabled at small breakpoints; Payload admin remains isolated.

## Implemented - 2026-09-19 / Public CRT and UI sound layer

- Added a public-only CSS CRT presentation layer with faint scanlines, phosphor edge glow, slow refresh sweep and rare brightness fluctuation.
- Added an opt-in Web Audio UI sound provider with localStorage persistence, a global `SND: OFF` / `SND: ON` status toggle and delegated activation sounds for existing links and buttons.
- Reduced motion disables CRT sweep and flicker; Payload admin remains outside both the provider and CRT layout boundary.

## Implemented - 2026-09-18 / Homepage summary query

- Added a homepage-specific public CMS query that loads only project, comic/chapter, update, tracker and archive summary fields in parallel.
- Avoided the full project graph, media transforms and repeated per-project relation scans used by detail routes while preserving all homepage panels and CMS-backed content.

## Implemented - 2026-09-17 / Homepage studio terminal

- Expanded the homepage beneath the preserved startup and primary terminal navigation with LATEST, featured PROJECTS, readable COMICS, TRACKER, ARCHIVE and SYSTEM panels.
- Reused public CMS project records, production notes, phases, chapters and archive records; full routes remain the canonical directories.
- Kept SHOP and Patreon promotional windows in the existing navigation and retained the homepage's responsive terminal language.

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
- Feature: Durable production private media storage for the verified Patreon access system implemented on 2026-09-28.
  - Target milestone: Storage phase. Priority: Later.
  - Notes: Current storage architecture is unchanged. Never hide public files as a substitute for access control.

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
