// Content-Security-Policy and Permissions-Policy watch for the browser scripts that run against the Next fixture
// (verify-site-health.mjs, verify.cjs, verify-factions.cjs, verify-interaction-polish.mjs, verify-art-viewer-keys.mjs).
// The CSP is report-only (security-headers.mjs): the browser blocks nothing and only reports, so console-error checks
// alone would miss it (Chrome logs CSP reports at "info" level). Two independent signals are collected:
// - `securitypolicyviolation` events, read in the page (report-only reports fire them too);
// - console messages naming either policy, at any level (Chrome: "... violates the following Content Security Policy
//   directive ...", "Permissions policy violation: ...").
// scripts/verify-site-health.mjs --self-test plants a CSP violation and a blocked geolocation call and fails unless
// both signals are reported, so a change in Chrome's wording or events shows up there.
// The other browser scripts serve their own pages without the site's headers, so there is nothing to watch there.
const POLICY_MESSAGE = /Content Security Policy|Permissions[- ]Policy/i;

// Calls onProblem(message, page) for every report or policy message in this context (all pages, all navigations).
async function watchPolicies(context, onProblem) {
  await context.exposeBinding('__policyWatchReport', ({ page }, report) => onProblem(`CSP report: ${report}`, page));
  await context.addInitScript(() => addEventListener('securitypolicyviolation', event =>
    window.__policyWatchReport?.(`${event.effectiveDirective} ${event.blockedURI || '(inline)'} (${event.disposition})`)));
  context.on('console', message => {
    const text = message.text();
    if (POLICY_MESSAGE.test(text)) onProblem(`policy console message (${message.type()}): ${text.split('\n')[0].slice(0, 200)}`, message.page());
  });
}

// Watches every context the browser opens from now on; returns the list the problems go into (page URL first).
function watchBrowser(browser) {
  const problems = [];
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await newContext(...args);
    await watchPolicies(context, (message, page) => problems.push(`${page?.url() ?? '(no page)'}: ${message}`));
    return context;
  };
  return problems;
}

module.exports = { POLICY_MESSAGE, watchPolicies, watchBrowser };
