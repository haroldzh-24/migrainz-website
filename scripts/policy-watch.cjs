// Content-Security-Policy and Permissions-Policy watch for the browser scripts that run against the Next fixture
// (verify-site-health.mjs, verify.cjs, verify-factions.cjs, verify-interaction-polish.mjs, verify-art-viewer-keys.mjs).
// The CSP is report-only (security-headers.mjs): the browser blocks nothing and only reports, so console-error checks
// alone would miss it (Chrome logs CSP reports at "info" level). Two signals are collected:
// - `securitypolicyviolation` events, read in the page (report-only reports fire them too; not in contexts with
//   JavaScript off, where only the console signal remains);
// - console messages naming either policy, at any level, with or without hyphens (Chrome: "... violates the following
//   Content Security Policy directive ...", "Unrecognized Content-Security-Policy directive ...", "Permissions policy
//   violation: ...").
// scripts/verify-site-health.mjs --self-test plants a CSP violation and a blocked geolocation call and fails unless
// each signal is reported, so a change in Chrome's wording or events shows up there.
// The other browser scripts serve their own pages without the site's headers, so there is nothing to watch there.
const POLICY_MESSAGE = /Content[- ]Security[- ]Policy|Permissions[- ]Policy/i;

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

// One round trip to every page of a context, so reports already on their way arrive before it closes or is checked.
const settle = async context => { for (const page of context.pages()) await page.evaluate(() => 0).catch(() => {}); };

// Watches every context the browser opens from now on (browser.newPage goes through newContext too). Returns
// { problems, check }: call `await check()` at the end, before closing the browser; it fails unless at least one
// context was watched and nothing was reported. Closing a watched context settles it first.
function watchBrowser(browser) {
  const problems = [];
  const open = new Set();
  let watched = 0;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await newContext(...args);
    await watchPolicies(context, (message, page) => problems.push(`${page?.url() ?? '(no page)'}: ${message}`));
    watched++;
    open.add(context);
    const close = context.close.bind(context);
    context.close = async (...closeArgs) => { await settle(context); open.delete(context); return close(...closeArgs); };
    return context;
  };
  const check = async () => {
    for (const context of open) await settle(context);
    if (!watched) throw new Error('policy watch: no browser context was watched (contexts created another way?)');
    if (problems.length) throw new Error(`CSP reports or policy console messages:\n${problems.join('\n')}`);
    return watched;
  };
  return { problems, check };
}

module.exports = { POLICY_MESSAGE, watchPolicies, watchBrowser };
