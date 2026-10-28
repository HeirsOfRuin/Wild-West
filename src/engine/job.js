// One job, start to finish: the way in, the money, the street, the horses, the
// ride to the hideout. The report the player reads is this resolver's own log,
// never a retelling.

import { TARGETS, NORTHFIELD, KINDS, LINKS, COUNTIES } from '../data/world.data.js';
import { K, yearOf, trueGuard, trueFight, intelValid } from './state.js';
import { pay } from './money.js';
import { member, members, nudge, defOf } from './gang.js';
import {
  crewStats, planProblem, alarmChance, vaultPower, vaultNeed, takeFraction, insideKillChance,
  townPower, EXPOSURE, hitChance, bystanderChance, posseStrength, catchChance, legendGain,
} from './odds.js';

export const targetDef = (id) => (id === NORTHFIELD.id ? NORTHFIELD : TARGETS.find((t) => t.id === id));
export const adjacent = (a, b) => LINKS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
export const countyName = (id) => COUNTIES.find((c) => c.id === id)?.name ?? 'Minnesota';

/** Where you can ride to after a job at this target, and why not elsewhere. */
export function hideouts(s, def) {
  const out = [];
  const from = def.county;
  for (const c of COUNTIES) {
    const near = c.id === from || adjacent(c.id, from);
    let lock = null;
    if (!def.far && !near) lock = 'Too far to ride before the wires catch you.';
    else if (s.sym[c.id] < K(s, 'safeSym')) lock = `Nobody in ${c.name} will hide you (sympathy under ${K(s, 'safeSym')}).`;
    out.push({ id: c.id, name: `${c.name} safe house`, lock });
  }
  const farmNear = def.far || from === 'clay' || adjacent('clay', from);
  out.unshift({ id: 'farm', name: 'The family farm, Clay County', lock: farmNear ? null : 'Too far from Clay County.' });
  return out;
}
export const hideoutCounty = (h) => (h === 'farm' ? 'clay' : h);

export function targetOpen(s, def) {
  if (def.far) return s.flags.northfieldOffer === s.t ? null : 'Not on offer.';
  if (def.from && yearOf(s.t) < def.from) return `Nobody has stopped a train in Missouri yet (opens ${def.from}).`;
  return null;
}

function hitOutcome(rng, isLeader, leftBehind) {
  const r = rng.next();
  if (r < (isLeader ? 0.2 : 0.3)) return 'killed';
  if (leftBehind && rng.chance(0.5)) return 'captured';
  return 'wounded';
}

