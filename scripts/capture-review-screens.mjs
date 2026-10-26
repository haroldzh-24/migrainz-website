// Review screenshots from a running review server (node scripts/serve-fixture.mjs): the homepage and the seeded
// equipment pages, desktop and phone, with the CRT toggle on / reduced / off, plus the open shop ad at phone widths.
//   PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node scripts/capture-review-screens.mjs http://127.0.0.1:<port>
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = process.argv[2];
if (!base) { console.error('Usage: node scripts/capture-review-screens.mjs <review server URL>'); process.exit(1); }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const out = path.resolve('test-results/crt-screens');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const pages = [['homepage', '/'], ['review-equipment-directory', '/projects/blushland/equipment'], ['review-equipment-scanner', '/projects/blushland/equipment/fixture-scanner'],
  ['review-equipment-satchel', '/projects/blushland/equipment/fixture-satchel'], ['review-character-operative', '/projects/blushland/characters/fixture-operative']];
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['mobile360', 360, 740]]) for (const mode of ['on', 'reduced', 'off']) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
    for (const [label, route] of pages) {
      const page = await context.newPage();
      await page.goto(base + route);
      const enter = page.getByRole('button', { name: 'ENTER', exact: true });
      if (await enter.waitFor({ timeout: 8000 }).then(() => true, () => false)) await enter.press('Enter');
      await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
      await page.evaluate(value => { document.documentElement.dataset.crt = value; }, mode);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, `${label}-${name}-${mode}.png`) });
      if (label === 'homepage' && width < 700) {
        const shop = page.getByRole('button', { name: 'Requisitions / shop 03 / requisitions.exe' });
        await shop.tap();
        await page.locator('#shop-promo').waitFor();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(out, `homepage-shop-ad-${name}-${mode}.png`) });
      }
      await page.close();
    }
    await context.close();
  }
  console.log('Wrote review screenshots to ' + out);
} finally { await browser.close(); }
