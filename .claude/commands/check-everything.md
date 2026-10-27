---
description: Run npm run check (typecheck, build and every test script); save the output; summarize simulated vs real checks
allowed-tools: Bash, PowerShell, Read
---

Run the full local check set and report honestly. Do not edit source files, commit, push, or touch `.env*`.

1. Stop any review or dev server first (`node scripts/serve-fixture.mjs --stop`), because the regression suite needs the port. Note whether one was running so you can offer to restart it at the end.
2. Run `npm.cmd run check` (Windows) or `npm run check` (set `BROWSER_PATH` to Chrome on Linux and macOS). It fetches the pinned test tools (Playwright, axe-core, PGlite), runs every step even after a failure, and writes `test-results/check-<time>.txt` with a `===== <step> =====` header and an `===== EXIT ... =====` footer per step plus a summary. `npm run check -- --list` shows the steps.
3. Restore line-ending-only noise from generated files (`git checkout -- payload-types.ts next-env.d.ts`) only if `git diff --ignore-space-at-eol` shows no real change in them. Report any other modified files as they are (the summary lists the working tree after the run).
4. Report: pass or fail per step, the log path, and the first failing assertion for any failure (quote it, do not paraphrase). For the site-health step, name any new or stale baseline entries.
5. End with two short lists. **Simulated** (everything above: headless Chrome against isolated SQLite fixtures, no real phone, no Safari or Firefox, no real media or production data). **Not covered** (real devices, other browsers, live site, Blob, production database, restricted-media 404 on the live site). Never describe a simulated pass as a live check.
