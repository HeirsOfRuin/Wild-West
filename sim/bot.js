// Reference bots. Each policy answers every decision explicitly, using only what
// the player can see (derive.js). The careful policy is the reference; the others
// exist to prove the decisions differ (the kill gate, sim/killgate.js).

import { act } from '../src/engine/season.js';
import { view, targetList, forecast, hideouts } from '../src/engine/derive.js';
import { targetDef } from '../src/engine/job.js';
import { yearOf } from '../src/engine/state.js';
import { members } from '../src/engine/gang.js';

export const POLICIES = {
  careful: { risk: 1, scout: true, approach: 'any', jobEvery: 1, retireAt: 1878, retirePurse: 9000, letters: true, give: true },
  noscout: { risk: 1, scout: false, approach: 'any', jobEvery: 1, retireAt: 1878, retirePurse: 9000, letters: true, give: true },
  quiet: { risk: 1, scout: true, approach: 'quiet', jobEvery: 1, retireAt: 1878, retirePurse: 9000, letters: true, give: true },
  bold: { risk: 1, scout: true, approach: 'bold', jobEvery: 1, retireAt: 1878, retirePurse: 9000, letters: true, give: true },
  raider: { risk: 0.2, scout: false, approach: 'bold', jobEvery: 0, retireAt: 9999, retirePurse: 1e9, letters: true, give: false, biggest: true },
  earlyout: { risk: 1, scout: true, approach: 'any', jobEvery: 1, retireAt: 1874, retirePurse: 6000, letters: true, give: true },
  stayer: { risk: 1, scout: true, approach: 'any', jobEvery: 1, retireAt: 9999, retirePurse: 1e9, letters: true, give: true },
  hermit: { risk: 1, scout: false, approach: 'any', jobEvery: 99, never: true, retireAt: 9999, retirePurse: 1e9, letters: false, give: false },
};

/** Candidate crews for a target: sizes, inside counts, approaches. */
function candidatePlans(s, v, target, pol) {
  const avail = v.gang.filter((m) => m.wounded === 0 || m.leader);
  const hides = hideouts(s, targetDef(target)).filter((h) => !h.lock);
  if (!hides.length) return [];
  const hide = hides.reduce((a, b) => ((s.sym[b.id === 'farm' ? 'clay' : b.id] ?? 0) > (s.sym[a.id === 'farm' ? 'clay' : a.id] ?? 0) ? b : a));
  const plans = [];
  const approaches = pol.approach === 'any' ? ['quiet', 'bold'] : [pol.approach];
  for (let n = 3; n <= Math.min(avail.length, 7); n++) {
    // Leader plus the n-1 best-rounded others.
    const others = avail.filter((m) => !m.leader).sort((a, b) => (b.gun + b.nerve + b.horse) - (a.gun + a.nerve + a.horse)).slice(0, n - 1);
    const crewMen = [avail.find((m) => m.leader), ...others];
    if (crewMen.length < n) continue;
    const holdersNeeded = Math.max(1, Math.ceil(n / 4));
    for (let k = 1; k <= Math.min(3, n - holdersNeeded); k++) {
      const byNerve = [...crewMen].sort((a, b) => b.nerve - a.nerve);
      const inside = byNerve.slice(0, k);
      const rest = crewMen.filter((m) => !inside.includes(m)).sort((a, b) => b.horse - a.horse);
      const horses = rest.slice(0, holdersNeeded);
      const street = rest.slice(holdersNeeded);
      const crew = [...inside.map((m) => ({ id: m.id, role: 'inside' })), ...horses.map((m) => ({ id: m.id, role: 'horses' })), ...street.map((m) => ({ id: m.id, role: 'street' }))];
      for (const approach of approaches) plans.push({ type: 'job', target, crew, approach, hideout: hide.id, cut: 'even' });
    }
  }
  return plans;
}

