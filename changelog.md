# Changelog

## Changed - 2026-10-25 / Phase 1 interaction polish (feature/interaction-polish)

- One shared hover/focus highlight: a reticle (four corner brackets, ~120ms lock-on, instant out) on terminal links, buttons, tabs and cards; Win95 navy bars, raised/pressed bevels and a dotted focus rectangle inside windows, the monitor, promo windows and desktop icons. No layout shift (hover nudges removed); hover only with a real pointer; shown while pressed (`:active`; checked with a held mouse press in a no-hover phone context, not with a real finger); transparent focus outline that High Contrast turns visible; reduced motion drops the animation. Window title-bar controls and locked placeholders keep their Win95 / own focus styles.
- Keyboard focus makes the Watcher glance at the focused control; a soft tick on hover/focus when sound is on.
- Main menu reads `01 / projects.db` over `Project database`; character and equipment files show the readable name with `NAME.CHR` / `NAME.EQP` small; equipment cards add the `.EQP` name.
- Amber phosphor mode (alternate token set, amber recolour filter, baked amber Watcher and grain), chosen in the new header SYSTEM menu with CRT effects and sound; applied before first paint.
- The transmission splash opens with a boot checklist built from real tracker and chapter data plus clearance (~3s, once per session, any key / Esc / click skips, S toggles sound), then the same announcement as before. Classified records print only their safe label. The data is fetched from `/boot-status` only when the checklist shows (never cached), so ordinary page loads add no database query.
- Screen readers hear the readable menu name before the file name; the visual order is unchanged.
- Fixed: the SND toggle was silent when turning sound on.
- New `scripts/verify-interaction-polish.mjs`, run by `test:regression`; the fixture seeds two REDACTED sentinel records.

## Changed - 2026-10-25 / Workflow setup (chore/workflow-setup)

- CLAUDE.md: two lanes (code-only vs production), batching of questions, model choice, reviewer and `/check-everything` pointers, and what `.claude/settings.json` does and does not block.
- `.claude/settings.json`: denies `git push`, `payload migrate` and `migrate:*`, `vercel`, `neonctl`, the Blob recovery script, the `cms:*` scripts that load `.env.local`, and reading `.env*`; allows the check scripts and basic git; asks before history rewrites.
- `.claude/agents/reviewer.md` (fresh-context, read-only reviewer) and `.claude/commands/check-everything.md`.
- docs/preview-isolation.md: step-by-step Preview isolation, each step needing approval; nothing run. No app code, database, Blob or env change.
- Push rule change: `git push origin main` (exactly, no flags) now asks every time instead of being denied. A PreToolUse hook (`.claude/hooks/guard-git-push.mjs`, test in the same folder) denies every other push (force, other branches, deletes, refspecs, bare push, chained forms) and fails closed. The four blanket push denies were removed from settings.json (deny beats ask) and replaced by an ask rule plus narrow denies that cannot match the exact command.

## Changed - 2026-10-25 / CRT review fixes after approval

- No focus ring on containers focused by script (`main#top` after the splash, windows); buttons, links and form controls keep theirs.
- The shop ad cannot be opened by click either while the transmission splash is showing (hover was already blocked). verify.cjs checks both and the focus ring.
- Added docs/deploy-checklist-crt.md (post-deploy checks and rollback). Simulated checks only; log in test-results/crt-regression-20261025c.txt.

## Changed - 2026-10-25 / CRT design-pass fixes (docs/redesign-plan.md step 1)

- Main menu items 01-07 (and the SHOP / PATREON triggers) are 16px; `[ LATEST ]` / `[ SYSTEM ]` buttons, panel links and row titles 14px; 12px stays for timestamps and labels.
- Phone header (480px and below): brand shows `MIGRAINZ` only, ONLINE is hidden, clock + SND + CRT stay on one line.
- Shop ad (BEST_DEALS.exe): hover-opens at most once per visit (sessionStorage), never while the transmission splash is up; clicking always opens it. Under 480px the SHOP and PATREON windows are small in-flow cards (scrolled into view) with a larger close button; Escape closes them. verify.cjs checks the once-per-visit rule.
- Review fixture now seeds synthetic equipment on BLUSHLAND: `/projects/blushland/equipment`, `/equipment/fixture-scanner` (schematic with poster fallback), `/equipment/fixture-satchel`, `/characters/fixture-operative`. Synthetic data only.
- Desktop only, not changed: at 1440x900 the open shop window can extend below the viewport.
- Checks are simulated (headless Chrome); log in test-results/crt-regression-20261025b.txt. Nothing tried on a real phone.

