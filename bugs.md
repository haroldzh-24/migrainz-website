# Bugs

## Open Bugs

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
