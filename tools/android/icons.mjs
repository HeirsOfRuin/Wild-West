// Write the launcher icon at each Android density from a square PNG, with the
// browser the repo already uses (Playwright), so no image library is needed.
//   node icons.mjs <icon-512.png> <res dir>
const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const [src, res] = process.argv.slice(2);
const data = `data:image/png;base64,${(await readFile(src)).toString('base64')}`;
const SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const browser = await chromium.launch();
for (const [d, px] of Object.entries(SIZES)) {
  const page = await browser.newPage({ viewport: { width: px, height: px } });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style><img src="${data}" style="width:${px}px;height:${px}px;display:block">`);
  await mkdir(join(res, `mipmap-${d}`), { recursive: true });
  await page.screenshot({ path: join(res, `mipmap-${d}`, 'ic_launcher.png'), omitBackground: true });
  await page.close();
}
await browser.close();
