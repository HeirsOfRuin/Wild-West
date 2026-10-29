// The three pursuers, and the people who hide you or sell you.
//
//   Posses     heat per county, 0-100. Fast and short-lived: halves every season.
//   Pinkertons one track, 0-100, from 1874 or the first train. Slow to fade,
//              they infiltrate the gang and come for the family.
//   The reward dollars on your head. Barely fades. It is what tempts informants
//              in unfriendly counties and the men in your own gang.

import { COUNTIES } from '../data/world.data.js';
import { K, yearOf } from './state.js';
import { followers, nudge, nameOf, canBetray } from './gang.js';
import { loseHouse } from './outfit.js';
import { detectiveFactor, detectiveKilled } from './law.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const COVER_COUNTY = { kc: 'jackson', stjoe: 'buchanan', nashville: null };
export const COVER_NAME = { kc: 'Kansas City', stjoe: 'St. Joseph', nashville: 'Nashville, Tennessee' };

/** The chance a hunted leader is taken or killed when they come for him. */
function leaderRaid(s, rng, events, { where, pCapture, pKill, why, cause }) {
  const r = rng.next();
  if (r < pKill) {
    s.outcome = { kind: 'killed', cause, t: s.t, text: `${why} You were killed in the yard${where ? ` in ${where}` : ''}.` };
    return;
  }
  if (r < pKill + pCapture) {
    s.outcome = { kind: 'captured', cause, t: s.t, text: `${why} They took you in your stocking feet${where ? ` in ${where}` : ''}.` };
    return;
  }
  const near = followers(s);
  if (near.length && rng.chance(0.3)) {
    const m = rng.pick(near);
    const g = s.gang.find((x) => x.id === m.id);
    g.status = 'captured'; g.capturedT = s.t;
    events.push({ kind: 'bad', text: `${why} You get out the back with your boots in your hand. ${m.name} is not so quick: they have him.` });
    for (const o of followers(s)) nudge(s, o.id, -(o.kin && o.kin === m.kin ? K(s, 'kinDeath') : K(s, 'comradeDeath')));
  } else {
    events.push({ kind: 'bad', text: `${why} You get out the back with your boots in your hand.` });
  }
}

/** Risk an informant brings a posse to where you are lying low. A safe house you own cuts it. */
export function informChance(s, county, atFarm = false) {
  if (!county) return 0;
  const drinker = followers(s).some((m) => m.traits.includes('drinker')) ? 1.5 : 1;
  const house = atFarm ? 1 : K(s, 'houseInform')[s.houses[county] || 0];
  return clamp((s.reward / K(s, 'informScale')) * (1 - s.sym[county] / 100) * 0.35 * drinker * house, 0, 0.4);
}

/** Risk someone recognises Mr. Howard. */
export function recognitionChance(s, place) {
  if (!place) return 0;
  const inState = place !== 'nashville';
  const farm = place === 'nashville' && s.assets?.farm ? K(s, 'farmRecognise') : 1;
  const exposed = s.flags?.exposedT === s.t ? 2 : 1; // you stood where people could see you
  return clamp((s.legend / 100) * 0.22 * (1 - s.cover.level / 120) * (inState ? 1.6 : 1) * farm * exposed, 0.005, 0.5);
}

/**
 * ctx: { where (county id, 'farm', or null when away), coverPlace, home, onJob }
 */
export function seasonPressure(s, ctx, rng, events) {
  const y = yearOf(s.t);
  const whereCounty = ctx.where === 'farm' ? s.home : ctx.where;

  // Posses give up.
  for (const c of COUNTIES) {
    const lying = ctx.lieLow && whereCounty === c.id;
    s.heat[c.id] = Math.round(s.heat[c.id] * (lying ? K(s, 'heatDecay') * 0.6 : K(s, 'heatDecay')));
    if (ctx.coverPlace) s.heat[c.id] = Math.round(s.heat[c.id] * 0.6);
  }

  // The Pinkertons.
  if (s.pinkActive) {
    let decay = K(s, 'pinkDecay');
    if (ctx.coverPlace === 'nashville') decay = K(s, 'pinkDecayCoverAway');
    else if (ctx.coverPlace) decay = K(s, 'pinkDecayCoverHome');
    s.pinkerton = clamp(s.pinkerton * decay + s.legend / 25, 0, 100);
    if (rng.chance(Math.min(0.9, (s.pinkerton / K(s, 'pinkOpScale')) * detectiveFactor(s, whereCounty)))) pinkertonOperation(s, ctx, rng, events);
  }
  if (s.outcome) return;

  // The reward barely fades.
  s.reward = Math.round(s.reward * (s.assets?.lawyer ? K(s, 'lawyerRewardFade') : K(s, 'rewardFade')));

  // A turncoat leads them to you.
  if (s.raid && s.raid.t < s.t) {
    const by = { name: nameOf(s, s.raid.by) };
    s.raid = null;
    if (ctx.coverPlace === 'nashville') {
      s.cover.level = Math.max(0, s.cover.level - 50);
      events.push({ kind: 'bad', text: `${by.name} told them you were living in Tennessee. Detectives are asking about a Mr. Howard. You move house in the night.` });
    } else {
      leaderRaid(s, rng, events, { where: null, pCapture: 0.15, pKill: 0.06, cause: 'turncoat',
        why: `${by.name} led a posse to your door.` });
      if (ctx.coverPlace) s.cover.level = 0;
      if (ctx.lieLow && ctx.where !== 'farm') loseHouse(s, whereCounty, events);
    }
    if (s.outcome) return;
  }

  // Informants where you hide.
  if (ctx.lieLow && whereCounty && rng.chance(informChance(s, whereCounty, ctx.where === 'farm'))) {
    s.heat[whereCounty] = Math.min(100, s.heat[whereCounty] + 20);
    if (ctx.where !== 'farm') loseHouse(s, whereCounty, events);
    leaderRaid(s, rng, events, { where: null, pCapture: 0.08 + s.heat[whereCounty] / 500, pKill: 0.04, cause: 'informant',
      why: `Someone in ${COUNTIES.find((c) => c.id === whereCounty).name} County wanted the reward more than they feared you.` });
    if (s.outcome) return;
  }

  // Being recognised under an alias.
  if (ctx.coverPlace && rng.chance(recognitionChance(s, ctx.coverPlace))) {
    s.cover.level = 0;
    if (s.pinkActive) s.pinkerton = clamp(s.pinkerton + 15, 0, 100);
    if (s.retired) s.retired.since = s.t + 1;
    leaderRaid(s, rng, events, { where: null, pCapture: 0.1, pKill: 0.02, cause: 'recognised',
      why: 'A man who rode with Quantrill knew your face in a feed store.' });
    if (!s.outcome) events.push({ kind: 'bad', text: 'Mr. Howard is finished. You will have to start again somewhere else.' });
  }
}