function utility(s, f, pol) {
  if (f.problem) return -Infinity;
  const m = f.mid;
  // Dollars against blood: a killing costs sympathy and the reward; a lost man costs the gang.
  return m.take + 150 * m.legend - pol.risk * (m.leaderRisk * 150000 + m.losses * 3000 + m.kill * 3000 + m.catch * 800);
}

function bestPlan(s, v, pol) {
  let best = null;
  for (const t of targetList(s)) {
    if (t.lock) continue;
    if (t.heat >= 60 && !pol.biggest) continue;
    for (const p of candidatePlans(s, v, t.id, pol)) {
      const f = forecast(s, p);
      if (f.problem) continue;
      const u = pol.biggest ? f.mid.take : utility(s, f, pol);
      if (!best || u > best.u) best = { p, f, u, t };
    }
  }
  return best;
}

/** One decision: returns the next action (free or season-ending). */
export function step(s, polName = 'careful') {
  const pol = typeof polName === 'string' ? POLICIES[polName] : polName;
  const v = view(s);
  const y = yearOf(s.t);

  if (s.retired) return { type: 'wait' };

  // Winding down: dissolve, live as Mr. Howard, retire.
  const windDown = y >= pol.retireAt || (y >= 1873 && s.purse >= pol.retirePurse);
  if (windDown) {
    const f = v.gang.find((m) => !m.leader);
    if (f) return { type: 'dismiss', id: f.id, stake: s.purse >= 300 + 5000 };
    if (!v.actions.retire) return { type: 'retire' };
    const place = v.coverOptions.find((o) => o.id === 'nashville' && !o.lock) || v.coverOptions.find((o) => !o.lock);
    if (place && (s.purse >= 2000 + place.cost || s.cover.level < 60)) return { type: 'cover', place: place.id };
  }

  // Free actions first.
  if (pol.letters && !v.actions.letter && s.lastJob && !s.lastJob.cashierKilled && !s.lastJob.bystanders) return { type: 'letter' };
  const sus = v.gang.find((m) => m.suspected && !m.leader);
  if (sus) return { type: 'dismiss', id: sus.id };
  const rec = v.recruits.find((r) => !r.lock);
  if (rec && v.gang.length < 6 && !windDown) return { type: 'recruit', id: rec.id };
  const sullen = v.gang.find((m) => !m.leader && m.mood.word === 'Sullen');
  if (sullen && s.purse > 1200 && s.gang.find((g) => g.id === sullen.id).bonusT !== s.t) return { type: 'bonus', id: sullen.id, amount: 200 };

  // A job?
  const due = !pol.never && (s.idle >= pol.jobEvery || v.gang.some((m) => !m.leader && m.pocket < 80));
  if (!windDown && due && v.gang.length >= 3) {
    if (pol.scout && s.scouts < 2 && s.purse >= 150) {
      const best = bestPlan(s, v, pol);
      if (best && !best.f.scouted && !best.t.scoutLock) return { type: 'scout', target: best.t.id };
    }
    const best = bestPlan(s, v, pol);
    if (best && (pol.biggest || best.u > 300)) return best.p;
  }

  // Lie low where it is safest.
  const opts = v.lieLow.filter((o) => !o.lock);
  const score = (o) => (s.sym[o.county] - s.heat[o.county] - 100 * v.risks.inform[o.county]) - (o.id === 'farm' && s.pinkActive ? s.pinkerton / 2 : 0);
  const at = opts.reduce((a, b) => (score(b) > score(a) ? b : a));
  const give = pol.give && s.purse > 900 && s.sym[at.county] < 60 ? 200 : 0;
  return { type: 'lielow', at: at.id, give };
}

/** Play a whole game. Returns the final state. */
export function playGame(seed, polName = 'careful', tune = {}, newGame) {
  let s = newGame(seed, tune);
  let guard = 0;
  while (!s.outcome) {
    const a = step(s, polName);
    s = act(s, a);
    if (++guard > 2000) throw new Error(`seed ${seed}: no end after 2000 actions (stuck on ${a.type})`);
  }
  return s;
}
