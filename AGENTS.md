# AGENTS.md

This repository is a static single-page website for MIGRAINZ // PUBLIC ACCESS TERMINAL. The main editable experience is in `index.html`, which includes the markup, styling, and client-side JavaScript in one place.

## Project shape

- `index.html` is the primary website file. It contains all CSS, markup, and UI behavior in the same document.
- `MIGRAINZ_terminal_prototype.html.html` is a separate prototype/reference page and should not be treated as the main source unless the task explicitly targets the prototype.
- There is no package manifest, build pipeline, test runner, or dependency install step in this repository.

## Working conventions

- At the beginning of every work session, check `bugs.md` and `features.md` before editing or planning work.
- When reviewing `bugs.md` or `features.md`, remind the user about any unresolved bug or planned feature that has been present for more than one month.
- Keep edits small and in-place inside the existing HTML structure.
- Preserve the terminal/public-access aesthetic: dark green CRT workspace, monospace typography, grid-like panel layout, scanner/eye/clock UI details.
- Favor CSS custom properties and existing design tokens already declared in the page's root styles when adding new visual elements.
- Add JavaScript in the existing inline script at the bottom of `index.html` rather than introducing a separate source file.
- Avoid adding frameworks, package dependencies, or build tooling unless a task explicitly requires them.

## UI expectations

- Navigation links and stable anchor IDs should remain consistent with the current page sections.
- Interactive elements such as the cart counter, project log toggle, and terminal clock already have JavaScript hooks; keep those hooks and UI text patterns consistent.
- For static design updates, prefer a one-file HTML/CSS/JS implementation that remains visually consistent with the current landing page.

## Validation

- Because this is a static HTML project, validation usually means opening the page locally in a browser and checking that markup remains valid and the generated site loads without missing assets.
- If editing the prototype page, keep the visual language aligned with the main site while avoiding accidental drift from the main `index.html` experience.
