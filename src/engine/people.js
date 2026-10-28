// Making people: your character, your companions, the men who come looking for
// you, your family. Generated from the tables in gang.data.js with named streams,
// so the same seed makes the same people.

import { BACKGROUNDS, FIRST_NAMES, SURNAMES, WOMEN, COMPANION_KINDS, RECRUIT_KINDS, KNOWN_MEN } from '../data/gang.data.js';
import { COUNTIES } from '../data/world.data.js';
import { streamFor } from './rng.js';

export const DEFAULT_CREATION = {
  first: 'Jesse', last: 'James', background: 'bushwhacker', home: 'clay', bonus: 'horse',
  companions: ['brother', 'cousin', 'warfriend'],
};

const TRAIT_POOL = ['hothead', 'steady', 'greedy', 'young', 'drinker'];

/** A member record: everything about a man lives in the save. */
export function makeMember(fields) {
  return {
    id: fields.id, name: fields.name, short: fields.short || fields.name.split(' ')[0],
    rel: fields.rel || null, kin: fields.kin || null, leader: !!fields.leader,
    gun: fields.gun, nerve: fields.nerve, horse: fields.horse, traits: fields.traits || [],
    gear: { horse: 0, gun: 0 }, pitch: fields.pitch || '',
    loyalty: fields.loyalty ?? 55, pocket: fields.pocket ?? 100, status: 'active', joined: fields.joined ?? 0,
    rode: fields.rode ?? 0, jobs: 0, wounded: 0, stage: 0, approached: false, suspected: false, bonusT: -1, noise: 0,
  };
}

/** The five companions on offer at creation, the same for the same seed and surname. */
export function companionChoices(seed, last) {
  const r = streamFor(seed, 0, 'companions');
  const used = new Set();
  const first = () => { let n; do n = r.pick(FIRST_NAMES); while (used.has(n)); used.add(n); return n; };
  return COMPANION_KINDS.map((k) => {
    const name = `${first()} ${k.sameName ? last : r.pick(SURNAMES)}`;
    const jitter = () => (r.chance(0.3) ? 1 : 0) - (r.chance(0.2) ? 1 : 0);
    const [g, n, h] = k.stats.map((x) => Math.max(1, Math.min(3, x + jitter())));
    const traits = [];
    if (k.young) traits.push('young');
    if (r.chance(0.35)) { const t = r.pick(TRAIT_POOL.filter((x) => !traits.includes(x))); traits.push(t); }
    return { id: `c-${k.id}`, kind: k.id, name, rel: k.rel, kin: k.kin ? 'family' : null,
      gun: g, nerve: n, horse: h, traits, loyalty: k.loyalty, pitch: k.pitch };
  });
}

export function backgroundOf(id) {
  const b = BACKGROUNDS.find((x) => x.id === id);
  if (!b) throw new Error(`No such background: ${id}`);
  return b;
}

/** Check a creation and say what is wrong with it, or null. */
export function creationProblem(c) {
  if (!c.first?.trim() || !c.last?.trim()) return 'Give your outlaw a first name and a surname.';
  if (!BACKGROUNDS.some((b) => b.id === c.background)) return 'Choose a background.';
  if (!COUNTIES.some((x) => x.id === c.home)) return 'Choose a home county.';
  if (!['gun', 'nerve', 'horse'].includes(c.bonus)) return 'Choose where your extra point goes.';
  const want = backgroundOf(c.background).companions;
  if ((c.companions || []).length !== want) return `Choose ${want} companions to ride with you.`;
  return null;
}

/** The leader, from the creation choices. */
export function makeLeader(c) {
  const b = backgroundOf(c.background);
  const stat = (k) => 2 + (b.bonus[k] || 0) + (c.bonus === k ? 1 : 0);
  return makeMember({ id: 'me', name: `${c.first.trim()} ${c.last.trim()}`, short: c.first.trim(), leader: true, kin: 'family',
    gun: stat('gun'), nerve: stat('nerve'), horse: stat('horse'), loyalty: 100, rode: 40 });
}

/** The family on the farm at the start. */
export function startingFamily(seed, last) {
  const r = streamFor(seed, 0, 'family');
  return [
    { id: 'mother', name: `${r.pick(WOMEN)} ${last}`, rel: 'mother', alive: true, injured: false },
    { id: 'boy', name: `${r.pick(['Archie', 'Johnny', 'Willie', 'Lafe', 'Tommy'])} ${last}`, rel: 'little brother', alive: true, injured: false },
  ];
}

/** New men looking for you this season: generated, plus a known man in his year. */
export function recruitOffers(s, rng, n, year, legend, nextId) {
  const out = [];
  const known = KNOWN_MEN.find((k) => k.from <= year && legend >= k.legend && !s.flags[`known:${k.id}`]);
  if (known && rng.chance(0.6)) {
    s.flags[`known:${known.id}`] = true;
    out.push({ ...known, id: known.id, known: true, rel: 'a known man' });
  }
  const kinds = RECRUIT_KINDS.filter((k) => legend >= k.legend);
  while (out.length < n) {
    const k = rng.weighted(kinds);
    const [gr, nr, hr] = k.stats;
    const roll = ([lo, hi]) => rng.range(lo, hi);
    const traits = [...(k.traits || [])];
    if (!traits.length && rng.chance(0.3)) traits.push(rng.pick(TRAIT_POOL));
    const first = rng.pick(FIRST_NAMES), last = rng.pick(SURNAMES);
    out.push({ id: `r${nextId()}`, name: `${first} ${last}`, short: first, gun: roll(gr), nerve: roll(nr), horse: roll(hr),
      traits, loyalty: rng.range(...k.loyalty), pitch: rng.pick(k.pitch), rel: k.id });
  }
  return out;
}

export function wifeName(seed) {
  const r = streamFor(seed, 0, 'wife');
  return `${r.pick(WOMEN)} ${r.pick(SURNAMES)}`;
}
export function childName(seed, n, last) {
  const r = streamFor(seed, n, 'child');
  const boy = r.chance(0.5);
  return { name: `${r.pick(boy ? FIRST_NAMES : WOMEN)} ${last}`, rel: boy ? 'son' : 'daughter' };
}

/** The wounded bushwhacker who turns up at your hideout. */
export function strangerOffer(rng, id) {
  const first = rng.pick(FIRST_NAMES), last = rng.pick(SURNAMES);
  return { id, name: `${first} ${last}`, short: first, gun: rng.range(2, 3), nerve: rng.range(2, 3), horse: 2,
    traits: rng.chance(0.4) ? ['hothead'] : [], loyalty: 68, rel: 'veteran',
    pitch: 'Rode with Bloody Bill. You took him in when he had nowhere to go, and he has not forgotten it.' };
}
