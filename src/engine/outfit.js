// What the money buys: horses and guns for each man, safe houses, a sheriff's
// blind eye, a doctor, a wedding. All free actions: they do not end the season.
// Every option comes with its lock reason so the screen can say why not.

import { GEAR, SAFE_HOUSE, ASSETS } from '../data/gang.data.js';
import { COUNTIES } from '../data/world.data.js';
import { K, yearOf } from './state.js';
import { pay } from './money.js';
import { rawMember } from './gang.js';
import { wifeName } from './people.js';
import { bribeFactor } from './law.js';

const spend = (s, amount, why) => { pay(s, -amount, why); s.stats.spent += amount; };

// ---- horses and guns --------------------------------------------------------

export function gearOptions(s, id) {
  const g = rawMember(s, id);
  if (!g) return [];
  return ['horse', 'gun'].map((item) => {
    const tier = g.gear[item];
    const next = GEAR[item][tier + 1];
    if (!next) return { item, tier, name: GEAR[item][tier].name, done: true };
    let lock = null;
    if (g.status !== 'active') lock = 'He is not riding with you.';
    else if (next.from && yearOf(s.t) < next.from) lock = `Not made until ${next.from}.`;
    else if (s.purse < next.cost) lock = `Costs $${next.cost}.`;
    return { item, tier, name: GEAR[item][tier].name, next: next.name, cost: next.cost, lock };
  });
}

export function buyGear(s, id, item) {
  const opt = gearOptions(s, id).find((o) => o.item === item);
  if (!opt || opt.done) throw new Error('Nothing better to buy.');
  if (opt.lock) throw new Error(opt.lock);
  const g = rawMember(s, id);
  spend(s, opt.cost, `${opt.next} for ${g.name}`);
  g.gear[item] += 1;
}

// ---- safe houses ------------------------------------------------------------

export function houseOptions(s) {
  return COUNTIES.map((c) => {
    const level = s.houses[c.id] || 0;
    const next = SAFE_HOUSE[level];
    if (!next) return { county: c.id, level, done: true };
    let lock = null;
    if (s.retired) lock = 'You have quit the life.';
    else if (s.sym[c.id] < K(s, 'minHouseSym')) lock = `Nobody in ${c.name} will keep a house for you (sympathy under ${K(s, 'minHouseSym')}).`;
    else if (s.purse < next.cost) lock = `Costs $${next.cost}.`;
    return { county: c.id, level, name: next.name, text: next.text, cost: next.cost, lock };
  });
}

export function buyHouse(s, county) {
  const opt = houseOptions(s).find((o) => o.county === county);
  if (!opt || opt.done) throw new Error('Nothing more to build there.');
  if (opt.lock) throw new Error(opt.lock);
  spend(s, opt.cost, `${opt.name} in ${COUNTIES.find((c) => c.id === county).name}`);
  s.houses[county] = opt.level + 1;
}

/** The house is gone: burned, or the family that kept it ran. */
export function loseHouse(s, county, events) {
  if (!s.houses[county]) return;
  delete s.houses[county];
  events.push({ kind: 'bad', text: `The safe house in ${COUNTIES.find((c) => c.id === county).name} is burned. The family that kept it has fled to Arkansas.` });
}

// ---- sheriffs, doctors ------------------------------------------------------

export function bribeOption(s, county) {
  const c = COUNTIES.find((x) => x.id === county);
  const f = bribeFactor(s, county);
  const cost = Math.round(s.heat[county] * K(s, 'bribePerHeat') * (c.southern ? 1 : 2) * (f ?? 1));
  let lock = null;
  if (s.heat[county] < 5) lock = 'No posse is looking for you here.';
  else if (f === null) lock = `Sheriff ${s.law.sheriffs[county].name} wants you, not your money.`;
  else if (s.bribed[county] === s.t) lock = 'He has had his money this season.';
  else if (s.purse < cost) lock = `Costs $${cost}.`;
  return { county, cost, lock };
}

export function bribe(s, county) {
  const opt = bribeOption(s, county);
  if (opt.lock) throw new Error(opt.lock);
  spend(s, opt.cost, `The sheriff of ${COUNTIES.find((c) => c.id === county).name} County looks the other way`);
  s.heat[county] = Math.round(s.heat[county] / 2);
  s.bribed[county] = s.t;
}

