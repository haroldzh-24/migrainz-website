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

### Bug Entry Template

- Description / Symptoms:
- Hypothesis or Suspected Cause:
- Evidence:
- Fix:
- Status: Resolved
