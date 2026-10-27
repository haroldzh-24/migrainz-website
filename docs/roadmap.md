# Roadmap: migrainz-website

Proposed 2026-10-26 after an audit (claude.ai Project doc `claude/project-audit-2026-10-26.md`); approved by Harold 2026-10-27. **Status (2026-10-27): M1 built (batches 1, 1b, 1c); M2 built except 2.2 (waiting for Harold's decision on `proxy.ts`) and 2.6 (waiting for the store URL). Committed locally, not pushed yet.**

This file is the repo copy; the Project copy (`claude/roadmap-<date>.md`) is kept in sync. Each item is ticked with its batch and commit when done. docs/redesign-plan.md stays the source of truth for design decisions and for Harold's agreed order of production work (Preview isolation, then the Payload upgrade, then the phase 2 plan); this roadmap fits the code-only batches around that order and gets Harold's OK where it changes it.

**Lanes.** *Code-only* = repo changes tested on the local fixture; after a plan review I work through these batch after batch. *Production* = anything touching Vercel, Neon, Blob, env vars, DNS, deploys, repo settings or money; every step needs Harold's OK. **Every push to `main` is a live deploy and needs Harold's OK each time, before and after Preview isolation.** The repo's push hook only runs when Claude Code opens the repo as its project, so this is a written rule, not just tooling.

**Every batch:** the reviewer agent checks the batch plan first (AGENTS.md "Two lanes"); tests added where possible; typecheck, full check set and build pass; changed pages opened at 390 and 1366; changelog.md, bugs.md, features.md and docs/roadmap.md updated; after the commit and before the push, a fresh agent reviews it read-only and real findings become sub-batch "Nb"; the Project status doc is updated.

---

## M0 — Decisions (Harold)

| # | Item | Done when |
|---|---|---|
| 0.1 | **Delivery.** Recommended: I commit each batch; `main` is pushed only with Harold's OK per push. After Preview isolation: one branch + pull request per batch with a preview link; Harold merges (or OKs each merge), since merging deploys. | Done 2026-10-27: recommended option chosen; in AGENTS.md "Delivery". |
| 0.2 | Your local clone: unpushed commits, branches, `stash@{0}`. | Open: Harold said there may be unpushed work; checked before the first push. |
| 0.3 | OK to move every rule from CLAUDE.md into AGENTS.md and make CLAUDE.md just `@AGENTS.md`. | Done 2026-10-27: yes (Harold's original instructions). |
| 0.4 | Order: may code-only batches M1–M3 be built (and shipped with Harold's per-push OK) before Preview isolation and the Payload upgrade, or should they wait? | Done 2026-10-27: yes, ship as ready (per-push OK); recorded in docs/redesign-plan.md "Current state". |
| 0.5 | CLAUDE.md says the equipment migration's production status is "NOT verified"; the Project runbook records it applied on 2026-10-16. OK to update that safety line to match the runbook? | Done 2026-10-27: yes; AGENTS.md "Release status" updated. |
| 0.6 | Public repo: keep public, make private, or move the sensitive ops notes out. Either way they stay in public history and existing clones unless history is rewritten (destructive, separate approval). | Open; Harold decides; done in M4.3. |
| 0.7 | OK to add GitHub Actions CI later (free for public repos; a new service). | Open (yes/no); done in M4.4. |
| 0.8 | The real store URL, if it exists yet. | Open: Harold gives it, or the placeholder stays. |

## M1 — Batch 1: working rules, docs, test harness (code-only)

| # | Item | Done when |
|---|---|---|
| 1.1 | AGENTS.md holds everything: current conventions, all CLAUDE.md safety rules, two lanes, release status, plus the new working rules (batches, plan review, test-before-commit, browser evidence, doc upkeep, post-commit review agent, status doc, ASK ME FIRST, per-push OK). CLAUDE.md = `@AGENTS.md`. `.claude/settings.json` and the push hook's behaviour unchanged. | CLAUDE.md is one line; the reviewer confirms every old CLAUDE.md rule appears in AGENTS.md; references to CLAUDE.md sections updated (push-hook message, reviewer agent, docs/preview-isolation.md, docs/redesign-plan.md, docs/deploy-checklist-crt.md); hook test still 27/27. **Done** batch 1 `98cc224`; line check in the batch 1 report; reviewer found no rule lost. |
| 1.2 | docs/roadmap.md created (this file). | Repo and Project copies match. **Done** batch 1; Project copy `claude/roadmap-2026-10-27.md`. |
| 1.3 | Docs clean-up: stray half-entry and two resolved entries under Open in bugs.md; broken characters in features.md; README (Node version, bugs.md line, test command on Linux); CLAUDE.md release status records the `7658101` push. Equipment-migration line only if M0.5 = yes. | Each fixed line visible in the diff; no other content changed. **Done** batch 1, plus stale migration notes in docs/CMS.md and docs/BLOB-STORAGE.md in 1b. |
| 1.4 | New `scripts/verify-site-health.mjs`, run by `test:regression`: follows every link in the browser from the main pages (project windows render theirs after hydration) and fails on a broken internal link, a missing route template, a wrong status code (expected 404s listed), a page or console error, a request to another site, sideways scroll at 390, a generic title, classified fixture text in a page, or a *new* axe-core violation (WCAG 2.2 AA + best practice); known findings sit in `scripts/site-health-baseline.json` with reasons, and stale entries fail too. `--self-test` (also run by the suite) plants a broken link, a wrong 404, a missing and a stale baseline entry and passes only if all four are reported. axe-core and Playwright are fetched pinned by `npm exec`; no app dependency. | Regression runs both; the self-test shows the failures being caught. **Done** batches 1, 1b, 1c (per-page-type, per-element baseline keys; 13 planted problems in the self-test). |
| 1.5 | `verify-equipment-migration.mjs` runs from a fresh clone: `npm run check` fetches PGlite (pinned) like Playwright; without it the script prints SKIPPED and exits 2, which counts as a failure (no app dependency). | Passes under `npm run check`; prints the skip and fails the run without PGlite. **Done** batch 1; SKIPPED path shown failing `npm run check -- --only fixture-env,migration` (exit 1) without PGlite. |
| 1.6 | One check set: `npm run check` runs typecheck, build and every test script (13 steps, `--list`, `--only`), keeps going after a failure, saves a log and exits non-zero on any failure; `/check-everything` calls it. Windows and Linux (`BROWSER_PATH` documented). Fixture runs use one fail-closed environment (`scripts/fixture-env.mjs`) so no Blob, Patreon or Vercel credentials can reach them. | Passes here; fails when one step fails; Harold runs it once on his PC. **Done except the Windows run** (batches 1, 1b, 1c). Open: Harold runs it once on his PC. |

## M2 — Batch 2: audit fixes (code-only)

| # | Item | Done when |
|---|---|---|
| 2.1 | FACTIONS heading readable inside light windows. | axe contrast clean on the project page; screenshot at 390 and 1366. **Done** batch 2: all light-window headings, plus the ACCESS DENIED window. |
| 2.2 | Missing records return HTTP 404 (project, character, equipment, faction, wrong project), keeping the in-world page. | Test asserts 404 for each case and 200 for real records. **Waiting for Harold:** the fix needs `proxy.ts` (one small Vercel invocation per /projects request). Cause and design in bugs.md. |
| 2.3 | Favicon, robots.txt, page title for equipment directories, basic Open Graph tags (title, description, image). Sitemap only if Harold wants one. | Fixture serves them; tests check each. **Done** batch 2 (no sitemap); site health checks each. |
| 2.4 | Accessibility: brand link name includes "MIGRAINZ"; no `aria-label` on a plain div; tracker heading order; 24 px hit area for Win95 window buttons and "i" buttons without changing how they look; "AWAITING FILES" and cursor contrast. | No serious axe violations left in the baseline (or each remaining one has a written reason); screenshots unchanged except the fixes. **Done** batch 2. Deviation: Win95 window controls keep 21x19 and get 4px spacing (WCAG 2.5.8 spacing rule) instead of a 24px box, which would make titlebars taller; the "i" buttons have a real 25x25 hit area. Cursor contrast: the blinking "[ NEW ]" alternates two readable colours. |
| 2.5 | Art Viewer: Escape closes it after focus has moved to another window (bugs.md 10-22). | A test reproduces the bug first, then passes. **Done** batch 2 (also: a closed viewer no longer reopens on reload). |
| 2.6 | Store link: real URL if given (M0.8). | No example.com link in the build. **Waiting for Harold:** needs the real store URL. |

## M3 — Batch 3: security headers (code-only; live check is production lane)

| # | Item | Done when |
|---|---|---|
| 3.1 | Add X-Content-Type-Options, Referrer-Policy, frame-ancestors / X-Frame-Options, Permissions-Policy; turn off `x-powered-by`. | Test checks headers on fixture pages, `/api` and `/admin`; regression passes; admin login page still loads. |
| 3.2 | Content-Security-Policy drafted as report-only and checked in the regression suite by reading browser console violations (no reporting endpoint or service). Turning it on live, and later enforcing it, are separate production-lane steps. | Report-only header present on the fixture; zero violations across the suite, including `/admin`. |

## M4 — Production lane (each step needs Harold's OK)

| # | Item | Done when |
|---|---|---|
| 4.1 | **Preview isolation**, docs/preview-isolation.md in its own order: 1 inventory, 2 Neon branch per preview, 3 separate Blob store/token, 4 separate Payload secret, 6 verify scoping, 5 remove old previews (all 10), 7 test preview. Note Vercel's Node version at step 1. The push-hook change after step 7 is a `.claude` change Harold makes or approves visibly. | Step 7 passes: a test preview uses its own DB branch and Blob store; production unaffected. |
| 4.2 | **Payload upgrade** to 3.92.0 (or 3.91.0 if Vercel's Node is older), with the migration routine (backup, tested restore, rehearsal on a Neon copy, apply, deploy); remove `@payloadcms/storage-s3`. Harold's PC's Node 24.20.0 must be updated for 3.92. | npm audit shows no Payload critical/high entries; live post-deploy checklist passes. |
| 4.3 | Repo visibility / sensitive notes, as decided in M0.6. | Done as decided. |
| 4.4 | GitHub Actions: typecheck + build + regression on every pull request (if M0.7 = yes). | A pull request shows a green check. |
| 4.5 | Patreon sign-in live (when Harold wants it): env vars, redirect URI, plus a short privacy note page. | Sign-in works on live with a test patron; privacy page linked in the footer. |
| 4.6 | Security headers and CSP report-only live, then CSP enforced after a clean period. | Live headers checked after deploy; no console violations on key pages. |

## M5 — Redesign phase 2 (design lane; plan first, Harold's approval)

Per docs/redesign-plan.md: terminal ↔ desktop mode switch, window-vs-page rule, page templates, new homepage (menu bar, directory-listing menu, Watcher with orbiting windows, Transmissions and clearance panels, one navigation, 1366x768 fit, phone tab bar), comic reader sizing (fit to height on desktop, clearer zoom on phones), phone windows to the bottom edge.

Done when: the phase 2 plan is approved, built, reviewed, checked by Harold on the review server and phone, and shipped; everything in the redesign plan's "Decided" sections met.

## M6 — Phase 3 system files, then backlog

Locked content with clearance tags and reveal, Patreon perks and shop as files, hidden archive files with a wallpaper kit; then the redesign backlog (Watcher moods, Ctrl+K, in-world 404, comic resume, etc.). Each gets its own "done when" when planned.

---

**Order:** M0 → M1 → M2 → M3 in the code-only lane, with shipping timed by M0.4 (ship as ready); M4.1 whenever Harold can sit at the Vercel and Neon dashboards; M4.2 right after it; then M5.
