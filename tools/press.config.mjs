// tools/press.config.mjs: what tools/press.mjs photographs. Each shot drives the
// REAL build to a moment worth showing. The save is a real game the careful bot
// played to summer 1869 (seed 7919, as Will Harlan), made by tools/press-seed.mjs and
// loaded through the game's own save key, so every number on screen is the game's.
import { readFileSync } from 'node:fs';

const SAVE = readFileSync(new URL('../release/_press-save.json', import.meta.url), 'utf8');

async function load(page, reload) {
  await page.evaluate((s) => { localStorage.setItem('outlaw.save.v1', s); }, SAVE);
  await reload();
  await page.click('[data-act="continue"]');
}

export default {
  site: 'dist/site',
  size: [390, 844], // the measured embed size (tools/embed-measure.mjs)
  cover: 'docs/itch/cover.html',
  hide: ['.toast', '.hint'],
  shots: [
    {
      name: 'plan-a-job',
      async drive({ page, reload }) {
        await load(page, reload);
        await page.click('[data-screen="job"]');
        await page.locator('[data-act="pick"]').first().click();
        await page.evaluate(() => window.scrollTo(0, 0));
      },
    },
    {
      name: 'the-map',
      async drive({ page, reload }) {
        await load(page, reload);
        await page.click('[data-tab="map"]');
      },
    },
    {
      name: 'the-gang',
      async drive({ page, reload }) {
        await load(page, reload);
        await page.click('[data-tab="gang"]');
      },
    },
    {
      name: 'the-papers',
      async drive({ page, reload }) {
        await load(page, reload);
        await page.click('[data-screen="job"]');
        await page.locator('[data-act="pick"]').first().click();
        await page.click('[data-act="ride"]');
        await page.evaluate(() => window.scrollTo(0, 0));
      },
    },
  ],
};