## Changed - 2026-10-25 / CRT text-size floor

- Body 16px; secondary and meta text (row copy, captions, notes, spec tables) 14px; labels, title bars, header, footer and the CRT toggle 12px. Nothing in globals.css is below 12px, including the `font:` shorthand rules. CSS only.
- Regression, verify-equipment-navigation and verify-equipment-browser pass (log: test-results/crt-regression-20261025.txt). Not yet checked by eye on a phone.

## Changed - 2026-10-22 / CRT readability follow-ups

- Baked the watcher recolour and glow into tuned PNG copies (originals kept) and removed the runtime filter from the watcher; filtered the Art Viewer schematic poster fallback; 70ch prose; InlineScript for the CRT mode script (fixes a React console error on client navigation).
- Regression suite: the comic reader checks now use PREV / NEXT / Go to page / the PROJECT title-bar link (changed in 5b36ecd, "monitor comic reader") and the Patreon check uses PATREON SIGN-IN UNAVAILABLE (real sign-in replaced the preview in 293d23d). The suite passes end to end on the isolated fixture. Code, CSS and scripts only.

## Changed - 2026-10-22 / CRT readability theme

- New --crt-* tokens replace hard-coded greens (legacy names alias them); IBM Plex Mono via next/font/local; 16px / 1.6 body; glow limited to headings and active items.
- Removed continuous CRT flicker, watcher grain drift, jitter and interference; the power-on sweep runs once. Scanlines and vignette follow the new CRT effects toggle (on / reduced / off).
- Added the #crt-tune recolour filter for the watcher and schematic media, window-wide watcher tracking and equipment module contrast (body 7:1 or more, meta 4.5:1 or more). Regression assertions updated; the stale .head path check was replaced with a filter check. Code and CSS only: no database, Blob or media changes.

## Changed - 2026-10-21 / Equipment item page fits a laptop window; poster cards on faction pages

- On wide screens the schematic height is capped by the visible project-window height (keeping the video ratio) and the module width follows it, so the video and the full spec list fit 1366x768, 1440x900, 1536x864 and 1920x1080 at 125% without scrolling. Specs use two columns on wide modules; a long description sits below the specs and may extend past the fold. Mobile stays stacked. The back link now shares the path line and the title/module spacing is tighter.
- Equipment cards on faction pages fall back to the schematic poster like the Equipment tab (shared listing shape in lib/content/queries.ts). Cards also appear on character pages, which already had the fallback. Code only.

## Fixed - 2026-10-21 / Schematic panel readable inside project windows

- The equipment module now uses dedicated terminal colour tokens instead of --green/--green2/--hot, which the light .project-application theme redefines to grey and near-black (labels were rgb(68,68,68) and values rgb(17,17,17) on the panel). The fixture now renders the page inside .project-application and asserts at least 4.5:1 contrast and green hue for labels, values, description and category line. Code only.

## Changed - 2026-10-21 / Equipment panel copy and back link

- The weapon description and category/updated line sit inside the terminal panel above the specs, in a softer green with a 1.7 line height and a readable measure. The page title and navigation stay outside.
- The equipment item page back link now reads RETURN TO EQUIPMENT and goes to the project Equipment tab (it said RETURN TO FACTIONS). Code only.

## Changed - 2026-10-21 / Equipment schematic module and renderer framing

- The equipment page shows the schematic video and the item info/specifications as one attached terminal module. The video has no controls or pointer input and falls back to the poster still (never a play button) when autoplay is blocked, on reduced motion or reduced data, or if the video fails. The player follows the media's aspect ratio.
- OPEN IN ART VIEWER now appears only for items with concept art.
- Renderer (local tooling): camera fits automatically so the widest point of the turn is 0.95 of the frame (target_fill), a per-weapon or --aspect option (for example 2:1) gives wider, shorter frames, the backdrop grid is 32 columns across so the site can continue it, and the video is tagged BT.709. Code and renderer only; no migration.

