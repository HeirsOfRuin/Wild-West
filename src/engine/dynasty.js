// The family code: what a retired outlaw leaves to his descendants, for the
// sequel (a Depression-era game in which a grandchild takes after him).
//
// A contract, like the save key: the prefix and version are fixed, fields may be
// added freely, and renaming one needs a version bump and a reader for the old
// version (Knight of Adalia's dynasty export works the same way).
//
//   DOAFAM1.<base64 of JSON>
//
// Only a retirement makes one: a man who was killed, taken or betrayed leaves
// nothing a grandson can use, except his name in the papers.

import { GEAR } from '../data/gang.data.js';
import { COUNTIES } from '../data/world.data.js';
import { yearOf } from './state.js';

export const FAMILY_PREFIX = 'DOAFAM1.';
export const FAMILY_VERSION = 1;

const b64 = (text) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(text))) : Buffer.from(text, 'utf8').toString('base64'));
const unb64 = (text) => (typeof atob === 'function' ? decodeURIComponent(escape(atob(text))) : Buffer.from(text, 'base64').toString('utf8'));

/** What the family keeps, as plain data. Null unless the game ended in a retirement. */
export function familyRecord(s) {
  if (s.outcome?.kind !== 'retired') return null;
  const me = s.gang.find((g) => g.leader);
  const skills = { gun: me.gun, nerve: me.nerve, horse: me.horse };
  const best = Object.entries(skills).sort((a, b) => b[1] - a[1])[0][0];
  const men = s.gang.filter((g) => !g.leader);
  return {
    v: FAMILY_VERSION,
    game: 'dead-or-alive',
    founder: {
      name: me.name, first: s.me.first, last: s.me.last, background: s.me.background,
      home: s.home, homeName: COUNTIES.find((c) => c.id === s.home)?.name ?? '',
      skills, takesAfter: best,
      heirlooms: { gun: GEAR.gun[me.gear.gun].name, horse: GEAR.horse[me.gear.horse].name },
      years: Math.round(((s.outcome.t + 1) / 4) * 10) / 10, retiredIn: yearOf(s.retired?.since ?? s.outcome.t),
      jobs: s.stats.jobs, take: s.stats.take, peakLegend: Math.round(s.legendPeak || s.legend),
      townsfolkKilled: s.stats.cashiers + s.stats.bystanders,
    },
    family: s.family.filter((f) => f.alive).map((f) => ({ name: f.name, rel: f.rel })),
    inheritance: {
      cash: s.purse,
      farm: !!s.assets?.farm,
      business: s.assets?.business ?? null,
      alias: 'Howard',
    },
    // Who kept faith and who did not: a grandson may meet their grandsons.
    friends: men.filter((g) => g.status === 'gone' && g.loyalty >= 50 && g.stage === 0).map((g) => ({ name: g.name, kin: g.kin === 'family' })),
    enemies: men.filter((g) => g.status === 'turned' || (g.status === 'gone' && g.stage >= 2)).map((g) => ({ name: g.name, why: g.status === 'turned' ? 'turned on you' : 'talked to the law' })),
    fallen: s.dead.map((d) => ({ name: d.name, how: d.how })),
    // The law remembers too.
    lawmen: s.law ? Object.entries(s.law.sheriffs).filter(([, sh]) => sh.grudge >= 30).map(([c, sh]) => ({ name: sh.name, county: c, grudge: Math.round(sh.grudge) })) : [],
  };
}

export function familyCode(s) {
  const r = familyRecord(s);
  return r ? FAMILY_PREFIX + b64(JSON.stringify(r)) : null;
}

/** Read a family code. Throws with a reason a player can act on. */
export function readFamilyCode(code) {
  const m = String(code).trim().match(/^DOAFAM(\d+)\.([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('That is not a family code from Dead or Alive.');
  if (Number(m[1]) > FAMILY_VERSION) throw new Error('That family code is from a newer version of the game.');
  const r = JSON.parse(unb64(m[2]));
  if (r.game !== 'dead-or-alive' || !r.founder?.name) throw new Error('That family code is damaged.');
  return r;
}
