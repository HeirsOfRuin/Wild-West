// The gang: who rides, what they think of you, and who sells you out.
//
// Every man's data lives in the save (s.gang): the companions you started with
// and the men who came looking for you are generated, so there is no fixed table.
//
// Loyalty is hidden. The screen shows a mood read from it with noise that
// shrinks the longer a man has ridden with you, so a new recruit is hard to
// read and your brother is an open book. Betrayal climbs in stages, quietly:
//   0 none -> 1 wavering -> 2 talking to the law -> 3 acting on it.

import { K } from './state.js';
import { pay } from './money.js';
import { makeMember } from './people.js';

const raw = (s, id) => s.gang.find((g) => g.id === id);
export const rawMember = raw;

/** Traits, less any switched off for an ablation (tune.offTraits). */
export function traitsOf(s, g) {
  const off = s.tune?.offTraits || [];
  return g.traits.filter((t) => !off.includes(t));
}
export const hasTrait = (s, g, t) => traitsOf(s, g).includes(t);

/** A man as the engine reads him: skills include his gear. */
export function member(s, id) {
  const g = raw(s, id);
  if (!g) return null;
  const step = K(s, 'gearStep');
  return {
    ...g, traits: traitsOf(s, g),
    base: { gun: g.gun, nerve: g.nerve, horse: g.horse },
    gun: g.gun + g.gear.gun * step, horse: g.horse + g.gear.horse * step,
  };
}
export const members = (s) => s.gang.map((g) => member(s, g.id));
export const active = (s) => members(s).filter((m) => m.status === 'active');
export const followers = (s) => active(s).filter((m) => !m.leader);
export const leader = (s) => member(s, 'me');
export const nameOf = (s, id) => raw(s, id)?.name ?? 'Someone';

export function nudge(s, id, delta) {
  const g = raw(s, id);
  if (!g || g.leader) return;
  const x = delta * (hasTrait(s, g, 'young') ? 1.5 : 1);
  g.loyalty = Math.max(g.kin === 'family' ? K(s, 'kinFloor') : 0, Math.min(100, g.loyalty + x));
}

/** Your own family never sells you. Everyone else can. */
export const canBetray = (m) => !m.leader && m.kin !== 'family';

/** Kin who ride with you and still like you watch your back. */
export const kinWatching = (s) => followers(s).some((m) => m.kin === 'family' && m.loyalty >= 50);

// ---- mood, as the player sees it -------------------------------------------

export function readNoise(m) {
  return Math.max(0, 30 - m.rode * 3);
}
export function mood(m) {
  if (m.leader) return { word: 'You', readable: true };
  const seen = m.loyalty + m.noise;
  const word = seen >= 70 ? 'Steady' : seen >= 50 ? 'Content' : seen >= 35 ? 'Restless' : 'Sullen';
  return { word, readable: readNoise(m) < 10 };
}

// ---- recruiting and parting -------------------------------------------------

export function recruitOptions(s) {
  const n = active(s).length;
  return s.offers.map((o) => {
    let lock = null;
    if (s.retired) lock = 'You have quit the life.';
    else if (n >= 8) lock = 'Eight men is as many as can hide together.';
    else if (s.flags.recruitT === s.t) lock = 'One new man a season; the others need to look him over.';
    else if (s.purse < K(s, 'recruitCost')) lock = `Needs $${K(s, 'recruitCost')} for his horse and kit.`;
    return { ...o, lock, leaves: o.expires - s.t };
  });
}

export function recruit(s, id) {
  const opt = recruitOptions(s).find((o) => o.id === id);
  if (!opt) throw new Error('He is no longer looking for you.');
  if (opt.lock) throw new Error(opt.lock);
  pay(s, -K(s, 'recruitCost'), `Horse and kit for ${opt.name}`);
  s.stats.spent += K(s, 'recruitCost');
  const { expires, leaves, lock, known, ...fields } = opt;
  s.gang.push(makeMember({ ...fields, joined: s.t, pocket: 50, rode: 0 }));
  s.offers = s.offers.filter((o) => o.id !== id);
  s.flags.recruitT = s.t;
  s.log.push({ t: s.t, kind: 'gang', text: `${opt.name} rides with you now.` });
}

/** Sending a man home. A stake buys goodwill; sending him off broke buys a grudge. */
export function dismiss(s, id, stake = false) {
  const g = raw(s, id);
  if (!g || g.status !== 'active' || g.leader) throw new Error('He is not riding with you.');
  const amount = K(s, 'stake');
  if (stake && s.purse < amount) throw new Error(`A stake is $${amount}; the purse has $${s.purse}.`);
  if (stake) {
    pay(s, -amount, `A stake for ${g.name} to go home on`);
    g.pocket += amount;
    nudge(s, id, 10);
  } else {
    nudge(s, id, -15);
  }
  g.status = 'gone';
  g.leftT = s.t;
  if (g.loyalty < 40) g.stage = Math.max(g.stage, 1); // parting on bad terms is remembered
  s.log.push({ t: s.t, kind: 'gang', text: `${g.name} ${stake ? 'takes his stake' : 'goes'} home${g.gear.horse || g.gear.gun ? ', on the horse and with the guns you bought him' : ''}.${g.loyalty < 40 ? ' He does not shake your hand.' : ''}` });
}

