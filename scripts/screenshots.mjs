// Renders the CRM pages with Playwright for comparison with design/.
// Run: NODE_PATH=$(npm root -g) node scripts/screenshots.mjs  (dev server on :3001, API on :4000)
import { createRequire } from 'node:module';

const { chromium } = createRequire(process.env.NODE_PATH + '/')('playwright');

const BASE = process.env.BASE ?? 'http://localhost:3001';
const OUT = new URL('../screenshots/', import.meta.url).pathname;

const browser = await chromium.launch();

async function shoot(email, pages, viewport, setup) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  await ctx.addInitScript(([token, cafeId]) => {
    localStorage.setItem('tb.devToken', token);
    if (cafeId) localStorage.setItem('tb.cafeId', cafeId);
  }, [`dev:${email}`, setup?.cafeId ?? null]);
  const page = await ctx.newPage();
  for (const [path, file, action] of pages) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    if (action) await action(page);
    await page.screenshot({ path: OUT + file, fullPage: !!setup?.fullPage });
    console.log('saved', file);
  }
  await ctx.close();
}

await shoot('cafe@towerbites.dev', [
  ['/cafe', 'board.png'],
  ['/cafe/menu', 'cafe-menu.png'],
  ['/cafe/history', 'cafe-history.png'],
  ['/cafe', 'board-reject-dialog.png', (p) => p.getByRole('button', { name: 'Reject' }).first().click()],
], { width: 1440, height: 810 });

await shoot('admin@towerbites.dev', [
  ['/admin', 'admin-dashboard.png'],
  ['/admin/locations', 'admin-locations.png'],
  ['/admin/cafes', 'admin-cafes.png'],
  ['/admin/cafes', 'admin-cafe-form.png', (p) => p.getByRole('button', { name: 'Edit cafe' }).first().click()],
  ['/admin/products', 'admin-products.png'],
  ['/admin/products', 'admin-item-form.png', (p) => p.getByRole('button', { name: 'Edit Masala Chai' }).click()],
  ['/admin/staff', 'admin-staff.png'],
  ['/admin/orders', 'admin-orders.png'],
  ['/admin/users', 'admin-users.png'],
], { width: 1440, height: 900 });

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: OUT + 'login.png' });
console.log('saved login.png');
await browser.close();
