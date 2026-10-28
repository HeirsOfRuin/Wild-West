// Drive the real page in a real browser at phone size (390x844).
// It checks what the unit tests cannot: the page throws, a button does nothing,
// a screen renders raw tokens, the layout scrolls sideways, a save fails to
// reopen. It plays seasons by clicking, the way a player would.
//
//   node tools/smoke.mjs                  # serves the repo, plays, screenshots
//   SHOTS=/some/dir node tools/smoke.mjs  # where the screenshots go

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const SHOTS = process.env.SHOTS || '/tmp/outlaw-shots';
const PORT = 8761;
await mkdir(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const path = join(ROOT, rel === '/' ? 'index.html' : rel);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED|net::/.test(m.text())) errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

let failures = 0;
const check = (label, ok, detail = '') => { console.log(`${ok ? 'ok  ' : '!!  '} ${label}${detail ? `  ${detail}` : ''}`); if (!ok) failures++; };
const has = async (sel) => (await page.locator(sel).count()) > 0;
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const rawTokens = () => page.evaluate(() => (document.body.innerText.match(/undefined|NaN|\[object|\$\{|null\b/g) || []).slice(0, 3));
let shot = 0;
async function look(name) {
  await page.screenshot({ path: join(SHOTS, `${String(++shot).padStart(2, '0')}-${name}.png`), fullPage: false });
  const o = await overflow();
  const raw = await rawTokens();
  check(`${name}: no sideways scroll`, o <= 0, o > 0 ? `${o}px` : '');
  check(`${name}: no raw tokens`, raw.length === 0, raw.join(' '));
  if (errors.length) { check(`${name}: no page errors`, false, errors.join(' | ')); errors.length = 0; }
}

await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.reload({ waitUntil: 'load' });
check('title screen renders', await has('[data-act="new"]'));
await look('title');

await page.click('[data-act="new"]');
check('New outlaw opens the creation screen', await has('#cr-first'));
await page.click('[data-act="cr-start"]');
check('Ride out with no name explains itself', await has('.toast'));
await page.fill('#cr-first', 'Ike');
await page.fill('#cr-last', 'Carver');
await page.locator('#cr-last').blur();
await page.click('[data-act="cr-bg"][data-v="farmer"]');
await page.click('[data-act="cr-home"][data-v="ray"]');
await look('create');
await page.click('[data-act="cr-start"]');
check('a new game opens on the season screen', await has('[data-screen="job"]'));
check('the masthead names the outlaw', (await page.locator('.bar .who').innerText()).includes('Ike Carver'));
await look('season');

// Scout and rob the first open target with the default plan.
await page.click('[data-screen="job"]');
await look('targets');
const scout = page.locator('[data-act="scout"]:not([disabled])').first();
if (await scout.count()) { await scout.click(); }
await page.locator('[data-act="pick"]').first().click();
await look('plan');
const ride = page.locator('[data-act="ride"]:not([disabled])');
check('the default plan can ride', (await ride.count()) > 0);
if (await ride.count()) await ride.click();
check('a job produces a newspaper report', await has('.paper .headline'));
await look('report');
await page.click('[data-act="done"]');

for (const tab of ['gang', 'map', 'news']) {
  await page.click(`[data-tab="${tab}"]`);
  await look(tab);
  if (tab === 'gang') {
    const buy = page.locator('[data-act="buy"]:not([disabled])').first();
    if (await buy.count()) {
      const p0 = await page.evaluate(() => globalThis.__outlaw.state.purse);
      await buy.click();
      const p1 = await page.evaluate(() => globalThis.__outlaw.state.purse);
      check('buying gear takes money from the purse', p1 < p0, `${p0} -> ${p1}`);
    }
  }
  if (tab === 'map') {
    await page.locator('[data-act="county"][data-id="daviess"]').click();
    check('tapping a county opens its panel', (await page.locator('.card h3').first().innerText()).includes('Daviess'));
    await look('map-daviess');
  }
}
await page.click('[data-tab="season"]');
await page.click('[data-act="help"]');
await look('help');
await page.click('[data-act="back"]');

// Play on: alternate lying low and jobs, by clicking, until the game ends or 24 seasons pass.
const t0 = await page.evaluate(() => globalThis.__outlaw.state.t);
for (let i = 0; i < 24; i++) {
  if (await has('[data-act="new"]')) break; // the end screen
  if (i % 2 === 0) {
    await page.click('[data-screen="lielow"]');
    await page.locator('[data-act="lielow"]').click();
    if (await has('[data-act="done"]')) await page.click('[data-act="done"]');
  } else {
    await page.click('[data-screen="job"]');
    const open = page.locator('[data-act="pick"]');
    if (!(await open.count())) { await page.click('[data-act="back"]'); continue; }
    await open.nth(i % (await open.count())).click();
    const r = page.locator('[data-act="ride"]:not([disabled])');
    if (await r.count()) { await r.click(); if (await has('[data-act="done"]')) await page.click('[data-act="done"]'); }
    else { await page.click('[data-act="untarget"]'); await page.click('[data-act="back"]'); }
  }
  if (errors.length) { check(`season ${i}: no page errors`, false, errors.join(' | ')); errors.length = 0; }
}
const t1 = await page.evaluate(() => globalThis.__outlaw.state?.t ?? -1);
const over = await has('[data-act="new"]');
check('seasons advanced by clicking', t1 > t0 || over, `t ${t0} -> ${t1}${over ? ' (game over)' : ''}`);
await look('later');

// The save survives a reload.
if (!over) {
  await page.reload({ waitUntil: 'load' });
  check('a reload offers Continue', await has('[data-act="continue"]'));
  await page.click('[data-act="continue"]');
  const t2 = await page.evaluate(() => globalThis.__outlaw.state.t);
  check('Continue restores the same season', t2 === t1, `${t1} -> ${t2}`);
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed. Screenshots in ${SHOTS}` : `\nall checks passed. Screenshots in ${SHOTS}`);
process.exit(failures ? 1 : 0);