## Fixed - 2026-10-21 / Equipment card navigation and Art Viewer dead ends

- Equipment cards in the project Equipment directory now open the item page (schematic and specifications); the item page keeps OPEN IN ART VIEWER. Equipment without concept art falls back to the schematic poster for the card thumbnail and the Art Viewer, and the character equipment cards use the same poster fallback.
- The Art Viewer no longer dead-ends: with no artwork it shows the poster, or a link to the item page (also for character tabs). Escape closes the viewer. Code only; no migration.
- Character cards still open the Art Viewer; faction cards navigate directly and have no viewer dead end.
- Verified with scripts/verify-equipment-navigation.mjs (real components, window manager and CSS at 1440, 670 and 390px, plus a resize sweep). The reported off-screen close button at about 670px could not be reproduced in that fixture or on the live site at 390-1200px; the sweep guards it.

## 2026-10-16 / Schematic video renderer (local tooling)

- Add tools/schematic-renderer: a headless Blender 5.2 script (.blend input, single or batch) that normalizes a grey model, draws Freestyle line art over subtle flat shading on a near-black grid backdrop using :root colors from globals.css, and renders a seamless 8s linear 360-degree turntable at 1280x720 (16:9, matching EquipmentSchematic).
- ffmpeg encodes H.264 yuv420p +faststart without audio, stepping CRF to stay under 2.9 MB (site cap 3 MiB), and exports the first frame as a poster. Per-weapon overrides live in schematic-config.json.
- Models, frames and renders live in a work folder outside the repo (default C:\Users\brrrr\schematic-work). No CMS, Blob, Neon or Vercel interaction. Verified on a synthetic test model only; real-model style selection and live upload test pending.

## 2026-10-15 / Equipment specifications, assignments and schematics

- Extend existing Equipment with optional specifications, ordered label/value rows, and disabled-by-default MP4/poster controls; preserve name, project/faction relationships, concept images, URLs and ART VIEWER.
- Store optional equipment assignments only on Characters, with designation, quantity, notes and order. Enforce same-project selections and moves, derive reverse listings, hide unauthorized assignment details, and protect live/current draft references from deletion.
- Add responsive equipment cards/specifications and optional native muted inline looping video above concept art. Lazy load in view, pause offscreen/hidden, honor reduced motion/data, expose native controls, and use authorized poster/error fallback. No videos on character cards.
- Keep the private Blob adapter and guarded file URLs. Add streaming single-byte ranges (206/416), HEAD/full responses, cancellation, a 3 MiB MP4 cap, MIME checks and video exclusion from artwork fields. Images/PDFs retain their upload paths; videos bypass Sharp.
- Regenerate Payload types and register reviewed additive PostgreSQL migration 20261015_080148_equipment_schematics_assignments plus schema snapshot. Remove duplicate generated SQL for earlier hand-authored migrations; automatic destructive down is refused. No existing SQLite writes, production migration, storage mutation, commit or deployment.
- Validation: TypeScript/build; fresh private SQLite CMS tests including mocked Patreon tiers and real Media endpoint authorization with mocked Blob reads; in-memory PostgreSQL full migration chain/preservation; Chrome component checks at 390px/1440px with real locally generated H.264 MP4. Details and commands: docs/CMS.md and docs/BLOB-STORAGE.md. Live Vercel/Safari/physical-device and authenticated admin verification remain manual.


## 2026-10-15 / Shared artwork pinch zoom

- Add two-touch Pointer Event pinch/pan and canvas-local non-passive Ctrl+wheel/Safari gesture handling to ArtworkCanvas for ART VIEWER and COMIC READER. Retain zoom bounds, containment, FIT/100%/buttons, mouse drag, keyboard pan and reader page resets. Coalesce input updates with requestAnimationFrame and cancel queued work on reset/unmount.
- Scope touch-action and touch callout suppression to the canvas; ordinary wheel scrolling and outside browser gestures remain native.
- Validation: typecheck and production build passed. Isolated Chrome checks at 1440px and 390px passed for both viewers: synthetic two-pointer pinch, release-to-one-pointer, cancellation, Ctrl+wheel prevention, ordinary-wheel passthrough, synthetic Safari events, FIT and comic page reset. Run scripts/verify-viewer-pinch.mjs with PLAYWRIGHT_MODULE as needed. Pointer capture is stubbed for synthetic input; this does not validate native capture or physical gestures.
- Physical verification remains: macOS trackpads in Safari/Chrome/Firefox, Windows Precision touchpads in Edge/Chrome/Firefox, iOS Safari and Android Chrome touch gestures, and physical 60/120Hz responsiveness.


