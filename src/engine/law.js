// The law with faces: a sheriff in each county, a lead Pinkerton operative.
//
// Sheriffs have a skill, a lean (friendly, neutral, hostile) and a grudge.
// Missouri elected them every two years in November: here, every autumn of an
// even year. The operative moves a county a season toward where you hide.

import { COUNTIES } from '../data/world.data.js';
import { DETECTIVE_NAMES, LEANS } from '../data/law.data.js';
import { newSheriff } from './law-init.js';
import { K, yearOf, seasonOf, adjacent } from './state.js';
import { pay } from './money.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const cname = (id) => COUNTIES.find((c) => c.id === id)?.name ?? '';

const surnames = (s) => Object.values(s.law.sheriffs).map((x) => x.name.split(' ')[1]);

export const sheriffOf = (s, county) => s.law?.sheriffs?.[county] ?? null;

/** What the sheriff adds to a posse in his county (0 where there is none, e.g. Minnesota). */
export function lawPosse(s, county) {
  const sh = sheriffOf(s, county);
  if (!sh) return 0;
  return sh.skill * K(s, 'sheriffSkillPosse') + LEANS[sh.lean].posse;
}

/** What paying him costs, as a multiplier, or null if he will not take money. */
export function bribeFactor(s, county) {
  const sh = sheriffOf(s, county);
  if (!sh) return 1;
  if (sh.grudge >= K(s, 'grudgeHunt')) return null;
  return LEANS[sh.lean].bribe;
}

/** After a job in his county. */
export function lawAfterJob(s, county, killed) {
  const sh = sheriffOf(s, county);
  if (!sh) return;
  sh.grudge = clamp(sh.grudge + K(s, 'grudgeJob') + (killed ? K(s, 'grudgeKill') : 0), 0, 100);
}

/** How much more often the Pinkertons act, with their man in your county. */
export function detectiveFactor(s, county) {
  const d = s.law?.detective;
  return d && county && d.county === county ? 1 + K(s, 'detSkillOps') * d.skill : 1;
}

export function backOption(s, county) {
  const y = yearOf(s.t);
  let lock = null;
  if (!sheriffOf(s, county)) lock = 'No sheriff here.';
  else if (y % 2 !== 0 || seasonOf(s.t) !== 2) lock = 'Sheriffs are elected in the autumn of even years.';
  else if (s.law.backed[county] === s.t) lock = 'You are already backing his rival.';
  else if (s.purse < K(s, 'backCost')) lock = `Costs $${K(s, 'backCost')}.`;
  return { county, cost: K(s, 'backCost'), lock };
}

export function backCandidate(s, county) {
  const o = backOption(s, county);
  if (o.lock) throw new Error(o.lock);
  pay(s, -o.cost, `Backing a candidate for sheriff of ${cname(county)} County`);
  s.stats.spent += o.cost;
  s.law.backed[county] = s.t;
}

/** A sheriff is killed: the county gets a new one with a grudge. */
export function sheriffKilled(s, county, rng, events) {
  const sh = sheriffOf(s, county);
  if (!sh) return;
  s.law.past.push({ name: sh.name, role: `Sheriff of ${cname(county)} County`, fate: 'killed by your gang', t: s.t });
  s.law.sheriffs[county] = newSheriff(rng, county, s.sym[county], s.t, { grudge: K(s, 'sheriffKillGrudge'), taken: surnames(s) });
  s.law.sheriffs[county].lean = 'hostile';
  events.push({ kind: 'bad', text: `${sh.name} is dead. ${s.law.sheriffs[county].name} is sworn in as sheriff of ${cname(county)} County over his coffin.` });
}

/** The lead operative is killed: the agency will send another. */
export function detectiveKilled(s) {
  const d = s.law?.detective;
  if (!d) return null;
  s.law.past.push({ name: d.name, role: 'Pinkerton operative', fate: 'killed', t: s.t });
  s.law.detective = null;
  s.law.nextDetT = s.t + K(s, 'detReplace');
  return d.name;
}

