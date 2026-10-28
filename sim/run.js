// Batch runner: N seeded games per policy, refusing stalled runs.
//   node sim/run.js [runs=200] [policy,policy,...]
import { runBatch } from './harness.js';
import { playGame, POLICIES } from './bot.js';
import { newGame, lastTurn } from '../src/engine/state.js';

const runs = Number(process.argv[2] || 200);
const pols = (process.argv[3] || Object.keys(POLICIES).join(',')).split(',');

export const progress = (s) => {
  const miss = [];
  if (!s.outcome) miss.push('no outcome');
  if (s.t < 1 && s.outcome?.kind !== 'killed' && s.outcome?.kind !== 'captured') miss.push('never left the first season');
  return miss;
};
export const metrics = (s) => ({
  retired: s.outcome.kind === 'retired',
  killed: s.outcome.kind === 'killed',
  captured: s.outcome.kind === 'captured',
  betrayed: s.outcome.kind === 'betrayed',
  eraEnd: s.outcome.kind === 'era',
  years: (s.t + 1) / 4,
  jobs: s.stats.jobs,
  take: s.stats.take,
  purse: s.purse,
  spent: s.stats.spent,
  gangPeak: Math.max(...s.hist.map((h) => h.gang)),
  legendPeak: Math.max(...s.hist.map((h) => h.legend)),
  gangDead: s.dead.length,
  diedOnJob: s.outcome.cause === 'job',
  informant: s.outcome.cause === 'informant',
  turncoat: s.outcome.cause === 'turncoat',
  pinkRaid: s.outcome.cause === 'pinkerton',
  recognised: s.outcome.cause === 'recognised',
  townsfolkKilled: s.stats.cashiers + s.stats.bystanders,
});

if (import.meta.url === `file://${process.argv[1]}`) {
  let failed = false;
  for (const p of pols) {
    const r = runBatch({ runs, play: (seed) => playGame(seed, p, {}, newGame), progress, metrics, label: p });
    console.log(r.report + '\n');
    failed ||= r.failed;
  }
  if (failed) process.exit(1);
}
