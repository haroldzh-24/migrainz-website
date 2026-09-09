# Features

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
