# Migrainz redesign plan

Handoff from the claude.ai planning chat (2026-10-25). From here on, Claude Code works from this file; there is no other planning channel.

**AGENTS.md stays authoritative** (CLAUDE.md only imports it since 2026-10-27). Nothing in this file overrides its safety rules (no pushes, deploys, database, Blob or `.env*` access without Harold's explicit approval in the conversation). Keep this file current as the source of truth for design decisions, and commit updates as small docs commits.

---

## Start here (for Claude Code)

Do these in order. Stop where it says STOP.

### 1. Finish the restyle on `feature/crt-readability`

Design-pass fixes from the 2026-10-25 review (skip any already done):

a. **Text sizes.** The 12px floor worked, but most homepage text sits at exactly 12px, including primary navigation. Main menu items (01–07) to 16px (14px if 16 doesn't fit); project/comic row titles and the `[ LATEST ]` / `[ SYSTEM ]` buttons to 14px. 12px only for true labels (timestamps, `SYS`, coordinates, status).
b. **Phone header.** Below ~480px it wraps to two lines. Show only `MIGRAINZ` as the brand there; keep SND and CRT on one line.
c. **Store popup ad.** It appeared over the Watcher while scrolling at phone size. Keep the joke, but: at most once per visit; never while the transmission splash is open; under ~480px a small dismissible card instead of covering content; visible close button; Escape closes it.
d. **Equipment on the review server.** The regression fixture has no equipment records, so equipment and schematic pages can't be reviewed. Add the equipment fixture's records (synthetic posters are fine) to the review server's database and note which item URLs to open.

Then: refresh `test-results/crt-screens/`, run `npm.cmd run test:regression`, `verify-equipment-navigation.mjs` and `verify-equipment-browser.mjs`, save the full output to `test-results/`, commit in small steps.

### 2. Self-review, then STOP

Launch a fresh subagent with no context of the work. Have it check the branch diff and the screenshots against this file and AGENTS.md and list problems. Fix what is clearly in scope; list the rest.

STOP and give Harold, in plain language:
- what changed since the last report
- test results (pass/fail per script, with the output file path)
- the review server's local and network URLs, and what to look at on computer and phone (text sizes and wrapping, CRT toggle on/reduced/off, Watcher tracking and touch scrolling, an equipment item with a schematic, the Art Viewer with a poster, the comic reader)
- anything needing his decision

### 3. After Harold approves the look: merge and prepare the deploy

- Merge into local `main` with `--no-ff`. Do not push.
- Pushing `main` deploys production (it also ships the unpushed laptop fit `3611c0e` / `46b5caf`). There is no isolated Preview yet, so production is the first real deploy. Ask for explicit approval, and before asking, prepare a post-deploy checklist:
  - Pages return 200: `/`, `/projects`, `/comics`, `/archive`, `/tracker`, a project page, `mp510mmcc`.
  - Public media GET with a Range header → 206; a restricted file → 404. Use GET, never HEAD (HEAD returns 404 on this route even for files that exist). If everything returns 404, the check has failed.
  - Visual: CRT toggle, Watcher on desktop and phone, schematic page, Art Viewer, comic reader.
  - Rollback: promote the previous production deployment in Vercel (instant; no database change involved).
- After deploy: run the checklist, report observed results, update `bugs.md` and this file.

### 4. Workflow setup (own small branch, after the deploy is verified)

See "Workflow setup" below.

### 5. Rework phases

See "Rework phases" below. One branch per phase. Each phase: plan in plan mode first (Opus 5.5 with higher effort recommended), the fresh reviewer subagent checks the plan against this file and AGENTS.md, Harold approves, then build, self-review (step 2), Harold looks on the review server, ship.

---

## Current state (2026-10-25 16:24 CT)

- 2026-10-27: the CRT glow pass (`7658101`) is live (pushed 2026-10-26; GitHub deployment record: Production success 39 s later). After an audit (Project doc `claude/project-audit-2026-10-26.md`) Harold approved docs/roadmap.md, which orders the work from here. Decisions (Harold, 2026-10-27): code-only batches M1–M3 (rules, tests, audit fixes, security headers) may ship before Preview isolation and the Payload upgrade, each push to `main` with his OK; the Payload upgrade still follows Preview isolation and comes before phase 2; after isolation each batch goes through a branch and pull request.
- 2026-10-25 ~23:30 CT: phase 1 (interaction polish) merged into `main` (`f718830`, `--no-ff`) and pushed with Harold's approval; live ~47 s later. Live GET checks (observed on migrainzxxl.com): all listed pages, `/admin` and `/boot-status` 200; `/boot-status` is `private, no-store` and shows only public data; public media Range GET 206; no Blob URLs in page source; amber assets 200. Read-only headless visit (desktop 1366, phone 390): boot checklist renders from live data, ENTER dismisses, new menu labels and SYSTEM menu present, no sideways overflow, no page errors, `/boot-status` requested once at boot and not on later page loads. Not checked: real devices, Safari/Firefox, sound, restricted-media 404 (no known restricted file). Follow-up: the live tracker title already contains the project name, so the line reads `blushland_blushland_ch1`.
- Order (Harold, 2026-10-26): the CRT glow branch (values from Harold), then Preview isolation (docs/preview-isolation.md, step by step with Harold at the dashboards; check Vercel’s Node version there), then the Payload upgrade (production lane, see below), then the phase 2 plan.
- 2026-10-26: `chore/dependency-updates` (local) fixes the Next (incl. two RCEs), sharp, fast-uri, source-map-js and Blob-undici advisories with patch/minor updates (audit 26 -> 21), turns off Next's agent upgrade stop, and fixes the boot label. The Payload advisories need Payload 3.90+ as a set, which needs a database migration and a Blob adapter check: production-lane work behind the CLAUDE.md schema blockers, which Preview isolation helps clear. 2026-10-26: merged and pushed with Harold’s approval (`086c592`); live ~56 s later. Live checks (observed): all listed pages, `/admin` and `/boot-status` 200; `/boot-status` `private, no-store`, label now `blushland_ch1`; media Range GET 206; no Blob URLs; headless visit at 1366/390: client reports Next 16.4.3, boot checklist and ENTER work, no overflow, no page errors, `/boot-status` requested once at boot only; `/admin` redirects to the login form (no create-first-user screen).
- Payload upgrade (decided, Harold 2026-10-26): after Preview isolation, before phase 2. Production lane with the equipment-migration steps: backup, tested restore, rehearsal on a Neon copy, apply, then deploy. Target 3.92.0 if Vercel’s Node is >=24.22.1, otherwise 3.91.0. Remove `@payloadcms/storage-s3` in that branch. Details: bugs.md "Upstream CMS dependency advisories".

- 2026-10-25 19:07 CT: `feature/crt-readability` was merged into local `main` (`--no-ff`) and `main` (`10b1ddf`) was pushed to `origin/main` with Harold's approval. Production served the new build about 36 s later (`<html data-crt="on">`). It shipped the restyle, the laptop fit (`3611c0e` / `46b5caf`) and the docs; no schema, migration, Blob or env change. Post-deploy GET checks: docs/deploy-checklist-crt.md. Restricted-media 404 check: not run (no known restricted test file). Visual checks on real devices: not done.
- Tests before the push (all simulated, headless Chrome): `test:regression`, `verify-equipment-navigation.mjs`, `verify-equipment-browser.mjs`, typecheck and build pass; output in `test-results/crt-regression-20261025c.txt`.
- Review server: `node scripts/serve-fixture.mjs` (dev mode over LAN, fail-closed env check); stop with `--stop`. Production builds can't run on SQLite by design (`payload.config.ts` guard + `scripts/verify-production-guard.mjs`); do not weaken that guard.
- `payload-types.ts` gets line-ending-only changes while the dev server runs; safe to `git checkout` it.
- `stash@{0}` "pre-revert local work" (2026-09-28): keep, don't drop.
- AGENTS.md "Release status" is current as of 2026-10-27 (it moved there from CLAUDE.md).

## Open bugs and checks

- Art Viewer: Escape stops working once another window has focus (logged 2026-10-22).
- Art Viewer close button at ~669px: not reproduced; all checks simulated. Recheck on a real phone.
- `mp510mmcc` poster missing in the viewer.
- Watcher: recheck on the Macs from the earlier stutter report (baked PNGs, no runtime filter), with CRT on (flicker and jitter run) and with CRT off.
- Not yet checked: Firefox, Safari, iOS, real schematic media, real comic pages (fixture comics show LOADING).
- On phones, project windows stop ~185px short of the screen bottom (fixed by the mode switch in phase 2).
- Regression `verify.cjs` still has stale assertions → separate cleanup.

---

## Theme (implemented on `feature/crt-readability`)

| Token | Value | Use | Contrast on bg |
|---|---|---|---|
| `--crt-bg` | `#0a0e0b` | page background | — |
| `--crt-panel` | `#0f1511` | panels | — |
| `--crt-text` | `#a8d8b0` | body text | 12.14:1 |
| `--crt-mid` | `#7fb08a` | secondary text | 7.85:1 |
| `--crt-bright` | `#d4f5da` | headings, active items | 16.54:1 |
| `--crt-dim` | `#5f8a6b` | meta, dates, labels | 4.94:1 |
| `--crt-border` | `rgba(140,220,160,.18)` | borders only, never text | — |
| `--crt-accent` | `#e8b45a` | links and buttons | 10.28:1 |
| `--crt-glow-head` | `0 0 3px rgba(212,245,218,.8), 0 0 18px rgba(140,230,165,.5)` | headings, hero title | — |
| `--crt-glow-ui` | `0 0 6px rgba(180,245,195,.55)` | menu names, brand, active items | — |
| `--crt-glow-link` | `0 0 6px rgba(232,180,90,.55)` | amber links (none on the site yet) | — |
| `--crt-glow-body` | `0 0 2.8px rgba(168,216,176,.24)` | paragraphs, CRT "on" only | — |

- Old names alias the tokens (`--bg`, `--panel`, `--green`, `--green2`, `--hot`, `--dim`, `--line`); `.project-application` keeps its light overrides. `--term-*` removed.
- **CRT glow pass (Harold, 2026-10-26, `fix/crt-glow`).** This deliberately reverses the earlier notes "no continuous flicker", "Watcher jitter removed" and "body text does not glow", and is stronger than AGENTS.md's "subtle CRT" by Harold's explicit choice. Static scanlines `repeating-linear-gradient(0deg, rgba(0,0,0,.07) 0 2px, transparent 2px 4px)`; the screen vignette is `radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%)` on the fixed background layer under all content (`body::before`), so it darkens the page background toward the corners and never the text; the scanlines stay a fixed overlay above everything (panels keep `inset 0 0 60px rgba(0,0,0,.5)`); power-on sweep plays once. In CRT "on" only: a rounded screen bezel above 480px (22px corners, 1px `rgba(140,220,160,.14)` inner edge, thin dark frame; never takes clicks) and Watcher-only motion: a stepped opacity flicker (1.3s loop: 97% at 14%, 98.2% at 47%, 97.5% at 78%, each dip held ~26ms) and a 2px jitter for 90ms every 3.5-9s at random, on their own wrappers apart from eye tracking. Reduced motion stops both. No other CRT motion (the announcement cursor blink and the promo ad wobble are older and unchanged; since batch 2 the "[ NEW ]" label blinks between `--crt-text` and `--crt-mid` instead of fading, so the text stays above 4.5:1, while the decorative cursor keeps its fade). The Watcher glow `drop-shadow(0 0 4px rgba(180,245,195,.7)) drop-shadow(0 0 16px rgba(120,220,150,.45))` is baked into the Watcher layers (lossless WebP; fixed in every CRT mode, so CRT "off" keeps the halo, Harold 2026-10-26). Because the vignette sits under the text, `--crt-dim` text keeps ~4.5-4.8:1 measured from pixels at 1366x768 (green; amber ~4.5-4.8:1), the gap from 4.94:1 being the scanlines (see bugs.md "CRT vignette contrast"; as an overlay it had dropped to ~2.4-3.2:1). The window layer sits above the overlay, so comics and artwork are never scanlined.
- Effects toggle `CRT: ON / REDUCED / OFF` (default on): reduced = scanlines .03, no vignette, no body glow, no bezel, no Watcher motion (head, menu and link glow stay); off = no scanlines, text glow, vignette, bezel or motion (the Watcher's baked halo stays). Palette and recolor stay in every mode.
- IBM Plex Mono (400, 700) via `next/font/local`; body 16px / 1.6; long-form text max ~70ch; nothing below 12px. Arial stays in Win95 windows.
- Recolor filter `#crt-tune` (grayscale, then R `0.039 0.373 0.659 0.831`, G `0.055 0.541 0.847 0.961`, B `0.043 0.420 0.690 0.855`, sRGB) on schematic video, posters and poster fallbacks. Never on concept art, comics or galleries. The Watcher uses baked `*.crt.png` copies (`scripts/bake-watcher-crt.mjs`). Display-time only; Blob untouched.
- Win95 windows: chrome stays grey/navy/Arial; `--crt-*` only for dark terminal content inside.
- Glow tokens: phosphor-specific `--crt-glow-*-value` tokens follow `html[data-crt]`; rules use `--crt-glow-head|ui|link|body`, which Win95 and light contexts (windows, project applications, promo ads, the monitor, desktop icons) set to none; the dark equipment panel re-enables body and link glow. Amber mode uses the same strengths in amber colours (amber links are cream).

**Amber phosphor** (phase 1; `html[data-phosphor="amber"]`, saved as localStorage `crt-phosphor`, applied before first paint; green stays the default):

| Token | Amber value | Contrast on bg |
|---|---|---|
| `--crt-bg` | `#0e0a06` | — |
| `--crt-panel` | `#15100a` | — |
| `--crt-text` | `#ebc48c` | 12.03:1 |
| `--crt-mid` | `#c69a60` | 7.69:1 |
| `--crt-bright` | `#ffe0b0` | 15.54:1 |
| `--crt-dim` | `#a07a48` | 5.05:1 |
| `--crt-border` | `rgba(235,180,110,.18)` | — |
| `--crt-accent` | `#fff1d6` (links underlined) | 17.66:1 |
| `--crt-glow-head` | `0 0 3px rgba(255,224,176,.8), 0 0 18px rgba(240,175,90,.5)` | — |
| `--crt-glow-ui` | `0 0 6px rgba(255,210,150,.55)` | — |
| `--crt-glow-link` | `0 0 6px rgba(255,241,214,.55)` (cream: amber mode's link colour) | — |
| `--crt-glow-body` | `0 0 2.8px rgba(235,196,140,.24)` | — |
| Watcher glow (baked) | `drop-shadow(0 0 4px rgba(255,210,150,.7)) drop-shadow(0 0 16px rgba(235,165,75,.45))` | — |

- `#crt-tune-amber` maps black → bg, then dim, text, white → bright (R `0.055 0.627 0.922 1`, G `0.039 0.478 0.769 0.878`, B `0.024 0.282 0.549 0.690`); CSS uses `var(--crt-tune-filter)`.
- Watcher: `watcher-{base,eyes}.amber.webp` and `crt-noise.amber.png` from `node scripts/bake-watcher-crt.mjs --phosphor amber`. The face and grain are CSS backgrounds (only the active set downloads); both 10 KB eye layers download, the inactive one is hidden.
- Near-black tints are tokens too (`--crt-deep`, `--crt-deep-hi`, `--crt-deep-lo`). Win95 chrome and the monitor hardware keep their fixed colours.

---

## Decided: terminal ↔ desktop mode switch (phase 2)

Why: artwork looks wrong on the green terminal; it needs a neutral background.

- **Two modes.** Terminal = text mode (navigation, lore, text). Anything with art (projects, Art Viewer, comic reader, equipment galleries) opens in graphics mode: the Win95 desktop.
- **In-world reason.** Opening a file prints `$ open blushland.prj` / `mounting volume ........ ok` / `image data detected` / `switching to graphics mode ...`.
- **The switch.** Terminal collapses to a bright line (scaleY, ~200ms) → the line shrinks (scaleX, ~170ms) → ~140ms black → desktop fades in (~240ms). ~~Full sequence on the first switch per visit; afterwards a quick flick (~250ms).~~ **Changed 2026-10-29 (Harold, 03:25 CT): "the terminal to windows grey transition everytime you go into the grey windows": the full sequence plays every time** (built in batch 7, phones included); the flick is left for arriving by browser Forward. Reduced motion or effects off: crossfade.
- **Desktop behind windows.** Muted dark teal `#2e4646`; taskbar with a `◂ TERMINAL` button and open-window buttons (extend the existing `public-window-dock`). Art sits on neutral grey inside windows. Windows never sit directly on the terminal.
- **Win95 zoom outline.** A stepping dotted outline (`steps(7)`, ~280ms) from the clicked item to the window; on close, window → its taskbar button, then the reverse switch.
- **Navigation.** Browser Back runs the reverse; every window keeps its URL.
- **Phones.** The flick, then a full-screen sheet slides up; Terminal button at the bottom.
- Also removes the brightness flash of a grey window appearing instantly over a dark page.

## Decided: hover highlights (phase 1)

- **Terminal mode: reticle.** Four corner brackets (10×2 and 2×10px, `--crt-bright`, inset −3px) scale in 1.3 → 1 with opacity, ~120ms in, instant out; text brightens to `--crt-bright` with `--crt-glow-ui`. Cards and posters: the reticle wraps the whole card. Story: the Watcher locking on; pair with the Watcher's eyes glancing toward the hovered item.
- **Desktop mode: authentic Win95.** Navy `#000080` bar with white text on menu and list items; flat toolbar buttons raise on hover (bevel `#fff #404040 #404040 #fff`) and press in on click; desktop icons get a navy label with a dotted border; dotted focus rectangle.
- **Rules.** Same graphic on `:focus-visible`; on touch, shown while pressed; drawn as an overlay (no layout shift); reduced motion = appears without scaling; one shared style applied to every link, button, card, tab and window control; optional soft tick when sound is on.

## Decided: phase 1 scope

Decided 2026-10-25 (Harold), when the phase 1 plan was approved.

- **Menu bar.** Phase 1 builds only a `SYSTEM` dropdown at the right of the existing header (CRT effects, sound, phosphor colour). The header keeps an empty nav slot so phase 2 adds `Projects · Comics · Archive · Tracker` and Search to the same bar. No File / Archive menus.
- **Boot.** The checklist replaces the BIOS/WORM.EXE lines and the eye blinks. The same window then becomes the existing announcement (`data/announcement.ts`), with ENTER, Esc and × dismissal unchanged. Skipping jumps to the announcement.
- **Amber.** Everything recoloured today goes amber too: tokens, the Watcher (a second baked PNG set) and schematics (an amber twin of `#crt-tune`). Concept art, comics and galleries stay unfiltered. Green stays the default.
- **Amber accent.** Default warm cream `#fff1d6`, underlined for links (green mode's accent is already amber). Pale cyan is the alternative if Harold prefers it.

---

## Decided: main menu and homepage (phase 2)

Decided 2026-10-25 (Harold). Replaces the current homepage, where the first screen is title + menu + a large Watcher and navigation appears three times.

- **Top bar = menu bar (desktop).** `MIGRAINZ · Projects · Comics · Archive · Tracker` on the left; `Search (Ctrl+K) · SND · CRT` on the right. The clickable file path (breadcrumbs) sits directly below it.
- **Left column: the main menu as a directory listing.** Number and file name small, readable name large (`01 / projects.db` over "Project database"), reticle on hover. Shop and Patreon at the bottom as locked system files (phase 3 for the unlock behaviour).
- **Centre: the Watcher.** The latest comic page, the newest schematic and a Patreon file orbit it as small clickable windows. Hover or tap activates the Watcher.
- **Right column: Transmissions** (real updates from the CMS) and a **clearance panel** (PUBLIC, or the visitor's Patreon tier).
- **Below the first screen:** a strip of recent files, then the tracker and comics panels. Hide empty sections (no "AWAITING FILES").
- **Navigation appears once.** Remove the launcher row (`[ LATEST ]` / `[ SYSTEM ]`) and the duplicate panel links.
- **Fit:** the menu and the Watcher must both be reachable without scrolling at 1366x768.
- **Phone:** slim top bar (`MIGRAINZ`, search, CRT), Watcher first, then content, bottom tab bar. The mobile control pad (arrow keys + Enter, from the 2026-10-15 notes) stays in the backlog.
- Since phase 1, SND and CRT (and phosphor colour) live in the header's `SYSTEM` menu; the phase 2 plan decides whether they stay there or move back onto the bar.
- Search and Ctrl+K belong to the backlog's "terminal commands + Ctrl+K palette"; the phase 2 plan decides whether a minimal search ships first.
- **Built 2026-10-29 (batch 6) from design canvas board 23**, which Harold picked over the earlier boards ("i like 1's general layout ... too much empty space ... 15d is my favorite in terms of all the moving pieces ... the title card glow ... one line and put it on top of the watcher, with an actual terminal system"; then "ship 23"). Differences from the list above, all Harold's choices on the canvas: no orbiting windows (the latest page and newest schematic are tiles below the first screen); a working terminal under the directory; the title sits on the Watcher in one line; text-mode static and a text lens on the Watcher (no planet behind it: "get rid of the planet behind the watcher but keep the little static in"); the right column adds a session clock and a signal globe, a real world map with NODE 01 in Texas; the tracker and comics panels became an activity chart and an operations tile. SND, CRT and phosphor stay in the SYSTEM menu; no search control. The phone tab bar is not built yet.

---

## Live site review (2026-10-22, migrainzxxl.com, before the restyle)

Working: strong fiction (paths, `.EQP` names, one-time transmission splash, spec panel); schematic posters; no sideways overflow on phones; usable phone comic reader; every page has a URL.

1. Tiny text (fixed by the floor; see step 1a for the remaining menu sizes).
2. Comic reader on desktop: not maximized; the page shows at ~393×562 on 1440×900. Open maximized, fit the page to height (~850px), consider two-page spreads. The "20%" zoom readout is confusing on phones.
3. Homepage: the first screen is title + menu + a 590px Watcher; all content is below the fold; navigation appears three times; an empty archive panel ("AWAITING FILES") on the front page; on phones the Watcher sits below the 7-item menu.
4. Grey project window over the dark homepage = brightness flash (solved by the mode switch). Content scrolls inside the window; let the page scroll when the window is full-screen.
5. Equipment: the live item page puts the schematic full-width with specs below the fold (check after the laptop fit ships; otherwise schematic ~60% left, specs right, "issued to" below). Vertical weapons sit tiny in 2:1 posters. Card titles are file names → readable name large, file name small. The equipment directory has a generic tab title.

Layout direction: one frame (top bar + clickable file path as breadcrumbs); three templates (directory with grid/list and filters; file/dossier shared by characters and equipment; reader); window-vs-page rule (windows for quick looks, pages for anything shareable; every window has a URL); fewer borders; laptop-first (1366×768); phones get full-screen sheets and a bottom nav; spacing tokens.

---

## Inspiration (liked by Harold)

- **EddyOS** (eddy-naboulet.dev): boot screen with jokey status lines, "press any key", S toggles sound; a dithered portrait as centerpiece with floating windows; tiles with the file name small and the readable name large; warm amber palette.
- **The Kesey Signal** (keseysignal.2advanced.com): handshake boot lines, "access the network" gate, a central emblem that activates on hover, "system file" rewards (wallpaper kit, signed-poster drawing), dossiers, easter eggs.
- Also noted: zui.ooo (readable terminal, commands as section headings, bottom tab bar on phones), chusmargallo.space (windows as toys, in-world cookie notice).

## Rework phases

1. **Interaction polish** (branch `feature/interaction-polish`; scope in "Decided: phase 1 scope"): reticle + Win95 hover highlights (one shared style); readable name large / file name small (menu tiles like `01 / projects.db` → Project database; equipment cards); boot checklist replacing the BIOS/WORM.EXE lines of the transmission splash (~3s, built from real data, e.g. `[ OK ] watcher.sys … awake`, `[ !! ] blushland_chapter_02 … 73% rendered`, `[ OK ] clearance … PUBLIC`; once per session; any key / Esc skips; S = sound); amber phosphor mode (alternate token set); a `SYSTEM` menu in the header (CRT effects, sound, phosphor colour).
2. **Mode switch and layout:** the terminal ↔ desktop switch; window-vs-page rule; page templates; homepage first screen and main menu (see "Decided: main menu and homepage (phase 2)": menu bar, directory-listing menu, Watcher with orbiting windows, Transmissions and clearance panels, one navigation, hide empty sections, 1366x768 fit, phone tab bar); comic reader sizing. May split into two branches.
3. **System files:** locked content shown redacted with a clearance tag and a link to the tier that unlocks it, with a reveal animation for people who have access (reuse existing Patreon tier access); Patreon perks and the Requisitions shop as unlockable files; hidden files in the archive, with a wallpaper kit for finding them. If rewards are stored in Blob, uploads are production work (approval); repo static assets are not.

## Backlog

Watcher moods (blink, flinch at fast movement, glance at hovered links, doze when idle, greet on return); terminal commands + Ctrl+K palette; connected lore with hover previews and a faction map; interactive schematics (drag to scrub, hotspots, compare); case-file progress and NEW markers (browser storage); comic resume / swipe / preload / end-of-issue links; in-world updates feed + RSS or notifications; opt-in sound; in-world 404 (also fixes soft 404s on wrong-project URLs); personnel-file share cards. Anything storing visitor data across devices (accounts, comments, guestbook, synced progress) needs database changes → production lane.

---

## Workflow setup

Status (branch `chore/workflow-setup`, 2026-10-25): items 1 to 6 and 8 are done in the repo: CLAUDE.md "Two lanes", batching and model lines; `.claude/settings.json`; `.claude/agents/reviewer.md`; `.claude/commands/check-everything.md`. Item 7 is written up step by step in docs/preview-isolation.md and NOT started (each step needs Harold's approval). Not yet merged to `main`. The permission rules have not been exercised against real denied commands; see AGENTS.md "Project Claude Code settings" on what they do and do not block. 2026-10-27: everything CLAUDE.md held now lives in AGENTS.md; CLAUDE.md only imports it.

1. **Two lanes in CLAUDE.md.** Code-only work (UI, styling, components, docs): one plan review, then work and report at the end. Production work (database, Blob, Vercel, Neon, pushes, env vars): keep stop-and-approve.
2. **Hard rules in project Claude Code settings.** Deny `git push`, `payload migrate` and `migrate:*`, `vercel`, `neonctl`, and reading `.env*`. Allow typecheck, build, the test and verify scripts, `serve-fixture`, and git status/diff/log/add/commit. Code-only work can then run in accept-edits mode.
3. **Reviewer subagent** in `.claude/agents/`: fresh context; reviews plans, diffs and screenshots against CLAUDE.md and this file; reports problems only; never edits.
4. **Check-everything command:** one project slash command that runs typecheck, build, regression and both verify scripts, saves the output, and summarizes simulated vs real checks.
5. **Batch questions, use defaults.** CLAUDE.md line: for code-only, reversible choices, pick the recommended option, note it in the report, and continue; stop only for production, data or design-direction questions.
6. **Update CLAUDE.md release status** to the current state.
7. **Preview isolation (production work, each step needs approval):** confirm the Neon integration still creates a branch per preview; separate Blob store + `BLOB_READ_WRITE_TOKEN` for Preview; separate `PAYLOAD_SECRET` for Preview; remove the old preview deployments that were built with production credentials; verify `vercel env ls` shows no production values scoped to Preview and that a test preview connects to its own database branch. Until this is done, no branch pushes. Once done, every branch gets a preview link for phone checks.
8. **Model choice:** Opus 5.5 with higher effort for audits, planning and production steps; Sonnet 5.5 at medium for executing a clear plan. Raise effort if it skips files, skips tests or stops partway.
