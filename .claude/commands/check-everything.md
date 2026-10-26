---
description: Run typecheck, build, regression and both equipment verify scripts; save the output; summarize simulated vs real checks
allowed-tools: Bash, PowerShell, Read
---

Run the full local check set and report honestly. Do not edit source files, commit, push, or touch `.env*`.

1. Stop any review or dev server first (`node scripts/serve-fixture.mjs --stop`), because the regression suite needs the port. Note whether one was running so you can offer to restart it at the end.
2. Find Playwright: `PLAYWRIGHT_MODULE` should point to a `playwright/index.mjs` (look under the npm cache `_npx` folders, for example `%LOCALAPPDATA%\npm-cache\_npx\*\node_modules\playwright\index.mjs`). The regression command fetches it itself.
3. Run these in order, appending everything to `test-results/check-everything-<YYYYMMDD-HHMM>.txt`, with a `===== <command> =====` header and an `===== EXIT <code> =====` footer for each. Keep going after a failure so one run shows everything:
   - `npm.cmd run typecheck`
   - `npm.cmd run build`
   - `npm.cmd run test:regression`
   - `node scripts/verify-equipment-navigation.mjs`
   - `node scripts/verify-equipment-browser.mjs`
4. Restore line-ending-only noise from generated files (`git checkout -- payload-types.ts next-env.d.ts`) only if `git diff --ignore-space-at-eol` shows no real change in them. Report any other modified files as they are.
5. Report: pass or fail per script, the output file path, and the first failing assertion for any failure (quote it, do not paraphrase).
6. End with two short lists. **Simulated** (everything above: headless Chrome against an isolated SQLite fixture, no real phone, no Safari or Firefox, no real media or production data). **Not covered** (real devices, other browsers, live site, Blob, production database, restricted-media 404 on the live site). Never describe a simulated pass as a live check.