/** Resolve a job. Mutates s; returns the job report. */
export function runJob(s, plan, rng, events) {
  const def = targetDef(plan.target);
  if (!def) throw new Error(`No such target: ${plan.target}`);
  const shut = targetOpen(s, def);
  if (shut) throw new Error(shut);
  const all = members(s);
  for (const c of plan.crew) {
    const m = all.find((x) => x.id === c.id);
    if (!m || m.status !== 'active') throw new Error(`${c.id} is not riding with you.`);
  }
  if (!plan.crew.some((c) => c.id === 'jesse')) throw new Error('You ride on every job.');
  const st = crewStats(all, plan.crew);
  const problem = planProblem(st);
  if (problem) throw new Error(problem);
  const hide = hideouts(s, def).find((h) => h.id === plan.hideout);
  if (!hide || hide.lock) throw new Error(hide?.lock || 'Pick a hideout.');

  const tgt = def.far
    ? { guard: def.guard, fight: def.fight, cash: s.flags.northfieldCash }
    : { ...s.targets[def.id], guard: trueGuard(def, s.targets[def.id]), fight: trueFight(def, s.targets[def.id]) };
  const county = def.county;
  const heat = s.heat[county] ?? 0;
  const symFrom = s.sym[county] ?? 0;
  const scouted = intelValid(s, def.id);
  const beats = [];
  const casualties = []; // { id, fate, where }
  let guard = tgt.guard, fight = tgt.fight;

  // An informer has told them you are coming.
  let ambushed = false;
  if (s.ambush && plan.crew.some((c) => c.id === s.ambush.by) === false) {
    ambushed = true;
    fight = Math.min(5, fight + 2);
    beats.push(`They were waiting. Someone told them. Men with rifles are at the windows above the street.`);
  }
  const ambushBy = s.ambush?.by ?? null;
  s.ambush = null;

  beats.push(plan.approach === 'bold'
    ? `${st.n} of you ride in hard at midday, shooting in the air to clear the street.`
    : `${st.n} of you drift in by twos, horses tied where they will be needed, and walk in like customers.`);

  // 1. The alarm.
  const pAlarm = ambushed ? 1 : alarmChance({ approach: plan.approach, guard, n: st.n, heat, scouted,
    insideNerve: st.insideNerve, streetCount: st.street.length, kind: def.kind });
  const alarm = rng.chance(pAlarm);
  if (plan.approach === 'quiet') beats.push(alarm ? 'Somebody shouts. The alarm is up before the money is out.' : 'Nobody looks twice until it is done.');

  // 2. The money.
  const power = vaultPower(st);
  const need = vaultNeed(guard, def.kind);
  let frac = takeFraction({ approach: plan.approach, alarm, power, need });
  if (def.far && frac > 0) frac = Math.min(frac, 0.01); // Northfield: the cashier said the time lock was set. It was not.
  const take = Math.round(tgt.cash * frac * (0.85 + 0.15 * rng.next()));
  if (def.far) beats.push(`The cashier swears the vault is on a time lock. It is not, but you do not know that. He will not open it even with a knife at his throat.`);
  else if (frac >= 0.9) beats.push(`The ${def.kind === 'train' ? 'express safe' : 'vault'} comes open. ${def.kind === 'stage' ? 'Watches, pocketbooks and the strongbox' : 'Notes, gold and silver'} go in the sack.`);
  else if (frac > 0) beats.push(`You get some of it — the ${def.kind === 'train' ? 'messenger' : 'cashier'} stalls and the rest stays behind.`);
  else beats.push(`You come out with nothing. The ${def.kind === 'train' ? 'messenger' : 'cashier'} would not or could not open it.`);

  // 3. A killing inside.
  const pKill = insideKillChance({ approach: plan.approach, alarm, power, need,
    hothead: st.hotheadInside, steady: st.steadyInside, insideNerve: st.insideNerve });
  let cashierKilled = rng.chance(pKill);
  let gallatin = false;
  if (def.id === 'gallatin-bank' && !s.flags.gallatin && st.inside.some((m) => m.id === 'jesse') && yearOf(s.t) <= 1870 && rng.chance(0.5)) {
    cashierKilled = true;
    gallatin = true;
    s.flags.gallatin = s.t;
  }
  if (cashierKilled) {
    const who = def.kind === 'train' ? 'The express messenger' : def.kind === 'stage' ? 'A passenger who reached for his pistol' : 'The cashier';
    beats.push(gallatin
      ? 'You think the cashier is Samuel Cox, the man who killed Bloody Bill Anderson. You shoot him through the head. His name was John Sheets.'
      : `${who} is shot dead${st.hotheadInside ? ' by a man who did not need to' : ''}.`);
  }

  // 4. The street.
  let bystanders = 0;
  let T = 0;
  if (alarm) {
    T = townPower({ approach: plan.approach, fight, streetGun: st.streetGun });
    if (T <= 0.3) beats.push(plan.approach === 'bold' ? 'The street empties. Nobody wants to be a hero today.' : 'A few shots from doorways, nothing more.');
    else beats.push(T >= 2.5 ? 'The town fights. Rifles from the hardware store, shotguns from the upper windows.' : 'Men run for their guns. There is shooting in the street.');
    if (rng.chance(bystanderChance(plan.approach, T))) {
      bystanders = 1;
      beats.push('A townsman who stepped into the street is killed.');
    }
  }
  const leftBehind = st.holders < st.holdersNeeded;
  if (alarm && leftBehind) beats.push('Not enough men on the horses: mounts bolt in the shooting.');
  for (const [role, list] of [['street', st.street], ['horses', st.horses], ['inside', st.inside]]) {
    for (const m of list) {
      if (!alarm) break;
      if (rng.chance(hitChance(T, EXPOSURE[role]))) {
        casualties.push({ id: m.id, fate: hitOutcome(rng, m.leader, leftBehind), where: 'in the street' });
      }
    }
  }

  // 5. The ride to the hideout.
  const killed = cashierKilled || bystanders > 0;
  const Q = posseStrength({ alarm, fight, guard, heat, kind: def.kind, killed });
  const symTo = s.sym[hideoutCounty(plan.hideout)] ?? 0;
  const woundedNow = st.wounded + casualties.filter((c) => c.fate === 'wounded').length;
  const pCatch = catchChance({ Q, symFrom, symTo, horseSkill: st.horseSkill, wounded: woundedNow, far: !!def.far });
  let caught = rng.chance(pCatch);
  let loot = take;
  if (caught) {
    beats.push(def.far
      ? 'A thousand men are out. You split up in the swamps and walk, hungry, for two weeks.'
      : 'The posse runs you down at a creek crossing. There is a fight in the trees.');
    loot = Math.round(take * 0.7);
    for (const m of st.all) {
      if (casualties.some((c) => c.id === m.id && c.fate !== 'wounded')) continue;
      if (rng.chance(def.far ? 0.45 : 0.25)) {
        const prev = casualties.find((c) => c.id === m.id);
        const fate = hitOutcome(rng, m.leader, true);
        if (prev) prev.fate = fate === 'wounded' ? 'captured' : fate; // hit twice: down for good
        else casualties.push({ id: m.id, fate, where: 'on the run' });
      }
    }
  } else {
    beats.push(Q < 25 ? 'Nobody follows far.' : 'A posse forms but loses you in friendly country.');
  }

  // Fates.
  for (const c of casualties) {
    const g = s.gang.find((x) => x.id === c.id);
    const name = defOf(c.id).name;
    if (c.fate === 'wounded') {
      g.wounded = 2;
      beats.push(`${name} is hit ${c.where} but stays in the saddle.`);
    } else if (c.fate === 'killed') {
      if (defOf(c.id).leader) {
        s.outcome = { kind: 'killed', cause: 'job', t: s.t, text: `You were shot from your horse ${c.where} at ${def.name}. They propped your body up for a photograph.` };
      } else {
        g.status = 'dead'; g.diedT = s.t;
        s.dead.push({ id: c.id, name, t: s.t, how: `killed ${c.where}, ${def.name}` });
        beats.push(`${name} is killed ${c.where}.`);
      }
    } else if (c.fate === 'captured') {
      if (defOf(c.id).leader) {
        s.outcome = { kind: 'captured', cause: 'job', t: s.t, text: `They took you alive ${c.where} after ${def.name}. The trial will be short.` };
      } else {
        g.status = 'captured'; g.capturedT = s.t;
        beats.push(`${name} is taken alive ${c.where}.`);
        if (g.loyalty < 50 && s.pinkActive) s.pinkerton = Math.min(100, s.pinkerton + 10);
      }
    }
  }

  // Money and shares.
  const ridersAlive = st.all.filter((m) => !casualties.some((c) => c.id === m.id && c.fate !== 'wounded'));
  const others = ridersAlive.filter((m) => !m.leader);
  const shares = others.length + 2 + (plan.cut === 'leader' ? 1 : 0); // a share each, yours, and one for the gang's needs
  const share = loot > 0 ? Math.floor(loot / shares) : 0;
  if (loot > 0) {
    pay(s, loot - share * others.length, `${def.name}: your share and the gang's`);
    for (const m of others) {
      const g = s.gang.find((x) => x.id === m.id);
      g.pocket += share;
      const greedy = m.traits.includes('greedy') ? 1.5 : 1;
      nudge(s, m.id, Math.min(K(s, 'shareCap'), (share / K(s, 'shareScale')) * greedy) - (plan.cut === 'leader' ? K(s, 'leaderCutPenalty') * greedy : 0));
    }
  }
  beats.push(loot > 0
    ? `The take: $${loot.toLocaleString('en-US')}. ${others.length ? `$${share.toLocaleString('en-US')} a man${plan.cut === 'leader' ? ', and a double share for you' : ''}.` : ''}`
    : 'The take: nothing.');

  // Grief and fear.
  const lost = casualties.filter((c) => c.fate === 'killed' || c.fate === 'captured').filter((c) => !defOf(c.id).leader);
  for (const c of lost) {
    for (const m of members(s).filter((x) => x.status === 'active' && !x.leader)) {
      nudge(s, m.id, -(m.kin && m.kin === defOf(c.id).kin ? K(s, 'kinDeath') : K(s, 'comradeDeath')));
    }
  }

  // The world's answer.
  const isHome = county === 'clay';
  if (!def.far) {
    if (def.kind === 'bank') s.sym[county] -= isHome ? K(s, 'symHomeBank') : K(s, 'symBank');
    if (def.kind === 'stage') s.sym[county] -= K(s, 'symStage');
    if (def.kind === 'train') for (const c of COUNTIES) if (c.southern) s.sym[c.id] += K(s, 'symTrain');
    if (killed) {
      s.sym[county] -= K(s, 'symKillLocal');
      for (const c of COUNTIES) s.sym[c.id] -= K(s, 'symKillAll');
    }
    s.heat[county] = Math.min(100, s.heat[county] + K(s, 'heatJob') + (killed ? K(s, 'heatKill') : 0));
    for (const c of COUNTIES) if (adjacent(c.id, county)) s.heat[c.id] = Math.min(100, s.heat[c.id] + K(s, 'heatNeighbour'));
    // The town learns.
    const t = s.targets[def.id];
    t.robbed += 1;
    // Express companies add guards; banks add guards and the town buys rifles.
    t.boostG = Math.min(2, t.boostG + 1);
    if (def.kind !== 'train') t.boostF = Math.min(2, t.boostF + 1);
    delete s.intel[def.id];
  } else {
    s.flags.northfieldDone = s.t;
    if (killed) for (const c of COUNTIES) s.sym[c.id] -= K(s, 'symKillAll');
  }
  const hc = hideoutCounty(plan.hideout);
  s.heat[hc] = Math.min(100, s.heat[hc] + 10);
  for (const c of Object.keys(s.sym)) s.sym[c] = Math.max(0, Math.min(100, s.sym[c]));

  s.legend = Math.max(0, Math.min(100, s.legend + legendGain({ approach: plan.approach, loot, killed, far: !!def.far })));
  s.reward += KINDS[def.kind].reward + (killed ? K(s, 'rewardKill') : 0) + (def.far ? 1000 : 0);
  if (def.kind === 'train' || def.far) s.pinkActive = true;
  if (s.pinkActive) s.pinkerton = Math.min(100, s.pinkerton + KINDS[def.kind].pink + (def.far ? 15 : 0));

  s.stats.jobs += 1;
  s.stats.take += loot;
  if (cashierKilled) s.stats.cashiers += 1;
  s.stats.bystanders += bystanders;
  if (loot === 0) s.stats.failed += 1;

  const headline = headlineFor(def, { loot, cashierKilled, bystanders, lost, alarm, caught, gallatin });
  const report = {
    t: s.t, target: def.id, name: def.name, kind: def.kind, approach: plan.approach, hideout: plan.hideout,
    loot, share, alarm, caught, cashierKilled, bystanders, ambushed, ambushBy,
    casualties, beats, headline, crew: plan.crew.map((c) => ({ ...c })),
  };
  s.lastJob = report;
  return report;
}

function headlineFor(def, r) {
  const place = def.far ? 'NORTHFIELD' : (COUNTIES.find((c) => c.id === def.county)?.town ?? '').toUpperCase();
  if (r.gallatin) return `MURDER AT GALLATIN — Cashier Sheets Shot Down in Cold Blood — The Daviess County Savings Robbed`;
  if (def.far && r.lost.length) return `THE NORTHFIELD RAID — Citizens Defend the Bank — Outlaws Shot Down in the Street`;
  if (r.cashierKilled) return `${place}: ${def.kind === 'train' ? 'EXPRESS MESSENGER' : 'CASHIER'} MURDERED — Bandits Escape With $${r.loot.toLocaleString('en-US')}`;
  if (r.bystanders) return `${place}: CITIZEN KILLED IN DARING ROBBERY`;
  if (r.loot === 0) return `${place}: ROBBERS FOILED — Bandits Flee Empty-Handed`;
  if (!r.alarm) return `${place}: A QUIET ROBBERY — $${r.loot.toLocaleString('en-US')} Taken Without a Shot`;
  return `${place}: BOLD ROBBERY — $${r.loot.toLocaleString('en-US')} Carried Off${r.caught ? ' — Posse in Pursuit' : ''}`;
}
