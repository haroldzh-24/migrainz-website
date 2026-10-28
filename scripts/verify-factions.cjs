const assert = require("node:assert/strict");
const path = require("node:path");
const { watchBrowser } = require("./policy-watch.cjs");
const { chromium } = require(
  require.resolve("playwright", {
    paths: process.env.PATH.split(path.delimiter).map((entry) =>
    path.dirname(entry),
    ),
  }),
);

(async () => {
  assert.ok(process.env.DESKTOP_TEST_FIXTURE, 'Run through npm run test:regression with isolated CMS fixtures');
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const policies = watchBrowser(browser); // report-only CSP; see policy-watch.cjs
  // Route windows render a hidden first copy until hydration (roadmap 2.2): measure only after it is replaced.
  const settled = target => target.locator('.retro-window-pending').waitFor({ state: 'detached' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: process.env.BASE_URL });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);
    await page.goto('/');
    await page.getByRole('button', { name: 'ENTER', exact: true }).click();
    await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
    await page.goto('/projects/blushland');
    await settled(page);
    const cards = page.locator('#factions .faction-file');
    await cards.first().waitFor();
    assert.equal(await cards.count(), 2);
    assert.deepEqual(await cards.locator('strong').allTextContents(), ['REGRESSION EMBLEM/', 'REGRESSION NO EMBLEM/']);
    const emblem = cards.first().locator('img');
    await emblem.waitFor({ state: 'visible' });
    await emblem.evaluate(img => img.decode());
    assert.equal(await emblem.evaluate(img => getComputedStyle(img).objectFit), 'contain');
    assert.equal(await cards.first().locator('.directory-thumbnail').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.match(await cards.nth(1).innerText(), /NO IMAGE/);
    const factionLink = cards.first().locator('a');
    assert.equal(await factionLink.getAttribute('href'), '/projects/blushland/factions/regression-emblem');
    await factionLink.focus();
    assert.notEqual(await factionLink.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    await factionLink.click();
    await page.waitForURL('**/projects/blushland/factions/regression-emblem');
    await page.getByRole('heading', { name: 'REGRESSION EMBLEM', exact: true }).waitFor();
    await page.goBack();
    await settled(page);
    await page.locator('#factions').waitFor();
    await page.goForward();
    await page.getByRole('heading', { name: 'REGRESSION EMBLEM', exact: true }).waitFor();
    await page.goto('/projects/blushland/factions');
    await settled(page);
    await page.locator('.faction-grid .faction-file').first().waitFor();
    assert.equal(await page.locator('.faction-grid .faction-file').count(), 2);
    await page.goto('/projects/stalker');
    await settled(page);
    await page.locator('#factions .faction-file strong').first().waitFor();
    assert.deepEqual(await page.locator('#factions .faction-file strong').allTextContents(), ['OTHER PROJECT FACTION/']);
    await page.goto('/projects/blushland');
    await settled(page);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.locator('#factions img').evaluate(img => img.decode());
    assert.equal(await page.locator('#factions .directory-thumbnail').first().evaluate(el => getComputedStyle(el).opacity), '1');
    assert.equal(await page.locator('.project-app-content').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.locator('#factions .faction-file a').first().click();
    await page.waitForURL('**/factions/regression-emblem');
    await page.goBack();
    await settled(page);
    await page.locator('#factions').waitFor();
    await page.screenshot({ path: 'test-results/factions-mobile.png' });
    await page.setViewportSize({ width: 1440, height: 1000 });

    const mobile = await browser.newContext({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', baseURL: process.env.BASE_URL });
    const touch = await mobile.newPage();
    touch.setDefaultTimeout(90000);
    await touch.goto('/projects/blushland');
    await settled(touch);
    await touch.getByRole('button', { name: 'ENTER', exact: true }).tap();
    await touch.locator('.startup-sequence').waitFor({ state: 'hidden' });
    await touch.locator('#factions img').evaluate(img => img.decode());
    assert.equal(await touch.locator('.project-app-content').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await touch.locator('#factions .faction-file a').first().tap();
    await touch.waitForURL('**/factions/regression-emblem');
    await touch.getByRole('heading', { name: 'REGRESSION EMBLEM', exact: true }).waitFor();
    await touch.goBack();
    await settled(touch);
    await touch.locator('#factions').waitFor();
    await mobile.close();
    await policies.check();
    console.log('PASS: inline factions, CMS project filtering/order, visible emblems, missing-image cards, keyboard focus, direct destinations, compatibility index, 320px layout, back/forward, and no CSP or Permissions-Policy reports.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
