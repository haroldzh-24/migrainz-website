# Changelog

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
