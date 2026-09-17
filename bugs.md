# Bugs

## Open Bugs

### 2026-09-10 - Vercel production admin initialization

- Evidence: public GET `/admin` returns HTTP 500; reported runtime error indicates one or more missing CMS environment variables.
- Confirmed code issue: build fallbacks masked missing hosted configuration, and runtime validation did not name the missing variable.
- Fix: hosted builds now validate supplied production configuration; runtime errors identify missing names without exposing values.
- Verification: typecheck, production guard and production build pass. Local SQLite `/admin` returns HTTP 200 with first-user setup; live production still returns HTTP 500 before deployment of these changes.
- Status: Code fix verified locally; deployment variable scopes, database connectivity and migration status require authenticated Vercel access. No CLI, token or project link is available in this workspace.

### 2026-09-09 - Upstream CMS dependency advisories

- Description: npm audit reports 12 moderate package entries inherited from Payload/Drizzle dependencies. No high or critical entries remain after updating Sharp and DOMPurify.
- Evidence: `npm audit`; ignored detailed report in test-results/npm-audit.json. Root advisories concern Payload default account-unlock access and older esbuild development-server tooling.
- Mitigation: account unlock is explicitly restricted to CMS staff; this site does not run an esbuild development server. Do not apply npm audit fix --force, which suggests incompatible old Payload packages.
- Status: Open for upstream package updates and production security review.


### Bug Entry Template

- Description / Symptoms:
- Hypothesis or Suspected Cause:
- Evidence:
- Fix:
- Status: Open

## Resolved Bugs

### 2026-09-15 - Regression suite depended on editorial publication state

- Cause: the browser suite expected the published legacy BLUSHLAND comic/chapter and STALKER project in the editing database, where these records are now drafts. Anonymous queries correctly omit them, including The Observer's related chapter link.
- Fix: `npm run test:regression` seeds and verifies a fresh private database/media fixture before running the complete browser suite. Editorial records and content authorization are unchanged. Direct browser runs report a missing published chapter fixture explicitly.
- Coverage: the original project/character/chapter path and reader assertions remain, with an added exact chapter-link URL assertion.

### Bug Entry Template

- Description / Symptoms:
- Hypothesis or Suspected Cause:
- Evidence:
- Fix:
- Status: Resolved

### 2026-09-10 - Public page flash before startup

- Cause: closed dialog opened only in a hydration effect; window frame appeared in a later animation stage.
- Fix: public layout initially renders a fixed opaque gate with its window already visible and underlying content hidden/inert. Session dismissal is checked after hydration.
- Status: Resolved. Typecheck, production build and focused browser checks passed (initial HTML without JavaScript, persistent frame, dismissal/session, mobile and reduced motion).
