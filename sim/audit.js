// Continuity audit: play many games and read every line a player would see.
// Flags raw tokens, the dead speaking or acting, two men with one name, the same
// line twice in one report, and questions asked about men who are not there.
//   node sim/audit.js [games=60]
import { step } from './bot.js';
import { act } from '../src/engine/season.js';
import { newGame, dateOf } from '../src/engine/state.js';
import { incidentView } from '../src/engine/incidents.js';

const N = Number(process.argv[2] || 60);
const POLS = ['careful', 'twocrews', 'stayer', 'raider'];
const problems = {};
const note = (kind, text) => { (problems[kind] ||= []).push(text); };
let lines = 0;

for (let i = 0; i < N; i++) {
  const pol = POLS[i % POLS.length];
  let s = newGame(1 + i * 104729);
  let guard = 0;
  while (!s.outcome && guard++ < 3000) {
    const a = step(s, pol);
    if (s.incident) {
      const v = incidentView(s);
      for (const id of s.incident.bind.who) {
        const g = s.gang.find((x) => x.id === id);
        const ok = s.incident.id === 'q-letter' ? g?.status === 'gone' : g?.status === 'active';
        if (!ok) note('question about a man who is not there', `${dateOf(s.t)} ${s.incident.id}: ${g?.name} is ${g?.status}`);
      }
      lines++;
      if (/undefined|NaN|\[object|\$\{/.test(v.text + v.options.map((o) => o.label + o.stakes.join(' ')).join(' '))) note('raw token', v.text);
    }
    const before = s;
    s = act(s, a);
    if (s.t === before.t && !s.outcome) continue;
    const r = s.report;
    // Each crew's story is read on its own; two quiet robberies may share a line.
    const groups = [[...(r.job?.beats || []), r.job?.headline || '', ...r.events.map((e) => e.text), r.state?.text || ''], r.job?.second?.beats || []];
    const texts = groups.flat().filter(Boolean);
    lines += texts.length;
    for (const grp of groups) {
      const seen = new Set();
      for (const t of grp.filter(Boolean)) {
        if (seen.has(t)) note('same line twice in one report', `${dateOf(r.t)}: ${t}`);
        seen.add(t);
      }
    }
    for (const t of texts) {
      if (/undefined|NaN|\[object|\$\{|\bnull\b/.test(t)) note('raw token', `${dateOf(r.t)}: ${t}`);
      // The dead do not act: a man who died before this season should not appear in it.
      for (const g of before.gang) {
        if (g.status === 'dead' && g.diedT < r.t && t.includes(g.name)) note('the dead appear', `${dateOf(r.t)}: ${t}`);
      }
    }
    const names = [...s.gang.map((g) => g.name), ...s.family.map((f) => f.name)];
    const dup = names.find((n, k) => names.indexOf(n) !== k);
    if (dup) note('two people, one name', `${dateOf(s.t)}: ${dup}`);
  }
}
console.log(`${N} games, ${lines} lines read`);
const kinds = Object.keys(problems);
for (const k of kinds) {
  const uniq = [...new Set(problems[k])];
  console.log(`\n!! ${k}: ${problems[k].length}`);
  for (const x of uniq.slice(0, 5)) console.log('   ' + x);
}
if (!kinds.length) console.log('nothing found');
process.exit(kinds.length ? 1 : 0);
