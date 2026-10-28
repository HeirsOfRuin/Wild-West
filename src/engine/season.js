// The turn. One call per player action: act(state, action) -> new state.
//
// Free actions (scout, recruit, dismiss, kill, pay, letter) change the state and
// leave the season open. Season actions (job, lie low, cover, retire, wait) run
// the season's end in this fixed order:
//   1. the action itself (a job resolves here)
//   2. your living costs
//   3. the gang's mood            gang.seasonLoyalty
//   4. who is selling you out     gang.seasonBetrayal
//   5. the pursuers               pressure.seasonPressure
//   6. the counties settle        sympathy drifts to its baseline
//   7. the legend fades
//   8. history happens            events by date
//   9. the clock moves; a new year re-rolls the targets
// One record comes out: s.report, which the season screen shows.

import { COUNTIES, TARGETS, NORTHFIELD } from '../data/world.data.js';
import { CONFIG } from '../data/config.data.js';
import { K, yearOf, seasonOf, dateOf, lastTurn, rollTarget } from './state.js';
import { streamFor } from './rng.js';
import { pay } from './money.js';
import { runJob, targetDef, targetOpen } from './job.js';
import { active, followers, member, recruit, dismiss, killMember, bonus, seasonLoyalty, seasonBetrayal, defOf } from './gang.js';
import { seasonPressure, COVER_COUNTY, COVER_NAME, familyMemberPresent } from './pressure.js';
import { retireProblem, finalScore, retireNeeded } from './ending.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function act(s0, a) {
  if (s0.outcome) throw new Error('The game is over.');
  const s = structuredClone(s0);
  switch (a.type) {
    case 'scout': scout(s, a.target); return s;
    case 'recruit': recruit(s, a.id); return s;
    case 'dismiss': dismiss(s, a.id, !!a.stake); return s;
    case 'kill': killMember(s, a.id); return s;
    case 'bonus': bonus(s, a.id, a.amount); return s;
    case 'letter': letter(s); return s;
    case 'job': case 'lielow': case 'cover': case 'retire': case 'wait': case 'rideagain':
      return seasonAction(s, a);
    default: throw new Error(`Unknown action: ${a.type}`);
  }
}

// ---- free actions -------------------------------------------------------------

export function scoutProblem(s, id) {
  const def = targetDef(id);
  if (!def) return 'No such target.';
  const shut = targetOpen(s, def);
  if (shut) return shut;
  if (s.retired) return 'You have quit the life.';
  if (s.scouts >= K(s, 'maxScoutsPerSeason')) return `Only ${K(s, 'maxScoutsPerSeason')} towns can be looked over in a season.`;
  if (s.purse < K(s, 'scoutCost')) return `Scouting costs $${K(s, 'scoutCost')}.`;
  return null;
}

function scout(s, id) {
  const why = scoutProblem(s, id);
  if (why) throw new Error(why);
  const def = targetDef(id);
  pay(s, -K(s, 'scoutCost'), `Scouting ${def.name}`);
  s.scouts += 1;
  if (def.far) {
    s.intel[id] = { t: s.t, guard: def.guard, fight: def.fight, cash: s.flags.northfieldCash };
  } else {
    const tg = s.targets[id];
    s.intel[id] = { t: s.t, guard: Math.max(0, Math.min(3, def.guard + tg.boostG + tg.rollG)),
      fight: Math.max(0, Math.min(3, def.fight + tg.boostF + tg.rollF)), cash: tg.cash };
    s.heat[def.county] = Math.min(100, s.heat[def.county] + K(s, 'scoutHeat'));
  }
}

export function letterProblem(s) {
  if (!s.flags.edwards) return 'No newspaper will print you yet.';
  if (!s.lastJob || s.lastJob.t !== s.t - 1) return 'A letter needs a job from last season to answer for.';
  if (s.lastLetter >= s.lastJob.t) return 'You have already written about that one.';
  return null;
}

function letter(s) {
  const why = letterProblem(s);
  if (why) throw new Error(why);
  const arrogant = s.t - s.lastLetter < K(s, 'letterCooldown') + 1;
  const f = arrogant ? 0.5 : 1;
  s.lastLetter = s.lastJob.t;
  s.stats.letters += 1;
  s.legend = clamp(s.legend + K(s, 'letterLegend') * f, 0, 100);
  s.edwards += K(s, 'letterSym') * f;
  for (const c of COUNTIES) {
    s.sym[c.id] = clamp(s.sym[c.id] + (c.southern ? K(s, 'letterSym') * f : K(s, 'letterSymNorth')) - (arrogant ? 2 : 0), 0, 100);
  }
  s.reward += K(s, 'letterReward');
  s.log.push({ t: s.t, kind: 'news', text: arrogant
    ? 'Another letter in the Kansas City Times. Even friends say you should stop writing to the papers.'
    : 'John Newman Edwards prints your letter: you are a Southern man wronged by Radicals, and you name the men who can swear where you were that day.' });
}

