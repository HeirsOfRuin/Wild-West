// The kill gate: do the decisions matter? Same seeds, paired policies, every
// axis with its noise floor.   node sim/killgate.js [runs=150]
import { compare } from './stats.js';
import { playGame } from './bot.js';
import { metrics } from './run.js';
import { newGame } from '../src/engine/state.js';

const runs = Number(process.argv[2] || 150);
const cache = {};
const rows = (pol) => (cache[pol] ||= Array.from({ length: runs }, (_, i) => metrics(playGame(1 + i * 7919, pol, {}, newGame))));
const PAIRS = [
  ['careful', 'plain', 'Does spending on horses, guns, houses and sheriffs pay?'],
  ['careful', 'twocrews', 'Do two crews pay?'],
  ['careful', 'noscout', 'Is scouting worth its cost?'],
  ['quiet', 'bold', 'Does the approach matter?'],
  ['careful', 'stayer', 'Does quitting pay?'],
  ['careful', 'raider', 'Does planning beat greed?'],
];
for (const [a, b, q] of PAIRS) {
  const A = rows(a), B = rows(b);
  console.log(`\n${q}  (${a} -> ${b}, ${runs} seeds each)`);
  console.log(compare(['retired', 'killed', 'captured', 'betrayed', 'years', 'jobs', 'purse', 'spent', 'gangPeak', 'legendPeak', 'gangDead', 'townsfolkKilled']
    .map((k) => ({ label: k, base: A.map((r) => r[k]), variant: B.map((r) => r[k]) }))));
}
