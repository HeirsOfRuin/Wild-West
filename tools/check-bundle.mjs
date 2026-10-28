// Does the single-file build work when opened from disk, and does the Pages
// build install and open offline? A bundler that writes a file is not one that
// writes a WORKING file (The Lists shipped one that would not parse).
const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { resolve, join, extname } from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + resolve('dist/dead-or-alive.html'), { waitUntil: 'load' });
const title = await page.locator('[data-act="new"]').count();
console.log('title renders from file://   ', title ? 'yes' : 'NO');
if (!title) errors.push('no title from file://');
else {
  await page.click('[data-act="new"]');
  await page.click('[data-screen="job"]');
  await page.locator('[data-act="pick"]').first().click();
  await page.click('[data-act="ride"]');
  const ok = await page.locator('.paper .headline').count();
  console.log('a job runs from file://       ', ok ? 'yes' : 'NO');
  if (!ok) errors.push('job did not run from file://');
}

const SITE = resolve('dist/site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const path = join(SITE, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(8763, r));
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const site = await ctx.newPage();
await site.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
site.on('pageerror', (e) => errors.push(`site: ${e.message}`));
await site.goto('http://localhost:8763/', { waitUntil: 'load' });
const t2 = await site.locator('[data-act="new"]').count();
console.log('the Pages build renders       ', t2 ? 'yes' : 'NO');
const manifestOk = await site.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]')?.href;
  const m = await (await fetch(href)).json();
  const icons = await Promise.all(m.icons.map((i) => fetch(new URL(i.src, href)).then((r) => r.ok)));
  return m.name === 'Dead or Alive' && icons.every(Boolean);
});
console.log('manifest and icons are served ', manifestOk ? 'yes' : 'NO');
if (!manifestOk) errors.push('manifest or icons missing');
const worker = await site.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active));
console.log('the offline worker is active  ', worker ? 'yes' : 'NO');
if (!worker) errors.push('no service worker');
await site.reload({ waitUntil: 'load' });
await ctx.setOffline(true);
await site.reload({ waitUntil: 'load' });
const off = await site.locator('[data-act="new"]').count();
console.log('it opens again offline        ', off ? 'yes' : 'NO');
if (!off) errors.push('not offline');
server.close();
await browser.close();
if (errors.length) { console.log(`\n!! ${errors.length} problem(s):`); for (const e of [...new Set(errors)].slice(0, 6)) console.log('   ' + e); process.exit(1); }
console.log('the single file and the Pages build both work');