// ---- season actions -----------------------------------------------------------

export function lieLowOptions(s) {
  const out = [{ id: 'farm', name: 'The family farm', county: 'clay',
    lock: null, note: s.pinkActive ? 'Home. Watched by the Pinkertons.' : 'Home.' }];
  for (const c of COUNTIES) {
    out.push({ id: c.id, name: `${c.name} County`, county: c.id,
      lock: s.sym[c.id] < K(s, 'safeSym') ? `Nobody in ${c.name} will hide you (sympathy under ${K(s, 'safeSym')}).` : null });
  }
  return out;
}

export function coverOptions(s) {
  return Object.keys(COVER_NAME).map((id) => ({
    id, name: COVER_NAME[id], cost: K(s, 'coverCost')[id],
    lock: s.purse < K(s, 'coverCost')[id] ? `Living as Mr. Howard in ${COVER_NAME[id]} costs $${K(s, 'coverCost')[id]} a season.` : null,
  }));
}

function seasonAction(s, a) {
  const rng = streamFor(s.seed, s.t, 'season');
  const events = [];
  const ctx = { rode: new Set(), where: null, coverPlace: null, lieLow: false, home: true, onJob: false };
  let job = null;
  let title = '';

  if (s.retired && !['wait', 'rideagain'].includes(a.type)) throw new Error('You have quit the life. Wait out the seasons, or ride again.');
  if (!s.retired && ['wait', 'rideagain'].includes(a.type)) throw new Error('You have not retired.');

  switch (a.type) {
    case 'job': {
      job = runJob(s, a, streamFor(s.seed, s.t, 'job'), events);
      for (const c of a.crew) ctx.rode.add(c.id);
      ctx.where = a.hideout;
      ctx.home = false;
      ctx.onJob = true;
      ctx.lieLow = true; // you go to ground at the hideout afterwards
      title = job.headline;
      if (s.cover.place) s.cover.level = Math.max(0, s.cover.level - K(s, 'coverJobLoss'));
      break;
    }
    case 'lielow': {
      const opt = lieLowOptions(s).find((o) => o.id === a.at);
      if (!opt) throw new Error('Pick where to hide.');
      if (opt.lock) throw new Error(opt.lock);
      ctx.where = a.at;
      ctx.lieLow = true;
      if (a.at !== 'farm') pay(s, -Math.min(s.purse, K(s, 'safeHouseFee')), `Safe house in ${opt.name}`);
      const give = Math.max(0, Math.min(a.give || 0, s.purse));
      if (give > 0) {
        pay(s, -give, `Given away in ${opt.name}: a widow's mortgage, a church roof`);
        const c = opt.county;
        const gain = (give / K(s, 'giveScale')) / 2 ** s.given[c];
        s.given[c] += 1;
        s.sym[c] = clamp(s.sym[c] + gain, 0, 100);
        events.push({ kind: 'good', text: `In ${COUNTIES.find((x) => x.id === c).name} they will say you paid a widow's mortgage. Sympathy +${Math.round(gain)}.` });
      }
      title = `Lying low: ${opt.name}`;
      break;
    }
    case 'cover': {
      const opt = coverOptions(s).find((o) => o.id === a.place);
      if (!opt) throw new Error('Pick where to live.');
      if (opt.lock) throw new Error(opt.lock);
      if (s.cover.place !== a.place) s.cover.level = 0;
      s.cover.place = a.place;
      pay(s, -opt.cost, `Rent and a respectable life in ${opt.name}`);
      s.cover.level = Math.min(100, s.cover.level + K(s, 'coverGain')[a.place]);
      s.familyAt = a.place;
      ctx.coverPlace = a.place;
      ctx.where = COVER_COUNTY[a.place];
      title = `Mr. Thomas Howard, ${opt.name}`;
      break;
    }
    case 'retire': {
      const why = retireProblem(s);
      if (why) throw new Error(why);
      s.retired = { since: s.t };
      ctx.coverPlace = s.cover.place;
      ctx.where = COVER_COUNTY[s.cover.place];
      pay(s, -Math.min(s.purse, K(s, 'retireCost')), 'A quiet life');
      title = 'You quit the life';
      events.push({ kind: 'good', text: `You put the guns in a trunk. Mr. Howard of ${COVER_NAME[s.cover.place]} keeps a few horses and pays his bills. ${retireNeeded(s)} quiet seasons and the world will forget.` });
      break;
    }
    case 'wait': {
      ctx.coverPlace = s.cover.place;
      ctx.where = COVER_COUNTY[s.cover.place];
      if (s.purse < K(s, 'retireCost')) {
        s.retired = null;
        events.push({ kind: 'bad', text: 'The money has run out. Mr. Howard cannot pay his bills, and Jesse James knows how to get more.' });
      } else {
        pay(s, -K(s, 'retireCost'), 'A quiet life');
        s.cover.level = Math.min(100, s.cover.level + 5);
      }
      title = 'A quiet season';
      break;
    }
    case 'rideagain': {
      s.retired = null;
      ctx.where = 'farm';
      title = 'You dig up the guns';
      break;
    }
  }

  // Cover decays while you are not living it.
  if (!ctx.coverPlace && a.type !== 'job' && s.cover.level > 0) s.cover.level = Math.max(0, s.cover.level - 5);
  s.where = ctx.where;

  // 2. Your living.
  if (!s.retired && !ctx.coverPlace) {
    const need = K(s, 'leaderLiving');
    if (s.purse >= need) pay(s, -need, 'Food, powder and horseshoes');
    else { if (s.purse > 0) pay(s, -s.purse, 'Food, powder and horseshoes'); events.push({ kind: 'bad', text: 'A lean season. You owe money to people who hide you.' }); }
  }

  // 3-5.
  if (!s.outcome) seasonLoyalty(s, { ...ctx, underCover: !!ctx.coverPlace }, rng, events);
  if (!s.outcome) seasonBetrayal(s, ctx, rng, events);
  if (!s.outcome) seasonPressure(s, ctx, rng, events);
  if (!s.outcome && s.retired) retirementRisk(s, rng, events);

  // 6. Sympathy drifts back toward what the county would feel anyway.
  s.edwards *= 0.85;
  for (const c of COUNTIES) s.sym[c.id] = clamp(s.sym[c.id] + (baseline(s, c) - s.sym[c.id]) * K(s, 'symDrift'), 0, 100);

  // 7.
  s.legendPeak = Math.max(s.legendPeak || 0, s.legend);
  s.legend = clamp(Math.max(s.legend - K(s, 'legendDecay'), Math.min(s.legend, s.legendPeak * K(s, 'legendFloor'))), 0, 100);

  // The record of the season.
  s.report = { t: s.t, title, job, events };
  for (const e of events) s.log.push({ t: s.t, kind: e.kind, text: e.text });
  if (job) s.log.push({ t: s.t, kind: 'job', text: job.headline });
  s.hist.push(snapshot(s));

  if (s.outcome) { s.outcome.score = finalScore(s); return s; }

  // Retirement complete?
  if (s.retired && s.t - s.retired.since + 1 >= retireNeeded(s)) {
    s.outcome = { kind: 'retired', t: s.t, text: `${retireNeeded(s)} quiet seasons. Mr. Howard is a neighbour now, nothing more. The papers write about you in the past tense. You lived.` };
    s.outcome.score = finalScore(s);
    return s;
  }
  // The era ends.
  if (s.t >= lastTurn()) {
    s.outcome = { kind: 'era', t: s.t, text: 'The year 1882 is over and you are still riding. The trains have telegraphs, the counties have telephones, and the men you rode with are dead, in Stillwater prison or gone. Nobody rides forever.' };
    s.outcome.score = finalScore(s);
    return s;
  }

  // 8-9. The clock, the year, and history.
  s.t += 1;
  s.scouts = 0;
  if (seasonOf(s.t) === 0) newYear(s);
  history(s, streamFor(s.seed, s.t, 'history'));
  return s;
}

