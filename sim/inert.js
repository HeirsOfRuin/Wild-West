// Inert check: does every tuning knob and every trait change a game?
// A knob the engine ignores gives a byte-identical end state (the engine is
// deterministic), so this is exact, not statistical.   node sim/inert.js
import { inertCheck } from './inert-check.js';
import { playGame } from './bot.js';
import { newGame } from '../src/engine/state.js';
import { CONFIG } from '../src/data/config.data.js';
import { GANG, RECRUITS, TRAITS } from '../src/data/gang.data.js';

const POLS = ['careful', 'stayer', 'hermit'];
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

// Traits: strip one trait from everyone and see whether any game changes.
const defs = [...GANG, ...RECRUITS];
const inertTraits = [];
for (const t of Object.keys(TRAITS)) {
  const base = SEEDS.map((s) => JSON.stringify(playAll(s, {})));
  const saved = defs.map((d) => d.traits.slice());
  for (const d of defs) d.traits = d.traits.filter((x) => x !== t);
  const changed = SEEDS.filter((s, i) => JSON.stringify(playAll(s, {})) !== base[i]).length;
  defs.forEach((d, i) => { d.traits = saved[i]; });
  console.log(`trait ${t.padEnd(12)} ${changed ? `moves the game (${changed}/${SEEDS.length} seeds)` : 'INERT'}`);
  if (!changed) inertTraits.push(t);
}
if (r.inert.length || inertTraits.length) { console.log(`\n!! inert: ${[...r.inert, ...inertTraits].join(', ')}`); process.exit(1); }
