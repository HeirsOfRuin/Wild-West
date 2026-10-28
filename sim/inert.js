// Inert check: does every tuning knob and every trait change a game?
// A knob the engine ignores gives a byte-identical end state (the engine is
// deterministic), so this is exact, not statistical.   node sim/inert.js
import { inertCheck } from './inert-check.js';
import { playGame } from './bot.js';
import { newGame } from '../src/engine/state.js';
import { CONFIG } from '../src/data/config.data.js';
import { TRAITS } from '../src/data/gang.data.js';

const POLS = ['careful', 'stayer', 'hermit', 'plain'];
const SEEDS = [1, 2, 3];
const playAll = (seed, tune) => POLS.map((p) => playGame(seed, p, tune, newGame));
const SKIP = new Set(['startYear', 'endYear', 'seasons']); // the calendar, not a knob

const knobs = {};
for (const [k, v] of Object.entries(CONFIG)) {
  if (SKIP.has(k)) continue;
  if (typeof v === 'number') knobs[k] = { default: v, try: [v === 0 ? 1 : Number.isInteger(v) && v < 10 ? v + 2 : v * 1.6] };
  else if (v && typeof v === 'object') knobs[k] = { default: v, try: [Object.fromEntries(Object.entries(v).map(([a, b]) => [a, b * 1.6]))] };
}
const r = inertCheck({ play: (seed, cfg) => playAll(seed, cfg), knobs, seeds: SEEDS });
console.log(r.text);

// Traits: switch one trait off for everyone (tune.offTraits) and see whether any game changes.
const inertTraits = [];
// Traits are rare in any one game (a hothead only matters if he goes inside), so
// they get more seeds than the knobs; test/traits.test.js covers each by a scene.
const TSEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const strip = (games) => JSON.stringify(games.map((g) => ({ ...g, tune: {} })));
const base = TSEEDS.map((s) => strip(playAll(s, {})));
for (const t of Object.keys(TRAITS)) {
  const changed = TSEEDS.filter((s, i) => strip(playAll(s, { offTraits: [t] })) !== base[i]).length;
  console.log(`trait ${t.padEnd(12)} ${changed ? `moves the game (${changed}/${TSEEDS.length} seeds)` : 'INERT'}`);
  if (!changed) inertTraits.push(t);
}
if (r.inert.length || inertTraits.length) { console.log(`\n!! inert: ${[...r.inert, ...inertTraits].join(', ')}`); process.exit(1); }