## 2026-10-15 / Crunchier watcher CRT signal

- Coarsen grain 1.5x and raise opacity to 12%; thicken faint scanlines to 2px on a 5px pitch. Add irregular subpixel signal shifts and brief 2-3px bursts; shorten interference sweep interval to 6.8 seconds.
- Animate only the clipped overlay with overscan, keeping artwork/labels steady and all tracking unchanged. Preserve cached noise, CSS tuning variables and reduced-motion behavior.
- Validation: TypeScript/build and isolated Chrome touch/scroll/desktop/reduced-motion checks passed at 375px, 430px and 1440px; affected physical devices were not retested.

## 2026-10-15 / Watcher performance investigation

- Coalesce pointer input into an on-demand animation-frame loop with elapsed-time interpolation, direct transform writes and no pointer-driven React state/CSS transitions.
- Keep the face separate from the clipped SVG eyes under one shared perspective parent. Replace runtime SVG grain with an equivalent pre-rasterized PNG tile; preserve all CRT effects and motion/accessibility behavior.
- Compare public deployed watcher assets and add an isolated effect-by-effect profiler. Chrome/Edge touch, scroll, reduced motion and responsive checks passed; simulated 60/120Hz behavior matches. TypeScript/build passed. No affected-hardware/Safari validation or deployment; see documentation/watcher-performance-20261015.md for measured improvements and limits.

## 2026-10-14 / Watcher artwork

- Replace the geometric placeholder with the aligned 1200px watcher base/eyes PNGs, preserving the square frame, 86% artwork size and terminal readouts.
- Increase eye tracking to a 10px horizontal / 5px vertical source-coordinate ellipse. Add whole-artwork drift up to 4px horizontally / 3px vertically at display size, with slightly slower easing. Preserve socket clips, neutral return, reduced motion and the fixed frame/readouts.
- Add understated 1000px perspective with up to 2deg Y / 1.25deg X rotation around the head/eye line on the shared artwork parent. Combine rotation/drift over 250ms; preserve 140ms local eye movement and edge clearance.
- Add a pointer-transparent CRT overlay above artwork/below labels with 9% tinted grain, faint scanlines and a soft interference sweep every 13 seconds. A brief 1–2px tear moves only the interference; CSS variables tune intensity/period. Cache a small SVG noise tile and animate transforms/opacity without timers.
- Enable primary touch/pen tracking and horizontal dragging using Pointer Events/capture. Preserve mouse hover, eye/head limits and native vertical scrolling/pinch zoom; reset on release, cancellation and capture loss. Reduced motion keeps tracking static, freezes grain and hides interference. No character blinking or autonomous character animation; boot and CMS code unchanged.
- Validation: TypeScript and production build passed. Isolated real-component Chrome checks passed at 375px/430px for touch tracking/dragging/release/cancel, native scroll, elliptical limits, CRT/reduced motion; 1440px layout and mouse hover/leave passed. No physical-device or Safari testing; full CMS/BLUSHLAND regression not run.

## 2026-10-04 / Direct project factions

- Display the existing CMS faction listing near the top of each project window, preserving project relationships, ordering, classified listings and faction URLs. Section navigation jumps to the inline grid; legacy faction-index URLs reuse it.
- Show authorized emblems immediately in gray cards on desktop/mobile, fitted without cropping; retain names, properties, image retries and intentional missing-image states.
- Keep writing, galleries, comics, production notes, character/equipment routes and the ART VIEWER. No CMS migrations, content edits or deployment.
- Extend isolated regression fixtures/checks for project filtering, ordering, emblems, missing images, direct destinations, focus, mobile width and back/forward.
- Validation: typecheck and production build passed. Dedicated isolated-CMS browser checks passed for inline factions, ordering/project filtering, emblems/missing images, focus, compatibility URLs, desktop/mobile/touch/reduced motion and back/forward. ART VIEWER and character-card interaction/persistence checks also passed in the broad suite. The broad suite stopped at its 90-second direct-character navigation timeout (server returned 200 after 103 seconds); remaining comic/reader and broader mobile checks were not completed. Existing studio data was untouched.