export function baseline(s, c) {
  const y = yearOf(s.t);
  const fade = Math.max(0, y - K(s, 'warFadeFrom')) * K(s, 'warFadePerYear');
  // A legend raises sympathy where people want a Southern hero; less where they do not.
  const myth = s.legend * (c.southern ? K(s, 'legendSymSouth') : K(s, 'legendSymNorth'));
  return clamp(c.base - (c.southern ? fade : fade / 2) + (c.southern ? s.edwards : 0) + myth, 0, 100);
}

function newYear(s) {
  for (const def of TARGETS) s.targets[def.id] = rollTarget(s.seed, s.t, def, s.targets[def.id]);
  for (const c of COUNTIES) s.given[c.id] = Math.floor(s.given[c.id] / 2);
}

function retirementRisk(s, rng, events) {
  // Old friends who know the alias, now poor, now tempted.
  let p = 0;
  for (const g of s.gang) {
    const d = defOf(g.id);
    if (d.leader || d.kin === 'james') continue;
    if ((g.status === 'gone' || g.status === 'turned') && g.loyalty < 40) p += 0.03 * (s.reward / K(s, 'rewardScale') + 0.3);
  }
  if (rng.chance(Math.min(0.5, p))) {
    s.retired.since = s.t + 1;
    s.cover.level = Math.max(0, s.cover.level - 40);
    events.push({ kind: 'bad', text: 'A man you rode with has been asking where Mr. Howard lives. You move the family before dawn and start again.' });
  }
}

