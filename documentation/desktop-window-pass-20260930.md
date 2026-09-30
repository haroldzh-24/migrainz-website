# Desktop/window pass — 2026-09-30

Project browsing now uses a persistent App Router layout at `app/(frontend)/projects/[slug]/layout.tsx`. It passes server-rendered, access-checked content into `RouteApplication`, which portals one maximized `RetroWindow` into the existing public WindowManager workspace. Subsections share the `project` window ID. Leaving the route unregisters that application; closing/minimizing while on the route preserves its content and URL. The terminal workspace has an explicit reopen action.

## Routes and navigation

- `/projects/[slug]`
- `/projects/[slug]/factions` and `/projects/[slug]/factions/[faction]`
- `/projects/[slug]/characters` and `/projects/[slug]/characters/[character]`
- `/projects/[slug]/equipment` (new directory) and `/projects/[slug]/equipment/[equipment]`
- Future nested project routes inherit the layout.

Next Links, server pages, real pathname changes, and browser history remain in use. Compact navigation shows only populated sections; writing and gallery links target existing overview anchors. ART VIEWER retains the existing intercepted file-click behavior and canonical character/equipment hrefs. Comics retain their separate reader routes and specialized window.

The project database, comic directory, and archive index also use gray route application windows. SYSTEM's PERSONNEL, FACTION INTEL, and ARMORY launchers open project selectors at `/projects?directory=characters|factions|equipment`, then use the corresponding canonical project directories. No duplicate CMS content store was introduced.

## Image sources and access

- Factions: existing `emblem` relationship, populated using access-checked reads, mapped through the existing media adapter. No other faction-specific image relationship exists; missing/inaccessible emblems intentionally show NO IMAGE / FILE UNAVAILABLE rather than unrelated project art.
- Characters: first available authorized image in the CMS's ordered `images` rows. There is no separate primary-image field; editors control priority by attachment order. Classified placeholders and PDFs are excluded.
- Equipment: the same ordered `images` policy, retaining category metadata and ART VIEWER actions. The new project equipment query uses the existing listing projection, including project/faction parent checks.
- Thumbnail requests prefer the mapped thumbnail, then the existing authorized source candidates. Broken candidates advance to the next safe URL; exhaustion shows an intentional unavailable graphic.
- HIDDEN access, drafts, inaccessible parents, REDACTED source media, and unauthorized PATRON media remain governed by the existing server authorization and safe metadata projection. Media listing visibility remains separate from actual file authorization. No new raw Media object is passed to thumbnail components.

## Windows, mobile, and startup

SYSTEM adds PROJECT DATABASE, PERSONNEL, FACTION INTEL, ARMORY, COMIC ARCHIVE, ARCHIVE, and CLASSIFIED. CLASSIFIED uses the existing Patreon-facing access shell. Content launches outside the monitor. Stable manager IDs reuse existing windows; same-route launches restore closed/minimized route windows. Artwork tabs continue to deduplicate through the existing ART VIEWER.

Minimized windows use the manager's existing `open` and `minimized` flags. The public taskbar shows one bottom-right restore tab per minimized window, including SYSTEM. Restoring raises/focuses the window and removes the tab; closing removes it. Active/closed windows are not represented as minimized tabs.

Mobile applications fill the existing non-draggable public workspace, with internally scrolling content and compact horizontally scrolling navigation. Faction images appear directly on touch/mobile cards; character and equipment images remain visible. The bottom restore strip scrolls horizontally, uses 44px touch targets, and respects safe-area spacing.

The single existing announcement is centered after boot, initially foregrounded, and yields to subsequently activated application windows. Desktop dragging, X/Enter/Escape/button dismissal, announcement-ID session storage, boot timing, and admin separation remain intact.

## Validation and limits

- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed; all project routes and `/admin` compiled.
- `scripts/verify-window-pass.mjs`: isolated Chrome component checks passed. It uses the actual components, a small Next routing shim, fixture props, and an HTTP image fixture. It does not initialize Payload or touch a database.
- Browser coverage: boot-to-centered-announcement and Enter dismissal; maximized PROJECT; subsection/history reuse; faction hover/focus; character/equipment drawings; minimize/restore/close/reopen; ART VIEWER; SYSTEM launcher URL and monitor exit; COMIC READER mounting; mobile direct entry, visible images, no horizontal page overflow, touch restore; reduced motion; no browser exceptions.
- Reviewed the fixture mobile screenshot at `test-results/window-pass/mobile.png`.
- Source review confirms the Payload layout is unchanged and remains outside public providers/styles. No live `/admin` response was tested.
- Actual Next direct URLs/back-forward with live CMS data, the complete published BLUSHLAND reader path and boundaries, protected-media HTTP responses, real artwork, desktop preview placement, touch dragging suppression, all startup dismissal methods, and multi-window safe-area stacking still need live/manual review. The previously recorded local SQLite synchronization issue is unresolved. The usual regression runner invokes a content migration, so it was not run.

No schema, storage, database, access-rule, OAuth, reader-internal, or migration changes were required or performed. No commit or push was made.

## Changed files

- `app/(frontend)/projects/[slug]/layout.tsx`
- `app/(frontend)/projects/[slug]/equipment/page.tsx`
- `app/(frontend)/projects/[slug]/factions/page.tsx`
- `app/(frontend)/projects/[slug]/page.tsx`
- `app/(frontend)/projects/page.tsx`
- `app/(frontend)/comics/page.tsx`
- `app/(frontend)/archive/page.tsx`
- `app/(frontend)/globals.css`
- `components/RouteApplication.tsx`
- `components/DirectoryThumbnail.tsx`
- `components/DesktopFile.tsx`
- `components/CharacterViewerLink.tsx`
- `components/EquipmentViewerLink.tsx`
- `components/WindowManager.tsx`
- `components/PixelMonitorDesktop.tsx`
- `components/StartupSequence.tsx`
- `lib/content/queries.ts`
- `scripts/verify-window-pass.mjs`
- `features.md`, `changelog.md`, and this report.
