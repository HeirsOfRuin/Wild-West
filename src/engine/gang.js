// The gang: who rides, what they think of you, and who sells you out.
//
// Loyalty is hidden. The screen shows a mood read from it with noise that
// shrinks the longer a man has ridden with you, so a new recruit is hard to
// read and Frank is an open book. Betrayal climbs in stages, quietly:
//   0 none -> 1 wavering -> 2 talking to the law -> 3 acting on it.

import { GANG, RECRUITS } from '../data/gang.data.js';
import { K, yearOf } from './state.js';
import { pay } from './money.js';

const DEFS = Object.fromEntries([...GANG, ...RECRUITS].map((d) => [d.id, d]));
export const defOf = (id) => DEFS[id];

/** A member with his fixed data and his state merged (read-only view). */
export function member(s, id) {
  const st = s.gang.find((g) => g.id === id);
  return st ? { ...DEFS[id], traits: DEFS[id].traits || [], ...st } : null;
}
export const members = (s) => s.gang.map((g) => member(s, g.id));
export const active = (s) => members(s).filter((m) => m.status === 'active');
export const riders = (s) => active(s); // the leader included
export const followers = (s) => active(s).filter((m) => !m.leader);
export const leader = (s) => member(s, 'jesse');
const raw = (s, id) => s.gang.find((g) => g.id === id);

export function nudge(s, id, delta) {
  const g = raw(s, id);
  const d = DEFS[id];
  if (!g || d.leader) return;
  const traits = d.traits || [];
  let x = delta * (traits.includes('young') ? 1.5 : 1);
  g.loyalty = Math.max(d.kin && kinWithLeader(d) ? K(s, 'kinFloor') : 0, Math.min(100, g.loyalty + x));
}
const kinWithLeader = (d) => d.kin === 'james';

/** Kin of the leader never sell him. Everyone else can. */
export const canBetray = (m) => !m.leader && m.kin !== 'james';

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
  const y = yearOf(s.t);
  const n = active(s).length;
  return RECRUITS.filter((r) => !raw(s, r.id) && r.joins <= y).map((r) => {
    let lock = null;
    if (n >= 8) lock = 'Eight men is as many as can hide together.';
    else if (s.flags.recruitT === s.t) lock = 'One new man a season; the others need to look him over.';
    else if (s.purse < K(s, 'recruitCost')) lock = `Needs $${K(s, 'recruitCost')} for his horse and kit.`;
    else if (s.legend < 15) lock = 'Nobody has heard of you yet. Legend 15 brings men looking for you.';
    else if (s.retired) lock = 'You have quit the life.';
    return { id: r.id, name: r.name, pitch: r.pitch, lock };
  });
}

export function recruit(s, id) {
  const opt = recruitOptions(s).find((o) => o.id === id);
  if (!opt) throw new Error(`No such recruit: ${id}`);
  if (opt.lock) throw new Error(opt.lock);
  const d = DEFS[id];
  pay(s, -K(s, 'recruitCost'), `Horse and kit for ${d.name}`);
  s.gang.push({ id, loyalty: d.loyalty, pocket: 50, status: 'active', joined: s.t, rode: 0, wounded: 0,
    stage: 0, approached: false, suspected: false, bonusT: -1, noise: 0 });
  s.flags.recruitT = s.t;
  s.log.push({ t: s.t, kind: 'gang', text: `${d.name} rides with you now.` });
}

/** Sending a man home. A stake buys goodwill; sending him off broke buys a grudge. */
export function dismiss(s, id, stake = false) {
  const g = raw(s, id);
  if (!g || g.status !== 'active' || DEFS[id].leader) throw new Error('He is not riding with you.');
  const amount = K(s, 'stake');
  if (stake && s.purse < amount) throw new Error(`A stake is $${amount}; the purse has $${s.purse}.`);
  if (stake) {
    pay(s, -amount, `A stake for ${DEFS[id].name} to go home on`);
    g.pocket += amount;
    nudge(s, id, 10);
  } else {
    nudge(s, id, -15);
  }
  g.status = 'gone';
  g.leftT = s.t;
  // Parting on bad terms is remembered.
  if (g.loyalty < 40) g.stage = Math.max(g.stage, 1);
  s.log.push({ t: s.t, kind: 'gang', text: `${DEFS[id].name} ${stake ? 'takes his stake' : 'goes'} home.${g.loyalty < 40 ? ' He does not shake your hand.' : ''}` });
}

