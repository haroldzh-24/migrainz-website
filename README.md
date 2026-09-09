# Studio Migrainz // Public Access Terminal

A Next.js App Router + React + TypeScript site for exploring creative work. Original `index.html` is preserved as a visual reference; the running homepage is `app/page.tsx`.

## Run locally

Requires Node.js 20.9+ and npm. In this directory, using PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:3000**. If that port is occupied, use the address printed by Next.js. Keep the terminal running; Ctrl+C stops the server. `npm.cmd` avoids PowerShell restrictions on the npm.ps1 wrapper. Other shells can use `npm`.

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd start
```

`start` serves the production build. Stop development first if using the same port.

## Major files

- `app/layout.tsx`: metadata, shared CRT overlay, header, footer and skip link.
- `app/page.tsx`: terminal-only homepage with dedicated route navigation.
- `app/globals.css`: extracted prototype styles and directory, reader and promotional-window extensions.
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

Add a record to `projects` in `data/projects.ts` to get an index entry and directory without copying pages. Slugs must be unique within their parent. Percentages must be 0–100. Character `chapterSlugs` must match chapters within that project. Comic pages use ordered public URLs and descriptive alt text. All current content and tracker values are demonstration data.

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
