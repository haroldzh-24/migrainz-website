# Features

## Implemented - 2026-10-22 / CRT readability theme (feature/crt-readability)

- One token set (--crt-bg #0a0e0b, --crt-panel #0f1511, --crt-text #a8d8b0, --crt-bright #d4f5da, --crt-mid #7fb08a, --crt-dim #5f8a6b, --crt-border, --crt-accent #e8b45a, --crt-glow). The legacy --bg/--panel/--green/--green2/--hot/--dim/--line names are aliases, so .project-application keeps its light overrides. --term-* is gone; the schematic module reads --crt-*.
- Headings, brand and active items glow; body text does not. Body is 16px at line-height 1.6 in IBM Plex Mono (next/font/local, 400 and 700, OFL licence in app/fonts/); Win95 windows keep Arial.
- .crt overlay: static scanlines (.06) and vignette, no continuous flicker; the sweep runs once on load. The watcher grain is static; jitter and interference loops are removed. The schematic panel gets scanlines and vignette; video, posters, comics and artwork never do.
- Recolour filter #crt-tune (root layout) applied with a glow to the watcher container and to schematic video, posters and schematic thumbnails only. Concept art, galleries and the Art Viewer are never filtered.
- Watcher tracks the pointer across the whole window (window listeners, distance-scaled, full deflection at 180px, recentres when the pointer leaves the document). Touch follows pointerdown/move without capture, holds about 1.2s after lift-off, then recentres.
- CRT effects toggle in the header: ON / REDUCED / OFF, saved in localStorage and set on <html data-crt> before first paint. Palette and recolour stay in every mode.

## Implemented - 2026-10-21 / Equipment item page fits a laptop window; poster cards on faction pages

- On wide screens the schematic height is capped by the visible project-window height (keeping the video ratio) and the module width follows it, so the video and the full spec list fit 1366x768, 1440x900, 1536x864 and 1920x1080 at 125% without scrolling. Specs use two columns on wide modules; a long description sits below the specs and may extend past the fold. Mobile stays stacked. The back link now shares the path line and the title/module spacing is tighter.
- Equipment cards on faction pages fall back to the schematic poster like the Equipment tab (shared listing shape in lib/content/queries.ts). Cards also appear on character pages, which already had the fallback. Code only.

## Implemented - 2026-10-21 / Schematic panel readable inside project windows

- The equipment module now uses dedicated terminal colour tokens instead of --green/--green2/--hot, which the light .project-application theme redefines to grey and near-black (labels were rgb(68,68,68) and values rgb(17,17,17) on the panel). The fixture now renders the page inside .project-application and asserts at least 4.5:1 contrast and green hue for labels, values, description and category line. Code only.

## Implemented - 2026-10-21 / Equipment panel copy and back link

- The weapon description and category/updated line sit inside the terminal panel above the specs, in a softer green with a 1.7 line height and a readable measure. The page title and navigation stay outside.
- The equipment item page back link now reads RETURN TO EQUIPMENT and goes to the project Equipment tab (it said RETURN TO FACTIONS). Code only.

## Implemented - 2026-10-21 / Equipment schematic module and renderer framing

- The equipment page shows the schematic video and the item info/specifications as one attached terminal module. The video has no controls or pointer input and falls back to the poster still (never a play button) when autoplay is blocked, on reduced motion or reduced data, or if the video fails. The player follows the media's aspect ratio.
- OPEN IN ART VIEWER now appears only for items with concept art.
- Renderer (local tooling): camera fits automatically so the widest point of the turn is 0.95 of the frame (target_fill), a per-weapon or --aspect option (for example 2:1) gives wider, shorter frames, the backdrop grid is 32 columns across so the site can continue it, and the video is tagged BT.709. Code and renderer only; no migration.

## Implemented - 2026-10-21 / Equipment card navigation and Art Viewer dead ends

- Equipment cards in the project Equipment directory now open the item page (schematic and specifications); the item page keeps OPEN IN ART VIEWER. Equipment without concept art falls back to the schematic poster for the card thumbnail and the Art Viewer, and the character equipment cards use the same poster fallback.
- The Art Viewer no longer dead-ends: with no artwork it shows the poster, or a link to the item page (also for character tabs). Escape closes the viewer. Code only; no migration.
- Character cards still open the Art Viewer; faction cards navigate directly and have no viewer dead end.
- Verified with scripts/verify-equipment-navigation.mjs (real components, window manager and CSS at 1440, 670 and 390px, plus a resize sweep). The reported off-screen close button at about 670px could not be reproduced in that fixture or on the live site at 390-1200px; the sweep guards it.

## Implemented - 2026-10-16 / Schematic video renderer (local tooling)

- Add tools/schematic-renderer: a headless Blender 5.2 script (.blend input, single or batch) that normalizes a grey model, draws Freestyle line art over subtle flat shading on a near-black grid backdrop using :root colors from globals.css, and renders a seamless 8s linear 360-degree turntable at 1280x720 (16:9, matching EquipmentSchematic).
- ffmpeg encodes H.264 yuv420p +faststart without audio, stepping CRF to stay under 2.9 MB (site cap 3 MiB), and exports the first frame as a poster. Per-weapon overrides live in schematic-config.json.
- Models, frames and renders live in a work folder outside the repo (default C:\Users\brrrr\schematic-work). No CMS, Blob, Neon or Vercel interaction. Verified on a synthetic test model only; real-model style selection and live upload test pending.

## Implemented - 2026-10-15 / Equipment specifications, assignments and schematics

- Extend existing Equipment with optional specifications, ordered label/value rows, and disabled-by-default MP4/poster controls; preserve name, project/faction relationships, concept images, URLs and ART VIEWER.
- Store optional equipment assignments only on Characters, with designation, quantity, notes and order. Enforce same-project selections and moves, derive reverse listings, hide unauthorized assignment details, and protect live/current draft references from deletion.
- Add responsive equipment cards/specifications and optional native muted inline looping video above concept art. Lazy load in view, pause offscreen/hidden, honor reduced motion/data, expose native controls, and use authorized poster/error fallback. No videos on character cards.
- Keep the private Blob adapter and guarded file URLs. Add streaming single-byte ranges (206/416), HEAD/full responses, cancellation, a 3 MiB MP4 cap, MIME checks and video exclusion from artwork fields. Images/PDFs retain their upload paths; videos bypass Sharp.
- Regenerate Payload types and register reviewed additive PostgreSQL migration 20261015_080148_equipment_schematics_assignments plus schema snapshot. Remove duplicate generated SQL for earlier hand-authored migrations; automatic destructive down is refused. No existing SQLite writes, production migration, storage mutation, commit or deployment.
- Validation: TypeScript/build; fresh private SQLite CMS tests including mocked Patreon tiers and real Media endpoint authorization with mocked Blob reads; in-memory PostgreSQL full migration chain/preservation; Chrome component checks at 390px/1440px with real locally generated H.264 MP4. Details and commands: docs/CMS.md and docs/BLOB-STORAGE.md. Live Vercel/Safari/physical-device and authenticated admin verification remain manual.


## Implemented - 2026-10-15 / Shared artwork pinch zoom

- Add two-touch Pointer Event pinch/pan and canvas-local non-passive Ctrl+wheel/Safari gesture handling to ArtworkCanvas for ART VIEWER and COMIC READER. Retain zoom bounds, containment, FIT/100%/buttons, mouse drag, keyboard pan and reader page resets. Coalesce input updates with requestAnimationFrame and cancel queued work on reset/unmount.
- Scope touch-action and touch callout suppression to the canvas; ordinary wheel scrolling and outside browser gestures remain native.
- Validation: typecheck and production build passed. Isolated Chrome checks at 1440px and 390px passed for both viewers: synthetic two-pointer pinch, release-to-one-pointer, cancellation, Ctrl+wheel prevention, ordinary-wheel passthrough, synthetic Safari events, FIT and comic page reset. Run scripts/verify-viewer-pinch.mjs with PLAYWRIGHT_MODULE as needed. Pointer capture is stubbed for synthetic input; this does not validate native capture or physical gestures.
- Physical verification remains: macOS trackpads in Safari/Chrome/Firefox, Windows Precision touchpads in Edge/Chrome/Firefox, iOS Safari and Android Chrome touch gestures, and physical 60/120Hz responsiveness.


## Implemented - 2026-10-15 / Crunchier watcher CRT signal

- Increase grain to 12% with a 96px repeating tile (1.5x coarser), and scanlines to 2px within a 5px pitch at 4.5% opacity.
- Add irregular 0.5-1.25px signal-only micro-jitter with brief 2-3px bursts, plus faster interference sweeps every 6.8 seconds. Overscan keeps edges covered; artwork motion, labels and tracking stay unchanged.
- Keep cached PNG noise and transform/opacity-only animation. Reduced motion stops signal jitter/grain and hides interference. Intensities, grain scale and animation periods remain CSS variables.
- Validation: TypeScript/build and isolated Chrome checks at 375px/430px/1440px passed (touch, native scroll, mouse tracking and reduced motion). No affected-device performance claim.

## Implemented - 2026-10-15 / Watcher performance

- Replace pointer-driven React renders and restarting CSS transitions with one on-demand, elapsed-time animation-frame loop. Keep the existing elliptical tracking, faster eyes, head drift/perspective, touch scrolling and reduced motion.
- Separate the static face from the eye SVG under one shared transformed parent, and pre-rasterize the noise tile without disabling CRT effects or changing artwork.
- Add a repeatable isolated browser profiler; source inspection confirms the deployed site uses the pre-optimization watcher behavior. No deployment performed.
- Validation: TypeScript/build and isolated Chrome/Edge touch/responsive checks passed; simulated 60/120Hz interpolation matches. Profiling confirms zero pointer-driven React renders and lower style costs; device-specific stutter and total rendering improvement remain unproven. Details/measurements: documentation/watcher-performance-20261015.md.

## Implemented - 2026-10-14 / Watcher artwork

- Replace the geometric placeholder with the aligned 1200px watcher base/eyes PNGs, preserving the square frame, 86% artwork size and terminal readouts.
- Move the eyes within a 10px horizontal / 5px vertical source-coordinate ellipse, with smooth interpolation, fixed socket clips and the face layered above them. Add whole-artwork drift up to 4px horizontally / 3px vertically at display size, with slightly slower easing; the frame and readouts stay fixed.
- Apply 1000px perspective and cursor-driven rotation (up to 2deg Y / 1.25deg X) to the shared SVG around the head/eye line. Combine drift/rotation over 250ms while local eye tracking stays at 140ms; retain the 7% inset for edge clearance.
- Add a separate clipped CRT overlay below labels: cached green-tinted grain at 9%, faint scanlines, and a soft interference sweep every 13 seconds with a brief 1–2px effect-only tear. CSS variables control all intensities and the sweep period; only composited transforms/opacity animate.
- Support primary touch/pen Pointer Events with capture for horizontal dragging, preserving mouse hover behavior and all existing eye/head limits. Native vertical scroll/pinch zoom stays enabled; release, cancellation and capture loss reset to neutral. Reduced motion keeps character tracking static, freezes grain and hides interference. No character blinking or autonomous character animation; boot and CMS code unchanged.
- Validation: TypeScript and production build passed. Isolated real-component Chrome checks passed at 375px/430px (touch start, horizontal drag, release/cancel, native vertical scrolling, elliptical limits, CRT and reduced motion) and 1440px (layout, mouse hover/leave). No physical iPhone/Android or Safari testing. Full browser/BLUSHLAND regression was not run; the existing local SQLite schema blocker remains recorded in bugs.md.

## Implemented - 2026-10-04 / Direct project factions

- Display the existing CMS faction listing near the top of each project window, preserving project relationships, ordering, classified listings and faction URLs. Section navigation jumps to the inline grid; legacy faction-index URLs reuse it.
- Show authorized emblems immediately in gray cards on desktop/mobile, fitted without cropping; retain names, properties, image retries and intentional missing-image states.
- Keep writing, galleries, comics, production notes, character/equipment routes and the ART VIEWER. No CMS migrations, content edits or deployment.
- Extend isolated regression fixtures/checks for project filtering, ordering, emblems, missing images, direct destinations, focus, mobile width and back/forward.
- Validation: typecheck and production build passed. Dedicated isolated-CMS browser checks passed for inline factions, ordering/project filtering, emblems/missing images, focus, compatibility URLs, desktop/mobile/touch/reduced motion and back/forward. ART VIEWER and character-card interaction/persistence checks also passed in the broad suite. The broad suite stopped at its 90-second direct-character navigation timeout (server returned 200 after 103 seconds); remaining comic/reader and broader mobile checks were not completed. Existing studio data was untouched.


## Implemented - 2026-09-30 / Project application desktop

- Wrap project routes in one maximized gray application with real URL navigation; add compact section navigation and a project equipment directory.
- Use authorized CMS images for character/equipment cards and faction hover/focus/touch previews, with intentional unavailable states and no schema changes.
- Add SYSTEM application launchers, public minimized restore tabs with mobile safe-area support, and a centered post-boot announcement.
- Typecheck, production build, and isolated Chrome component checks passed. Live CMS/BLUSHLAND/admin and full access-response validation remain pending the recorded local schema blocker. No migrations, database changes, commits, or pushes.
- Architecture, file list, source-selection policy, and validation limits: documentation/desktop-window-pass-20260930.md.

## Implemented - 2026-09-30 / Read-only Blob OIDC diagnostic

- Add sanitized Node/Undici HTTPS and SDK list/head diagnostics, including nested transport causes and HTTP status without credentials or object details.
- Identify the current local blocker as Development not enabled on the Blob project's OIDC connection; recovery's explicit token/store SDK options are correct.
- Document the manual connection correction and read-only retry. No uploads, deletes, recovery apply, database writes or connection changes performed.
- Validation: read-only HTTPS/list/head probes completed; authenticated calls returned the same explicit HTTP 403 environment-authorization error. `npm.cmd run typecheck` passed.

## Implemented - 2026-09-30 / OIDC recovery authentication

- Use the installed Blob SDK's explicit OIDC token/store options for local recovery apply mode; no long-lived token is required or used.
- Retain explicit store confirmation, cross-check BLOB_STORE_ID when present, and let Vercel authorize the linked project. Sanitize SDK error output.
- Preserve offline dry-run, filename/hash matching, private non-overwriting copies and database independence. Payload storage and public routes are unchanged.
- Validation: `npm.cmd run typecheck` only; no recovery executed.

## Implemented - 2026-09-29 / Private Vercel Blob storage

- Add a private Blob adapter using Payload 3.88 cloud-storage hooks and the official Vercel SDK; preserve authorized API file URLs and all original/derivative upload outputs without new schema fields.
- Use the existing Blob token on Vercel; fail closed when missing. Local development without a token stays on filesystem storage. Keep admin/batch multipart flow, existing hosted request-size limits, public fallback and protected-media rules.
- Add an unexecuted recovery tool that defaults to an offline dry-run from existing Media exports; explicit apply copies exact files without overwriting Blob objects or changing records.
- Document seven local originals/four legacy thumbnails, verified Private store mode and exact manual steps in docs/BLOB-STORAGE.md and documentation/blob-media-recovery.md.
- Validation: `npm.cmd run typecheck` and the in-memory storage config check passed, including identical sanitized database field paths. No recovery script, deployment, migration or production upload executed.

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

## Implemented Ã¢â‚¬â€ 2026-09-08

- Next.js + React + TypeScript foundation, reusable components and pinned dependencies.
- Original terminal styling, responsive layout, CRT overlay, live clock and cursor-reactive placeholder.
- Data-driven project index, directories, characters, chapters and public production tracker.
- Complete BLUSHLAND sample path: project Ã¢â€ â€™ characters Ã¢â€ â€™ The Observer Ã¢â€ â€™ chapter 01 Ã¢â€ â€™ three-page reader Ã¢â€ â€™ project.
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