## 2026-09-30 / Project application desktop

- Wrap project routes in one maximized gray application with real URL navigation; add compact section navigation and a project equipment directory.
- Use authorized CMS images for character/equipment cards and faction hover/focus/touch previews, with intentional unavailable states and no schema changes.
- Add SYSTEM application launchers, public minimized restore tabs with mobile safe-area support, and a centered post-boot announcement.
- Typecheck, production build, and isolated Chrome component checks passed. Live CMS/BLUSHLAND/admin and full access-response validation remain pending the recorded local schema blocker. No migrations, database changes, commits, or pushes.
- Architecture, file list, source-selection policy, and validation limits: documentation/desktop-window-pass-20260930.md.

## 2026-09-30 / Blob OIDC failure diagnosis

- Add `scripts/diagnose-blob-oidc.mjs` for credential-safe read-only HTTPS and Blob API diagnostics.
- HTTPS connectivity succeeded; authenticated metadata calls reported Development-environment OIDC access disabled. Document the required store/project connection correction; preserve recovery logic and storage routes.
- Confirm SDK HTTP 403 through sanitized Undici events; typecheck passed. No apply, storage mutations or credentials printed.

## 2026-09-30 / OIDC recovery authentication

- Replace recovery's read/write-token parsing with explicit VERCEL_OIDC_TOKEN and confirmed store ID passed to the installed Blob SDK. Reject configured-store mismatches and avoid raw authentication error output.
- Document the apply command loading .env.local, explicit store selection and token refresh. No matching, hash, filename, dry-run, Payload storage or route changes.
- Validation limited to typecheck. No uploads, database writes, commits or pushes.

## 2026-09-29 / Persistent private Media storage

- Integrate the existing Vercel Blob service through a small private adapter, retaining Payload file authorization, stable API URLs, filenames and Media relationships. No migrations or UI changes.
- Add the official Blob SDK and explicitly declare Payload's existing cloud-storage hook package. The official Payload Vercel adapter at 3.88 is public-only and cannot meet protected-media requirements.
- Keep filesystem storage for local development without Blob configuration; require the existing token on Vercel. Add a dry-run-first recovery script and a read-only local file inventory; no recovery or uploads executed.
- Confirm the existing store is Private. Typecheck and the in-memory storage config check passed; no production writes, migrations, commits or pushes.

## 2026-09-29 / PUBLIC image original fallback

- Address missing derivative files in temporary storage by allowing the original as the last source for authorized published PUBLIC images.
- Preserve shared art/comic runtime retries, page ordering and protected-media checks; file delivery still authorizes each request and denies non-PUBLIC image originals to nonstaff.
- Update CMS documentation. No storage, migration, record, upload or regeneration changes. Validation: `npm.cmd run typecheck` only.

## 2026-09-29 / Legacy thumbnail fallback

- Fix empty derivative URLs suppressing legacy thumbnails and the preview-only availability guard discarding viewer-only records.
- Centralize viewer -> preview -> thumbnail -> legacy thumbnail selection in the public media mapper; reject original-image URLs and preserve ordered fallback candidates for the shared canvas.
- Keep inaccessible media protected and missing comic positions intact. Validation limited to `npm.cmd run typecheck`.

## 2026-09-29 / Targeted website recovery

- Retain existing local heading and SYSTEM-only monitor implementation without restoring the infrastructure commit or stash.
- Fix PUBLIC attached Media being denied solely because its listing is hidden; publication, access/tier and accessible-parent checks remain required.
- Retain comic page positions, render safe unavailable/classified slots, and fall back between authorized image derivatives when a preferred file fails.
- Validate TypeScript and production compilation; preserve the original work in a private temporary snapshot and work on a recovery branch. No commits, deployment, media rewrite or production migration.

## 2026-09-28 / Draggable announcement and verified Patreon access

