// The game state, a new game, the clock, and save versioning.
//
// The engine is pure: (state, action) -> new state. No DOM, no Math.random, no
// Date.now. Randomness comes from named streams keyed by (seed, season, label),
// so the save needs no generator state and a reload cannot reroll anything.

import { COUNTIES, ALL_TARGETS } from '../data/world.data.js';
import { CONFIG } from '../data/config.data.js';
import { streamFor } from './rng.js';
import { pay } from './money.js';
import { DEFAULT_CREATION, creationProblem, companionChoices, makeLeader, makeMember, startingFamily, backgroundOf } from './people.js';

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'outlaw.save.v1'; // a contract: never rename

/** A tuning number, with any override this game was started with (ablations). */
export function K(s, key) {
  const v = s.tune && Object.prototype.hasOwnProperty.call(s.tune, key) ? s.tune[key] : CONFIG[key];
  if (v === undefined) throw new Error(`Unknown tuning key: ${key}`);
  return v;
}

export const yearOf = (t) => CONFIG.startYear + Math.floor(t / 4);
export const seasonOf = (t) => t % 4;
export const dateOf = (t) => `${CONFIG.seasons[seasonOf(t)]} ${yearOf(t)}`;
export const lastTurn = () => (CONFIG.endYear - CONFIG.startYear + 1) * 4 - 1;

// A target's true guard and fight: its base, what robberies taught it (fading),
// and this year's luck (a new cashier with a pistol, a sheriff away at court).
// The gang knows the base and its own robberies; only scouting shows the rest.
export function rollTarget(seed, t, def, prev) {
  const r = streamFor(seed, yearOf(t), `target:${def.id}`);
  const [lo, hi] = def.cash;
  const cash = Math.round((lo + r.next() * (hi - lo)) / 50) * 50;
  const luck = () => { const x = r.next(); return x < 0.25 ? -1 : x < 0.75 ? 0 : 1; };
  const fade = (b) => (b > 0 && r.chance(0.3) ? b - 1 : b);
  return {
    cash, robbed: prev?.robbed ?? 0,
    boostG: fade(prev?.boostG ?? 0), boostF: fade(prev?.boostF ?? 0),
    rollG: luck(), rollF: luck(),
  };
}
/** A state-news effect in force this year (see news.data.js and season.js). */
export const modActive = (s, key) => !!s.mods?.[key] && yearOf(s.t) <= s.mods[key].until;
/** Cash in the vault after the times: the Panic of 1873 thins the country banks. */
export const cashOf = (s, def, cash) => Math.round(def.kind === 'bank' && modActive(s, 'bankCash') ? cash * s.mods.bankCash.x : cash);
/** What a target truly holds this year: what scouting (or an informer) tells you. */
export function readTarget(s, def) {
  if (def.far) return { guard: def.guard, fight: def.fight, cash: s.flags.northfieldCash };
  const t = s.targets[def.id];
  return { guard: trueGuard(def, t), fight: trueFight(def, t), cash: cashOf(s, def, t.cash) };
}
/** Scouting holds until the new year re-rolls the town's luck, or until you rob it. */
export const intelValid = (s, id) => !!s.intel[id] && yearOf(s.intel[id].t) === yearOf(s.t);
export const trueGuard = (def, t) => Math.max(0, Math.min(3, def.guard + t.boostG + t.rollG));
export const trueFight = (def, t) => Math.max(0, Math.min(3, def.fight + t.boostF + t.rollF));
/** What the gang believes without scouting: the base plus what it taught the town. */
export const believedGuard = (def, t) => Math.max(0, Math.min(3, def.guard + t.boostG));
export const believedFight = (def, t) => Math.max(0, Math.min(3, def.fight + t.boostF));

/**
 * A new game from the creation choices (see people.js DEFAULT_CREATION).
 * Throws with a reason if the choices are incomplete.
 */
export function newGame(seed = 1, tune = {}, creation = DEFAULT_CREATION) {
  const why = creationProblem(creation);
  if (why) throw new Error(why);
  const bg = backgroundOf(creation.background);
  const leader = makeLeader(creation);
  const picks = companionChoices(seed, creation.last.trim()).filter((c) => creation.companions.includes(c.kind));
  const s = {
    v: SAVE_VERSION,
    seed: seed >>> 0,
    t: 0,
    tune,
    me: { first: creation.first.trim(), last: creation.last.trim(), background: bg.id, home: creation.home },
    home: creation.home,
    purse: 0,
    ledger: [],
    legend: bg.legend,
    legendPeak: bg.legend,
    reward: bg.reward,
    pinkerton: 0,
    pinkActive: false,
    heat: Object.fromEntries(COUNTIES.map((c) => [c.id, 0])),
    sym: Object.fromEntries(COUNTIES.map((c) => [c.id, c.base])),
    given: Object.fromEntries(COUNTIES.map((c) => [c.id, 0])),
    edwards: 0, // sympathy the newspaper has lent the Southern counties; fades
    cover: { level: 0, place: null },
    where: 'farm',
    familyAt: 'farm',
    married: false,
    family: startingFamily(seed, creation.last.trim()),
    gang: [leader, ...picks.map((c) => makeMember({ ...c, id: c.id, loyalty: c.loyalty + bg.loyalty, pocket: 120, rode: c.kin ? 30 : 8 }))],
    offers: [],
    nextId: 1,
    houses: {},
    assets: { farm: false, business: null, lawyer: false },
    incident: null,
    bribed: {},
    mods: {},
    targets: {},
    intel: {},
    scouts: 0,
    lastJob: null,
    lastLetter: -99,
    idle: 0,
    flags: {},
    ambush: null,
    raid: null,
    retired: null,
    outcome: null,
    hist: [],
    dead: [],
    stats: { jobs: 0, take: 0, cashiers: 0, bystanders: 0, failed: 0, letters: 0, spent: 0 },
    report: null,
    log: [],
  };
  for (const c of COUNTIES) if (c.southern) s.sym[c.id] += bg.southern;
  s.sym[s.home] = Math.max(0, Math.min(100, s.sym[s.home] + bg.home + 8)); // home is home
  for (const def of ALL_TARGETS) s.targets[def.id] = rollTarget(s.seed, 0, def);
  pay(s, K(s, 'startPurse') + bg.purse, 'What you came home with');
  const homeName = COUNTIES.find((c) => c.id === s.home).name;
  s.log.push({ t: 0, kind: 'story', text: `The war is over. Not for ${s.me.first} ${s.me.last}. You are back on the farm in ${homeName} County with ${picks.map((p) => p.name).join(', ')}, and none of you means to plough.` });
  return s;
}

