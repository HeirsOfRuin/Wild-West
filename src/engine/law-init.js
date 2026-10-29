// Setting up the law at the start of a game. Kept apart from law.js so the
// state module can call it without an import cycle (the bundler refuses cycles).

import { COUNTIES } from '../data/world.data.js';
import { SHERIFF_FIRST, SHERIFF_LAST } from '../data/law.data.js';
import { streamFor } from './rng.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function newSheriff(rng, county, sym, t, { friendlyBoost = 0, grudge = 0, taken = [] } = {}) {
  const pFriendly = clamp(sym / 100 - 0.25 + friendlyBoost, 0, 0.9);
  const pHostile = clamp(0.55 - sym / 100, 0.05, 0.6);
  const r = rng.next();
  const lean = r < pFriendly ? 'friendly' : r < pFriendly + pHostile ? 'hostile' : 'neutral';
  // No two sitting sheriffs share a surname: six Garretts reads as a bug, not a family.
  const last = rng.pick(SHERIFF_LAST.filter((n) => !taken.includes(n)));
  return { name: `${rng.pick(SHERIFF_FIRST)} ${last}`, skill: rng.range(1, 3), lean, grudge, since: t };
}

export function initLaw(seed, sym) {
  const rng = streamFor(seed, 0, 'law');
  const sheriffs = {};
  for (const c of COUNTIES) sheriffs[c.id] = newSheriff(rng, c.id, sym[c.id], 0, { taken: Object.values(sheriffs).map((x) => x.name.split(' ')[1]) });
  return { sheriffs, detective: null, nextDetT: null, backed: {}, past: [], dets: 0 };
}