function snapshot(s) {
  return {
    t: s.t, purse: s.purse, legend: Math.round(s.legend), reward: s.reward, pinkerton: Math.round(s.pinkerton),
    heat: Math.round(Object.values(s.heat).reduce((a, b) => a + b, 0) / COUNTIES.length),
    sym: Object.fromEntries(Object.entries(s.sym).map(([k, v]) => [k, Math.round(v)])),
    gang: active(s).length - 1, cover: s.cover.level,
  };
}

// ---- history ------------------------------------------------------------------

function history(s, rng) {
  const y = yearOf(s.t), q = seasonOf(s.t);
  const news = (text, title) => s.log.push({ t: s.t, kind: 'history', text, title });
  if (y === 1870 && q === 0 && !s.flags.edwards) {
    s.flags.edwards = true;
    s.edwards += 4;
    news('John Newman Edwards of the Kansas City Times, who rode with Jo Shelby, has started printing letters from Missouri\'s "outlaws" and defending them as Southern men driven to it. He will print yours. (After a job you can write to him: legend and Southern sympathy rise, and so does the reward.)', 'A friend at the Kansas City Times');
  }
  if (y === 1873 && q === 0) {
    news('The railroads are across Missouri now and the express companies ship cash in locked safes in the baggage cars. A train can be stopped like a stage, if you pull up a rail. Train jobs are open.', 'The express cars');
  }
  if (y === 1874 && q === 0) {
    if (!s.pinkActive) { s.pinkActive = true; s.pinkerton = Math.max(s.pinkerton, 15); }
    news('The Adams Express Company has hired the Pinkerton National Detective Agency of Chicago to hunt you. They do not give up, they do not mind whom they hurt, and they pay informers.', 'The Pinkertons');
  }
  if (y === 1874 && q === 1) news('You marry Zee Mimms, your cousin, after nine years of courting. Frank says you are a fool. He is at the wedding.', 'A wedding');
  if (y === 1875 && q === 1) news('Zee has a son. You name him Jesse Edward.', 'A son');
  if (y === 1879 && q === 1) news('Zee has a daughter, Mary.', 'A daughter');
  if (y === 1876 && q === 2 && !s.flags.northfieldDone) {
    const ch = member(s, 'chadwell');
    if (ch && ch.status === 'active') {
      s.flags.northfieldOffer = s.t;
      s.flags.northfieldCash = Math.round((NORTHFIELD.cash[0] + rng.next() * (NORTHFIELD.cash[1] - NORTHFIELD.cash[0])) / 100) * 100;
      news(`Bill Chadwell talks every night about a bank in Northfield, Minnesota: General Ames's money, a sleepy Yankee town, nobody up there who can shoot. It is a long way. It is on offer this season only.`, 'Minnesota');
    }
  }
  if (y === 1879 && q === 0) news('New men are drifting into the old haunts, looking for you. Most of them never rode with Quantrill. Some of them are very young.', 'New faces');
  if (y === 1881 && q === 1) {
    s.reward = Math.max(s.reward + 5000, 10000);
    news('Governor Thomas Crittenden, with railroad money behind him, offers $5,000 for your arrest and $5,000 more when you are convicted. Frank is worth the same. Every poor man in Missouri can do that sum.', 'Governor Crittenden');
  }
}

export { dateOf };
