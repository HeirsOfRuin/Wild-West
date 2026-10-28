// Finds settings, effects and options the engine never reads.
//
// The single most repeated defect across the eight builds: something declared,
// shown or offered that changes nothing.
//   - Farmyard: 21 of 26 technology effects, then 35 declared effects in all,
//     read by nothing; a war's labourShortage aggregated every year and used nowhere.
//   - Touchline: time wasting, offside trap and attacking focus in the UI and never
//     read; autoPickOnMatchday written at creation and read in zero places.
//   - Knight of Adalia: 18 hollow choices; 120 flags set and never read.
//
// A text search ("does the key name appear in the engine?") gives false passes:
// Farmyard's guard passed labourShortage because the name appeared in the code
// that collected it. Test BEHAVIOUR instead. With a deterministic engine, a knob
// the engine ignores produces a byte-identical end state, so this is an exact
// test, not a statistical one (Touchline's ablate.js).
//
// Usage:
//   import { inertCheck } from './inert-check.js';
//   const report = inertCheck({
//     play: (seed, cfg) => runGame(seed, cfg),            // returns final state
//     knobs: {
//       timeWasting:   { default: 0, try: [1, -1] },
//       offsideTrap:   { default: false, try: [true] },
//     },
//     seeds: [1, 2, 3],
//     digest: (s) => JSON.stringify(s.results),          // optional: what to compare
//   });
//   console.log(report.text); if (report.inert.length) process.exit(1);

import { createHash } from 'node:crypto';

export function inertCheck({ play, knobs, seeds = [1, 2, 3], digest = (s) => JSON.stringify(s) }) {
  const hash = (s) => createHash('sha1').update(digest(s)).digest('hex');
  const baseCfg = Object.fromEntries(Object.entries(knobs).map(([k, v]) => [k, v.default]));
  const baseHashes = seeds.map((seed) => hash(play(seed, baseCfg)));
  const lines = [];
  const inert = [];
  for (const [name, k] of Object.entries(knobs)) {
    for (const value of k.try) {
      const cfg = { ...baseCfg, [name]: value };
      const same = seeds.filter((seed, i) => hash(play(seed, cfg)) === baseHashes[i]).length;
      const verdict = same === seeds.length ? 'INERT (byte-identical on every seed)' : same ? `partly inert (${same}/${seeds.length} seeds identical)` : 'moves the game';
      if (same === seeds.length) inert.push(`${name}=${JSON.stringify(value)}`);
      lines.push(`${name.padEnd(24)} = ${JSON.stringify(value).padEnd(10)} ${verdict}`);
    }
  }
  // "Moves the game" is necessary, not sufficient: follow with an ablation that
  // checks the effect is big enough to be worth a control (stats.js compare()).
  // A real effect smaller than the noise floor should be reported as such, not
  // as "ignored" (Touchline's ablate.js said both the same way at first).
  lines.push(`\n${inert.length} inert of ${Object.values(knobs).reduce((a, k) => a + k.try.length, 0)} knob settings`);
  return { inert, text: lines.join('\n') };
}