- Add bounded, titlebar-only Pointer Events dragging to the existing post-boot announcement; preserve dismissal and mobile behavior.
- Add Patreon API v2 start/callback/signout routes, encrypted HttpOnly sessions using the existing secret, fresh campaign membership checks and optional tier-ID authorization in Payload.
- Keep unauthorized patron metadata safe, show black censor bars/CLASSIFIED media, open ACCESS DENIED with the existing window manager, and render safe shells for known locked page routes. Preserve REDACTED/HIDDEN distinctions and separate CMS authentication.
- Add `20260928_190000_patreon_tier_access` (22 nullable JSONB columns, no data rewrite, unapplied), optional environment documentation and docs/PATREON.md. No storage/provider changes.
- Validation: `npm.cmd run typecheck` passed; live OAuth and browser checks remain manual. No build, regression, commit or push.

## 2026-09-28 / Safe classified rendering

- Add REDACTED and HIDDEN access choices alongside PUBLIC/PATRON, with clear listing-visibility precedence and safe-label guidance. Add `20260928_180000_classified_access` without rewriting records or applying migrations.
- Introduce a server-only allowlisted teaser path while retaining PUBLIC-only document/file authorization. Render generic green censor cards, text bars and media placeholders for REDACTED/PATRON entries; omit HIDDEN and inaccessible descendants.
- Block placeholder links, viewer/reader launches, inspectors and keyboard activation. Filter restricted media out of viewer payloads and show their placeholders on content pages.
- Validation: `npm.cmd run typecheck` passed; no build, regression or browser run. Existing window/viewer components, storage and integrations are unchanged by this access-control change.

## 2026-09-28 / Homepage display text

- Replace the main hero wording with MIGRAINZ ARCHIVE & PROJECTS without changing typography, styling or unrelated homepage content.

## 2026-09-28 / Public artwork workspace and SYSTEM monitor

- Move normal gray windows out of the monitor into a viewport-sized public terminal layer while retaining the existing WindowManager, viewer tabs, canvas controls and reader.
- Reserve PixelMonitorDesktop for explicit SYSTEM activation. Move its existing status content into the persistent public layout; closing/minimizing SYSTEM or returning to the terminal hides only the monitor.
- Add a public dock with a SYSTEM restore entry; the monitor's internal dock contains only SYSTEM. Expand artwork/comic defaults and maximize bounds, with near-fullscreen nondraggable mobile windows.
- Validation: `npm.cmd run typecheck` passed; no build, regression or browser validation.

## 2026-09-28 / PostgreSQL Media image-size repair

- Add and register `20260928_160000_media_image_sizes` to supply missing preview/viewer columns on `media` and `_media_v`, plus their filename indexes.
- Keep all new fields nullable; do not rewrite records, regenerate derivatives, alter thumbnail fields or edit historical migrations. The forward-only migration retains metadata on rollback.
- No storage adapters, provider/configuration changes, environment variables or UI changes. Migration remains unapplied; `npm.cmd run typecheck` passed. No build or regression run.

## 2026-09-28 / Art-first monitor and public image derivatives

- Reduce monitor and window chrome, place ART VIEWER tabs in the titlebar, maximize within the monitor screen, and collapse the dock while maximized. Consolidate COMIC READER page controls into a compact row.
- Generate 400px thumbnail, 1200px preview and 2400px viewer WebP derivatives at quality 84; public surfaces select size-appropriate URLs with a legacy-thumbnail fallback. Deny anonymous access to original image files; retain originals for staff.
- Existing files are unchanged and are not backfilled by this config change; they need regeneration to receive the new preview/viewer sizes. The removed comic page-turn animation remains removed.
- Validation: `npm.cmd run typecheck` only; no build or regression suite.

## 2026-09-28 / PostgreSQL route-key repair

- Add and register `20260928_120000_route_key_repair` as a new forward migration for existing Factions and Equipment schemas, including version-table route keys.
- Backfill route keys from project IDs and slugs before creating the unique indexes; all table operations are conditional and no Character schema/indexes are touched.
- Keep previously recorded migrations immutable; no production or local database migration was applied.
- Validation: `npm.cmd run typecheck` only.

## 2026-09-28 / Factions and equipment index collision