function pinkertonOperation(s, ctx, rng, events) {
  const familyAtFarm = s.familyAt === 'farm';
  if (!s.flags.farmRaid && s.pinkerton >= 40 && (familyAtFarm || ctx.where === 'farm' || rng.chance(0.5))) {
    s.flags.farmRaid = s.t;
    const fam = (id) => s.family.find((f) => f.id === id);
    const boy = fam('boy');
    const boyDies = boy?.alive && rng.chance(0.7);
    if (boyDies) boy.alive = false;
    if (fam('mother')) fam('mother').injured = true;
    s.sym[s.home] = clamp(s.sym[s.home] + 25, 0, 100);
    for (const c of COUNTIES) if (c.id !== s.home) s.sym[c.id] = clamp(s.sym[c.id] + 8, 0, 100);
    s.pinkerton = clamp(s.pinkerton - 35, 0, 100);
    s.legend = clamp(s.legend + 5, 0, 100);
    events.push({ kind: 'bad', title: 'The raid on the farm',
      text: `In the night Pinkerton men throw an iron flare-bomb through the kitchen window of your mother's house. ${boyDies ? `Your little brother ${boy.name.split(' ')[0]} is killed. ` : ''}Your mother's right arm is torn away. All Missouri is disgusted. Even the papers that call you a murderer call this one an outrage.` });
    if (familyAtFarm) {
      // The wife and children are hurt only if they were there.
      for (const f of s.family.filter((x) => x.core && x.alive)) {
        if (rng.chance(0.1)) {
          f.alive = false;
          events.push({ kind: 'bad', text: `${f.name.split(' ')[0]}, your ${f.rel}, was in the house. They did not live.` });
        }
      }
    }
    if (ctx.where === 'farm') {
      leaderRaid(s, rng, events, { where: null, pCapture: 0.08, pKill: 0.04, why: 'You were there.', cause: 'pinkerton' });
    }
    return;
  }
  const marks = followers(s).filter(canBetray);
  if (marks.length && rng.chance(0.6)) {
    const m = marks.reduce((a, b) => (b.loyalty < a.loyalty ? b : a));
    const g = s.gang.find((x) => x.id === m.id);
    g.approached = true;
    nudge(s, m.id, -8);
    events.push({ kind: 'warn', text: `A stranger with a soft voice${s.law?.detective ? ` (${s.law.detective.name}'s man)` : ''} has been buying drinks in the saloons where your men drink. Nobody remembers who he talked to.` });
    return;
  }
  const county = ctx.where === 'farm' ? s.home : ctx.where;
  if (county && s.sym[county] >= 60) {
    s.pinkerton = clamp(s.pinkerton + 10, 0, 100);
    s.reward += 1000;
    const dead = s.law?.detective?.county === county ? detectiveKilled(s) : null;
    events.push({ kind: 'warn', text: `${dead ? `${dead} of the Pinkerton agency` : 'A Pinkerton man'} hired on as a farmhand near your hideout. He was found on a road with his hands tied and a bullet in him. Nobody in the county saw a thing.` });
  } else if (county) {
    s.heat[county] = Math.min(100, s.heat[county] + 30);
    events.push({ kind: 'warn', text: `${s.law?.detective?.name ?? 'A detective'} has found the right road in ${COUNTIES.find((c) => c.id === county).name} County. The local sheriff has company.` });
  } else if (ctx.coverPlace) {
    s.cover.level = Math.max(0, s.cover.level - 25);
    events.push({ kind: 'warn', text: 'A detective has been asking at the boarding houses about men who pay in gold. Your landlady mentioned it.' });
  }
}

