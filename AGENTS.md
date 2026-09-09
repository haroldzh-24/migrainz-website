# AGENTS.md

Studio Migrainz is a Next.js App Router + React + TypeScript website for exploring artwork, projects, comics and production archives. It is not a job-seeking portfolio.

## Working conventions

- Check bugs.md and features.md before editing or planning. Remind the user about unresolved bugs or planned features older than one month.
- Update features.md and changelog.md as features are implemented.
- Preserve Git history and the original index.html visual reference.
- Keep changes focused and avoid unnecessary dependencies.

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
- Reuse CSS custom properties and established styles. Avoid generic portfolios, SaaS dashboards, excessive neon and hacker styling.
- SHOP and Patreon intentionally use cheap Windows 95/98 promotional windows. Triggers open windows; inner actions navigate.
- Preserve homepage IDs: top, projects, tracker, archive, shop, about.
- Respect reduced motion, keyboard access, visible focus and touch/mobile behavior. Clean up timers and listeners.
- Commerce stays external. Do not reintroduce a cart, checkout or payment system.
- Patreon authentication is a future phase. Never implement fake access control or put restricted files in public assets/client data. Future protected content needs private storage and server-side authorization on every request.

## Validation

- Run npm.cmd run typecheck and npm.cmd run build for TypeScript and production compilation.
- npm.cmd run dev starts http://127.0.0.1:3000 (or the next free port printed in the terminal).
- Check the complete BLUSHLAND path, reader boundaries, popup hover/keyboard/touch behavior, mobile widths and reduced motion.
- Optional browser checks: npm.cmd exec --yes --package=playwright -- node scripts/verify.cjs while the server runs. See README.md.
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
