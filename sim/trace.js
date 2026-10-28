// One game, season by season: node sim/trace.js [seed=1] [policy=careful]
import { step } from './bot.js';
import { act } from '../src/engine/season.js';
import { newGame, dateOf } from '../src/engine/state.js';
import { active } from '../src/engine/gang.js';

const seed = Number(process.argv[2] || 1), pol = process.argv[3] || 'careful';
let s = newGame(seed);
while (!s.outcome) {
  const a = step(s, pol);
  const t = s.t;
  s = act(s, a);
  const tag = a.type === 'job' ? `JOB ${a.target} ${a.approach} n=${a.crew.length} -> $${s.lastJob.loot}${s.lastJob.casualties.length ? ' ' + s.lastJob.casualties.map((c) => c.id + ':' + c.fate).join(',') : ''}`
    : a.type === 'lielow' ? `lie low ${a.at}${a.give ? ' give ' + a.give : ''}` : `${a.type} ${a.id || a.target || a.place || ''}`;
  if (s.t !== t || s.outcome) {
    const g = active(s).filter((m) => !m.leader).map((m) => `${m.id}:${Math.round(m.loyalty)}/${m.stage}`).join(' ');
    console.log(`${dateOf(t).padEnd(12)} ${tag.padEnd(56)} $${String(s.purse).padStart(6)} L${Math.round(s.legend)} R${s.reward} P${Math.round(s.pinkerton)} | ${g}`);
    for (const e of s.report?.events || []) console.log(`      ${e.kind}: ${e.text.slice(0, 110)}`);
  } else console.log(`${''.padEnd(12)} ${tag}`);
}
console.log(s.outcome.kind, s.outcome.cause || '', s.outcome.text);
