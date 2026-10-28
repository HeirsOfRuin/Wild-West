// The game state, a new game, the clock, and save versioning.
//
// The engine is pure: (state, action) -> new state. No DOM, no Math.random, no
// Date.now. Randomness comes from named streams keyed by (seed, season, label),
// so the save needs no generator state and a reload cannot reroll anything.

import { COUNTIES, TARGETS } from '../data/world.data.js';
import { GANG, FAMILY } from '../data/gang.data.js';
import { CONFIG } from '../data/config.data.js';
import { streamFor } from './rng.js';
import { pay } from './money.js';

export const SAVE_VERSION = 1;
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
/** Scouting holds until the new year re-rolls the town's luck, or until you rob it. */
export const intelValid = (s, id) => !!s.intel[id] && yearOf(s.intel[id].t) === yearOf(s.t);
export const trueGuard = (def, t) => Math.max(0, Math.min(3, def.guard + t.boostG + t.rollG));
export const trueFight = (def, t) => Math.max(0, Math.min(3, def.fight + t.boostF + t.rollF));
/** What the gang believes without scouting: the base plus what it taught the town. */
export const believedGuard = (def, t) => Math.max(0, Math.min(3, def.guard + t.boostG));
export const believedFight = (def, t) => Math.max(0, Math.min(3, def.fight + t.boostF));

export function newGame(seed = 1, tune = {}) {
  const s = {
    v: SAVE_VERSION,
    seed: seed >>> 0,
    t: 0,
    tune,
    purse: 0,
    ledger: [],
    legend: 10,
    legendPeak: 10,
    reward: 0,
    pinkerton: 0,
    pinkActive: false,
    heat: Object.fromEntries(COUNTIES.map((c) => [c.id, 0])),
    sym: Object.fromEntries(COUNTIES.map((c) => [c.id, c.base])),
    given: Object.fromEntries(COUNTIES.map((c) => [c.id, 0])),
    edwards: 0, // sympathy the newspaper has lent the Southern counties; fades
    cover: { level: 0, place: null },
    where: 'farm',
    familyAt: 'farm',
    family: FAMILY.map((f) => ({ id: f.id, alive: true, injured: false })),
    gang: GANG.map((g) => ({
      id: g.id, loyalty: g.loyalty, pocket: 150, status: 'active', joined: 0,
      rode: 8, wounded: 0, stage: 0, approached: false, suspected: false, bonusT: -1, noise: 0,
    })),
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
    stats: { jobs: 0, take: 0, cashiers: 0, bystanders: 0, failed: 0, letters: 0 },
    report: null,
    log: [],
  };
  for (const def of TARGETS) s.targets[def.id] = rollTarget(s.seed, 0, def);
  pay(s, K(s, 'startPurse'), 'What is left from the war');
  s.log.push({ t: 0, kind: 'story', text: 'The war is over. Not for you. Quantrill is dead, Bloody Bill is dead, and the men who rode with them cannot go home to vote, preach or practise law. Some of them still have their horses.' });
  return s;
}

const MIGRATIONS = {
  // 1: (s) => ({ ...s, v: 2, ... }),
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
