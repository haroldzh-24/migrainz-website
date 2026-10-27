# AGENTS.md

Studio Migrainz is a Next.js App Router + React + TypeScript website for exploring artwork, projects, comics and production archives. It is not a job-seeking portfolio.

This file holds every rule for working on this repo, for any agent (Claude Code, Codex) and for people. CLAUDE.md only imports it (`@AGENTS.md`). Everything CLAUDE.md held until 2026-10-27 is here.

## Production safety: never without explicit approval in the current conversation
- Connecting to, querying, migrating or writing the production database (Neon `migrainz-db`, branch `main`), even read-only.
- `payload migrate`, `migrate:fresh|reset|refresh`, `push: true`, or any migration `down`.
- Reading, writing, copying or deleting objects in the private Blob store `migrainz-media`, or running `scripts/recover-blob-media.mjs --apply`.
- Pushing any branch (a push creates a Vercel Preview deployment), pushing to `main`, deploying/promoting, or changing Vercel/Neon settings or env vars.
- Printing, copying or committing `.env*` values. Refer to variables by name only.
- Starting the dev server against the existing local SQLite database after a schema change (dev schema sync writes on startup; see bugs.md). Use isolated fixtures under `test-results/`.
- Rewriting Git history, deleting branches or dropping stashes.

The Vercel build command is `npm run build` and must not run migrations. Migrations are applied manually: back up, rehearse on a Neon branch copy, then apply.

## Ask Harold first
- Before the first push from a new clone or session: check that Harold's own clone has no unpushed work that would diverge, and follow "Delivery" below.
- Anything destructive or hard to undo: deleting files or branches, rewriting history, force-pushing.
- Any change to hosting, deploy settings, domain/DNS, environment variables or secrets.
- Anything that costs money, and any new third-party service, analytics or tracker.
- Health information: the site gives none today. If it ever does, every medical statement needs a reputable source listed in docs/sources.md, nothing may read as personal medical advice, and new health content is published only with Harold's approval.

## Delivery (Harold, 2026-10-27)
- Each batch is built on a local branch off `main`, checked, committed, then merged into local `main` with `--no-ff`.
- Pushing `main` deploys production within about a minute. Push `main` only after Harold's explicit OK for that push, every time.
- Until Preview isolation is done (docs/preview-isolation.md), no other branch is pushed.
- After Preview isolation: one branch and pull request per batch, with a preview link. Merging deploys, so Harold merges or OKs each merge.
- The code-only batches M1–M3 in docs/roadmap.md may ship before Preview isolation and the Payload upgrade. The Payload upgrade still comes after Preview isolation and before phase 2.

## How we work: numbered batches
- Start of a session: read the newest `claude/status-*.md` and `claude/roadmap-*.md` in the claude.ai Project (sessions bound to it) or docs/roadmap.md, and continue from the next unfinished roadmap item.
- Each batch is one focused set of roadmap items. Before building, the `reviewer` subagent checks the batch plan (see "Two lanes").
- Every fix or feature gets a test where possible.
- Before every commit: `npm run check` passes (typecheck, production build, full test suite; log in `test-results/`), and the changed pages are opened in a browser at phone (~390px) and desktop (1366px) width. Never call something fixed without that evidence.
- Each batch updates changelog.md, bugs.md, features.md and docs/roadmap.md.
- Commit message: `Batch N: <short summary>` plus a short list of what changed.
- After each batch commit, before asking Harold for the push (so findings never go live first): a separate agent that has not seen the work reviews the commit read-only. Check every finding yourself; fix the real ones as the next sub-batch (`Nb`) with tests. Anything pushed without that review gets it right after the push.
- After each batch: update the Project status doc `claude/status-<date>.md` (latest commit and test count; commits by batch; behaviour changes; what to check by hand; open items only Harold can do; known limitations) and keep the Project roadmap copy in sync with docs/roadmap.md.
- Keep going batch after batch without waiting, except for "Ask Harold first" items and production-lane steps.

## Reporting
- Plain language, short: what changed, test results, what was checked in the browser and what could not be.
- Separate what was verified from what is guessed, and simulated checks (headless browser, fixtures) from real-device or live checks.
- When blocked, say exactly what is needed from Harold.

