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
    assert.equal(await admin.locator('.desktop-file, .desktop-inspector, .crt, .art-viewer-window, .window-taskbar').count(), 0);
    await adminContext.close();
    await page.goto("/");
    await page.locator('.startup-sequence').waitFor({ state: 'visible' });
    const frame = await page.locator('.startup-window').elementHandle();
    const bootBounds = await frame.boundingBox();
    // Boot checklist from real data: driver lines, fixture tracker phases, the newest chapter, clearance.
    await page.locator('.boot-line').first().waitFor();
    assert.equal(await page.locator('#top').isVisible(), false);
    assert.equal(await page.locator('#top').evaluate(el => !!el.closest('[inert]')), true);
    // S toggles sound without skipping; the snd.drv line follows. Toggle back so the sound test below starts off.
    await page.keyboard.press('s');
    await page.locator('.boot-line', { hasText: 'snd.drv' }).filter({ hasText: 'on' }).waitFor();
    assert.equal(await page.locator('.startup-sequence').getAttribute('data-phase'), 'boot');
    await page.keyboard.press('s');
    assert.equal(await page.evaluate(() => localStorage.getItem('migrainz-sound-enabled')), 'false');
    await page.locator('.boot-line', { hasText: 'clearance' }).filter({ hasText: 'PUBLIC' }).waitFor();
    assert.equal(await page.locator('.boot-line', { hasText: 'watcher.sys' }).filter({ hasText: 'awake' }).count(), 1);
    const phase = page.locator('.boot-line', { hasText: 'blushland_chapter_02' });
    assert.equal(await phase.getAttribute('data-status'), 'warn');
    assert.ok((await phase.textContent()).includes('[ !! ]') && (await phase.textContent()).includes('73% rendered'));
    // Without a key it moves on to the announcement by itself (~3s).
    await page.getByRole('button', { name: 'ENTER', exact: true }).waitFor({ timeout: 6000 });
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
    // The shop ad cannot be opened (hover or click) while the splash is showing.
    const splashShop = page.getByRole('button', { name: '03 / requisitions.exe Requisitions / shop' });
    await splashShop.hover();
    await splashShop.click();
    assert.equal(await splashShop.getAttribute('aria-expanded'), 'false');
    await page.mouse.move(5, 5);
    await page.getByRole('button', { name: 'ENTER', exact: true }).focus();
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('#top').isVisible(), true);
    await page.keyboard.press('Enter');
    await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
    // Focus lands on main#top after the splash, without a visible ring around the whole page.
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'top');
    assert.equal(await page.locator('#top').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    // Skipping: Esc, any key or a click jumps to the announcement; the key release can't also press ENTER.
    for (const skip of ['Escape', ' ', 'x', 'click']) {
      await page.evaluate(() => sessionStorage.clear());
      await page.reload();
      await page.locator('.boot-line').first().waitFor();
      const started = Date.now();
      if (skip === 'click') await page.locator('.startup-window').click();
      else await page.keyboard.press(skip);
      await page.locator('.startup-sequence[data-phase="announcement"]').waitFor({ timeout: 1000 });
      assert.ok(Date.now() - started < 1000, `${skip} skips the checklist`);
      await page.waitForTimeout(200);
      assert.equal(await page.locator('.startup-sequence').getAttribute('data-phase'), 'announcement', `${skip} does not dismiss the ad`);
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'ENTER');
    }
    // Once per session: a reload before dismissing the ad goes straight to the ad.
    await page.reload();
    await page.locator('.startup-sequence[data-phase="announcement"]').waitFor();
    assert.equal(await page.locator('.boot-line').count(), 0);
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
      // Reduced motion: every checklist line at once, then the ad.
      await gatePage.locator('.boot-line', { hasText: 'clearance' }).waitFor();
      assert.ok(await gatePage.locator('.boot-line').count() >= 4);
      await gatePage.getByRole('button', { name: 'ENTER', exact: true }).waitFor({ timeout: 4000 });
      assert.equal(await gatePage.locator('#top').isVisible(), true);
      const bounds = await gatePage.locator('.startup-window').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320);
      assert.equal(await gatePage.locator('.startup-blink').first().evaluate(el => getComputedStyle(el).animationName), 'none');
      await gatePage.getByRole('button', { name: 'ENTER', exact: true }).tap();
      await gatePage.locator('.startup-sequence').waitFor({ state: 'hidden' });
      await mobileGate.close();
      assert.deepEqual(errors, []);
      console.log('Boot gate checks passed: initial HTML, checklist, skip keys, persistent frame, dismissal, session, mobile and reduced motion.');
      return;
    }
    await page.getByRole("heading", { level: 1 }).waitFor();
    assert.equal(await page.locator('.crt').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    assert.equal(await page.locator('.crt').evaluate(el => getComputedStyle(el).animationName), 'none', 'no continuous flicker');
    assert.equal(await page.locator('.crt').evaluate(el => getComputedStyle(el, '::before').animationIterationCount), '1', 'power-on sweep runs once');
    // SND, CRT and phosphor live in the header's SYSTEM menu (a disclosure button; the panel stays mounted).
    const systemMenu = page.getByRole('button', { name: 'SYSTEM', exact: true });
    const sound = page.locator('.sound-toggle');
    assert.equal(await sound.getAttribute('aria-pressed'), 'false');
    await systemMenu.click();
    assert.equal(await systemMenu.getAttribute('aria-expanded'), 'true');
    await sound.click();
    assert.equal(await sound.getAttribute('aria-pressed'), 'true');
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.sound-toggle')?.getAttribute('aria-pressed') === 'true');
    await systemMenu.click();
    await sound.click();
    assert.equal(await page.evaluate(() => localStorage.getItem('migrainz-sound-enabled')), 'false');
    await page.waitForFunction(
      () => document.querySelector("#clock").textContent !== "--:--:--",
    );
    assert.equal(
      await page.locator("body").evaluate((el) => getComputedStyle(el).color),
      "rgb(168, 216, 176)",
      "Original phosphor green must survive CSS extraction",
    );
    // The old `.head path` outline check targeted markup removed with the image watcher. The recolour is baked into
    // the watcher layers (scripts/bake-watcher-crt.mjs), so the moving container must not carry a runtime filter.
    assert.equal(await page.locator('.watcher').evaluate((el) => getComputedStyle(el).filter), 'none', 'watcher has no runtime filter');
    // The face layer is a CSS background picked by html[data-phosphor]; green is the default.
    assert.match(await page.locator('.watcher-art > .watcher-base').evaluate((el) => getComputedStyle(el).backgroundImage), /watcher-base\.crt\.png/);
    await page.screenshot({
      path: "test-results/home-desktop.png",
      fullPage: true,
    });
    assert.equal(await page.locator('main > section').count(), 1);
    assert.equal(await page.locator('main > .hero').count(), 1);
    assert.equal(await page.locator('main .section-block').count(), 0);
    for (const [name, route] of [
      ['01 / projects.db Project database', '/projects'],
      ['02 / operations.log Current operations', '/tracker'],
      ['04 / archive/ Archive', '/archive'],
      ['05 / info.txt Information', '/about'],
      ['07 / comics/ Comics / reader', '/comics'],
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
    // Tracking is window-wide: a pointer far outside the watcher box still steers the eyes.
    await page.mouse.move(5, 5);
    await page.waitForFunction(() => /translate\(-/.test(document.querySelector('.watcher-eyes').style.transform));
    await page.waitForFunction(() => document.querySelector("#readout-x")?.textContent !== "000");
    const patronTrigger = page.getByRole('button', { name: '06 / patreon.key Patreon access' });
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
    const shop = page.getByRole("button", { name: "03 / requisitions.exe Requisitions / shop" });
    // The shop ad hover-opens once per visit: start from a fresh visit.
    await page.evaluate(() => sessionStorage.removeItem("migrainz-shop-promo-seen"));
    await shop.hover();
    await page.getByRole("region", { name: "SHOP promotional window" }).hover();
    assert.equal(await shop.getAttribute("aria-expanded"), "true");
    await page.screenshot({ path: "test-results/shop-desktop.png" });
    await page.keyboard.press("Escape");
    assert.equal(await shop.getAttribute("aria-expanded"), "false");
    await page.mouse.move(5, 5);
    await shop.hover();
    assert.equal(await shop.getAttribute("aria-expanded"), "false", "shop ad must not hover-open a second time in one visit");
    await shop.press("Enter");
    assert.equal(await shop.getAttribute("aria-expanded"), "true");
    assert.equal(
      await page
        .getByRole("link", { name: ">>> ENTER STORE <<<" })
        .getAttribute("href"),
      "https://example.com/studio-migrainz-store",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "01 / projects.db Project database" }).click();
    await page.getByRole("link", { name: "BLUSHLAND/", exact: true }).hover();
    await page.getByRole('tooltip').waitFor();
    assert.match(await page.getByRole('tooltip').innerText(), /PAGE COUNT\s+3/);
    assert.doesNotMatch(await page.getByRole('tooltip').innerText(), /CURRENT PHASE|TRACKER STATE/);
    await page.screenshot({ path: 'test-results/phase5-project-properties.png' });
    await page.getByRole("link", { name: "BLUSHLAND/", exact: true }).click();
    if (process.env.DESKTOP_TEST_FIXTURE) {
      const art = page.getByRole('link', { name: /REGRESSION ART\.ART/ });
      assert.equal(await art.getAttribute('href'), '/projects/blushland#gallery-regression-art');
      await art.click();
      await page.getByRole('tab', { name: 'REGRESSION ART', exact: true }).waitFor();
      await page.waitForFunction(() => { const img = document.querySelector('.art-viewer-canvas img'); return img?.complete && img.naturalWidth > 0; });
      assert.equal(await page.locator('.art-viewer-canvas').evaluate(el => { const canvas = el.getBoundingClientRect(); const image = el.querySelector('img').getBoundingClientRect(); return image.bottom <= canvas.bottom && image.right <= canvas.right; }), true);
      await page.screenshot({ path: 'test-results/phase5-artwork.png' });
      await page.getByRole('button', { name: 'Minimize ART VIEWER', exact: true }).click();
      await art.click();
      assert.equal(await page.getByRole('tab', { name: 'REGRESSION ART', exact: true }).count(), 1);
      await page.getByRole('button', { name: 'Close REGRESSION ART', exact: true }).click();
    }
    await page.getByRole("link", { name: "ALL CHARACTERS / INCLUDING UNASSIGNED RECORDS", exact: true }).click();
    const file = page.getByRole("link", { name: /THE_OBSERVER\.CHR/ });
    const fallback = await file.getAttribute('href');
    let hoverRequests = [];
    const trackHover = request => { if (/\/api\/|_rsc=/.test(request.url())) hoverRequests.push(request.url()); };
    await page.waitForLoadState('networkidle');
    page.on('request', trackHover);
    await file.hover();
    await page.getByRole('tooltip').waitFor();
    assert.match(await page.getByRole('tooltip').innerText(), /NAME\s+THE OBSERVER/);
    assert.match(await page.getByRole('tooltip').innerText(), /PROJECT\s+BLUSHLAND/);
    assert.match(await page.getByRole('tooltip').innerText(), /UPDATED\s+\d{4}-\d{2}-\d{2}/);
    assert.equal(await page.getByRole('tooltip').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    const inspector = await page.getByRole('tooltip').boundingBox();
    assert.ok(inspector.x >= 0 && inspector.y >= 0 && inspector.x + inspector.width <= 1440 && inspector.y + inspector.height <= 1000);
    page.off('request', trackHover);
    assert.deepEqual(hoverRequests, []);
    await page.keyboard.press('Escape');
    await page.getByRole('tooltip').waitFor({ state: 'hidden' });
    await file.focus();
    await page.getByRole('tooltip').waitFor();
    await page.setViewportSize({ width: 320, height: 240 });
    await page.waitForFunction(() => { const box = document.querySelector('.desktop-inspector')?.getBoundingClientRect(); return box && box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight; });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await file.press('Enter');
    await page.getByRole('tab', { name: 'THE OBSERVER', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/projects/blushland/characters');
    await page.getByRole('button', { name: 'Minimize ART VIEWER', exact: true }).click();
    await file.click();
    assert.equal(await page.getByRole('tab', { name: 'THE OBSERVER', exact: true }).count(), 1);
    await page.reload();
    await page.getByRole('tab', { name: 'THE OBSERVER', exact: true }).waitFor();
    await page.screenshot({ path: 'test-results/phase5-viewer-desktop.png' });
    await page.getByRole('button', { name: 'Close THE OBSERVER', exact: true }).click();
    await page.goto(fallback);
    await page.waitForURL('**/projects/blushland/characters/the-observer');
    const chapterLink = page.getByRole("link", { name: /CHAPTER 01.*OPEN READER/ });
    assert.equal(await chapterLink.getAttribute('href'), '/comics/blushland/chapter-01');
    await chapterLink.click();
    await page.waitForURL('**/comics/blushland/chapter-01');
    const previous = page.getByRole("button", { name: "PREV", exact: true }).first();
    const next = page.getByRole("button", { name: "NEXT", exact: true }).first();
    assert.equal(await previous.isDisabled(), true);
    await next.click();
    assert.match(
      await page.locator(".comic-page-stage .art-viewer-canvas img").getAttribute("src"),
      /02.svg/,
    );
    await next.press("ArrowRight");
    assert.equal(await next.isDisabled(), true);
    assert.match(
      await page.locator(".comic-page-stage .art-viewer-canvas img").getAttribute("src"),
      /03.svg/,
    );
    await page.getByLabel("Go to page").selectOption("0");
    assert.equal(await previous.isDisabled(), true);
    await page.waitForFunction(() => {
      const img = document.querySelector('.comic-page-stage .art-viewer-canvas img');
      return img?.complete && img.naturalWidth > 0;
    });
    assert.equal(
      await page
        .locator(".comic-page-stage .art-viewer-canvas img")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
      true,
    );
    await page.getByRole("link", { name: "PROJECT", exact: true }).click();
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
    assert.equal(await touch.locator('.crt').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await touch.locator('.startup-blink').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await touch.getByRole('button', { name: 'ENTER', exact: true }).tap();
    await touch.locator('.startup-sequence').waitFor({ state: 'hidden' });
    const patreon = touch.getByRole("button", { name: "06 / patreon.key Patreon access" });
    await patreon.tap();
    assert.equal(await patreon.getAttribute("aria-expanded"), "true");
    const touchPopup = await touch.locator('#patreon-promo').boundingBox();
    assert.ok(touchPopup.x >= 0 && touchPopup.y >= 0 && touchPopup.x + touchPopup.width <= 390 && touchPopup.y + touchPopup.height <= 844, 'Touch popup fits viewport');
    // Phone widths: the promo window is a small in-flow card with a finger-sized close button.
    assert.equal(await touch.locator('#patreon-promo').evaluate(el => getComputedStyle(el).position), 'static');
    const closeBox = await touch.getByRole('button', { name: 'Close patreon promotion' }).boundingBox();
    assert.ok(closeBox.width >= 28 && closeBox.height >= 28, 'Phone promo close button is at least 28px');
    assert.equal(
      await touch
        .locator(".promo-new")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    assert.equal(
      await touch
        .locator(".watcher-art")
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
      .getByRole("button", { name: "PATREON SIGN-IN UNAVAILABLE" })
      .waitFor();
    await touch.goto("/");
    await touch.getByRole("button", { name: "03 / requisitions.exe Requisitions / shop" }).tap();
    assert.equal(await touch.locator('#shop-promo').evaluate(el => getComputedStyle(el).position), 'static');
    assert.equal(await touch.locator('#shop-promo small').isVisible(), true, 'Placeholder-store note stays visible on phones');
    await touch.keyboard.press("Escape");
    assert.equal(await touch.getByRole("button", { name: "03 / requisitions.exe Requisitions / shop" }).getAttribute("aria-expanded"), "false");
    await touch.getByRole("button", { name: "03 / requisitions.exe Requisitions / shop" }).tap();
    await touch.locator(".lede").first().tap();
    assert.equal(
      await touch
        .getByRole("button", { name: "03 / requisitions.exe Requisitions / shop" })
        .getAttribute("aria-expanded"),
      "false",
    );
    for (const width of [320, 390, 768]) {
      await touch.setViewportSize({ width, height: 844 });
      for (const route of ['/', '/archive', '/about', '/projects', '/projects/blushland/characters']) {
        await touch.goto(route);
        assert.equal(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, route + ' at ' + width);
      }
    }
    await touch.setViewportSize({ width: 390, height: 844 });
    await touch.goto('/projects/blushland/characters');
    await touch.getByRole('button', { name: 'Properties for THE_OBSERVER.CHR', exact: true }).tap();
    await touch.getByRole('tooltip').waitFor();
    assert.match(await touch.getByRole('tooltip').innerText(), /THE OBSERVER/);
    const mobileInspector = await touch.getByRole('tooltip').boundingBox();
    assert.ok(mobileInspector.x >= 0 && mobileInspector.y >= 0 && mobileInspector.x + mobileInspector.width <= 390 && mobileInspector.y + mobileInspector.height <= 844);
    await touch.screenshot({ path: 'test-results/phase5-properties-mobile.png' });
    await touch.getByRole('button', { name: 'Properties for THE_OBSERVER.CHR', exact: true }).tap();
    await touch.getByRole('tooltip').waitFor({ state: 'hidden' });
    await touch.getByRole('link', { name: /THE_OBSERVER\.CHR/ }).tap();
    await touch.getByRole('tab', { name: 'THE OBSERVER', exact: true }).waitFor();
    assert.equal(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await touch.getByRole('button', { name: 'Close THE OBSERVER', exact: true }).tap();
    await touch.goto("/comics/blushland/chapter-01");
    await touch.getByRole("button", { name: "NEXT", exact: true }).first().tap();
    assert.match(
      await touch.locator(".comic-page-stage .art-viewer-canvas img").getAttribute("src"),
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
