const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 474, height: 1027 }, deviceScaleFactor: 1 });
  await page.goto('file:///E:/AI游戏/ZOO/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.click('#zoo-nav-collection');
  await page.waitForTimeout(800);
  await page.click('[data-species-id="red-panda"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'E:/AI游戏/ZOO/tools/collection-detail-current.png' });
  const hit1 = await page.evaluate(() => {
    const el = document.elementFromPoint(30, 250);
    return el ? { tag: el.tagName, id: el.id || '', cls: String(el.className || '') } : null;
  });
  console.log(JSON.stringify({ hit1 }));
  await browser.close();
})();