// Version 1 was the historical prototype: Jesse James and the full gang, with
// the men's fixed data in tables that no longer exist. Their numbers are kept
// here so an old save opens and plays on.
const V1_MEN = {
  jesse: ['Jesse James', 'Jesse', 'james', 3, 2, 3, ['hothead']], frank: ['Frank James', 'Frank', 'james', 2, 3, 2, ['steady']],
  cole: ['Cole Younger', 'Cole', 'younger', 3, 3, 2, ['greedy']], jim: ['Jim Younger', 'Jim', 'younger', 2, 2, 2, []],
  bob: ['Bob Younger', 'Bob Y.', 'younger', 2, 1, 3, ['young']], clell: ['Clell Miller', 'Clell', 'miller', 2, 2, 2, []],
  cummins: ['Jim Cummins', 'Cummins', null, 1, 1, 2, ['drinker']], pitts: ['Charlie Pitts', 'Pitts', null, 2, 2, 1, ['steady']],
  chadwell: ['Bill Chadwell', 'Chadwell', null, 2, 1, 2, ['greedy']], liddil: ['Dick Liddil', 'Liddil', null, 2, 1, 3, ['drinker']],
  hite: ['Wood Hite', 'Hite', 'james', 2, 2, 2, []], edmiller: ['Ed Miller', 'Ed', 'miller', 1, 2, 2, ['young']],
  charley: ['Charley Ford', 'Charley', 'ford', 1, 1, 2, []], bobford: ['Bob Ford', 'Bob Ford', 'ford', 2, 2, 1, ['ambitious', 'young']],
};
const MIGRATIONS = {
  1: (s) => {
    const gang = s.gang.map((g) => {
      const [name, short, kin, gun, nerve, horse, traits] = V1_MEN[g.id];
      const leader = g.id === 'jesse';
      return { ...g, id: leader ? 'me' : g.id, name, short, kin: kin === 'james' ? 'family' : kin, leader, gun, nerve, horse, traits,
        gear: { horse: 0, gun: 0 }, jobs: 0, rel: null, pitch: '' };
    });
    const fam = { mother: ['Zerelda Samuel', 'mother'], archie: ['Archie Samuel', 'little brother'], zee: ['Zee Mimms', 'wife'],
      jessejr: ['Jesse Edward James', 'son'], mary: ['Mary James', 'daughter'] };
    const year = 1866 + Math.floor(s.t / 4);
    const born = { zee: 1874, jessejr: 1875, mary: 1879 };
    const family = s.family.filter((f) => !born[f.id] || year >= born[f.id])
      .map((f) => ({ ...f, id: f.id === 'archie' ? 'boy' : f.id, name: fam[f.id][0], rel: fam[f.id][1] }));
    const fixWho = (x) => (x === 'jesse' ? 'me' : x);
    return {
      ...s, v: 2, gang, family, married: year >= 1874,
      me: { first: 'Jesse', last: 'James', background: 'bushwhacker', home: 'clay' }, home: 'clay',
      offers: [], nextId: 1, houses: {}, bribed: {}, mods: {}, assets: { farm: false, business: null, lawyer: false },
      stats: { ...s.stats, spent: 0 },
      dead: s.dead.map((d) => ({ ...d, id: fixWho(d.id) })),
      ambush: s.ambush ? { by: fixWho(s.ambush.by) } : null,
    };
  },
  // Version 2 saves from before the end game and incidents lack both.
  2: (s) => {
    const targets = { ...s.targets };
    for (const def of ALL_TARGETS) if (!targets[def.id]) targets[def.id] = rollTarget(s.seed, s.t, def);
    return { ...s, v: 3, targets, assets: s.assets || { farm: false, business: null, lawyer: false }, incident: null };
  },
};
export function migrate(s) {
  if (!s || typeof s.v !== 'number') throw new Error('Not a save from this game.');
  if (s.v > SAVE_VERSION) throw new Error('This save is from a newer version of the game.');
  while (s.v < SAVE_VERSION) s = MIGRATIONS[s.v](s);
  return s;
}

export const serialize = (s) => JSON.stringify(s);
export const deserialize = (text) => migrate(JSON.parse(text));

// Save code: a versioned text form for moving a game between devices.
export function toCode(s) {
  const json = serialize(s);
  const b64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, 'utf8').toString('base64');
  return 'OUTLAW1.' + b64;
}
export function fromCode(code) {
  const m = String(code).trim().match(/^OUTLAW1\.([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('That is not a save code from this game.');
  const json = typeof atob === 'function'
    ? decodeURIComponent(escape(atob(m[1])))
    : Buffer.from(m[1], 'base64').toString('utf8');
  return deserialize(json);
}
