const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  require.resolve("playwright", {
    paths: process.env.PATH.split(path.delimiter).map((entry) =>
      path.dirname(entry),
    ),
  }),
);

(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.BROWSER_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const baseURL = process.env.BASE_URL || "http://127.0.0.1:3000";
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    baseURL,
  });
  const page = await context.newPage();
  // Fresh fixture servers compile each route on first visit.
  page.setDefaultTimeout(90000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("404"))
      errors.push(message.text());
  });
  fs.mkdirSync("test-results", { recursive: true });
  try {
    if (process.env.BOOT_ONLY !== '1') {
      const fixtureResponse = await context.request.get('/api/chapters?where[slug][equals]=chapter-01&depth=0');
      assert.equal(fixtureResponse.status(), 200);
      assert.equal((await fixtureResponse.json()).totalDocs, 1,
        'Published BLUSHLAND chapter fixture is missing. Run npm run test:regression for an isolated seeded database; do not republish editorial drafts for tests.');
    }
    const noJS = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const initial = await noJS.newPage();
    await initial.goto('/');
    assert.equal(await initial.locator('.startup-sequence').isVisible(), true);
    assert.equal(await initial.locator('#top').isVisible(), false);
    assert.equal(await initial.locator('#top').evaluate(el => !!el.closest('[inert]')), true);
    await noJS.close();
    const adminContext = await browser.newContext({ baseURL });
    const admin = await adminContext.newPage();
    const adminResponse = await admin.goto('/admin', { timeout: 120000 });
    assert.equal(adminResponse.status(), 200);
    assert.equal(await admin.locator('.startup-sequence').count(), 0);
    assert.equal(await admin.locator('[inert]').count(), 0);
    await adminContext.close();
    await page.goto("/");
    await page.locator('.startup-sequence').waitFor({ state: 'visible' });
    const frame = await page.locator('.startup-window').elementHandle();
    const bootBounds = await frame.boundingBox();
    await page.locator('.startup-compromised').waitFor();
    assert.equal(await page.locator('#top').isVisible(), false);
    assert.equal(await page.locator('#top').evaluate(el => !!el.closest('[inert]')), true);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.startup-sequence').getAttribute('data-phase'), 'boot');
    await page.waitForFunction(() => document.querySelector('.startup-art-viewport')?.dataset.eyeState === 'closed');
    await page.waitForFunction(() => document.querySelector('.startup-art-viewport')?.dataset.eyeState === 'open');
    await page.getByRole('button', { name: 'ENTER', exact: true }).waitFor();
    assert.equal(await frame.evaluate(el => el === document.querySelector('.startup-window')), true);
    const adBounds = await frame.boundingBox();
    assert.equal(adBounds.width, bootBounds.width);
    assert.equal(adBounds.height, bootBounds.height);
    assert.equal(await page.locator('.startup-window').getAttribute('aria-modal'), null);
    assert.equal(await page.locator('#top').evaluate(el => !!el.closest('[inert]')), false);
    assert.equal(await page.locator('.startup-sequence').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    // A real page control outside the hanging window remains usable.
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    assert.equal(await page.locator('.startup-announcement').isVisible(), true);
    await page.getByRole('button', { name: 'ENTER', exact: true }).focus();
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('#top').isVisible(), true);
    await page.keyboard.press('Enter');
    await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
    for (const key of ['Enter', 'Escape', 'click']) {
      await page.evaluate(() => sessionStorage.clear());
      await page.reload();
      await page.getByRole('button', { name: 'ENTER', exact: true }).waitFor();
      if (key === 'click') await page.getByRole('button', { name: 'Close announcement' }).click();
      else {
        await page.getByRole('link', { name: 'Home', exact: true }).focus();
        await page.keyboard.press(key);
      }
      await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
      await page.reload();
      await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#top').isVisible(), true);
    }
    await page.reload();
    await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
    // A dismissal for another ID must not suppress the current announcement.
    await page.evaluate(() => {
      sessionStorage.clear();
      sessionStorage.setItem('migrainz-announcement:older-transmission', 'older-transmission');
    });
    await page.reload();
    await page.getByRole('button', { name: 'ENTER', exact: true }).waitFor();
    await page.getByRole('button', { name: 'ENTER', exact: true }).click();
    if (process.env.BOOT_ONLY === '1') {
      const mobileGate = await browser.newContext({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', baseURL });
      const gatePage = await mobileGate.newPage();
      await gatePage.goto('/');
      await gatePage.locator('.startup-compromised').waitFor();
      await gatePage.waitForTimeout(1000);
      assert.equal(await gatePage.locator('.startup-art-viewport').getAttribute('data-eye-state'), 'open');
      await gatePage.getByRole('button', { name: 'ENTER', exact: true }).waitFor();
      assert.equal(await gatePage.locator('#top').isVisible(), true);
      const bounds = await gatePage.locator('.startup-window').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320);
      assert.equal(await gatePage.locator('.startup-blink').first().evaluate(el => getComputedStyle(el).animationName), 'none');
      await gatePage.getByRole('button', { name: 'ENTER', exact: true }).tap();
      await gatePage.locator('.startup-sequence').waitFor({ state: 'hidden' });
      await mobileGate.close();
      assert.deepEqual(errors, []);
      console.log('Boot gate checks passed: initial HTML, persistent frame, dismissal, session, mobile and reduced motion.');
      return;
    }
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForFunction(
      () => document.querySelector("#clock").textContent !== "--:--:--",
    );
    assert.equal(
      await page.locator("body").evaluate((el) => getComputedStyle(el).color),
      "rgb(114, 255, 98)",
      "Original phosphor green must survive CSS extraction",
    );
    assert.equal(
      await page
        .locator(".head path")
        .first()
        .evaluate((el) => getComputedStyle(el).stroke),
      "rgb(114, 255, 98)",
      "Face outline must be visible",
    );
    await page.screenshot({
      path: "test-results/home-desktop.png",
      fullPage: true,
    });
    assert.equal(await page.locator('main > section').count(), 1);
    assert.equal(await page.locator('main > .hero').count(), 1);
    assert.equal(await page.locator('main .section-block').count(), 0);
    for (const [name, route] of [
      ['01 PROJECT DATABASE', '/projects'],
      ['02 CURRENT OPERATIONS', '/tracker'],
      ['04 ARCHIVE', '/archive'],
      ['05 INFORMATION', '/about'],
      ['07 COMICS / READER', '/comics'],
    ]) {
      const link = page.getByRole('link', { name, exact: true });
      assert.equal(await link.getAttribute('href'), route);
      await link.click();
      await page.waitForURL('**' + route);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.goto('/');
    }
    const watcher = page.locator("#watcher");
    await watcher.hover({ position: { x: 100, y: 100 } });
    assert.notEqual(await page.locator("#readout-x").innerText(), "000");
    const patronTrigger = page.getByRole('button', { name: '06 PATREON ACCESS' });
    await patronTrigger.hover();
    const patronPopup = page.getByRole('region', { name: 'PATREON promotional window' });
    const triggerBox = await patronTrigger.boundingBox();
    const popupBox = await patronPopup.boundingBox();
    assert.ok(popupBox.y < triggerBox.y, 'Patreon opens upward');
    assert.ok(popupBox.y >= 0 && popupBox.y + popupBox.height <= 1000, 'Desktop popup fits viewport');
    await page.mouse.move(triggerBox.x + 50, triggerBox.y + triggerBox.height / 2);
    await page.mouse.move(popupBox.x + 50, popupBox.y + popupBox.height - 8, { steps: 15 });
    assert.equal(await patronTrigger.getAttribute('aria-expanded'), 'true');
    await patronPopup.getByRole('link', { name: '>>> JOIN PATREON <<<' }).hover();
    assert.equal(await patronTrigger.getAttribute('aria-expanded'), 'true');
    await page.screenshot({ path: 'test-results/patreon-desktop.png' });
    await page.keyboard.press('Escape');
    const shop = page.getByRole("button", { name: "03 REQUISITIONS / SHOP" });
    await shop.hover();
    await page.getByRole("region", { name: "SHOP promotional window" }).hover();
    assert.equal(await shop.getAttribute("aria-expanded"), "true");
    await page.screenshot({ path: "test-results/shop-desktop.png" });
    await page.keyboard.press("Escape");
    assert.equal(await shop.getAttribute("aria-expanded"), "false");
    await shop.press("Enter");
    assert.equal(await shop.getAttribute("aria-expanded"), "true");
    assert.equal(
      await page
        .getByRole("link", { name: ">>> ENTER STORE <<<" })
        .getAttribute("href"),
      "https://example.com/studio-migrainz-store",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "01 PROJECT DATABASE" }).click();
    await page.getByRole("link", { name: /BL-001.*OPEN DIRECTORY/ }).click();
    await page.getByRole("link", { name: /CHARACTERS\/.*1 RECORDS/ }).click();
    await page.getByRole("link", { name: /THE OBSERVER/ }).click();
    await page.waitForURL('**/projects/blushland/characters/the-observer');
    const chapterLink = page.getByRole("link", { name: /CHAPTER 01.*OPEN READER/ });
    assert.equal(await chapterLink.getAttribute('href'), '/comics/blushland/chapter-01');
    await chapterLink.click();
    await page.waitForURL('**/comics/blushland/chapter-01');
    const previous = page.getByRole("button", { name: "← PREVIOUS" }).first();
    const next = page.getByRole("button", { name: "NEXT →" }).first();
    assert.equal(await previous.isDisabled(), true);
    await next.click();
    assert.match(
      await page.locator(".comic-figure img").getAttribute("src"),
      /02.svg/,
    );
    await next.press("ArrowRight");
    assert.equal(await next.isDisabled(), true);
    assert.match(
      await page.locator(".comic-figure img").getAttribute("src"),
      /03.svg/,
    );
    await page.getByLabel("GO TO PAGE").selectOption("0");
    assert.equal(await previous.isDisabled(), true);
    await page.waitForFunction(() => {
      const img = document.querySelector('.comic-figure img');
      return img?.complete && img.naturalWidth > 0;
    });
    assert.equal(
      await page
        .locator(".comic-figure img")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
      true,
    );
    await page.getByRole("link", { name: "← RETURN TO BLUSHLAND" }).click();
    await page.waitForURL("**/projects/blushland");
    assert.equal(new URL(page.url()).pathname, "/projects/blushland");
    await page.getByRole("button", { name: "VIEW LOG +" }).click();
    await page.getByRole("heading", { name: "MILESTONES" }).waitFor();
    for (const route of [
      "/projects",
      "/projects/stalker",
      "/projects/misc-works",
      "/projects/stalker/characters",
      "/tracker",
      "/comics",
      "/patreon",
      "/archive",
      "/about",
    ]) {
      const response = await page.goto(route);
      assert.equal(response.status(), 200, route);
    }
    for (const route of [
      "/projects/missing",
      "/projects/blushland/characters/missing",
      "/comics/blushland/missing",
    ]) {
      await page.goto(route);
      await page.getByRole("heading", { name: "RECORD NOT FOUND" }).waitFor();
    }
    const gagContext = await browser.newContext({
      viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true, baseURL,
    });
    const gag = await gagContext.newPage();
    await gag.goto('/archive');
    await gag.getByRole('button', { name: 'ENTER', exact: true }).waitFor();
    const bounds = await gag.locator('.startup-window').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320);
    await gag.screenshot({ path: 'test-results/startup-mobile.png' });
    await gag.getByRole('button', { name: 'ENTER', exact: true }).tap();
    await gag.locator('.startup-sequence').waitFor({ state: 'hidden' });
    await gagContext.close();
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
      baseURL,
    });
    const touch = await mobile.newPage();
    touch.on("pageerror", (error) => errors.push(error.message));
    await touch.goto("/");
    await touch.getByRole('button', { name: 'ENTER', exact: true }).waitFor();
    assert.equal(await touch.locator('.startup-blink').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await touch.getByRole('button', { name: 'ENTER', exact: true }).tap();
    await touch.locator('.startup-sequence').waitFor({ state: 'hidden' });
    const patreon = touch.getByRole("button", { name: "06 PATREON ACCESS" });
    await patreon.tap();
    assert.equal(await patreon.getAttribute("aria-expanded"), "true");
    const touchPopup = await touch.locator('#patreon-promo').boundingBox();
    assert.ok(touchPopup.x >= 0 && touchPopup.y >= 0 && touchPopup.x + touchPopup.width <= 390 && touchPopup.y + touchPopup.height <= 844, 'Touch popup fits viewport');
    assert.equal(
      await touch
        .locator(".promo-new")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    assert.equal(
      await touch
        .locator(".watcher svg")
        .evaluate((el) => getComputedStyle(el).transform),
      "none",
    );
    await touch.screenshot({
      path: "test-results/patreon-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await touch.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await touch.getByRole("link", { name: ">>> JOIN PATREON <<<" }).tap();
    await touch
      .getByRole("button", { name: "CONNECT PATREON — COMING LATER" })
      .waitFor();
    await touch.goto("/");
    await touch.getByRole("button", { name: "03 REQUISITIONS / SHOP" }).tap();
    await touch.locator(".lede").first().tap();
    assert.equal(
      await touch
        .getByRole("button", { name: "03 REQUISITIONS / SHOP" })
        .getAttribute("aria-expanded"),
      "false",
    );
    for (const width of [320, 390, 768]) {
      await touch.setViewportSize({ width, height: 844 });
      for (const route of ['/', '/archive', '/about']) {
        await touch.goto(route);
        assert.equal(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, route + ' at ' + width);
      }
    }
    await touch.setViewportSize({ width: 390, height: 844 });
    await touch.goto("/comics/blushland/chapter-01");
    await touch.getByRole("button", { name: "NEXT →" }).first().tap();
    assert.match(
      await touch.locator(".comic-figure img").getAttribute("src"),
      /02.svg/,
    );
    assert.equal(
      await touch.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await touch.screenshot({
      path: "test-results/reader-mobile.png",
      fullPage: true,
    });
    await mobile.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: exploration, reader controls, project logs, routes, missing records, hover/keyboard/touch promotions, mobile width, reduced motion, and runtime console.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
