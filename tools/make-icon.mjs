// The home-screen icon, drawn rather than pasted in as a blob.
// iOS will not take an SVG for apple-touch-icon, so this renders real PNGs.
//   node tools/make-icon.mjs          # writes assets/icon-180.png and icon-512.png
const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(PW);
const chromium = pw.chromium || pw.default?.chromium;
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A wanted bill: newsprint, a black border, a red star for the dead-or-alive.
const SVG = (s) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#17120d"/>
  <rect x="96" y="70" width="320" height="372" fill="#ece3cf"/>
  <rect x="114" y="88" width="284" height="336" fill="none" stroke="#241c14" stroke-width="10"/>
  <rect x="146" y="128" width="220" height="34" fill="#241c14"/>
  <path d="M256 196 L281 262 L351 262 L294 302 L316 370 L256 328 L196 370 L218 302 L161 262 L231 262 Z" fill="#8e2a1c"/>
  <rect x="146" y="384" width="220" height="14" fill="#241c14"/>
</svg>`;

const browser = await chromium.launch();
await mkdir(join(ROOT, 'assets'), { recursive: true });
for (const size of [180, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;padding:0;background:transparent}</style>${SVG(size)}`);
  const buf = await page.screenshot({ omitBackground: true });
  await writeFile(join(ROOT, 'assets', `icon-${size}.png`), buf);
  console.log(`assets/icon-${size}.png  ${(buf.length / 1024).toFixed(1)} KB`);
  await page.close();
}
await browser.close();