export function killMember(s, id) {
  const g = raw(s, id);
  if (!g || g.status !== 'active' || DEFS[id].leader) throw new Error('He is not riding with you.');
  g.status = 'dead';
  g.diedT = s.t;
  g.byGang = true;
  for (const o of followers(s)) {
    nudge(s, o.id, -K(s, 'killMemberFear') - (o.kin && o.kin === DEFS[id].kin ? 30 : 0));
  }
  for (const c of Object.keys(s.sym)) s.sym[c] = Math.max(0, s.sym[c] - 4);
  s.legend = Math.min(100, s.legend + 2);
  s.dead.push({ id, name: DEFS[id].name, t: s.t, how: 'killed by the gang' });
  s.log.push({ t: s.t, kind: 'gang', text: `${DEFS[id].name} is found in the brush with a bullet in the back of his head. Nobody asks. Everybody knows.` });
}

export function bonus(s, id, amount) {
  const g = raw(s, id);
  if (!g || g.status !== 'active' || DEFS[id].leader) throw new Error('He is not riding with you.');
  if (amount <= 0 || amount > s.purse) throw new Error('Not enough in the purse.');
  if (g.bonusT === s.t) throw new Error('You have already paid him this season. More looks like fear.');
  pay(s, -amount, `A private word and money for ${DEFS[id].name}`);
  g.pocket += amount;
  g.bonusT = s.t;
  const greedy = (DEFS[id].traits || []).includes('greedy');
  nudge(s, id, Math.min(K(s, 'bonusCap'), (amount / K(s, 'bonusPer')) * (greedy ? 1.5 : 1)));
}

// ---- the season's turn of mood ----------------------------------------------

/**
 * ctx: { rode: Set of ids who went on a job this season, underCover: bool }
 * Order matters: pockets first (a broke man is a restless man), then fear,
 * then pride.
 */
export function seasonLoyalty(s, ctx, rng, events) {
  const rode = ctx.rode;
  const anyRode = rode.size > 0;
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
    nudge(s, m.id, -(m.kin === 'james' ? fear / 2 : fear));
    if (!anyRode) nudge(s, m.id, -(s.idle > 3 ? K(s, 'longIdlePenalty') : K(s, 'idlePenalty')));
    if (ctx.underCover && m.kin !== 'james') nudge(s, m.id, -K(s, 'coverAbsence'));
    if (s.legend >= K(s, 'prideLegend')) nudge(s, m.id, 1);
    if (g.wounded > 0) g.wounded -= 1;
    g.noise = Math.round((rng.next() * 2 - 1) * readNoise(member(s, m.id))) || 0; // never -0: saves must round-trip exactly
  }
  const L = raw(s, 'jesse');
  if (L.wounded > 0) L.wounded -= 1;
}

// ---- betrayal ----------------------------------------------------------------

const SIGNS = [
  (n) => `${n} was seen in Kansas City talking with a man in a city suit.`,
  (n) => `${n} has money nobody paid him. He says he won it at cards.`,
  (n) => `A friend in Liberty says ${n} asked the sheriff's deputy how much the reward stands at.`,
  (n) => `${n} sleeps with his boots on and his back to the wall now. He watches you.`,
];

export function seasonBetrayal(s, ctx, rng, events) {
  const temptBase = s.reward / K(s, 'rewardScale');
  const frank = member(s, 'frank');
  const frankWatching = frank && frank.status === 'active' && frank.loyalty >= 50;
  for (const m of members(s)) {
    if (!canBetray(m)) continue;
    if (m.status !== 'active' && m.status !== 'gone') continue;
    const g = raw(s, m.id);
    if (m.status === 'gone') {
      // A man gone home lives on what he took with him; when it runs out, the reward looks better.
      g.pocket = Math.max(0, g.pocket - K(s, 'livingCost'));
      if (g.pocket === 0 && s.reward > 2000) g.loyalty = Math.max(0, g.loyalty - 3);
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
      const here = s.sym[ctx.where] ?? 50;
      const p = 0.2 + (frankWatching ? 0.2 : 0) + (here >= 60 ? 0.15 : 0);
      if (rng.chance(p)) {
        g.suspected = true;
        events.push({ kind: 'warn', text: rng.pick(SIGNS)(m.name) });
      }
    }
    // Acting on it.
    if (g.stage >= 3 && !s.outcome) {
      if (m.traits.includes('ambitious') && m.status === 'active' && ctx.home) {
        if (rng.chance(0.5)) {
          const foil = (g.suspected ? 0.25 : 0) + (frankWatching ? 0.2 : 0);
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
