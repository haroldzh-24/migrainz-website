# Changelog

## 2026-09-19 / Public retro window manager

- Add a lightweight public window manager with bounded Pointer Events dragging, focus stacking, minimize, restore and close controls.
- Convert homepage LATEST and SYSTEM content into gray Windows-style windows with a small reopenable dock.
- Stack windows and disable dragging on mobile without changing CMS data loading or Payload admin behavior.

## 2026-09-19 / Public CRT and UI sound layer

- Add restrained scanlines, phosphor edge glow, refresh sweep and occasional flicker to the existing public CRT overlay.
- Add an opt-in localStorage-backed Web Audio sound manager and terminal status toggle for existing UI activations.
- Keep reduced-motion behavior and Payload admin isolation intact.

## 2026-09-18 / Homepage query performance

- Replace the homepage's full project graph load with a public summary query for the data rendered by LATEST, PROJECTS, COMICS and TRACKER.
- Fetch homepage collections concurrently, use depth 0 for non-relational summary data, and index project relations once instead of repeatedly filtering every collection for each project.
- Keep full project/archive loaders for detail routes and preserve all homepage sections, CMS authorization and admin behavior.

## 2026-09-17 / Studio terminal homepage

- Add a dense homepage activity layer for latest project notes, featured active projects, readable comics, tracker progress, archive records and public system status.
- Keep the existing startup takeover, watcher, primary navigation and SHOP/Patreon promotional behavior unchanged.
- Use live public CMS query results with explicit empty states instead of duplicating project or archive content.

## 2026-09-15 / BLUSHLAND regression fixture isolation

- Fix browser test setup that assumed BLUSHLAND comic/chapter and STALKER were still published in the editing database. Their current draft state correctly hides them from visitors.
- Add `test:regression` with a fresh seeded/verified SQLite database, private media, free local port and managed server shutdown; preserve editorial data and `.env.local`.
- Preserve full project/character/reader navigation and controls coverage; assert the exact chapter URL and diagnose missing fixtures before a link timeout.
- Document the isolated runner and retain direct browser checks for servers with the published demo fixture.

## 2026-09-15 / Floating startup announcement verification

- Retain the working tree's boot/install/virus and blinking-eyes flow into a floating announcement over the visible, interactive website.
- Handle Enter as well as Escape after focus moves into the homepage; prevent the dismissal key from activating a background link and ignore composition/repeated key events.
- Extend browser checks for admin bypass, hidden/inert content during boot, keyboard dismissal outside the announcement and persistence after each dismissal method.
- Announcement content stays in data/announcement.ts; original index.html remains untouched.
- Validation: typecheck, production build and focused startup browser suite passed, including admin bypass, mobile touch and reduced motion. The broader browser suite stopped at the expected CHAPTER 01 / OPEN READER link on The Observer page; subsequent reader checks remain unverified.

## 2026-09-10 / Vercel configuration diagnosis

- Stop masking missing Vercel environment variables with build-only fallback values; preserve local offline builds.
- Share production validation across Payload, hosted build and standalone startup, with missing-variable names and no secret values.
- Add `cms:verify-env`; test each missing hosted variable and production SQLite rejection without local secrets.
- Document dashboard remediation and non-resetting migration workflow; retain private temporary demo media and defer R2.

## 2026-09-08 — Terminal foundation / 0.2.0

### Added

- Next.js App Router, React, strict TypeScript, pinned dependencies and development/build/typecheck scripts.
- Reusable header, original face SVG, pointer interaction, navigation, project views, directory rows and comic reader.
- Typed project data and dynamic project, character and chapter routes.
- BLUSHLAND sample character and three public comic pages with a complete exploration and return path.
- Tracker phases, dates, milestones and toggled production logs.
- SHOP/Patreon Windows-style promotional windows for hover, keyboard and touch.
- Patreon interface preview, missing-record screen, local setup/content documentation and browser smoke checks.

### Changed

- Active application source moved to app/, components/ and data/. Original index.html and Git history preserved.
- Original terminal CSS and SVG extracted, retaining colors, typography, layout, CRT and section anchors.
- Simulated cart replaced with an external placeholder store link in the running app.
- Unconnected archive buttons and fake contact links replaced with sample navigation or pending-content labels.
- Repository instructions and feature notes updated for the migrated app.

### Fixed

- Pointer and promotional animation respect reduced motion.
- Log toggle exposes expanded state; controls include visible keyboard focus.
- Missing project, character and chapter records show a terminal 404 screen.

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

## 2026-09-09 / CMS foundation and publishing workflow

- Added Payload to isolated frontend/CMS route groups without replacing terminal styling or interactions.
- Added collection schemas, authenticated admin, draft/version controls, independent listing/content classifications and private media access.
- Migrated 20 legacy records with stable keys, preserved original data/assets and verified page order, descriptions, alt text and checksums.
- Connected project writing, images, galleries, characters, chapters, updates, tracker and archive content to the existing frontend.
- Proved admin login through publishing to the reader before adding the custom batch uploader and page/gallery order controls.
- Added PostgreSQL production guards and an offline initial migration. SQLite remains development-only.
- Added CMS setup/migration/verification documentation and browser regression checks. Updated Sharp and DOMPurify to patched versions; remaining upstream moderate advisories are recorded in bugs.md.

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