export function doctorOption(s, id) {
  const g = rawMember(s, id);
  let lock = null;
  if (!g || g.status !== 'active') lock = 'He is not riding with you.';
  else if (!g.wounded) lock = 'He is not hurt.';
  else if (s.purse < K(s, 'doctorCost')) lock = `A doctor who keeps quiet costs $${K(s, 'doctorCost')}.`;
  return { id, cost: K(s, 'doctorCost'), lock };
}

export function doctor(s, id) {
  const opt = doctorOption(s, id);
  if (opt.lock) throw new Error(opt.lock);
  const g = rawMember(s, id);
  spend(s, opt.cost, `A doctor for ${g.name}, and his silence`);
  g.wounded = 0;
}

// ---- the end game -----------------------------------------------------------

export function assetOptions(s) {
  return ASSETS.map((a) => {
    const owned = a.id === 'business' ? !!s.assets.business : s.assets[a.id];
    let lock = null;
    if (owned) lock = a.id === 'business' ? `You own one in ${COVER_PLACES[s.assets.business]}.` : 'You own it.';
    else if (a.needs === 'married' && !s.married) lock = 'A farm needs a family to work it: marry first.';
    else if (a.needs === 'cover' && !s.cover.place) lock = 'You need somewhere to live as Mr. Howard first.';
    else if (s.purse < a.cost) lock = `Costs $${a.cost.toLocaleString('en-US')}.`;
    return { ...a, owned, lock, where: a.id === 'business' ? s.assets.business || s.cover.place : null };
  });
}
const COVER_PLACES = { kc: 'Kansas City', stjoe: 'St. Joseph', nashville: 'Nashville' };

export function buyAsset(s, id) {
  const opt = assetOptions(s).find((o) => o.id === id);
  if (!opt) throw new Error('No such thing to buy.');
  if (opt.lock) throw new Error(opt.lock);
  spend(s, opt.cost, opt.name + (id === 'business' ? ` in ${COVER_PLACES[s.cover.place]}` : ''));
  if (id === 'business') s.assets.business = s.cover.place;
  else s.assets[id] = true;
  s.log.push({ t: s.t, kind: 'story', text: { farm: 'You buy a farm in Tennessee under another name. Nobody there has heard of you.',
    business: `Mr. Howard opens a business in ${COVER_PLACES[s.cover.place]}. He pays his bills on time.`,
    lawyer: 'A Jefferson City lawyer takes your money and your case. He knows the governor\'s friends.' }[id] });
}

/** Money for a man who has gone home: it buys back his goodwill, and his silence. */
export function hushOption(s, id) {
  const g = rawMember(s, id);
  let lock = null;
  if (!g || g.status !== 'gone') lock = 'Only a man who has gone home can be paid to stay quiet.';
  else if (g.hushT === s.t) lock = 'You have sent him money this season.';
  else if (s.purse < K(s, 'hushCost')) lock = `Costs $${K(s, 'hushCost')}.`;
  return { id, cost: K(s, 'hushCost'), lock };
}

export function hush(s, id) {
  const opt = hushOption(s, id);
  if (opt.lock) throw new Error(opt.lock);
  const g = rawMember(s, id);
  spend(s, opt.cost, `Money sent to ${g.name}`);
  g.pocket += opt.cost;
  g.hushT = s.t;
  g.loyalty = Math.min(100, g.loyalty + K(s, 'hushLoyalty'));
  if (g.loyalty >= K(s, 'betrayRecover')) g.stage = 0;
}

// ---- a wedding --------------------------------------------------------------

export function marryProblem(s) {
  if (s.married) return 'You are married.';
  if (s.retired) return null;
  if (s.purse < K(s, 'marryCost')) return `A wedding, a ring and a house for her costs $${K(s, 'marryCost')}.`;
  return null;
}

export function marry(s) {
  const why = marryProblem(s);
  if (why) throw new Error(why);
  spend(s, K(s, 'marryCost'), 'A wedding, a ring and a house');
  s.married = true;
  const name = wifeName(s.seed);
  s.family.push({ id: 'wife', name, rel: 'wife', alive: true, injured: false, core: true });
  s.log.push({ t: s.t, kind: 'story', text: `You marry ${name}. Your mother cries, the preacher does not ask questions, and your gang gets drunk.` });
}
