# Studio Migrainz // Public Access Terminal

A Next.js App Router + React + TypeScript site for exploring creative work. Original `index.html` is preserved as a visual reference; the running homepage is `app/(frontend)/page.tsx`.

## Content management

Payload CMS now feeds the terminal frontend. See [CMS setup, editing, migration and production requirements](docs/CMS.md). SQLite is **development only**; public production requires managed PostgreSQL. Open `/admin` after setup to create your administrator.

## Run locally

Requires Node.js 20.9+ and npm. In this directory, using PowerShell:

```powershell
npm.cmd ci
npm.cmd run cms:setup
npm.cmd run cms:types
npm.cmd run cms:importmap
npm.cmd run cms:migrate -- --apply
npm.cmd run dev
```

Open **http://127.0.0.1:3000**. If that port is occupied, use the address printed by Next.js. Keep the terminal running; Ctrl+C stops the server. `npm.cmd` avoids PowerShell restrictions on the npm.ps1 wrapper. Other shells can use `npm`.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd start
```

`start` requires real production PostgreSQL configuration; it intentionally rejects development SQLite. See the CMS guide before deployment.

## Major files

- `app/(frontend)/layout.tsx`: metadata, shared CRT overlay, header, footer and skip link.
- `app/(frontend)/page.tsx`: terminal-only homepage with dedicated route navigation.
- `app/(frontend)/globals.css`: extracted prototype styles and directory, reader and promotional-window extensions.
- `app/projects/`: project index, dynamic directories and character records.
- `app/archive/page.tsx`: relocated archive directory and system activity.
- `app/about/page.tsx`: studio information and external storefront details.
- `app/tracker/page.tsx`: public phases, milestones and production logs.
- `app/comics/`: chapter index and dynamic comic reader route.
- `app/patreon/page.tsx`: clearly unavailable account-connection preview.
- `app/not-found.tsx`: terminal-style missing-record page.
- `components/TerminalHeader.tsx`: live clock and brand.
- `components/Watcher.tsx`, `WatcherArt.tsx`: original SVG and cursor interaction.
- `components/TerminalNav.tsx`, `PromoWindow.tsx`: navigation and mouse/touch/keyboard promotional windows.
- `components/ProjectIndex.tsx`, `ProjectTracker.tsx`: reusable views of public project data.
- `components/Directory.tsx`: shared directory pages and rows.
- `components/ComicReader.tsx`: previous/next controls, page selection, arrow keys and return links.
- `data/projects.ts`: typed projects, characters, chapters, progress, milestones and logs.
- `data/site.ts`: placeholder external store URL.
- `public/comics/blushland/01.svg` through `03.svg`: three public sample comic pages.
- `package.json`, `package-lock.json`: commands and pinned dependencies.
- `tsconfig.json`, `next-env.d.ts`: TypeScript configuration.
- `.gitignore`: excludes build/dependency output, secrets and validation artifacts.
- `scripts/verify.cjs`: browser smoke checks using temporary Playwright tooling.
- `AGENTS.md`, `features.md`, `changelog.md`: migrated workflow, completed features and future work. `bugs.md` has no recorded issues.

## Content workflow

Edit content in `/admin`; do not edit `data/projects.ts` for live changes. That file is now a preserved migration fixture. Publishing updates the frontend on the next request. See [the CMS guide](docs/CMS.md) for chapter uploads, galleries, access controls and safe migration.

Example path: `/` → `/projects` → `/projects/blushland` → `/projects/blushland/characters` → `/projects/blushland/characters/the-observer` → `/comics/blushland/chapter-01` → `/projects/blushland`.

The reader handles previous/next, direct page selection, and arrow keys while focus is inside it. Spread/vertical modes and persistent reading positions are future work. SHOP/Patreon open on mouse hover or trigger activation. Escape, close, pointer departure, focus departure or outside taps dismiss them. Only the inner action navigates.

Replace `shopUrl` in `data/site.ts` when the real storefront is ready and remove the placeholder flag to update its labels. Commerce stays external.

## Future membership access

No OAuth, membership verification, private content or fake unlocks exist. `public/` and frontend data contain public files only. Future restrictions require private storage and server-side membership authorization on every protected request, including image delivery. Never put restricted files in public assets or client components.

## Browser checks

With the development server running and Chrome installed at its default Windows path:

```powershell
npm.cmd exec --yes --package=playwright -- node scripts/verify.cjs
```

Playwright is temporary tooling, not an application dependency. Override `BROWSER_PATH` or `BASE_URL` if needed. Screenshots go to ignored `test-results/`.
