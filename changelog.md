# Changelog

## Changed - 2026-10-29 / Batch 12 (with 11b): operations log on the tracker (feat/batch-12-activity-log)

Design canvas board 12, from Harold's "everything else on the road map" (2026-10-29). Plan reviewed by a fresh agent first (its points are built in: seen updates kept as IDs, not a date; a session baseline so NEW survives Back; classified updates kept out of the merged log; thumbnails from the update's own images; fixed slots so nothing rewraps). Code-only; no schema, migration, Blob or env change.

- The tracker page opens with an OPERATIONS LOG: the 12 newest public updates of every public project, newest first, one line each: date, project code, the update's title, `OPEN <code> ▸` to the project's page (amber, as on the board) and the first public picture of the update as a small thumbnail (none when it has no picture; on phones its text then takes the full width). The project cards with their phase bars and VIEW LOG stay below (the board's "the phase bars can stay").
- NEW: updates this browser has not seen before carry an amber NEW label and edge, and the status line says `2 NEW SINCE YOUR LAST VISIT` (otherwise `LATEST <date>`). What was seen is a list of update IDs kept in this browser only (localStorage, capped at 300); nothing goes to the server. A first visit marks nothing; the marks stay for the visit (also after opening a project and coming Back); blocked storage just means no NEW. The NEW slot is its own column, empty in the server's HTML, so marking a row never rewraps it.
- Classified (REDACTED or PATRON) updates stay out of the merged log (they keep their placeholder in their project's VIEW LOG); classified projects contribute nothing.
- Public updates now carry their record ID to the page (classified placeholders never do). React keys for updates use their order, not their date (two updates on one day gave duplicate keys).
- Tests: new `scripts/verify-operations-log.mjs` (regression): the list (both fixture projects, newest first, two updates on one day, the thumbnail of the update with a picture, no REDACTED or PATRON sentinel text in the HTML), first visit without NEW, a returning visit with two unseen updates marked NEW (also after OPEN and Back) and then recorded as seen, blocked storage, no sideways scroll at 390 and 320 px. The fixture gains five updates (two on one day, one with a picture, one for STALKER, a REDACTED and a PATRON one); site health looks for the new sentinels on every page.

**11b (fixes from the independent review of batch 11, which went live before its review; nothing blocking):**
- Slow-page status on phones: lines wrap instead of being cut, and below 420 px the dot leader goes, so the waiting time always shows (at 320 px it was cut off).
- The panel fades in over 200 ms (none with reduced motion), so a page arriving just after 300 ms barely shows it.
- A page shown again from the browser's back/forward cache ends a status it was frozen with (no popstate fires then).
- Screen readers hear "Loading page: about" (plain words) instead of the SYS: path.
- Comic reader: with focus on PREV or NEXT, reaching the first or last page (by key or click) disabled the focused button and arrow keys stopped; focus now moves to the page. The same check treats a disabled focused element as lost focus.
- Art Viewer: the caption is measured when the panel appears or resizes and when the shown caption changes, not on every render; the picture's spoken name mentions arrow keys between images only when there is more than one, and the reader's lists 0.
- Regression harness: the second dev server (site health) gets its own probed port; an unused option that could have bypassed the fixture's fail-closed environment check is gone.
- Docs: Release status records the batch 11 push; the redesign plan and features say the decoding placeholder shows only a thumbnail the filmstrip already showed (so not in the comic reader); the batch 11 changelog line no longer says every plan-review point was built.
- Tests (`verify-nav-status.mjs`): unroute now removes the held route (it never did); the switch's mode-stage event and a back/forward-cache restore end the status (both simulated by dispatching the event); at 320 px every line fits and the waiting time shows, and after 20 s it says "no answer yet" and goes while the page is still on its way; reduced motion: no fade or blink. `verify-equipment-directory.mjs`: focus on NEXT, Right to the last page, then Left still turns back.

- Check: `check-20261029-210237`: all 16 steps passed (simulated: headless Chromium on throwaway SQLite fixtures).

## Changed - 2026-10-29 / Batch 11 (with 10b): slow-page status (feat/batch-11-nav-status)

Design canvas board 10 (left half), from Harold's "everything else on the road map" (2026-10-29). Planned with batch 10 and split off after that plan's review; the review's points are built in except two: no Escape to dismiss the panel (it takes no focus and goes by itself) and the fast-page test is simulated (corrected in 11b). Code-only; no schema, migration, Blob or env change.

- A terminal page that takes longer than 300 ms to arrive after a link click (or the homepage terminal's `cd`/`open`) shows a small terminal panel at the top right under the header: `> ACCESSING SYS:/ABOUT`, `request sent`, `waiting for node ........ 1.4 s` (the real time so far) and a blinking cursor. It goes when the address changes, on Back/Forward, and when the switch to the grey-window desktop starts; after 20 s it says "no answer yet; the page may still arrive" for 2 s and goes. Fast pages never show it. No progress figure and no "ok" that nothing measured.
- Screen readers: a status region that is always in the page says "Loading SYS:/ABOUT" when the panel appears; the panel itself is decoration.
- Not shown for: the grey-window desktop and the switch into it (it has its own LOADING VOLUME line), links with `data-mode-switch="off"` (their own handlers decide), API, admin, sign-in and file links, the same page, other sites, new tabs and modified clicks. Reduced motion: no cursor blink.
- Check: `check-20261029-183710`: 15 of 16 steps passed; the regression step passed every browser script, then the `next dev` server restarted for memory during the site-health crawl (bugs.md "Regression server restarted for memory mid-run"). A larger heap did not help (`check-20261029-191436`, same restart). `scripts/regression.mjs` now gives site health a freshly started server; the regression step re-run with that: `check-20261029-194926`, passed.

**10b (fixes from the independent review of batch 10, which went live before its review):**
- Keyboard focus after a key turns the page or changes the image: the picture and its toolbar are new elements after the change, so focus fell back to the page and further arrow keys did nothing (in the live comic reader: after clicking the page, the first Right turned it and the next did nothing, a regression from batch 10 making the page focusable). Focus that was on the picture or its toolbar now moves to the new picture (or the reader or viewer window).
- The decoding placeholder uses only a thumbnail this page has already shown (the Art Viewer's filmstrip), so it never costs another media request; elsewhere (the comic reader, a single-image viewer tab, a strip not yet loaded) only the DECODING label shows.
- Filmstrip tiles keep their raised grey look with a mouse (a hover rule had made the other tiles transparent, so a tile whose image had not loaded was invisible).
- In the caption or the filmstrip, Up and Down are theirs (a zoomed picture took them, so a long caption could not be scrolled by keyboard); the caption is a tab stop only when its text scrolls; the image counter never shows a number past the end while switching tabs; the picture's spoken name lists the keys; dead CSS from the old meta row removed.
- Tests: click the picture, Right, Left (Art Viewer) and click the page, Right, Left (reader) keep working; the filmstrip tile colour; a short caption is not a tab stop; the scan is recorded when its animation starts instead of looked for afterwards.
- Tests: new `scripts/verify-nav-status.mjs` (regression): with the page data for /about held 1.5 s, the panel appears after about 300 ms with the right path, the status region announces it, no "ok", and it goes when the page arrives; a page that arrives within 300 ms (simulated: under `next dev` every dynamic page takes a second or more) shows nothing; nothing for the desktop switch, an opted-out link, `/robots.txt` or `/admin`; a slow `cd about` in the homepage terminal shows it; at 390 px it fits and stays clear of the tab bar.

## Changed - 2026-10-29 / Batch 10 (with 9b): Art Viewer filmstrip and captions, decoding art (feat/batch-10-art-viewer)

Design canvas boards 9 and 10 (right half), from Harold's "everything else on the road map" (2026-10-29). Plan reviewed by a fresh agent first (its points are in the plan: one window-level key handler, no landmark inside the window, placeholder as an image that reuses the filmstrip's copy, no scan in the reader, the slow-page status moved to batch 11). Code-only; no schema, migration, Blob or env change.

- Art Viewer layout: the window is a size container; its body is a grid. In a window at least 760 px wide the caption panel sits beside the picture (260 px), in a narrower one under it (scrolling if long). It now stays when the window is maximized (it used to hide).
- Caption panel: `IMAGE n / m` (with two or more images), the record's name as a heading, project / role, the image's caption, the record's description (both, where before the meta row showed them in one line), the schematic-poster note, and `OPEN RECORD ▸` to the record's page on every page except that page itself (it replaces OPEN ITEM PAGE, which only showed for poster-only items); a hint line for mouse users ("drag to pan · ← → images · + − zoom"). A plain group named by the heading, focusable so a long text can be scrolled by keyboard.
- Filmstrip: 84x62 thumbnails (64x48 in a window 480 px wide or less), named "Image n of m" plus the image's alt text, the shown one marked `aria-current`; the strip scrolls itself (never the page) to keep the shown one in view.
- Keys, with focus anywhere in the viewer window: the picture handles + (with or without Shift) and = to zoom in, - to zoom out, 0 to fit, and arrows to pan a zoomed picture; otherwise Left / Right show the previous / next image (stopping at the ends, never on an auto-repeat, so holding an arrow to pan never races through the images; from the filmstrip, focus follows). Tabs, form fields, Ctrl/Alt/Meta shortcuts and keys already handled are left alone. The picture is focusable whenever it is shown (before: only when zoomed).
- Decoding (board 10): an image still loading after 150 ms shows a blurred, dimmed copy of its thumbnail at the size it will have (from the CMS's width and height, with the same fit; FIT WIDTH from the top) and a `DECODING <file name>` label; screen readers keep hearing LOADING from the size readout. The placeholder is an `<img>` that reuses the copy the filmstrip already loaded (measured: no media file requested twice in one image view) and is used only when the thumbnail is a different file from the image being loaded, never for schematic posters. In the Art Viewer a slow image then scans in from the top in 420 ms behind a neutral line (no phosphor colour over artwork), with CRT "on" and motion allowed; otherwise it simply appears. A cached image shows neither. In the comic reader the placeholder shows but there is no scan, so page turns stay quick.
- Comic reader: 0 goes back to the reader's own fit (the chosen FIT HEIGHT or FIT WIDTH, else by screen shape).
- Not built from board 9: PREV / NEXT RECORD (the viewer only knows the records whose tabs are open; a list of neighbours would need every opener to pass one). From board 10: no progress percentage (an image element gives none, and a made-up one would not be true).
- Tests: new `scripts/verify-art-viewer.mjs` (regression): caption beside the picture at 1366 (also maximized) and under it at 390 with no sideways scroll, `IMAGE n / m`, filmstrip names and current image, Right / Left between images and stopping at the end, focus following in the strip, + / - / 0 on the picture and + from a toolbar button, a zoomed picture panning before the image changes, OPEN RECORD absent on the record's own page and present elsewhere; decoding with the image's request held (placeholder blurred, decorative, image-sized, not the image being loaded; DECODING label; LOADING readout; the scan under CRT "on", none with reduced motion; nothing from cache; no media file requested twice: 3 requests for one view with the strip). `verify-equipment-directory.mjs`: + then 0 in the reader returns to FIT WIDTH. `verify-equipment-navigation.mjs`: OPEN RECORD instead of OPEN ITEM PAGE. Selectors for the picture use its new class (`img.art-viewer-image`) in verify.cjs, verify-equipment-directory and verify-equipment-navigation.

- Check: `check-20261029-171325`: 15 of 16 steps passed; the regression step stopped on one of this batch's own new assertions (the poster-less clip's request was held for a fixed 2 s, which a slow first page load used up, so the clip was already playing when the test looked). The test now holds the clip until it has checked, then releases it; the regression step was re-run with that change: `check-20261029-173943`, passed.

**9b (fixes from the independent review of batch 9, in the same commit and check):**
- Any schematic video without a poster stays transparent until its first frame plays (the homepage's NEWEST SCHEMATIC tile was still a black box while loading); a new clip element starts transparent again after a reduced-motion switch.
- Reader on a wide window: a page with no size toolbar (classified, unavailable or none filed) lets the page bar span its row instead of leaving a dark gap (not covered by a test: the fixture has no such page).
- Boot: a click on empty page during the power-on (which focuses only the main section) no longer keeps the announcement from taking focus.
- Docs: the 8c note on the equipment tabs now says the row is scrolled before paint on in-app navigation only; the roadmap and AGENTS release status say what is live.
- Tests: the poster-less clip is checked transparent while its request is held; a tall card in phone landscape (844x340) whose top is under the tab bar is moved above it on keyboard focus; a boot skip reaches the announcement within 1.9 s (was 2.5 s); a click on empty page during the power-on still lets ENTER take focus.

## Changed - 2026-10-29 / Batch 9 (with 8c): Harold's design calls (feat/batch-9-design-calls)

Harold, 2026-10-29 (~10:20 CT), answering the open design questions: "TRACKER tab on phones", "Taller reader page", "Boot power-on visible", "Fix CRT vignette order"; keep the always-turning equipment thumbnails. Code-only; no schema, migration, Blob or env change.

- Phone tab bar: a fifth tab, TRACKER (`/tracker`). At 360 px and narrower the labels lose their letter spacing so PROJECTS fits its 64 px tab at 320 px.
- Comic reader: in a reader window at least 760 px wide (a container query on the window), the page bar (PREV / PAGE n / m / GO TO / NEXT) shares the size toolbar's row above the page, so the page is taller: 564 px at 1366x768 (533 before) and 696 px at 1440x900 (665 before). The page bar never shrinks; the size toolbar wraps first. Narrower windows (phones) keep the page bar at the bottom. The DOM order is unchanged (toolbar, page, page bar), so keyboard order on wide windows goes toolbar, page, then the page bar shown above it.
- Boot: after the checklist collapses, the page's power-on (board 17, 900 ms) plays with the startup window hidden (still mounted, so it is the same window that becomes the announcement, and the shop ad and Escape still know a startup window is up); then the announcement opens. It takes focus only if the visitor has not moved into the page meanwhile. Reduced motion or CRT off: no power-on, the announcement opens at once.
- CRT vignette: body is transparent, so the fixed background layer with the screen vignette shows behind every page (before, body's own background covered it on any page longer than the screen). The layer's faint top-centre haze, never seen either, was dropped rather than shown.
**8c (fixes from the independent review of 8b, in the same commit and check):**
- Equipment card with a video but no poster: the concept art stays while the video is on its way and under the clip until its first frame plays, so the card is never blank (before: art, then blank, then black until the first frame). A fixture item (Fixture Relay) has a video and no poster.
- Phone tab bar: the focus nudge skips only elements with `tabindex="-1"` (containers focused by script) and tall controls whose top already shows; a tall card whose top is under the bar (a phone in landscape) is moved again. One `--phone-tabs-height` (including the safe area) now sets the page padding, the window dock offset and the scroll padding.
- Equipment tabs on phones: the current tab is scrolled into view before paint on in-app navigation (on a direct load the server's HTML paints first, so the row can still jump once), measured from the boxes; the Windows High Contrast outline stays inside the scrolling row.
- Tests that did not prove their claim: the reader's "scrolling does not choose a fit" case now runs where FIT WIDTH overflows (700x1000), checks the page moved, then the landscape refit; the readout case checks 000 is held for 700 ms and that it turns again; the phone reader screenshot is taken before any other step again.
- Recorded in bugs.md: the 6c/7c behaviours that still have no dedicated test.
- Check: `check-20261029-155800`: 15 of 16 steps passed; the regression step stopped on a timing assertion in `verify-interaction-polish.mjs` (a Watcher jitter took over 250 ms to snap back with three pages running at once; not caused by this batch, see bugs.md "Flaky timing check"). The regression step was re-run on the unchanged tree: `check-20261029-161900`, passed (all ten browser scripts).
- Tests: `verify-home.mjs` checks the power-on plays with no startup window over it, then the announcement opens with focus on ENTER; focus moved into the page during the power-on stays put; reduced motion has no power-on wait; the vignette darkens the same background pixel compared with the vignette switched off. `verify-equipment-directory.mjs` checks five tabs, TRACKER current on /tracker, every tab label inside its tab at 320 px, the reader's one bar row on wide windows with the page at least 20 px taller than before, the page bar at the bottom at 390 px, and every reader control inside the window at 800 px. `verify.cjs` allows the extra 900 ms between a boot skip and the announcement.

## Changed - 2026-10-29 / Batch 8b: fixes from the independent review of batch 8 (fix/batch-8b-review-fixes)

Code-only; no schema, migration, Blob or env change.

- Phone tab bar: its keyboard-focus nudge no longer scrolls the page when a script focuses a large container (the main section is focused with `preventScroll` after the reverse switch, the startup sequence and a window closing; at 860 px and narrower the nudge used to push the header off screen). The cards and the tab bar no longer prefetch their pages (the old Win95 rows did not either; the switch fetches the route at the click). The bar gets 8 px of bottom padding, more where the phone reports a safe area; the page padding and the window dock above the bar move up to match.
- Equipment directory on phones: the current section tab is scrolled into view in its sideways-scrolling row; a keyboard-focused tab brightens and its reticle is drawn inside the tab, so the row no longer cuts it off.
- An equipment card whose video has no poster shows the item's first concept art as its still (reduced motion, data saver or a failed load) instead of "NO SCHEMATIC".
- The directory page builds its EQUIPMENT tab from the cards it already loaded instead of a second equipment listing.
- The clock readout ("ROTATION 123°") follows a live reduced-motion or data-saver change: it holds at 000 while the cards hold still and runs again when they turn.
- Reader: only the FIT HEIGHT and FIT WIDTH buttons choose a fit to keep for the next pages; scrolling a fitted page no longer locks it in, so the landscape/portrait default still applies after turning the phone.
- Homepage terminal: "^C cancelled; still at ~" is printed only when the terminal started the move (the open-route event now says who started it); Escape on a move started by a directory row prints nothing.
- Tests: `verify-equipment-directory.mjs` adds the scroll position after a script focus of the main section with the tab bar showing, the current tab inside its row at 390 px, the focused tab's colour and reticle, the readout holding at 000 under emulated reduced motion, and a reader that keeps fitting by shape after a wheel scroll; `verify-mode-switch.mjs` adds Escape on a terminal move (cancel line) and on a directory-row click (no line, still home). Not tested: the concept-art fallback (no fixture item has a video without a poster).
- Docs: `scripts/fixtures/README.md` says how the test clips were made; `verify-equipment-navigation.mjs` notes that its list page models the faction pages' Win95 list, not the real equipment directory; the redesign plan records the equipment directory as the exception to "art opens in graphics mode" and the reader decisions; bugs.md corrects the cost note.
- **Corrections to batch 8's entry:** "two clips made 3 requests on load" was one request for each of three files (the two clips and the scanner's stub video, which fails and shows its poster), and "none per loop" was measured only with 33 KB and 49 KB test clips, not real schematic files; the decorative spinner and its following a live reduced-motion change shipped in 6b, not batch 8; only Left and Right turn pages, Up and Down only scroll; the 4x-of-fit zoom ceiling also applies to the Art Viewer; the equipment directory's cards are plain links, so the directory no longer opens the Art Viewer or the Properties panel from its list (item pages still do).

## Changed - 2026-10-29 / Batch 8 (with 6c/7c): equipment directory out of the window, reader fitted to the page, phone tab bar (feat/batch-8-equipment-reader)

Harold, 2026-10-29: "take the equipment menu out of the white windows tab and make it so that its thumbnails are always spinning and in sync of each other in terms of showing the right side of it as the starting loop" (design canvas board 22), and "everything else on the road map" (boards 4 and 5). Code-only; no schema, migration, Blob or env change.

- The equipment directory (`/projects/<slug>/equipment`) is now a terminal page outside the project window: the project's section tabs (current one marked), "<n> records filed", a readout of the shared clock ("ROTATION 123° · LOOP START: RIGHT SIDE") and a grid of cards whose schematic videos all turn on the one 12 s clock, each loop starting on the item's right side (the video's start). Cards without a schematic show their first concept art (never recoloured) or "NO SCHEMATIC". Opening a card goes into the project window with the switch; the window's EQUIPMENT tab comes back with the reverse. The project window's routes moved into a route group (`projects/[slug]/(window)/`); URLs are unchanged. The cards' videos come from a separate query (`getEquipmentTiles`), so the project window never loads video records just to show its tabs.
- Comic reader: opens maximized; the page fits the frame's height on a landscape screen and its width on a portrait one, with FIT HEIGHT / FIT WIDTH / ACTUAL SIZE / − / + and a readout in words ("FIT HEIGHT", "ZOOM 150%") instead of "20%"; short labels on phones. FIT WIDTH starts at the top of the page, the mouse wheel scrolls a page larger than the frame, and arrow keys turn the page whenever the page cannot move that way. A chosen fit is kept for the next pages.
- Tab bar (board 5): HOME, PROJECTS, COMICS, ARCHIVE at the bottom of terminal pages at 860 px and narrower (where the header's section links are hidden), with the current section marked. It hides on the grey-window desktop (the taskbar takes over), while a window or the SYSTEM monitor is open, and while a text field has focus; the window dock moves above it; keyboard focus is never left under it.
- The schematic spinner can be decorative inside a card (no second name for the link), and follows a change of the reduced-motion setting while the page is open.
- Tests: `scripts/verify-equipment-directory.mjs` (regression): the directory outside the window, tabs, cards, decorative media, unfiltered concept art, two real test clips (6 s and 9 s, VP9 in MP4, `scripts/fixtures/`, seeded as Fixture Beacon and Fixture Lamp) in step with the clock and played at duration / 12 s, video requests over a full loop, the switch both ways, reduced motion, the missing-project 404; the reader maximized and fitted at 1366x768 and 1440x900, FIT WIDTH from the top, the wheel, the arrow key, the toolbar at 390 and 320 px; the tab bar at 390, 768 and 1366, focus never under it, hidden while typing, under the SYSTEM monitor and on the desktop. `verify-viewer-pinch.mjs` reads the scale from `data-scale`; site health adds `/projects/no-such-project/equipment` to its 404 list; `verify-interaction-polish.mjs` checks the Win95 directory on the characters page.
- Measured (headless, fixture): FIT HEIGHT shows the page 533 px tall at 1366x768 and 665 px at 1440x900 (board 4 hoped for about 690 and 850): the header above the windows (board 14), the window frame, the size toolbar and the page row take the rest. Merging the two rows would gain about 40 px (left for Harold). Two playing clips made 3 video requests on load and none during a full 12 s loop.
- Found by the batch's own check: the clock readout on the equipment page was too dim (contrast) and now uses the brighter text shade; in the reader, a small page fitted to the height sat at the zoom ceiling, so pinching in did nothing; the ceiling is now 4x the fitted size when that is larger.
- After pulling this batch, a stale `.next/types` or `.next/dev/types` from an older build can fail `npm run check`'s first step (typecheck) because the project routes moved into a route group; delete those two folders once or run the build first.

**6c/7c (fixes from the independent review of 6b/7b, in the same commit and check):**
- The page title (h1) is the first heading again: the Watcher panel's label is no longer a heading and its section is named by the title; panel heading extensions (".DIR") are not read aloud.
- The idle caption fits at 1366 ("Move over the Watcher; hover a file to preview it.") and follows a CRT-mode or reduced-motion change; a lens sample that went stale while loading is dropped; the motion helper reads the latest visibility entry and stops after cleanup; `[ SYSTEM ]` no longer makes its strip taller.
- Escape during the switch prints "^C cancelled; still at ~" in the homepage terminal.
- Tests: the h1 comes first; verify-home waits for the reverse switch before typing; the Escape case in verify-mode-switch always runs.
- Docs: AGENTS release status says how the batches were really merged (batch 7 before 6's fixes, 6b and 7b as one sub-batch).

## Changed - 2026-10-29 / Batch 6b/7b: fixes from the independent reviews of batches 6 and 7 (fix/batch-6b-review-fixes)

One sub-batch for both reviews (one check run, one commit). Batch 6 items first, then batch 7.

- Homepage panels have real headings again (h2: WATCHER, ACTIVITY, DIRECTORY, TERMINAL, TRANSMISSIONS, SESSION, SIGNAL, CLEARANCE, RECENT FILES), each section labelled by its heading; decorative strip and panel-end labels ("01 | 012", "END. PROGRAM", "TYPE help") are hidden from screen readers.
- Keyboard order runs left to right on desktop: `[ SYSTEM ]` moved from the Watcher panel to the NODE STATUS strip, so the Watcher column (first in the source, for the page title) has no controls.
- "Latest" means latest: the PROJECTS preview lists and names the most recently updated project and counts all public projects (with how many are active); LATEST PAGE comes from the most recently updated project, skips pages this visitor cannot load (no empty image), shows that page's own number, and its thumbnail no longer repeats the link's name. "ARCHIVE INDEX AWAITING FILES" became "NO PUBLIC FILES YET"; the TRANSMISSIONS panel is left out when there is nothing to list; its count reads "LATEST 3".
- Terminal: each printed line keeps a stable key, so the log region never re-reads old lines once the 80-line cap is reached.
- The boot ends once: a second key or click during the collapse, or the boot data arriving then, no longer restarts it or powers the page on twice; the title decode clears its timer before starting again.
- Less work when nothing moves: the static and globe timers start and stop with the panel being on screen, the tab being visible, reduced motion and the CRT mode (`components/home/motion.ts`), instead of polling; the title and caption keep their own state, so their updates no longer re-render the Watcher; the lens samples the image on the first mouse move where it can run, and again after a phosphor switch.
- The idle caption only invites moving over the Watcher where the lens runs (mouse, motion allowed, CRT on); otherwise "Hover or focus a file to preview it."; on touch "Tap a file to open it."
- NEWEST SCHEMATIC tries the next item when the newest one has no video or poster this visitor can load; the spinner follows a live change of the reduced-motion setting; the session clock's `<time>` has a valid duration; the globe's text tolerates a last-digit trigonometry difference between server and browser.
- Text: terminal output, transmissions, caption, tile text and the prompt are 14 px (redesign plan step 1a); directory previews and phase labels stay 12 px as data labels.
- Docs: AGENTS.md release status states only what is true and records Harold's 10-29 order change as an exception in "Delivery"; the redesign plan's current state says the same; comments and features match the code (previews and caption are decoration; the lens is off, not held, under reduced motion; getNewestSchematic serves patron items to entitled patrons).
- Tests (`verify-home.mjs`): panel headings and focus order; the lens waits for its lazy sampling; CRT off hides the static, the lens and its ring; CRT reduced holds the globe too; `crt`, `phosphor` and `sound` commands with the SYSTEM menu following; `cd 6` opens the store window; `open blushland`.
- Not changed (recorded): the old homepage's unused CSS rules stay for now (they are also in the reticle selector list); the boot's power-on plays mostly behind the announcement window (a design question for Harold).
- **Correction to batch 7:** its commit message says the first check's regression "ran past the old 30 min limit after passing". It was stopped inside the site-health self-test, so the self-test had not finished, and six other steps ran on code that changed again before the commit. The full check for this sub-batch covers batch 7's code as committed plus these fixes.
- Switch (batch 7): browser Back or Forward during a run ends it at once (found while testing 6b: Back during the fade let the old run finish on the terminal page); keys are held only while the page is covered, so typing works as soon as the new page shows; Escape during the print cancels the run (nothing opens); an auto-repeat is held back but never skips. Every stage is announced as a `migrainz:mode-stage` event, so the test sees stages too short to paint.
- Taskbar: a navigation landmark only on the desktop (no empty "Taskbar" on terminal pages), with the window buttons as a group inside it instead of a second landmark; "◂ TERMINAL" keeps its space. The window layer's header offset is measured only while the desktop shows and is written on the layer itself, so scrolling terminal pages restyles nothing.
- A "LOADING VOLUME" line also shows during the reduced-motion crossfade, and a hidden status line says "Loading" to screen readers. ◂ TERMINAL keeps the last terminal page's query string. The switch's bright line takes the phosphor colour (amber in amber mode). The prefetch option type no longer comes from a Next internal path.
- Tests (`verify-mode-switch.mjs`): stages recorded from the switch's own events; the Back-during-print case now stays in one document (it used to load a new page, so it tested nothing) and also covers Escape; Back the moment the desktop page arrives, then typing in the terminal at once; one fragile read of the vanishing mount log removed.
- Docs: the batch 7 changelog no longer claims a Win95 hover for desktop controls (they get the Win95 dotted focus and no reticle; hover styling is unchanged).
## Changed - 2026-10-29 / Batch 7: the switch from the terminal to the grey-window desktop (feat/batch-7-mode-switch)

Harold, 2026-10-29: "including the terminal to windows grey transition everytime you go into the grey windows" (design canvas boards 2 and 14). Code-only; no schema, migration, Blob or env change.

- Pages that open a grey window (`/projects` and everything under it, `/comics`, the comic reader, `/archive`) now sit on a muted dark teal Win95 desktop (`#2e4646`) instead of the green terminal: the header stays a dark full-width bar, the page's own text is re-inked for the desktop, and the window dock becomes a Win95 taskbar with `◂ TERMINAL` (back to the last terminal page this tab showed). The look keys on a server-rendered marker, so a direct load never flashes the terminal.
- The switch, every time a link (or the homepage terminal's `cd`/`open`) goes from a terminal page to a grey-window page: the terminal prints `$ open <file>`, `mounting volume ........ ok`, `image data detected`, `switching to graphics mode ...`, collapses to a bright line, the line shrinks, black until the page is there, then the desktop fades in (about 0.9 s plus the server's time; the route is fetched in full at the click so the server works during the animation; after 1.2 s of black a small "LOADING VOLUME" line shows, and after 15 s the cover lifts anyway). Coming back (`◂ TERMINAL`, RETURN TO TERMINAL, browser Back) plays it in reverse; browser Forward is a short flick. Reduced motion or CRT "off": a 160 ms crossfade. A plain key, click or tap skips the forward run; shortcuts (Ctrl/Alt/Meta, function keys) pass through; browser Back during the run ends it (6b/7b). After the reverse, keyboard focus goes to the page's main section.
- Board 14: on the desktop, windows start below the header, so `SYSTEM` stays usable over a maximized window.
- Desktop controls get the Win95 dotted focus, not the terminal reticle; the 404 page carries `data-not-found` so `◂ TERMINAL` never returns to it. The taskbar is a labelled navigation landmark (site health's axe check caught the new link outside any landmark). On the desktop the fixed background layer shows the teal and the screen vignette evenly behind the whole page. The route marker lives in its own file (`components/GraphicsRouteMarker.tsx`) so route windows don't load the switch's router code.
- `npm run check`: the regression step may take up to 50 minutes (it now takes about 30 on a 2-core machine).
- Tests: `scripts/verify-mode-switch.mjs` (regression): the whole forward run twice in a row, the mount log gone on black, teal reaching the bottom of the screen (screen pixel), the window below the header, the SYSTEM menu opening whole over a maximized window, the reverse from `◂ TERMINAL` (keyboard, focus on the page after) and from Back, Forward's flick, nothing between two desktop pages, RETURN TO TERMINAL, a key skipping, a shortcut not swallowed and Back abandoning the run, a direct load with no switch, the crossfade under reduced motion and CRT off, the homepage terminal's `cd`, the route list against the pages' markers on 12 routes, and phone width. `scripts/verify-graphics-mode.ts` (new `npm run check` step): the route list and the printed file names.

## Changed - 2026-10-29 / Batch 6: homepage from design canvas board 23 (feat/batch-6-home)

Harold, 2026-10-29: "ship 23 ... set the signal .Globe to a real world map with the NODE 01 in texas, get rid of the planet behind the watcher but keep the little static in". Code-only; no schema, migration, Blob or env change.

- New first screen in three columns: the directory and a working terminal on the left, the Watcher in the centre with the one-line glowing title `MIGRAINZ ARCHIVE & PROJECTS` over its top edge, node status on the right (transmissions, session clock, signal globe, clearance), then recent files (latest comic page, newest schematic, operations). The directory and the Watcher fit 1366x768 without scrolling. On phones the Watcher and title come first, then the directory and terminal, then the rest.
- The old launcher row (`[ LATEST ]` / `[ SYSTEM ]`), the studio terminal panels and the duplicate panel links are gone; `[ SYSTEM ]` (the pixel monitor) moved into the Watcher panel's title row, and the header gains `PROJECTS · COMICS · ARCHIVE · TRACKER` (hidden on phones). The directory is renumbered: 02 comics/, 03 operations.log, 06 requisitions.exe, 07 patreon.key [LOCKED].
- Text-mode graphics, all decoration hidden from screen readers: sparse static dots behind the Watcher (no planet), a text lens that redraws the Watcher as characters around a mouse pointer, a preview panel with a wipe for the directory row under the mouse or keyboard focus, and the signal globe: a real world map (NOAA GLOBE land mask, embedded, nothing fetched) with NODE 01 pinned on central Texas, swinging slowly over the Americas. They move only with CRT "on" and without reduced motion; CRT "reduced" holds them still and "off" hides the static and the lens.
- Terminal: `help`, `ls` (and `ls projects`), `cd <name|1-7|..>`, `open <project|system>`, `cat info.txt`, `system`, `whoami`, `date`, `echo`, `clear`, `crt on|reduced|off`, `phosphor green|amber`, `sound on|off` (the SYSTEM menu follows), `boot` (replays the boot); Up/Down history, Tab completes a partial name, 16 px input so phones don't zoom.
- Boot (board 17): a big counter and a 20-cell bar driven by the checklist (it holds below 90 until `/boot-status` answers and never goes back), `SIGNAL LOCKED`, then the checklist collapses to a line and the page's `<main>` powers on with its panels rising in turn. Reduced motion and CRT off skip the collapse and power-on.
- Newest schematic: `SchematicSpinner` plays the item's schematic video on one shared 12 s clock (every spinner shows the same angle at the same moment, starting on the right side), pauses off screen, and shows the poster under reduced motion or a data-saver setting. The video is requested only when it comes within 200 px of the screen. New query `getNewestSchematic()` (`overrideAccess: false`: public items, and patron items for entitled patrons).
- Tests: `scripts/verify-home.mjs` (in the regression suite): one-line title, 1366x768 fit, no classified text, static dots only and moving, lens on hover, previews on hover and focus, globe land and pin, schematic tile link, SYSTEM monitor, terminal commands, history and Tab, reduced motion, CRT off and reduced, phone order and no sideways scroll, boot counter never drops and the page powers on. `scripts/verify-home-graphics.ts` (new `npm run check` step `home-graphics`): land mask against known land and sea, the pin drawn on land over Texas, static, image-to-text. `verify.cjs`, `verify-interaction-polish.mjs` and `capture-review-screens.mjs` follow the new menu numbers.
- Found while checking, fixed before the commit: the counter fell from 76 to 66 when the boot data added lines; the power-on class was removed by the first panel's `animationend` (it bubbles), cutting the later panels' rise short; the phone column could grow wider than the screen.

## Changed - 2026-10-28 / Batch 4e: fixes from the independent review of batch 4d (fix/batch-4e-review-fixes)

- **Correction:** batch 4d's commit message cites `test-results/check-20261028-232649.txt` as its check. That run was in the Payload upgrade worktree, not on `main`, so 4d had not passed a full check on `main` when it was committed. The check for this batch covers 4d and 4e together on `main` (see the 4e commit). The 4d mutation log (`test-results/mutation-4d-no-focusout-clear.txt`) was run on `main`.
- Switching to another app and back (the browser window losing and regaining focus) no longer ends the quiet hand-back, so the file's Properties panel doesn't pop open on return; only focus really leaving the element ends it (4d had brought back the 4b bug in that case). Tested by replaying the browser's window-blur events.
- Site health's self-check asserts which rule reports each sample, and matches React's image preload link in any attribute order. The samples come from the `react-dom` in node_modules; Next renders pages with its own bundled React build, so they show the form of React's output, not that exact build (the 4d entry said "React's own server output").

## Changed - 2026-10-28 / Batch 4d: fixes from the independent review of batch 4c (fix/batch-4d-review-fixes)

- Focus handed back by the window manager also stops being "quiet" when focus leaves that element (not only on the next key or pointer press), so coming back to it later is an ordinary focus again.
- `partlyInView` (decides whether a handed-back element needs scrolling into view) measures each scrolling ancestor's inner box, without borders and scrollbars, and treats fixed elements as clipped by the viewport only.
- Tests: site health's hidden-copy check matches attribute names in any case (React writes `srcSet`, `imageSrcSet`, `fetchPriority`), places each `<source>` by its own position, fails if the crawl never reaches `/projects/blushland`, and checks itself on sample HTML rendered by `react-dom` (node_modules; Next bundles its own build), including React's automatic `<link rel="preload">` for eager images (found while writing this: React's server render adds a preload link for eager images, seen in its static output, so a hidden eager image would also be fetched through `<head>`). The Art Viewer test checks the panel stays shut after restore and Escape, and that focus leaving and returning to a handed-back file opens its panel as usual (fails without the fix).
- Docs: features.md (focus return on minimize); the 4c changelog line now says the next Tab lands on the file's own Properties button in the test, and no longer claims an untested sound.

## Changed - 2026-10-28 / Batch 4c: fixes from the independent review of batch 4b (fix/batch-4c-review-fixes)

- Focus handed back by the window manager is quiet only for the element it went to, until the next key or pointer press: the Tab straight after closing the viewer is an ordinary keyboard focus again (in the test it lands on the same file's Properties button, which opens the panel; batch 4b used a 400 ms window for every element).
- Minimizing the Art Viewer hands focus back to the control that opened it (it fell to the page before); restoring it from the dock and closing it returns there again.
- A handed-back element that was scrolled out of view is brought into view (so keyboard focus is visible); one still at least partly in view keeps the reader's place as before.
- Tests: `verify-art-viewer-keys.mjs` case 6b now clips the file at the bottom edge of the window before a mouse open and close (a hand-back that scrolled would move the reader's place), waits for focus on that exact file instead of fixed delays, and adds the next-Tab, minimize and restore, and scrolled-out-of-view cases at 1366 and 390 px. Each of the four fails with its fix removed (logs `test-results/mutation-4c-*.txt`). Site health's hidden-copy check reads every hidden block, fails if `/projects/blushland` has none, also catches video/audio sources and posters, iframes, embeds, SVG images and preload links for hidden files, and checks itself on sample HTML at start.
- Docs: AGENTS.md says the Payload migration is applied only after Preview isolation, with Harold's OK at each step, and that 3.92.1 (prepared) needs his OK over the decided 3.92.0.

## Changed - 2026-10-28 / Batch 4b: fixes from the independent review of batch 4 (fix/batch-4b-review-fixes)

- A malformed `#fragment` (for example `/projects/blushland#%`) no longer breaks the page: the fragment is used as written when it can't be decoded. Found in the review (the batch 4 scroll code threw "URI malformed").
- Keyboard: opening a file with Enter and closing the viewer with Escape returns focus to the file without popping open its Properties panel (focus handed back by the window manager is now quiet for the file too, not only for mouse closes). Found in the review.
- Tests: site health loads `/projects/blushland#%` (no page error) and checks every crawled page's server HTML so the hidden first copy of a route window has only lazy images and no video source (fails on the three fixture pages with images if the guard is removed); `verify-art-viewer-keys.mjs` closes the restored viewer with focus inside it and requires focus on the project window (the old check could pass without moving focus), checks the reader's place on `.project-app-content` (the element that actually scrolls; it asserts the content was scrolled first) and adds the keyboard open/close case at 1366 and 390 px. Each new check was confirmed to fail with its fix removed.
- Roadmap status line: the Payload upgrade is prepared locally only (no Neon or Blob access); its version is confirmed against Vercel's Node during Preview isolation (M4.1).

## Changed - 2026-10-28 / Batch 4: real 404s, Art Viewer tab strip and focus (feat/batch-4-not-found-viewer)

- Missing records return HTTP 404 (roadmap 2.2): a missing project, its character directory, a missing character, equipment item or faction, a character asked for under the wrong project, and REDACTED records all answer 404 with the site's in-world "RECORD NOT FOUND" page (the same page as any unknown address, without the project window) instead of 200. Following a link inside the site to a missing record shows the same page. Done without `proxy.ts`, so no extra Vercel function calls: a route window now renders its content, hidden, until its workspace exists in the browser, so the page really renders on the server and its `notFound()` sets the status. PATRON records keep their 200 locked page. Real records look and behave as before.
- The hidden copy adds about 4 to 16% to those pages' HTML (fixture pages) and loads no images (they load lazily inside it; the visible window fetches each image once). A `#section` address on a full page load now scrolls the window to that section once its content is in place.
- Art Viewer: its tab close buttons and tab titles are at least 24x24 px (WCAG 2.5.8; roadmap 2.7, done on Harold's 2026-10-28 instruction to complete the roadmap); the viewer's title bar is a few pixels taller than other windows'.
- Art Viewer: closing it (Escape or a tab's close button) returns keyboard focus to the control that opened it; if that's gone (or the viewer was restored after a reload), to the topmost other window or the page's main section; closing one of several tabs focuses the tab that becomes active. The hand-back is silent (no second sound) and keeps the reader's place in the window (tested at 390 and 1366 px since batch 4c, with the file clipped at the window's edge). A file's Properties panel now opens on keyboard focus only, so focus returning after a click doesn't pop it open (bugs.md 2026-10-27).
- Patron placeholder buttons are named by their visible text ("PATRON / LOCKED / ... - patron content, access denied"; axe label-content-name-mismatch, found by the new fixture record).
- Tests: the regression fixture has a PATRON character and REDACTED character, equipment and faction with sentinel text; site health requires 404 for the REDACTED and missing records (the 6 soft-404 baseline entries are gone), 200 with the locked page and no protected text for the PATRON one, scans each crawled page's server HTML (not only the hydrated page) and every 404 body for sentinel text, fails if a route window's hidden copy is left after load or an image is fetched twice in one page load, and checks the `#factions` scroll at 390 and 1366 px. `verify-art-viewer-keys.mjs` checks focus return (Escape, close button, restored viewer, stale opener, closing one of several tabs), a file opened and closed by mouse (no Properties panel, no scroll jump; failed before the fix) at 1366 and 390 px, and the 24 px sizes with several long tabs, maximized and at 390 px. `verify-factions.cjs`, `verify.cjs` and `verify-interaction-polish.mjs` wait until a route window's hidden first copy is replaced before measuring (one of them hung on a never-loading hidden image; others could have measured the hidden copy).

## Changed - 2026-10-27 / Batch 3e: fixes from the independent review of batch 3d (fix/batch-3e-review-fixes)

- Eval scan: `Reflect.apply(Function.prototype.toString, ...)` and similar ordinary code no longer count as eval (the pattern needs `eval`/`Function` itself as the argument); more look-alikes in the self-check. When the known AJV entry stops matching (likely after the Payload upgrade), the check now shows what it found instead of only naming the missing entry. The scan also finds `new WebAssembly.Module(...)`, and the section comment lists every form it finds.

## Changed - 2026-10-27 / Batch 3d: fixes from the independent review of batch 3c (fix/batch-3d-review-fixes)

- The build environment moved to `scripts/build-env.mjs` (same values; `scripts/build.mjs` still builds with it locally and on Vercel), so the header check tests the Vercel and local cases directly instead of counting text.
- Policy watch: settling before a close or check is best effort (one round trip per page, at most 3 s, so a stuck page can't hang a run), and the docs say so. The self-test adds a violation followed straight away by closing its context (24 planted problems).
- Eval scan: also `eval?.()`, `(0,Function)()`, `globalThis["eval"]`-style access, `Reflect.apply(eval|Function, ...)` and `WebAssembly.compile/instantiate`; the AJV entry tolerates `$` in minified names, and a known entry that no longer occurs fails (so the list is updated after the Payload upgrade).
- Docs: AGENTS.md and features.md say a plain `npm run dev` still sends Next telemetry until `npx next telemetry disable`; the fixture-env comment says `next dev` still asks npm for Next's latest version.

## Changed - 2026-10-27 / Batch 3c: fixes from the independent review of batch 3b (fix/batch-3c-review-fixes)

- Next.js usage telemetry off for every build (`scripts/build.mjs`, locally and on Vercel; no dashboard change) and every fixture run (`scripts/fixture-env.mjs`). A plain `npm run dev` still sends it until `npx next telemetry disable` is run once on that machine.
- Policy watch (`scripts/policy-watch.cjs`): also matches the hyphenated "Content-Security-Policy" wording; `watchBrowser` returns `check()`, which fails if no context was watched, settles each page before a context closes and before the final check; `verify.cjs` also checks in its boot-only mode. The site-health self-test now runs `watchBrowser` on its own browser with a planted violation, and with nothing watched (23 planted problems).
- `scripts/verify-security-headers.mjs`: the eval scan also finds prefixed string timers, `Function.apply/call`, `Reflect.construct(Function, ...)` and `.constructor("...")`; admin code may only have the eval-like calls listed in `KNOWN_ADMIN_EVAL` (today AJV), so a new one fails; the config probe passes Windows' temp and profile folders; comments say a standalone run reads whatever the last build left.
- Docs: the telemetry entry in bugs.md lists what Payload and Next.js send.

## Changed - 2026-10-27 / Batch 3b: fixes from the independent review of batch 3 (fix/batch-3b-review-fixes)

- Payload telemetry off (`telemetry: false`): Payload no longer posts anonymous usage data to telemetry.payloadcms.com when the server or the admin starts. Found in the review.
- CSP watch for the whole suite: `scripts/policy-watch.cjs` (shared) fails on CSP reports and on CSP / Permissions-Policy console messages; besides site health it now runs in `verify.cjs`, `verify-factions.cjs`, `verify-interaction-polish.mjs` and `verify-art-viewer-keys.mjs`, which open the reader, menus, amber and CRT modes and the Art Viewer that the crawl doesn't.
- Site-health self-test: also expects the CSP console message and a blocked geolocation call (proves the Permissions-Policy header is served and its message is caught); 21 planted problems. Admin list visits wait for a real row link (not "Create new") and for a media thumbnail to load.
- `scripts/verify-security-headers.mjs`: compares every directive and source exactly (a new outside source fails); no longer fails after a checkout just because file times changed (the build is compared by content, and the build time is printed); the eval scan also finds indirect eval, `window/self/globalThis.eval` and string timers, and fails if a known site-only chunk isn't classified as site code; checks Payload's telemetry and avatar from the loaded config.
- Docs: site health needs a fresh fixture each run (it creates a throwaway administrator); wording fixed (the equipment video is requested, not played: the fixture video is a stub); roadmap status line; jsDelivr and Web Worker notes for roadmap 4.6.

## Changed - 2026-10-27 / Batch 3: security headers (feat/batch-3-security-headers)

- Every response now sends `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` and `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`; the `X-Powered-By: Next.js, Payload` header is gone. HSTS stays with Vercel. The Patreon routes under `/auth/` keep `Referrer-Policy: no-referrer` (a config header would otherwise have replaced the routes' own value).
- `Content-Security-Policy-Report-Only` for the site (only this site's own scripts, styles, images, fonts, media and connections; no framing by other sites; no plugins) and a slightly wider one for `/admin` (upload previews, and Payload's JSON field editor from one versioned jsDelivr folder). Report-only blocks nothing: violations appear in the browser console only. No reporting endpoint or service. Development adds `'unsafe-eval'` and `ws:` for React's dev tools and hot reload.
- Payload admin avatar: the built-in icon instead of Gravatar, so admin pages no longer send a hash of the administrator's email to gravatar.com.
- The headers live in `security-headers.mjs`, served by `next.config.mjs`.
- Tests: new `scripts/verify-security-headers.mjs` (a `npm run check` step after the build, now 14 steps): the policies, the config, the production build's routes manifest (final headers for 13 sample paths, admin policy only under `/admin`), the Monaco version Payload loads, and no eval-like calls in the site's production browser code. Site health checks the exact headers on every page load and 13 other responses (API, media, 404, admin, the Patreon redirect, metadata), fails on any CSP report or CSP / Permissions-Policy console message, visits 7 admin pages (first-user page, then logged in as a throwaway administrator in the fixture) and checks that the equipment schematic video is requested with motion allowed. The self-test plants a CSP violation and a response without security headers (19 planted problems).
- Not checked in a browser: the production policy (the fixture runs `next dev`); Monaco (needs jsDelivr, blocked in the offline test browser); the live site (after the push, roadmap 4.6).

## Changed - 2026-10-27 / Batch 2b: fixes from the independent reviews of batches 2 and 1d (fix/batch-2b-review-fixes)

- Link previews use the public site address from `data/site.ts` as their base (`metadataBase`); before, absolute `og:image` URLs relied on Next's fallback, which is localhost unless Vercel exposes its system variables. In development Next always uses localhost for these URLs, so site health checks that the layout sets this base and that Next's own resolver, asked as a production build, returns the live site.
- Only the "[ NEW ]" label blinks between two colours (`--crt-text` / `--crt-mid`, 7.85:1 at its dimmest); the decorative "AWAITING INPUT _" cursor keeps its original fade (batch 2 had changed both). Recorded in docs/redesign-plan.md "Theme".
- From the 1d review: the fixture-env runner test stops a runner that wrongly starts with SIGTERM, then SIGKILL, including every process group it listed, and waits for complete output; comments corrected (browsers are not listed: headless Chrome exits when its Playwright parent dies, checked); the baseline's readme describes the text suffix for bare elements.
- Logged, not changed: Escape on the viewer leaves focus on the page body (pre-existing); the Art Viewer's tab close buttons are under 24 px (roadmap 2.7, needs a slightly taller tab strip); robots.txt lets search engines index artwork files (question for Harold).

## Changed - 2026-10-27 / Batch 1d: fixes from the independent review of batch 1c (chore/batch-1d-review-fixes)

- Site health: accessibility keys are built in the page from the failing element (tag, id, sorted classes, aria-label word; for an element with none of those, its first words of text), so a bare `h2` no longer covers every heading on a page type. Off-site and failed requests are recorded for every page in a browser context (the missing-record checks were missed before).
- Site-health self-test now plants 16 problems (adds: a violation on a bare element, an off-site redirect hop inside the browser, a request that fails without a response); all are reported.
- `npm run check`: a repeated signal within 2 s (one Ctrl+C can arrive twice through npm) is ignored; a later one kills the running step and the process groups the regression runner listed for it; closing the terminal (SIGHUP) stops the run like Ctrl+C. The regression runner ends each step's process group as soon as the step exits, ignores repeated signals while stopping, and handles SIGHUP.
- `verify-fixture-env.mjs`: the planted credential has a unique name (checked absent from `.env*` files) and the runners are started in their own process group with a 20 s limit.

## Changed - 2026-10-27 / Batch 2: audit fixes (fix/batch-2-audit-fixes)

- Headings inside light Win95 windows (FACTIONS, RELATED COMIC CHAPTERS, the character EQUIPMENT section, ASSIGNED CHARACTERS, equipment card titles) are dark instead of pale terminal green (about 1.02:1 before). The ACCESS DENIED window heading is Win95 navy. Dark modules inside windows keep their terminal colours.
- Favicon (`app/(frontend)/icon.svg`, an original green M on near-black), `robots.txt` (allows the site and media; disallows `/admin`, `/api/`, `/auth/`, `/boot-status`), an "Equipment" page title for equipment directories, and link-preview tags (Open Graph and Twitter card) with a 1200x630 card image (`app/(frontend)/opengraph-image.png`, rendered by `scripts/make-og-image.mjs` from the site's own font, palette and Watcher layers). Every page's preview uses the site title.
- Accessibility: the brand link's name is its visible text (was "Home"); the window workspaces are labelled regions (a label on a plain div before); the tracker keeps heading order with a visually hidden "Projects" h2; Win95 window controls sit 4px apart instead of 2px (same 21x19 size; meets the WCAG 2.2 spacing rule); "i" property buttons have a 25x25 hit area around the unchanged 21x21 face; empty-state lines use `--crt-mid` (4.23:1 before); the blinking "[ NEW ]" alternates two readable colours instead of fading to 35% opacity.
- Art Viewer: Escape closes it also after another window took focus. One Escape closes one thing: the file inspector, promo windows, SYSTEM menu, monitor and the announcement take it first; auto-repeat and text fields are ignored. A closed viewer no longer reopens on the next full page load (its tabs are still kept).
- `node scripts/serve-fixture.mjs --stop` no longer crashes when the server has already exited.
- Tests: new `scripts/verify-art-viewer-keys.mjs` (6 cases; cases 2 and 4 failed before the fix), run by the regression suite; site health checks the favicon, robots.txt rules and preview tags; the brand-link locators in `verify.cjs` follow the new name. 78 of the 85 baseline entries are gone; the 7 left wait for roadmap 2.2 (real 404s, needs Harold's decision on `proxy.ts`) and 2.6 (store URL).

## Changed - 2026-10-27 / Batch 1c: fixes from the independent review of batch 1b (chore/batch-1c-review-fixes)

- Site health: accessibility findings are keyed by the failing element itself (tag, id, sorted classes, first word of its aria-label) instead of axe's page-dependent CSS selectors, so adding a card no longer turns into new and stale entries. Unknown baseline sections fail.
- Site health: Chrome now runs with every host except the local server unresolvable and without a proxy, so a same-origin redirect to another site can't load anything; every off-site request is recorded (also redirect hops), and same-origin requests that fail without a response are recorded too.
- Site-health self-test plants 13 problems (adds: a baseline entry without a roadmap reason, classified text in a JSON response, an off-site redirect against a throwaway local server); all are reported.
- `npm run check`: a second Ctrl+C kills the running step at once; after the first, the summary is still written and the log flushed before exiting (exit code 130). The regression runner waits for its steps (dev server, test scripts) to stop, then SIGKILLs their process groups; browsers are closed by the test scripts that started them.
- `verify-fixture-env.mjs` now also runs both fixture runners with a fake credential set and checks they refuse, start nothing, print no value and leave no fixture directory.
- docs/roadmap.md: 1.6 marked done except Harold's Windows run.

## Changed - 2026-10-27 / Batch 1b: fixes from the independent review (chore/batch-1b-review-fixes)

- Site health: accessibility baseline keys now include the route template, so a known finding is only accepted on the page type where it was seen. Entries without a "Roadmap" reason fail. The script's own requests no longer follow redirects to other sites. Classified fixture text is matched in any case and also in JSON and RSC responses the page fetches (in `next dev` there are no link prefetches, so this is mostly the page's own data).
- Site-health self-test now plants one of each problem (broken link, wrong 404, accessibility violation, stale entry, third-party request, classified text, console error, sideways scroll, generic title, failed request) instead of relying on real defects; all ten are reported.
- `npm run check`: on Linux and macOS, Ctrl+C or a timeout stops the running step gracefully (SIGTERM, then SIGKILL after a grace period) so the regression suite can stop its own server; on Windows the step's process tree is ended at once (taskkill). The last lines of a step's output are no longer cut off; a missing git no longer hides the summary.
- AGENTS.md: the independent review runs after each batch commit, before asking for the push (findings never go live first); "no branch is pushed" now says "no branch other than `main`"; `verify-cms.cjs` named as outside `npm run check`; Playwright pinned in the documented commands (also README, docs/CMS.md).
- docs/CMS.md and docs/BLOB-STORAGE.md no longer call the equipment and factions migrations unapplied (pointer to AGENTS.md "Release status").
- `verify-fixture-env.mjs` checks that both fixture runners refuse to start before they start anything.

## Changed - 2026-10-27 / Batch 1: working rules, roadmap, one check command, site-health checks (chore/batch-1-working-rules)

- AGENTS.md now holds every rule; CLAUDE.md only imports it (`@AGENTS.md`). Every CLAUDE.md line moved unchanged except the release status and three wording updates. New sections: Ask Harold first, Delivery (commit per batch; push `main` only with Harold's OK each time; pull requests after Preview isolation), How we work (numbered batches), Reporting. Release status records the `7658101` push and the equipment migration applied on 2026-10-16 (per the equipment release runbook, with Harold's approval). Pointers in the push hook, the reviewer agent and the docs updated.
- docs/roadmap.md: the approved roadmap (M0 decisions recorded).
- `npm run check` (scripts/check-all.mjs): typecheck, build and all 11 test scripts in one run, with `--list` / `--only`, a log in `test-results/check-<time>.txt`, per-step timeouts and a non-zero exit when any step fails or is skipped. `/check-everything` calls it.
- New `scripts/verify-site-health.mjs`, run by `test:regression`: follows every link in the browser and checks status codes, missing-record 404s, page and console errors, requests to other sites, sideways scroll at 390, page titles, classified fixture text, and axe-core accessibility at 390 and 1366. Known findings live in `scripts/site-health-baseline.json` (new ones and stale ones fail). `--self-test` checks that the checker reports planted problems (expanded in batch 1b).
- Safety: the regression suite now uses the same fail-closed environment as the review server (`scripts/fixture-env.mjs`): Blob, Patreon, Vercel and every `.env*` variable blanked, and it refuses to start if anything points at a remote database, storage or credential. Before, it copied the shell environment, so `next dev` could fill those from `.env.local`. Unit checks: `scripts/verify-fixture-env.mjs`.
- The regression runner stops `next dev` with its whole process group on Linux and macOS.
- Test tools pinned and fetched by `npm exec`: Playwright 1.64.1 (was unpinned), axe-core 4.14.0, PGlite 0.5.11. `verify-equipment-migration.mjs` finds PGlite that way and prints SKIPPED (exit 2) instead of crashing without it. The four Playwright scripts that used `channel: 'chrome'` honour `BROWSER_PATH`.
- Docs: bugs.md (stray half-entry removed, two resolved entries moved to Resolved, migration status notes), broken characters in features.md and changelog.md, README (Node versions, checks).

## Changed - 2026-10-26 / CRT glow pass (fix/crt-glow)

- Glow tokens per Harold's values: headings and the hero title (`--crt-glow-head`), menu names, brand and active items (`--crt-glow-ui`), amber links (`--crt-glow-link`; no amber links exist yet), paragraphs (`--crt-glow-body`, CRT "on" only). Amber mode uses the same strengths in amber colours.
- Scanlines .07; the screen vignette is now a radial gradient on the fixed background layer under the content (so it does not dim text); a rounded screen bezel shows in CRT "on" above 480px and never takes clicks.
- Watcher glow (two drop-shadows) baked into the tuned layers as lossless WebP (face ~266KB instead of ~474KB as PNG) on a 1360px canvas (80px padding, checked unclipped). Watcher-only stepped flicker and a rare 2px jitter, CRT "on" only, stopped by reduced motion.
- Fixed: the Win95 promo ad's headline glowed green (it now has no glow). The hero description keeps `--crt-text` (it already computed to it).
- `scripts/verify-interaction-polish.mjs` checks the modes, contexts, bezel, vignette, flicker keyframes and jitter; `scripts/profile-watcher.mjs` runs with CRT on and has a forced-jitter variant; `scripts/compare-watcher-bake.mjs` compares both phosphors against the live filter chain.

## Changed - 2026-10-26 / Security updates without the Payload set (chore/dependency-updates)

- next 16.3.4 -> 16.4.3 and sharp 0.35.4 -> 0.35.5; fast-uri, source-map-js and Blob's undici patched within their ranges. npm audit 26 -> 21. The `dompurify` override moves to `^3.4.17` (audit hygiene only; the copy that runs is bundled in monaco). The zod chain under `@vercel/blob` is accepted (no fixed release). The other 17 need the Payload upgrade, which needs a database migration (see bugs.md).
- `experimental.agentUpgrade: false` in next.config.mjs: Next 16.4 would otherwise stop the first agent-run `next dev` / `next build` after an advisory.
- Boot checklist phase labels no longer double the project slug (`blushland_ch1`, not `blushland_blushland_ch1`), and a 28-character cut never leaves a trailing `_`.

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