- Replace the unnamed project/slug composites on Factions and Equipment with collection-specific unique route-key indexes because Payload 3.88 does not expose custom compound-index names.
- Preserve the existing Characters project/slug and version indexes. Correct the unapplied faction/equipment migration and snapshot; no data migration or application performed.
- Validation: `npm.cmd run typecheck` passed; migration remains unapplied.

## 2026-09-28 / Monitor comic reader

- Render existing `/comics/[project]/[chapter]` content in the existing pixel-monitor COMIC READER window and taskbar without changing route lookup or CMS models.
- Reuse the ART VIEWER zoom/pan canvas and WindowManager controls; add Comic/chapter metadata and immediate page navigation.
- Validation: `npm.cmd run typecheck` passed; browser/manual checks remain.

## 2026-09-28 / Payload media upload guidance

- Add concise single-file and comic batch upload instructions to the existing Payload Media and Chapter admin surfaces.
- Explain chapter/comic/project assignment, alt text, natural filename sorting, saved row order and public publishing requirements; show a clear unsupported-format error for batch pages.
- Validation: `npm.cmd run typecheck` passed. Admin browser review remains manual.

## 2026-09-27 / Factions and equipment

- Add Factions and Equipment to Payload with optional character affiliation relationships and project-filtered choices.
- Add project faction directories, faction character/equipment files and direct equipment URLs using the existing desktop and ART VIEWER.
- Preserve character URLs, tab IDs, unassigned records and homepage summary queries; extend file access and reference protection to the new collections.
- Generate CMS types and an additive PostgreSQL schema migration; no database migration or content changes applied.
- Validation: `npm.cmd run typecheck` passed; no production build, regression/browser validation, commit or push.

## 2026-09-24 / Pixel monitor desktop

- Mount a reusable pixel-style computer monitor in the public layout while preserving the green terminal outside it.
- Route managed gray windows into its screen, bound dragging/maximize to that workspace, and move the existing taskbar inside the screen.
- Add terminal launchers and hide/reopen controls with focus return; retain viewer tabs, session storage and hidden desktop state.
- Use a simplified mobile bezel and scrolling stacked windows with an accessible internal dock. Keep artwork neutral and unpixelated.
- Validation: `npm.cmd run typecheck` passed; no build/regression/browser checks, commit or push.

## 2026-09-21 / Art viewer zoom and maximize

- Add FIT, 100%, zoom in/out and bounded pointer/keyboard artwork panning to the existing ART VIEWER without dependencies.
- Add opt-in WindowManager maximize state, preserving normal window geometry and restoring the prior normal-size zoom/pan settings. Keep tabs mounted and mobile window behavior unchanged.
- Preserve existing session tab storage and neutral artwork presentation; reuse delegated button sounds.
- Validation: `npm.cmd run typecheck` passed; production build, regression and browser validation intentionally omitted at the user's request.

## 2026-09-20 / Phase 5 desktop files and inspectors

- Continue the interrupted file styling and project/character integration with reusable DesktopFile and DesktopFolder components.
- Character files and CMS gallery artwork reuse the existing ART VIEWER and stable tab IDs; real character routes and gallery anchors remain available.
- Add delayed hover/focus properties and a touch properties toggle, viewport clamping, Escape/outside dismissal, and timer/listener cleanup. Metadata comes from existing access-checked server queries; hover does not fetch or prefetch CMS data.
- Correct the existing viewer canvas sizing so tall artwork fits without clipping.
- Show actual character update dates and public chapter/page counts; omit unsupported current-phase and tracker-state assumptions.
- Preserve the existing window manager, viewer persistence, CRT, sound, startup, promotional windows and isolated Payload admin. Extend browser regression coverage for files, properties, persistence and mobile widths.
- Validation completed 2026-09-21: typecheck, production build and isolated regression pass; desktop/mobile screenshots reviewed, with an additional artwork-fit check at 1440/390/320px.

## 2026-09-19 / Public art viewer tabs

- Add a large gray image viewer using the existing window manager and centralized sound system.
- Add persistent tab state for generic image-heavy records, with character route integration and duplicate-tab reuse.
- Keep artwork neutral against the CRT shell, preserve direct character URLs, and use a full-width mobile viewer.

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

## 2026-09-08 Ã¢â‚¬â€ Terminal foundation / 0.2.0

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
