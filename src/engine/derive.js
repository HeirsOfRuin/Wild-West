// Every number the player sees, computed here and nowhere else. The UI and the
// bot read this module; neither does arithmetic of its own.
//
// The plan forecast runs the resolver's own formulas (odds.js) on what the gang
// BELIEVES about a target. Scouted: the true numbers this year. Not scouted: a
// range around what the gang knows (the town's reputation and what your own
// robberies taught it). The bot sees exactly what the player sees.

import { ALL_TARGETS, NORTHFIELD, KINDS, COUNTIES } from '../data/world.data.js';
import { incidentView } from './incidents.js';
import { lawPosse, backOption } from './law.js';
import { LEANS } from '../data/law.data.js';
import { K, yearOf, dateOf, intelValid, believedGuard, believedFight, cashOf, modActive } from './state.js';
import { targetDef, targetOpen, hideouts, hideoutCounty, freshHorses } from './job.js';
import { members, active, followers, mood, recruitOptions, lieutenantOption } from './gang.js';
import { gearOptions, houseOptions, bribeOption, doctorOption, marryProblem, assetOptions, hushOption } from './outfit.js';
import { scoutProblem, letterProblem, lieLowOptions, coverOptions } from './season.js';
import { informChance, recognitionChance, COVER_COUNTY } from './pressure.js';
import { retireProblem, familyAlive } from './ending.js';
import {
  crewStats, planProblem, alarmChance, vaultPower, vaultNeed, takeFraction, insideKillChance,
  townPower, EXPOSURE, hitChance, bystanderChance, posseStrength, catchChance, band, legendGain, shareCount,
} from './odds.js';

const clamp3 = (x) => Math.max(0, Math.min(3, x));

/** What the gang believes about a target. Ranges are [lo, hi]. */
export function intel(s, id) {
  const def = targetDef(id);
  if (def.far) {
    if (intelValid(s, id)) return { scouted: true, guard: [def.guard, def.guard], fight: [def.fight, def.fight], cash: [s.flags.northfieldCash, s.flags.northfieldCash], note: 'Your scout says the hardware store sells rifles to anyone, and the townsmen know how to use them.' };
    return { scouted: false, guard: [0, 1], fight: [0, 1], cash: def.cash, note: def.rumour.note };
  }
  const t = s.targets[id];
  if (intelValid(s, id)) {
    const i = s.intel[id];
    return { scouted: true, guard: [i.guard, i.guard], fight: [i.fight, i.fight], cash: [i.cash, i.cash] };
  }
  const g = believedGuard(def, t), f = believedFight(def, t);
  const emptied = t.robbedYear === yearOf(s.t);
  const cash = emptied ? [Math.round(def.cash[0] * 0.1), Math.round(def.cash[1] * 0.4)] : def.cash;
  return { scouted: false, guard: [clamp3(g - 1), clamp3(g + 1)], fight: [clamp3(f - 1), clamp3(f + 1)],
    cash: cash.map((c) => cashOf(s, def, c)), note: emptied ? 'You robbed it this year. The vault will not be full again until the new year.' : undefined };
}

/** The targets on offer this season, with why the closed ones are closed. */
export function targetList(s) {
  const defs = ALL_TARGETS.filter((d) => !d.tip || !targetOpen(s, d));
  if (s.flags.northfieldOffer === s.t) defs.push(NORTHFIELD);
  return defs.map((def) => ({
    id: def.id, name: def.name, kind: def.kind, kindName: def.kindName || KINDS[def.kind].name, county: def.county, tip: !!def.tip,
    countyName: COUNTIES.find((c) => c.id === def.county)?.name ?? 'Minnesota',
    far: !!def.far, lock: targetOpen(s, def), robbed: def.far ? 0 : s.targets[def.id].robbed,
    sym: s.sym[def.county] ?? 0, heat: s.heat[def.county] ?? 0,
    intel: intel(s, def.id), scoutLock: scoutProblem(s, def.id),
  }));
}

/**
 * The forecast for a plan, as the gang can judge it.
 * Expected values are taken over the alarm; ranges over what is not known.
 */