export function killMember(s, id) {
  const g = raw(s, id);
  if (!g || g.status !== 'active' || g.leader) throw new Error('He is not riding with you.');
  g.status = 'dead';
  g.diedT = s.t;
  g.byGang = true;
  for (const o of followers(s)) nudge(s, o.id, -K(s, 'killMemberFear') - (o.kin && o.kin === g.kin ? 30 : 0));
  for (const c of Object.keys(s.sym)) s.sym[c] = Math.max(0, s.sym[c] - 4);
  s.legend = Math.min(100, s.legend + 2);
  s.dead.push({ id, name: g.name, t: s.t, how: 'killed by the gang' });
  s.log.push({ t: s.t, kind: 'gang', text: `${g.name} is found in the brush with a bullet in the back of his head. Nobody asks. Everybody knows.` });
}

export function bonus(s, id, amount) {
  const g = raw(s, id);
  if (!g || g.status !== 'active' || g.leader) throw new Error('He is not riding with you.');
  if (amount <= 0 || amount > s.purse) throw new Error('Not enough in the purse.');
  if (g.bonusT === s.t) throw new Error('You have already paid him this season. More looks like fear.');
  pay(s, -amount, `A private word and money for ${g.name}`);
  s.stats.spent += amount;
  g.pocket += amount;
  g.bonusT = s.t;
  nudge(s, id, Math.min(K(s, 'bonusCap'), (amount / K(s, 'bonusPer')) * (hasTrait(s, g, 'greedy') ? 1.5 : 1)));
}

// ---- the season's turn of mood ----------------------------------------------

/**
 * ctx: { rode: Set of ids who went on a job this season, underCover: bool }
 * Order matters: pockets first (a broke man is a restless man), then fear,
 * then pride.
 */
export function seasonLoyalty(s, ctx, rng) {
  const anyRode = ctx.rode.size > 0;
  s.idle = anyRode ? 0 : s.idle + 1;
  for (const m of followers(s)) {
    const g = raw(s, m.id);
    g.rode += 1;
    // What have you done for me lately: last year's big share is forgotten.
    g.loyalty += (K(s, 'loyaltyRest') - g.loyalty) * K(s, 'loyaltyDrift');
    g.pocket -= K(s, 'livingCost');
    if (g.pocket < 0) {
      g.pocket = 0;
      nudge(s, m.id, -K(s, 'brokePenalty'));
    }
    const fear = Math.min(4, (s.pinkActive ? s.pinkerton / 40 : 0) + s.reward / 8000);
    nudge(s, m.id, -(m.kin === 'family' ? fear / 2 : fear));
    if (!anyRode) nudge(s, m.id, -(s.idle > 3 ? K(s, 'longIdlePenalty') : K(s, 'idlePenalty')));
    if (ctx.underCover && m.kin !== 'family') nudge(s, m.id, -K(s, 'coverAbsence'));
    if (s.legend >= K(s, 'prideLegend')) nudge(s, m.id, 1);
    if (g.wounded > 0) g.wounded -= 1;
    if (g.leaveT !== undefined && s.t >= g.leaveT) {
      g.status = 'gone';
      g.leftT = s.t;
      s.log.push({ t: s.t, kind: 'gang', text: `${g.name} keeps his word to his girl and goes home to marry her. He leaves on good terms.` });
      continue;
    }
    g.noise = Math.round((rng.next() * 2 - 1) * readNoise(member(s, m.id))) || 0; // never -0: saves must round-trip exactly
  }
  const L = raw(s, 'me');
  if (L.wounded > 0) L.wounded -= 1;
  // Men who were away come back, in time for the next season.
  for (const g of s.gang) {
    if (g.status === 'away' && s.t + 1 >= g.returnT) {
      g.status = 'active';
      s.log.push({ t: s.t, kind: 'gang', text: `${g.name} is back.` });
    }
  }
  // A lieutenant who is gone is no lieutenant.
  if (s.lieutenant && raw(s, s.lieutenant)?.status !== 'active' && raw(s, s.lieutenant)?.status !== 'away') s.lieutenant = null;
}

// ---- betrayal ----------------------------------------------------------------

const SIGNS = [
  (n) => `${n} was seen in Kansas City talking with a man in a city suit.`,
  (n) => `${n} has money nobody paid him. He says he won it at cards.`,
  (n) => `A friend says ${n} asked the sheriff's deputy how much the reward stands at.`,
  (n) => `${n} sleeps with his boots on and his back to the wall now. He watches you.`,
];