## Release status (update when it changes)
- The Equipment expansion (`feature/equipment-schematics-assignments`) is live, and its migration `20261015_080148_equipment_schematics_assignments` was applied to production by hand on 2026-10-16, after a backup, a tested restore and a rehearsal on a Neon copy (equipment release runbook, a claude.ai Project doc; recorded here with Harold's approval, 2026-10-27). Re-check the production `payload_migrations` ledger before the next migration; that backup and rehearsal do not carry over to the Payload upgrade.
- 2026-10-25: `main` (`10b1ddf`) was pushed with Harold's approval and production served it about 36 s later: the CRT restyle, the laptop fit and faction poster cards, and the docs. No schema, migration, Blob or env change. Pushing `main` deploys production; it needs explicit approval every time.
- `feature/crt-readability` is merged (local branch only, never pushed).
- 2026-10-25 ~23:30 CT: `main` (`f718830`, merge of `feature/interaction-polish`, phase 1) was pushed with Harold's approval; production served it ~47 s later. It also carried the workflow-setup commits (`.claude` settings, push hook, reviewer, docs). Adds the `/boot-status` route handler; no schema, migration, Blob or env change. Rollback target: the `10b1ddf` deployment.
- 2026-10-26: `main` (`086c592`, merge of `chore/dependency-updates`) was pushed with Harold's approval; production served it ~56 s later (live client reports Next 16.4.3). Next 16.3.4 -> 16.4.3 security update, patched packages, boot label fix, `experimental.agentUpgrade: false`. No schema, migration, Blob or env change. Rollback target: the `f718830` deployment. The docs commits after `086c592` went out with the next push.
- 2026-10-26 11:14 UTC: `main` (`7658101`, merge of `fix/crt-glow`, the CRT glow pass) was pushed; GitHub's deployment record shows the Production deployment succeeding 39 s later. No schema, migration, Blob or env change. Rollback target: the `086c592` deployment. Live checks (read-only audit, 2026-10-26): 37 public pages 200, the live CSS has the glow rules, the `mp510mmcc` schematic plays, no page errors; real devices not checked.
- Payload is still 3.88 with open advisories. Decided (Harold, 2026-10-26): upgrade after Preview isolation and before phase 2, as production-lane work with the equipment-migration steps (backup, tested restore, rehearsal on a Neon copy, apply, deploy); target 3.92.0 if Vercel's Node is >=24.22.1, otherwise 3.91.0; remove `@payloadcms/storage-s3` in that branch. Details: bugs.md "Upstream CMS dependency advisories".
- There is no isolated Preview yet (a push creates a Vercel Preview built with production credentials), so no branch other than `main` is pushed (and `main` only with Harold's OK). Preview isolation is listed in docs/redesign-plan.md "Workflow setup".
- Blockers before any further production schema work: production `payload_migrations` ledger and schema verified; Neon and Blob backups taken; restore tested in isolation; Preview confirmed on a separate DB branch; pending migrations rehearsed against a production copy.
- The review server (`node scripts/serve-fixture.mjs`) runs in dev mode on a throwaway SQLite fixture; production builds on SQLite are refused by design.

## Commands (PowerShell: use npm.cmd)
- `npm.cmd run check`: everything below in one run (typecheck, build, the isolated checks, the regression suite with the site-health crawl, and the browser verify scripts; not `scripts/verify-cms.cjs`, which needs a database with no administrator, see docs/CMS.md); keeps going after a failure, saves `test-results/check-<time>.txt` and exits non-zero if any step failed. `npm.cmd run check -- --list` shows the steps, `--only <step,...>` runs some of them. Stop the review server first.
- `npm.cmd run typecheck` and `npm.cmd run build` (offline build; does not prove DB or migration state)
- `npm.cmd run test:regression` (fresh private SQLite fixture plus Playwright; stop the dev server first)
- Isolated checks that never load `.env.local`: `node --import tsx scripts/verify-equipment.ts`, `node --import tsx scripts/check-blob-storage.mjs`, `node --import tsx scripts/verify-equipment-migration.mjs`, `node scripts/verify-equipment-browser.mjs`
- Browser scripts use Chrome: `BROWSER_PATH` overrides the default Windows path (needed on Linux and macOS). Playwright, axe-core and PGlite are test tools fetched by `npm exec` at pinned versions (see package.json), not app dependencies.

## Architecture invariants
- Payload 3.88 packages are pinned together; upgrade them only as a set.
- PostgreSQL migrations are hand-reviewed, additive, registered in `migrations/postgres/index.ts`, with no automatic destructive `down`. Regenerate `payload-types.ts` after schema changes.
- Listing visibility is never authorization. Full-content queries are server-only with `overrideAccess: false`; only allowlisted placeholder projections bypass access.
- Media bytes are served only via `/api/media/file/...` after `mediaRead`. No public Blob URLs, signed links or client tokens. Protected originals never enter fallback candidates.
- `Characters.equipmentAssignments` is the only source of equipment assignments; equipment pages derive the reverse.

## Two lanes
- **Code-only lane** (UI, styling, components, docs, scripts, fixtures, local tests): get one plan review (the `reviewer` subagent checks the plan against this file and docs/redesign-plan.md), then work and report at the end. Do not stop for approval on reversible, repo-only choices.
- **Production lane** (database, Blob, Vercel, Neon, pushes, deploys, env vars, anything that reads production data): keep stop-and-approve. Every step needs Harold's explicit approval in the current conversation (see "Production safety").
- A change that starts in the first lane and needs the second (for example a schema change, or any push) stops at that point and asks.

## Working style
- Check bugs.md and features.md before editing or planning. Remind the user about unresolved bugs or planned features older than one month.
- Update features.md and changelog.md as features are implemented.
- Preserve Git history and the original index.html visual reference.
- Keep changes focused and avoid unnecessary dependencies.
- One local branch per batch off `main`; one commit per batch, or a few focused ones. docs/redesign-plan.md is the source of truth for design decisions and docs/roadmap.md for the order of work; keep both current.
- Update features.md and changelog.md; log bugs in bugs.md with evidence and status.
- Report validation honestly: separate simulated/synthetic checks from real-device or live checks.
- Batch questions. For code-only, reversible choices pick the recommended option, note it in the report and continue. Stop only for production, data or design-direction questions.
- Before showing work to Harold, run the `reviewer` subagent (fresh context) on the diff and screenshots, fix what is clearly in scope and list the rest. `/check-everything` runs `npm run check` and saves the output.
- Model choice: Opus 5.5 with higher effort for audits, planning and production steps; Sonnet 5.5 at medium effort for executing a clear plan. Raise effort if work skips files, skips tests or stops partway.

## Project Claude Code settings
`.claude/settings.json` denies `payload migrate` and `migrate:*`, `vercel`, `neonctl`, the Blob recovery script, the `cms:*` scripts that load `.env.local`, and reading `.env*`; it allows the individual check scripts and basic git (not `npm run check`, which asks). Pushes are handled by the hook `.claude/hooks/guard-git-push.mjs` (tested by `node .claude/hooks/guard-git-push.test.mjs`): `git push origin main` (exactly, no flags) asks Harold every time; every other push (force, any other branch, deletes, refspecs, bare `git push`, chained forms) is denied until Preview isolation is done. Deny beats ask in Claude Code, so settings.json holds no blanket push deny; it holds the ask rule plus narrow denies (force, delete, mirror, refspec) that cannot match the exact command. These rules block Claude's own tool calls only. They do not stop a script from reading `.env*` itself, so the safety rules above still apply to every command. Pushing, deploying and Vercel or Neon changes are done by Harold, or by Claude only after explicit approval and a temporary, visible change to these rules.
- The settings and the hook load only when Claude Code runs with this repo as its project folder; a session started elsewhere (for example a cloud session) may run without them. The written rules in this file apply either way.

## Project shape

- app/(frontend)/page.tsx is the terminal homepage; app/(frontend)/globals.css contains the original visual system and application extensions.
- app/(frontend)/ contains public routes; app/(payload)/ contains the isolated CMS admin/API. SQLite is DEVELOPMENT ONLY; production requires managed PostgreSQL.
- Keep listing metadata visibility separate from actual content/file authorization.
- app/ contains routes; components/ contains reusable UI and isolated client interactions.
- Payload collections/ and lib/content/ define live content and server-only queries. data/projects.ts is a preserved migration fixture, not live data. Read docs/CMS.md before changing CMS behavior.
- data/site.ts holds the external store destination and placeholder flag.
- public/ contains public assets only.
- index.html is a preserved prototype, not the running application source.

## UI expectations

- Preserve near-black/phosphor-green colors, monospace text, directory structure, timestamps, subtle CRT and face/scanner/clock details.
- The CRT glow pass (Harold, 2026-10-26: stronger glow, vignette, screen bezel, Watcher flicker and jitter in CRT "on") is deliberate; its values are in docs/redesign-plan.md "Theme". Do not tone it back toward "subtle" without Harold's approval.
- Reuse CSS custom properties and established styles. Avoid generic portfolios, SaaS dashboards, excessive neon and hacker styling.
- SHOP and Patreon intentionally use cheap Windows 95/98 promotional windows. Triggers open windows; inner actions navigate.
- Preserve homepage IDs: top, projects, tracker, archive, shop, about.
- Respect reduced motion, keyboard access, visible focus and touch/mobile behavior. Clean up timers and listeners.
- Commerce stays external. Do not reintroduce a cart, checkout or payment system.
- Patreon authentication is a future phase. Never implement fake access control or put restricted files in public assets/client data. Future protected content needs private storage and server-side authorization on every request.

## Validation

- Run npm.cmd run typecheck and npm.cmd run build for TypeScript and production compilation; `npm.cmd run check` runs everything.
- npm.cmd run dev starts http://127.0.0.1:3000 (or the next free port printed in the terminal).
- Check the complete BLUSHLAND path, reader boundaries, popup hover/keyboard/touch behavior, mobile widths and reduced motion.
- Optional browser checks: npm.cmd exec --yes --package=playwright@1.64.1 -- node scripts/verify.cjs while the server runs. See README.md.
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
