const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require(require.resolve('playwright', {
  paths: process.env.PATH.split(path.delimiter).map(entry => path.dirname(entry)),
}));

(async () => {
  const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
  assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL), 'CMS verification runs only on a local server');
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  const email = `cms-check-${Date.now()}@example.invalid`;
  const password = crypto.randomBytes(24).toString('hex');
  let userID;
  const created = [];
  const suffix = Date.now().toString();
  const publicContext = await browser.newContext({ baseURL });
  const visitor = await publicContext.newPage();
  visitor.setDefaultTimeout(90000);
  async function publish(collection, create = true) {
    const response = page.waitForResponse(r => r.url().includes(`/api/${collection}`) && r.request().method() === (create ? "POST" : "PATCH"));
    await page.getByRole("button", { name: "Publish changes", exact: true }).click();
    const r = await response;
    assert.ok(r.ok(), await r.text());
    const doc = (await r.json()).doc;
    if (create) created.push([collection, doc.id]);
    await page.waitForURL(`**/admin/collections/${collection}/${doc.id}`);
    return doc;
  }
  try {
    const init = await context.request.get('/api/users/init', { timeout: 120000 });
    assert.equal((await init.json()).initialized, false, 'Use a fresh development DB or provide a dedicated test setup; never overwrite an existing administrator');
    const register = await context.request.post('/api/users/first-register', { data: { email, password } });
    assert.equal(register.status(), 200);
    userID = (await register.json()).user.id;
    await context.clearCookies();
    await page.goto('/admin/login', { timeout: 120000 });
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('**/admin');
    await page.goto('/admin/collections/projects/create');
    await page.locator('#field-title').waitFor();
    await page.locator('#field-title').fill('CMS Workflow ' + suffix);
    await page.locator('#field-slug').fill('cms-workflow-' + suffix);
    await page.locator('#field-projectCode').fill('CMS-' + suffix);
    await page.locator('#field-description').fill('Created through the CMS admin.');
    await page.locator('[contenteditable="true"]').first().fill('Long formatted writing from the editor.');
    const project = await publish('projects');
    await page.locator('#field-description').fill('Edited through the CMS admin.');
    await publish('projects', false);
    await visitor.goto('/projects/' + project.slug);
    await visitor.getByText('Edited through the CMS admin.', { exact: true }).waitFor();
    await visitor.getByText('Long formatted writing from the editor.', { exact: true }).waitFor();
    await page.goto('/admin/collections/media/create');
    const png = await require('sharp')({ create: { width: 64, height: 96, channels: 3, background: '#72ff62' } }).png().toBuffer();
    await page.locator('input[type="file"]').setInputFiles({ name: 'cms-check-' + suffix + '.png', mimeType: 'image/png', buffer: png });
    await page.locator('#field-alt').fill('CMS workflow test page');
    const media = await publish('media');
    assert.equal((await publicContext.request.get(media.url)).status(), 403, 'Unattached media is private');
    await page.goto('/admin/collections/comics/create');
    await page.locator('#field-title').fill('CMS Comic ' + suffix);
    await page.locator('#field-slug').fill('cms-comic-' + suffix);
    await page.locator('#field-project input').fill(project.title);
    await page.getByRole('option', { name: project.title, exact: true }).click();
    const comic = await publish('comics');
    await page.goto('/admin/collections/chapters/create');
    await page.locator('#field-title').fill('CMS Chapter ' + suffix);
    await page.locator('#field-slug').fill('cms-chapter-' + suffix);
    await page.locator('#field-chapterNumber').fill('1');
    await page.locator('#field-comic input').fill(comic.title);
    await page.getByRole('option', { name: comic.title, exact: true }).click();
    await page.getByRole('button', { name: 'Add Page', exact: true }).click();
    await page.getByRole('button', { name: 'Choose from existing', exact: true }).click();
    await page.getByText(media.filename, { exact: true }).click();
    let chapter = await publish('chapters');
    await visitor.goto('/comics/' + project.slug + '/' + chapter.slug);
    await visitor.getByRole('heading', { name: chapter.title, exact: true }).waitFor();
    await visitor.waitForFunction(() => { const img = document.querySelector('.comic-figure img'); return img?.complete && img.naturalWidth > 0; });
    assert.equal((await publicContext.request.get(media.url)).status(), 200);
    await visitor.screenshot({ path: 'test-results/cms-published-reader.png', fullPage: true });
    const batch = page.getByRole('region', { name: 'Batch page upload' });
    await batch.locator('input[type="file"]').setInputFiles([
      { name: 'batch-' + suffix + '-10.png', mimeType: 'image/png', buffer: png },
      { name: 'batch-' + suffix + '-2.png', mimeType: 'image/png', buffer: png },
    ]);
    assert.deepEqual(await batch.locator('.batch-queue li').evaluateAll(els => els.map(el => el.dataset.filename)), ['batch-' + suffix + '-2.png', 'batch-' + suffix + '-10.png']);
    await batch.getByLabel('Alt text for batch-' + suffix + '-2.png', { exact: true }).fill('Batch page two');
    await batch.getByLabel('Alt text for batch-' + suffix + '-10.png', { exact: true }).fill('Batch page ten');
    let failOnce = true;
    await page.route('**/api/media', async route => {
      if (route.request().method() === 'POST' && failOnce) {
        failOnce = false; await route.fulfill({ status: 503, body: 'Temporary test failure' });
      } else await route.continue();
    });
    await batch.getByRole('button', { name: 'Upload files', exact: true }).click();
    const retry = batch.getByRole('button', { name: 'Retry batch-' + suffix + '-2.png', exact: true });
    await retry.waitFor();
    await page.waitForFunction(() => !document.querySelector('.batch-queue button')?.disabled);
    await retry.click();
    await retry.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => [...document.querySelectorAll('.batch-queue [role="status"]')].every(el => el.textContent === 'ready'));
    await batch.getByRole('button', { name: 'Attach uploaded files', exact: true }).click();
    await batch.getByRole('button', { name: 'Move page 3 up', exact: true }).click();
    chapter = await publish('chapters', false);
    assert.equal(chapter.pages.length, 3);
    assert.equal(chapter.pages[1].alt, 'Batch page ten');
    assert.equal(chapter.pages[2].alt, 'Batch page two');
    await visitor.reload();
    await visitor.getByRole('button', { name: /NEXT/ }).first().click();
    assert.match(await visitor.locator('.comic-figure img').getAttribute('src'), /-10.png/);
    await page.screenshot({ path: 'test-results/cms-batch-pages.png', fullPage: true });
    for (const change of [{ _status: 'draft' }, { _status: 'published', accessLevel: 'patron', listingVisibility: 'public' }]) {
      const response = await context.request.patch('/api/chapters/' + chapter.id, { data: change });
      assert.ok(response.ok(), await response.text());
      assert.ok([403,404].includes((await publicContext.request.get('/api/chapters/' + chapter.id)).status()), 'Protected chapter data is denied');
      assert.ok([403,404].includes((await publicContext.request.get(media.url)).status()), 'Protected chapter file is denied');
      assert.ok([403,404].includes((await publicContext.request.get(media.sizes.thumbnail.url)).status()), 'Protected derivative is denied');
      await visitor.goto('/comics/' + project.slug + '/' + chapter.slug);
      await visitor.getByRole('heading', { name: 'RECORD NOT FOUND' }).waitFor();
    }
    await context.request.patch('/api/chapters/' + chapter.id, { data: { _status: 'published', accessLevel: 'public' } });
    await context.request.patch('/api/projects/' + project.id, { data: { _status: 'draft' } });
    assert.ok([403,404].includes((await publicContext.request.get(media.url)).status()), 'Unpublished parent hides descendant files');
    console.log('PASS: admin login, project create/edit, rich text, image upload, comic/chapter forms, page attachment, publish-to-reader, unpublish, patron and parent/derivative access checks, batch upload, natural order, retry and manual page order.');
  } finally {
    if (userID) {
      const batches = await context.request.get('/api/media?where[filename][contains]=batch-' + suffix);
      if (batches.ok()) for (const doc of (await batches.json()).docs) created.push(['media', doc.id]);
    }
    const deletionOrder = ['chapters', 'comics', 'media', 'projects'];
    for (const [collection, id] of created.sort((a,b) => deletionOrder.indexOf(a[0]) - deletionOrder.indexOf(b[0]))) {
      const r = await context.request.delete(`/api/${collection}/${id}`);
      assert.ok(r.ok(), `Cleanup ${collection}/${id}: ${await r.text()}`);
    }
    if (userID) {
      await context.request.post('/api/users/login', { data: { email, password } });
      const response = await context.request.delete(`/api/users/${userID}`);
      assert.ok(response.ok(), 'Temporary administrator cleanup');
    }
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