/** The season's turn for the law. */
export function seasonLaw(s, ctx, rng, events) {
  if (!s.law) return;
  const where = ctx.where === 'farm' ? s.home : ctx.where;
  for (const c of COUNTIES) {
    const sh = s.law.sheriffs[c.id];
    sh.grudge = Math.max(0, sh.grudge - K(s, 'grudgeFade'));
    // A friendly sheriff lets his county cool faster.
    if (sh.lean === 'friendly' && s.heat[c.id] > 0) s.heat[c.id] = Math.round(s.heat[c.id] * 0.75);
    // A sheriff with a grudge rides after you.
    if (sh.grudge >= K(s, 'grudgeHunt') && where && (where === c.id || adjacent(where, c.id))) {
      s.heat[where] = Math.min(100, s.heat[where] + K(s, 'huntHeat'));
      if (rng.chance(0.4)) events.push({ kind: 'warn', text: `Sheriff ${sh.name} of ${c.name} County has been seen on the roads near your hideout with a dozen deputies.` });
    }
  }
  // Elections: autumn of even years.
  if (seasonOf(s.t) === 2 && yearOf(s.t) % 2 === 0) {
    for (const c of COUNTIES) {
      const sh = s.law.sheriffs[c.id];
      const backed = s.law.backed[c.id] === s.t;
      const pLose = K(s, 'electionLoss') + (backed ? K(s, 'backSwing') : 0) + (sh.lean === 'hostile' && s.sym[c.id] >= 60 ? 0.2 : 0);
      if (rng.chance(pLose)) {
        const fresh = newSheriff(rng, c.id, s.sym[c.id], s.t, { friendlyBoost: backed ? K(s, 'backSwing') : 0, taken: surnames(s) });
        s.law.past.push({ name: sh.name, role: `Sheriff of ${c.name} County`, fate: 'voted out', t: s.t });
        s.law.sheriffs[c.id] = fresh;
        const text = `${c.name} County elects ${fresh.name} sheriff over ${sh.name}. ${fresh.name.split(' ')[1]} ${LEANS[fresh.lean].word}.`;
        // Only a change that matters to you makes the season's report; the rest goes in the record.
        if (fresh.lean !== sh.lean || backed) events.push({ kind: fresh.lean === 'friendly' ? 'good' : fresh.lean === 'hostile' ? 'warn' : 'gang', text });
        else s.log.push({ t: s.t, kind: 'gang', text });
      } else if (backed) {
        events.push({ kind: 'bad', text: `Your man lost in ${c.name} County. ${sh.name} is sheriff for two more years, and he has heard who paid for the other fellow.` });
        sh.grudge = clamp(sh.grudge + 15, 0, 100);
      }
    }
  }
  // The Pinkertons' man.
  if (s.pinkActive && !s.law.detective && (s.law.nextDetT === null || s.t >= s.law.nextDetT)) {
    const name = DETECTIVE_NAMES[s.law.dets % DETECTIVE_NAMES.length];
    s.law.dets += 1;
    const start = COUNTIES.find((c) => !c.southern)?.id ?? 'buchanan';
    s.law.detective = { name, skill: Math.min(3, 1 + Math.floor(s.law.dets / 2) + rng.int(2)), county: start, grudge: s.law.nextDetT === null ? 0 : 30, since: s.t };
    events.push({ kind: 'warn', text: `The Pinkerton agency has put ${name} on your trail. He starts in ${cname(start)} County.` });
  } else if (s.law.detective && where && s.law.detective.county !== where) {
    const d = s.law.detective;
    const step = COUNTIES.find((c) => c.id === where && adjacent(c.id, d.county)) ? where
      : COUNTIES.filter((c) => adjacent(c.id, d.county)).sort((a, b) => (adjacent(b.id, where) ? 1 : 0) - (adjacent(a.id, where) ? 1 : 0))[0]?.id;
    if (step && rng.chance(0.5 + 0.15 * d.skill)) d.county = step;
  }
}