export function forecast(s, plan) {
  const def = targetDef(plan.target);
  const all = members(s);
  const st = crewStats(all, plan.crew || []);
  const problem = planProblem(st) || (!plan.hideout ? 'Pick a hideout.' : null);
  const info = intel(s, def.id);
  const heat = s.heat[def.county] ?? 0;
  const symFrom = s.sym[def.county] ?? 0;
  const symTo = plan.hideout ? s.sym[hideoutCounty(s, plan.hideout)] ?? 0 : 0;
  const cases = [];
  for (const guard of new Set(info.guard)) for (const fight of new Set(info.fight)) cases.push({ guard, fight });
  const one = ({ guard, fight }, cash) => {
    const pA = alarmChance({ approach: plan.approach, guard, n: st.n, heat, scouted: info.scouted, insideNerve: st.insideNerve, streetCount: st.street.length, kind: def.kind });
    const power = vaultPower(st), need = vaultNeed(guard, def.kind);
    const fracQ = takeFraction({ approach: plan.approach, alarm: false, power, need });
    const fracA = takeFraction({ approach: plan.approach, alarm: true, power, need });
    let frac = plan.approach === 'bold' ? fracA : (1 - pA) * fracQ + pA * fracA;
    if (def.far && info.scouted) frac = Math.min(frac, 0.01);
    const kill = (1 - pA) * insideKillChance({ approach: plan.approach, alarm: false, power, need, hothead: st.hotheadInside, steady: st.steadyInside, insideNerve: st.insideNerve })
      + pA * insideKillChance({ approach: plan.approach, alarm: true, power, need, hothead: st.hotheadInside, steady: st.steadyInside, insideNerve: st.insideNerve });
    const T = townPower({ approach: plan.approach, fight, streetGun: st.streetGun });
    const by = pA * bystanderChance(plan.approach, T);
    // Chance at least one man is hit in the street.
    let none = 1;
    const per = [];
    for (const [role, list] of [['street', st.street], ['horses', st.horses], ['inside', st.inside]]) {
      for (const m of list) { const h = pA * hitChance(T, EXPOSURE[role]); none *= 1 - h; per.push({ id: m.id, h }); }
    }
    const killedP = 1 - (1 - kill) * (1 - by);
    const law = lawPosse(s, def.county);
    const posse = (alarm) => killedP * posseStrength({ alarm, fight, guard, heat, kind: def.kind, killed: true, law })
      + (1 - killedP) * posseStrength({ alarm, fight, guard, heat, kind: def.kind, killed: false, law });
    const Q = pA * posse(true) + (1 - pA) * posse(false);
    // Fates as job.js deals them: a man hit in the street is killed 30% (you 20%),
    // and if the horses are short half the rest are left behind; caught on the
    // road, a quarter are hit again and most of those are lost.
    const behind = st.holders < st.holdersNeeded ? 0.5 : 0;
    const expWounded = st.wounded + per.reduce((a, p) => a + p.h * 0.7 * (1 - behind), 0);
    const pCatch = catchChance({ Q, symFrom, symTo, horseSkill: st.horseSkill, wounded: expWounded, far: !!def.far, fresh: plan.hideout ? freshHorses(s, plan.hideout) : 0 });
    const take = cash * frac * 0.925 * (1 - 0.3 * pCatch);
    const roadLoss = (def.far ? 0.45 : 0.25) * 0.7;
    const leaderId = st.all.find((m) => m.leader)?.id;
    const leader = per.find((p) => p.id === leaderId);
    const leaderRisk = (leader ? leader.h * (0.2 + 0.8 * behind) : 0) + pCatch * roadLoss;
    const lossEach = per.filter((p) => p.id !== leaderId).map((p) => p.h * (0.3 + 0.7 * behind) + pCatch * roadLoss);
    const legend = legendGain({ approach: plan.approach, loot: take, killed: killedP > 0.5, far: !!def.far }) + 3 * killedP - (killedP > 0.5 ? 3 : 0);
    return { pA, take, kill: killedP, hit: 1 - none, pCatch, leaderRisk, losses: lossEach.reduce((a, b) => a + b, 0), legend };
  };
  const rows = [];
  for (const c of cases) for (const cash of new Set(info.cash)) rows.push(one(c, cash));
  const rng = (k) => [Math.min(...rows.map((r) => r[k])), Math.max(...rows.map((r) => r[k]))];
  const mid = (k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
  const out = {
    problem, scouted: info.scouted, n: st.n, holdersNeeded: st.holdersNeeded, holders: st.holders,
    alarm: rng('pA'), take: rng('take'), kill: rng('kill'), hit: rng('hit'), catch: rng('pCatch'),
    leaderRisk: rng('leaderRisk'), losses: rng('losses'), legend: rng('legend'),
    mid: { alarm: mid('pA'), take: mid('take'), kill: mid('kill'), hit: mid('hit'), catch: mid('pCatch'), leaderRisk: mid('leaderRisk'), losses: mid('losses'), legend: mid('legend') },
    shareEach: 0,
  };
  const othersList = st.all.filter((m) => !m.leader);
  const shares = shareCount({ others: othersList.length, lieutenant: othersList.some((m) => m.id === s.lieutenant),
    meRiding: st.all.some((m) => m.leader), leaderCut: plan.cut === 'leader' });
  out.shareEach = Math.round(out.mid.take / shares);
  out.words = {
    alarm: bandRange(out.alarm), kill: bandRange(out.kill), hit: bandRange(out.hit), catch: bandRange(out.catch),
  };
  return out;
}

function bandRange([lo, hi]) {
  const a = band(lo), b = band(hi);
  return a === b ? a : `${a} to ${b}`;
}

/** Everything the season screen needs, with every lock explained. */
export function view(s) {
  return {
    date: dateOf(s.t), year: yearOf(s.t), t: s.t,
    purse: s.purse, legend: Math.round(s.legend), reward: s.reward,
    pinkerton: s.pinkActive ? Math.round(s.pinkerton) : null,
    heat: Object.fromEntries(Object.entries(s.heat).map(([k, v]) => [k, Math.round(v)])),
    sym: Object.fromEntries(Object.entries(s.sym).map(([k, v]) => [k, Math.round(v)])),
    safe: Object.fromEntries(Object.entries(s.sym).map(([k, v]) => [k, v >= (s.houses[k] ? K(s, 'houseSym') : K(s, 'safeSym'))])),
    me: s.me, home: s.home, houses: { ...s.houses }, where: s.where,
    married: s.married, marry: marryProblem(s), family: s.family.map((f) => ({ ...f })),
    houseOptions: houseOptions(s),
    incident: incidentView(s),
    law: s.law ? {
      sheriffs: Object.fromEntries(Object.entries(s.law.sheriffs).map(([c, sh]) => [c, { ...sh, leanWord: LEANS[sh.lean].word,
        hunting: sh.grudge >= K(s, 'grudgeHunt'), grudgeWord: sh.grudge >= K(s, 'grudgeHunt') ? 'hunting you' : sh.grudge >= 30 ? 'a grudge' : sh.grudge > 0 ? 'annoyed' : 'none',
        back: backOption(s, c) }])),
      detective: s.law.detective ? { ...s.law.detective } : null,
      past: s.law.past.slice(),
    } : null,
    bribe: Object.fromEntries(COUNTIES.map((c) => [c.id, bribeOption(s, c.id)])),
    mods: {
      panic: modActive(s, 'bankCash'), grange: modActive(s, 'symTrainX'), strike: modActive(s, 'strike'),
    },
    cover: { ...s.cover, level: Math.round(s.cover.level) },
    retired: s.retired, outcome: s.outcome,
    gang: members(s).filter((m) => m.status === 'active').map((m) => ({
      id: m.id, name: m.name, short: m.short, leader: !!m.leader, gun: m.gun, nerve: m.nerve, horse: m.horse,
      base: m.base, gear: { ...m.gear }, rel: m.rel, pitch: m.pitch, jobs: m.jobs || 0,
      traits: m.traits, kin: m.kin, mood: mood(m), pocket: m.pocket, wounded: m.wounded, suspected: m.suspected,
      rode: m.rode, outfit: gearOptions(s, m.id), doctor: doctorOption(s, m.id),
      story: m.storyDone ? null : m.story, lieutenant: s.lieutenant === m.id, makeLt: lieutenantOption(s, m.id),
    })),
    gone: members(s).filter((m) => m.status !== 'active' && !m.leader).map((m) => ({ id: m.id, name: m.name, status: m.status, hush: hushOption(s, m.id), returnT: m.returnT })),
    lieutenant: s.lieutenant,
    assets: assetOptions(s),
    recruits: recruitOptions(s),
    actions: {
      job: s.retired ? 'You have quit the life.' : null,
      lielow: s.retired ? 'You have quit the life.' : null,
      cover: s.retired ? 'You have quit the life.' : null,
      retire: retireProblem(s),
      letter: letterProblem(s),
    },
    risks: {
      inform: Object.fromEntries(COUNTIES.map((c) => [c.id, informChance(s, c.id)])),
      informFarm: informChance(s, s.home, true),
      recognise: Object.fromEntries(['kc', 'stjoe', 'nashville'].map((p) => [p, recognitionChance(s, p)])),
    },
    lieLow: lieLowOptions(s),
    coverOptions: coverOptions(s),
    familyAlive: familyAlive(s),
  };
}

export { band, hideouts };
