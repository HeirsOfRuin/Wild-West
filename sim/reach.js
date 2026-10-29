// Content reach: how often does a player get to see each part of the game?
// Content nobody reaches is effort nobody sees.   node sim/reach.js [games=200]
import { step } from './bot.js';
import { act } from '../src/engine/season.js';
import { newGame, yearOf } from '../src/engine/state.js';

const N = Number(process.argv[2] || 200);
const hits = {};
const hit = (k) => { hits[k] = (hits[k] || 0) + 1; };
for (let i = 0; i < N; i++) {
  const pol = i % 2 ? 'careful' : 'stayer';
  let s = newGame(1 + i * 7919);
  const seen = new Set();
  const mark = (k) => { if (!seen.has(k)) { seen.add(k); hit(k); } };
  while (!s.outcome) {
    const a = step(s, pol);
    if (a.type === 'answer') mark(`question: ${s.incident.id}`);
    if (a.type === 'job') { mark(`job: ${a.target}`); if (a.second) mark('a second crew rides'); }
    s = act(s, a);
    const y = yearOf(s.t);
    for (const yy of [1870, 1873, 1876, 1880]) if (y >= yy) mark(`alive in ${yy}`);
    if (s.flags.northfieldOffer) mark('Northfield offered');
    if (s.flags.farmRaid !== undefined) mark('the Pinkerton raid on the farm');
    if (s.gang.some((g) => g.id === 'bobford')) mark('Bob Ford rides with you');
    if (s.lieutenant) mark('a lieutenant');
    if (s.married) mark('married');
    if (s.retired) mark('retired (began the quiet years)');
    if (s.law?.past.some((p) => p.fate === 'killed by your gang')) mark('a sheriff killed');
  }
  mark(`ended: ${s.outcome.kind}${s.outcome.cause ? ` (${s.outcome.cause})` : ''}`);
}
const rows = Object.entries(hits).sort((a, b) => b[1] - a[1]);
for (const [k, v] of rows) console.log(`${String(Math.round((100 * v) / N)).padStart(4)}%  ${k}`);
