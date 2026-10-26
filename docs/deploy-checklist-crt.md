# Deploy checklist: CRT restyle (prepared 2026-10-25)

Prepared before asking for approval to push `main`. Nothing here has been run against production. Pushing `main` deploys production; there is no isolated Preview yet (see docs/redesign-plan.md "Workflow setup").

## What ships (`origin/main` 88913ea to local `main`)

- The CRT restyle: theme tokens, IBM Plex Mono, effects toggle, text-size floor, phone header, shop ad rules, baked Watcher PNGs (`public/images/watcher/*.crt.png`), focus-ring fix.
- The unpushed laptop fit (`3611c0e` / `46b5caf`): equipment item page fits laptop windows, poster cards on faction pages.
- CLAUDE.md, docs and scripts (review fixture server, screenshot and bake scripts).
- No database schema, migration, collection, Blob or env change. The only server-side code change is `lib/content/queries.ts` (read-only listing `select` and poster fallback for equipment cards). `npm run build` does not migrate.

## Before pushing

- [ ] Harold gives explicit approval to push `main` (CLAUDE.md: a push deploys production).
- [ ] Local checks on the merge commit: typecheck, build, `test:regression`, `verify-equipment-navigation.mjs`, `verify-equipment-browser.mjs` all pass (all simulated, headless Chrome).
- [ ] Note the current production deployment in Vercel (the rollback target).

## After deploy: pages return 200

Use GET against https://migrainzxxl.com.

- [ ] `/`
- [ ] `/projects`
- [ ] `/comics`
- [ ] `/archive`
- [ ] `/tracker`
- [ ] `/projects/blushland`
- [ ] `/projects/blushland/equipment`
- [ ] `/projects/blushland/equipment/mp510mmcc`
- [ ] `/comics/rat-city-blues-one-shot/oneshot`
- [ ] `mp510mmcc` (the MP5 10mm item; confirm the exact path from the live equipment list)

## After deploy: media

Use GET, never HEAD: HEAD returns 404 on this route even for files that exist. If everything returns 404, the check has failed (wrong URL or a real problem); do not read it as "restricted files are protected".

- [ ] A public media file, with a Range header, returns 206: `curl -s -o /dev/null -w "%{http_code}\n" -H "Range: bytes=0-99" "https://migrainzxxl.com/api/media/file/colt9mm-poster-400x200.webp"`.
- [ ] A restricted file returns 404. NOT RUN: there is no known restricted test file yet, and no path is guessed.
- [ ] No Blob URL (`*.blob.vercel-storage.com`) appears in any page source or network request.

## After deploy: visual (simulated checks do not cover these)

- [ ] CRT toggle cycles ON / REDUCED / OFF and the choice survives a reload.
- [ ] Watcher on desktop: tracks the pointer; no stutter on the Macs from the earlier report.
- [ ] Watcher on a phone: touch scrolling still works across the Watcher.
- [ ] Phone header is one line (`MIGRAINZ`, clock, SND, CRT); nav text is 16px.
- [ ] Shop ad: appears once per visit on hover, not over the splash; on a phone SHOP and PATREON open as small cards with a visible close button.
- [ ] A schematic page (the poster/video panel and spec table).
- [ ] Art Viewer, including a poster fallback.
- [ ] Comic reader on desktop and phone.
- [ ] After clicking ENTER on the splash there is no outline around the whole page.

## Rollback

Promote the previous production deployment in Vercel (instant; no database change is involved). Then fix forward on a branch.

## After the checklist

- [ ] Report observed results (separate what was checked on the live site from what was only simulated).
- [ ] Update `bugs.md` and docs/redesign-plan.md "Current state".
