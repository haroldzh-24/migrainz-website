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
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("404"))
      errors.push(message.text());
  });
  fs.mkdirSync("test-results", { recursive: true });
  try {
    await page.goto("/");
    await page.locator('.startup-sequence').waitFor({ state: 'visible' });
    await page.locator('.startup-log').getByText('SYSTEM COMPROMISED', { exact: true }).waitFor();
    const art = page.locator('.startup-art-viewport');
    await art.waitFor();
    assert.equal(await art.getAttribute('data-placeholder'), 'true');
    assert.equal(await page.locator('.startup-face').count(), 2);
    assert.equal(await page.locator('.startup-face').first().textContent(), await page.locator('.startup-face').last().textContent());
    for (let blink = 0; blink < 3; blink++) {
      await page.waitForFunction(() => document.querySelector('.startup-art-viewport')?.dataset.eyeState === 'closed');
      await page.waitForFunction(() => document.querySelector('.startup-art-viewport')?.dataset.eyeState === 'open');
    }
    await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
    for (const key of ['Enter', 'Space', 'click']) {
      await page.evaluate(() => sessionStorage.removeItem('migrainz-startup'));
      await page.reload();
      await page.locator('.startup-sequence').waitFor({ state: 'visible' });
      if (key === 'click') await page.locator('.startup-log').click();
      else await page.keyboard.press(key);
      await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
    }
    await page.reload();
    assert.equal(await page.locator('.startup-sequence').isVisible(), false);
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
    await page.getByRole("link", { name: /CHAPTER 01.*OPEN READER/ }).click();
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
    assert.equal(await gag.locator('.startup-sequence').count(), 0);
    await gag.goto('/');
    await gag.locator('.startup-art-viewport').waitFor();
    assert.equal(await gag.locator('.startup-art-viewport').evaluate(el => el.querySelector('.startup-art-canvas').getBoundingClientRect().width <= el.clientWidth + 1), true);
    await gag.screenshot({ path: 'test-results/startup-mobile.png' });
    await gag.locator('.startup-art-viewport').tap();
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
    assert.equal(await touch.locator('.startup-sequence').isVisible(), false);
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