export function seasonBetrayal(s, ctx, rng, events) {
  const temptBase = s.reward / K(s, 'rewardScale');
  const watching = kinWatching(s);
  for (const m of members(s)) {
    if (!canBetray(m)) continue;
    if (m.status !== 'active' && m.status !== 'gone') continue;
    const g = raw(s, m.id);
    if (m.status === 'gone') {
      // A man gone home lives on what he took with him; when it runs out, the reward looks better.
      g.pocket = Math.max(0, g.pocket - K(s, 'livingCost'));
      // A man who left angry sours as soon as his money runs out; one who left with
      // your blessing only when he is broke and the reward is too big to ignore.
      const bitter = g.stage >= 1 || g.loyalty < 50;
      if (g.pocket === 0 && s.reward > (bitter ? K(s, 'goneSourReward') : K(s, 'goneSourRewardGood'))) g.loyalty = Math.max(0, g.loyalty - 3);
    }
    const greedy = m.traits.includes('greedy') ? 1.3 : 1;
    const amb = m.traits.includes('ambitious') ? 1.6 : 1;
    const tempt = temptBase * greedy * amb * (g.approached ? 1.5 : 1);
    if (g.loyalty < K(s, 'betrayBelow') && g.stage < 3) {
      const p = Math.min(0.6, ((K(s, 'betrayBelow') - g.loyalty) / 60) * (0.3 + tempt));
      if (rng.chance(p)) {
        g.stage += 1;
        if (g.stage === 2) {
          if (s.pinkActive) s.pinkerton = Math.min(100, s.pinkerton + 5);
          if (m.status === 'active' && rng.chance(0.4)) s.ambush = { by: m.id };
        }
      }
    } else if (g.loyalty > K(s, 'betrayRecover') && g.stage > 0 && g.stage < 3 && rng.chance(0.4)) {
      g.stage -= 1;
    }
    // Being found out: friends talk, kin watch.
    if (g.stage >= 2 && !g.suspected && m.status === 'active') {
      const here = s.sym[ctx.where === 'farm' ? s.home : ctx.where] ?? 50;
      const p = 0.2 + (watching ? 0.2 : 0) + (here >= 60 ? 0.15 : 0);
      if (rng.chance(p)) {
        g.suspected = true;
        events.push({ kind: 'warn', text: rng.pick(SIGNS)(m.name) });
      }
    }
    // Acting on it.
    if (g.stage >= 3 && !s.outcome) {
      if (m.traits.includes('ambitious') && m.status === 'active' && ctx.home) {
        if (rng.chance(0.5)) {
          const foil = (g.suspected ? 0.25 : 0) + (watching ? 0.2 : 0);
          if (rng.chance(foil)) {
            g.status = 'gone';
            g.stage = 2;
            events.push({ kind: 'warn', text: `${m.name} had his pistol half out when you turned round. He runs for the door and keeps running.` });
          } else {
            s.outcome = { kind: 'betrayed', cause: 'assassin', t: s.t, by: m.id,
              text: `${m.name} shot you in the back of the head while you stood on a chair to straighten a picture. He went to the telegraph office to claim the reward.` };
          }
        }
      } else if (rng.chance(0.5)) {
        g.status = 'turned';
        g.turnedT = s.t;
        s.raid = { by: m.id, t: s.t };
        if (s.pinkActive) s.pinkerton = Math.min(100, s.pinkerton + 10);
        events.push({ kind: 'warn', text: `${m.name} has given himself up and is talking. He knows your hiding places.` });
      }
    }
  }
}

// ---- a lieutenant -------------------------------------------------------------

export function lieutenantOption(s, id) {
  const g = raw(s, id);
  let lock = null;
  if (!g || g.status !== 'active' || g.leader) lock = 'He is not riding with you.';
  else if (s.lieutenant === id) lock = 'He is your lieutenant.';
  else if ((g.jobs || 0) < K(s, 'lieutenantJobs')) lock = `Men follow a man they have seen work: ${K(s, 'lieutenantJobs')} jobs (he has ${g.jobs || 0}).`;
  return { id, lock };
}

/** Name a man your lieutenant: he can lead a second crew and takes a double share. */
export function makeLieutenant(s, id) {
  const o = lieutenantOption(s, id);
  if (o.lock) throw new Error(o.lock);
  const old = s.lieutenant && raw(s, s.lieutenant);
  if (old) nudge(s, old.id, -10);
  s.lieutenant = id;
  nudge(s, id, 10);
  s.log.push({ t: s.t, kind: 'gang', text: `${raw(s, id).name} is your lieutenant${old ? `, in place of ${old.name}, who takes it badly` : ''}.` });
}

// ---- the rise ----------------------------------------------------------------

const ROLE_STAT = { inside: 'nerve', street: 'gun', horses: 'horse' };
const ROLE_WORD = { nerve: 'cooler at the counter', gun: 'surer with a pistol', horse: 'a better hand with horses' };

/** After a job: a man who came through unhurt may get better at what he did. */
export function learn(s, crew, hurt, rng, beats) {
  for (const c of crew) {
    if (hurt.has(c.id)) continue;
    const g = raw(s, c.id);
    if (!g || g.status !== 'active') continue;
    g.jobs = (g.jobs || 0) + 1;
    const stat = ROLE_STAT[c.role];
    if (g[stat] < K(s, 'skillMax') && rng.chance(K(s, 'learnChance'))) {
      g[stat] += 1;
      beats.push(`${g.leader ? 'You are' : `${g.name} is`} ${ROLE_WORD[stat]} after this one.`);
    }
  }
}
