// Incidents: one question at a time, answered before the season's action.
// The table is in src/data/incidents.data.js. This module picks one, words its
// stakes from the effects themselves, and applies the answer. An effect key it
// does not know is an error, so nothing in the table can be decoration.

import { INCIDENTS } from '../data/incidents.data.js';
import { COUNTIES, TARGETS } from '../data/world.data.js';
import { K, yearOf, seasonOf, readTarget, adjacent as adjacentTo } from './state.js';
import { pay } from './money.js';
import { followers, nudge, rawMember } from './gang.js';
import { sheriffKilled } from './law.js';
import { COUNTIES as ALL_COUNTIES } from '../data/world.data.js';
import { strangerOffer } from './people.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const countyName = (id) => COUNTIES.find((c) => c.id === id)?.name ?? '';
const KNOWN = new Set(['purse', 'sym', 'heat', 'legend', 'reward', 'pinkerton', 'cover', 'loyalty', 'leaveIn', 'offer',
  'tip', 'intel', 'reveal', 'ride', 'restart', 'exposed', 'childRisk', 'chance', 'lieutenant', 'away', 'quitChance', 'killSheriff']);

/** Helpers the table's when() functions use to bind people and places. */
function helpers(s, rng) {
  const where = s.where === 'farm' ? s.home : s.where;
  const f = followers(s);
  return {
    hideCounty: s.cover.place && !s.retired ? null : COUNTIES.some((c) => c.id === where) ? where : null,
    homeCounty: s.home,
    hottest: (min) => { const c = COUNTIES.filter((k) => s.heat[k.id] >= min).sort((a, b) => s.heat[b.id] - s.heat[a.id])[0]; return c?.id ?? null; },
    twoFollowers: () => (f.length >= 2 ? rng.shuffle(f.map((m) => m.id)).slice(0, 2) : null),
    oneFollower: (pred) => { const xs = f.filter(pred).filter((m) => !m.leaveT); return xs.length ? rng.pick(xs).id : null; },
    storyMan: (story, pred) => { const xs = f.filter((m) => m.story === story && !m.storyDone && pred(m)); return xs.length ? rng.pick(xs).id : null; },
    anyCounty: () => rng.pick(ALL_COUNTIES).id,
    huntingSheriff: () => {
      if (!s.law || !where) return null;
      const near = ALL_COUNTIES.filter((c) => s.law.sheriffs[c.id].grudge >= K(s, 'grudgeHunt') && (c.id === where || adjacentTo(c.id, where)));
      return near.length ? near[0].id : null;
    },
    oneGone: () => { const xs = s.gang.filter((g) => g.status === 'gone' && g.kin !== 'family'); return xs.length ? rng.pick(xs).id : null; },
  };
}

function eligible(s, inc) {
  const y = yearOf(s.t);
  if (!!inc.retired !== !!s.retired) return false;
  if (inc.story && s.tune?.offStories) return false; // ablation switch
  if (inc.minLegend && s.legend < inc.minLegend) return false;
  if (inc.needPink && !s.pinkActive) return false;
  if (inc.from && y < inc.from) return false;
  if (inc.to && y > inc.to) return false;
  if (inc.season && !inc.season.includes(seasonOf(s.t))) return false;
  if (s.flags[`inc:${inc.id}`] && s.t - s.flags[`inc:${inc.id}`] < 8) return false; // not the same question twice in two years
  return true;
}

/**
 * Maybe something happens. `seasons` > 1 when a stretch of quiet seasons ends:
 * the questions held back during it come as one, with the chance of those seasons.
 */
export function rollIncident(s, rng, seasons = 1) {
  if (s.incident || s.outcome) return;
  const gap = K(s, 'incidentGap')[s.retired ? 1 : 0];
  if (seasons === 1 && s.flags.lastIncidentT !== undefined && s.t - s.flags.lastIncidentT < gap) return;
  const p = s.retired ? K(s, 'incidentRetired') : K(s, 'incidentRiding');
  if (!rng.chance(1 - (1 - p) ** seasons)) return;
  const h = helpers(s, rng);
  const pool = [];
  for (const inc of INCIDENTS) {
    if (!eligible(s, inc)) continue;
    const bind = inc.when(s, h);
    if (bind) pool.push({ inc, bind, weight: inc.weight });
  }
  const pick = rng.weighted(pool);
  if (!pick) return;
  s.incident = { id: pick.inc.id, t: s.t, bind: { who: pick.bind.who || [], county: pick.bind.county || null } };
  s.flags[`inc:${pick.inc.id}`] = s.t;
  s.flags.lastIncidentT = s.t;
}

function binding(s, b) {
  const names = b.who.map((id) => rawMember(s, id)?.name ?? 'someone');
  const shorts = b.who.map((id) => rawMember(s, id)?.short ?? 'him');
  return { ...b, names, shorts, countyName: countyName(b.county), sheriff: s.law?.sheriffs?.[b.county]?.name ?? 'the sheriff' };
}

/** Words for what an option does, from its effects. */
export function stakes(effects, b) {
  const out = [];
  const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
  const place = (k) => (k === 'here' ? b.countyName : k === 'all' ? 'everywhere' : k === 'south' ? 'Southern counties' : countyName(k));
  for (const [k, v] of Object.entries(effects)) {
    if (!KNOWN.has(k)) throw new Error(`Unknown incident effect: ${k}`);
    if (k === 'purse') out.push(v < 0 ? `costs $${-v}` : `+$${v}`);
    if (k === 'sym') for (const [c, n] of Object.entries(v)) out.push(`sympathy ${sign(n)} (${place(c)})`);
    if (k === 'heat') for (const [c, n] of Object.entries(v)) out.push(`posse heat ${sign(n)} (${place(c)})`);
    if (k === 'legend') out.push(`legend ${sign(v)}`);
    if (k === 'reward') out.push(`reward +$${v}`);
    if (k === 'pinkerton') out.push(`Pinkertons ${sign(v)}`);
    if (k === 'cover') out.push(`cover ${sign(v)}`);
    if (k === 'loyalty') {
      if (v.who) out.push(`${b.shorts[0]} ${v.who > 0 ? 'pleased' : 'resentful'}`);
      if (v.other) out.push(`${b.shorts[1]} ${v.other > 0 ? 'pleased' : 'resentful'}`);
      if (v.all) out.push(`the men ${v.all > 0 ? 'pleased' : 'uneasy'}`);
    }
    if (k === 'leaveIn') out.push(`he leaves the gang within ${v} seasons`);
    if (k === 'offer') out.push('a new man to take on');
    if (k === 'tip') out.push('a one-season job opens');
    if (k === 'intel') out.push("this year's best train, scouted");
    if (k === 'reveal') out.push('learn who the Pinkertons have talked to');
    if (k === 'ride') out.push('you leave the quiet life');
    if (k === 'restart') out.push('the quiet years start again');
    if (k === 'exposed') out.push('more chance of being recognised this season');
    if (k === 'childRisk') out.push(`a ${Math.round(v * 100)}% chance you lose the child`);
    if (k === 'lieutenant') out.push('he becomes your lieutenant: he can lead a second crew and takes a double share');
    if (k === 'away') out.push(`he is away ${v === 1 ? 'a season' : `${v} seasons`}`);
    if (k === 'quitChance') out.push(`a ${Math.round(v * 100)}% chance he quits and takes a friend`);
    if (k === 'killSheriff') out.push(`Sheriff ${b.sheriff} is killed; the next man starts with a grudge`);
    if (k === 'chance') out.push(`${Math.round(v.p * 100)}%: ${stakes(v.win, b).join(', ')}; otherwise ${stakes(v.lose, b).join(', ') || 'nothing'}`);
  }
  return out;
}

/** The waiting incident as the screen shows it. */
export function incidentView(s) {
  if (!s.incident) return null;
  const inc = INCIDENTS.find((i) => i.id === s.incident.id);
  const b = binding(s, s.incident.bind);
  return {
    id: inc.id, title: inc.title, text: inc.text(b),
    options: inc.options.map((o) => {
      const cost = -(o.effects.purse || 0);
      return { id: o.id, label: typeof o.label === 'function' ? o.label(b) : o.label, stakes: stakes(o.effects, b),
        lock: cost > 0 && s.purse < cost ? `Needs $${cost}.` : null, bot: o.bot };
    }),
  };
}

export function answer(s, optionId, rng) {
  const v = incidentView(s);
  if (!v) throw new Error('Nothing is waiting for an answer.');
  const opt = v.options.find((o) => o.id === optionId);
  if (!opt) throw new Error('No such answer.');
  if (opt.lock) throw new Error(opt.lock);
  const inc = INCIDENTS.find((i) => i.id === s.incident.id);
  const effects = inc.options.find((o) => o.id === optionId).effects;
  const b = binding(s, s.incident.bind);
  const lines = [`${inc.title}: ${opt.label}.`];
  apply(s, effects, b, rng, lines);
  if (inc.story) { const g = rawMember(s, s.incident.bind.who[0]); if (g) g.storyDone = true; }
  s.incident = null;
  s.log.push({ t: s.t, kind: 'gang', title: inc.title, text: lines.slice(1).join(' ') || `${opt.label}.` });
  return lines;
}

function apply(s, e, b, rng, lines) {
  const county = (k) => (k === 'here' ? b.county : k);
  for (const [k, v] of Object.entries(e)) {
    if (!KNOWN.has(k)) throw new Error(`Unknown incident effect: ${k}`);
    switch (k) {
      case 'purse': pay(s, v < 0 ? -Math.min(-v, s.purse) : v, v < 0 ? 'Paid out' : 'Won'); if (v < 0) s.stats.spent += -v; break;
      case 'sym':
        for (const [c, n] of Object.entries(v)) {
          const ids = c === 'all' ? COUNTIES.map((x) => x.id) : c === 'south' ? COUNTIES.filter((x) => x.southern).map((x) => x.id) : [county(c)];
          for (const id of ids) if (id && s.sym[id] !== undefined) s.sym[id] = clamp(s.sym[id] + n, 0, 100);
        }
        break;
      case 'heat': for (const [c, n] of Object.entries(v)) { const id = county(c); if (id && s.heat[id] !== undefined) s.heat[id] = clamp(s.heat[id] + n, 0, 100); } break;
      case 'legend': s.legend = clamp(s.legend + v, 0, 100); break;
      case 'reward': s.reward += v; break;
      case 'pinkerton': if (s.pinkActive) s.pinkerton = clamp(s.pinkerton + v, 0, 100); break;
      case 'cover': s.cover.level = clamp(s.cover.level + v, 0, 100); break;
      case 'loyalty':
        if (v.who && b.who[0]) nudge(s, b.who[0], v.who);
        if (v.other && b.who[1]) nudge(s, b.who[1], v.other);
        if (v.all) for (const m of followers(s)) nudge(s, m.id, v.all);
        break;
      case 'leaveIn': { const g = rawMember(s, b.who[0]); if (g) g.leaveT = s.t + v; break; }
      case 'offer': s.offers.push({ ...strangerOffer(rng, `r${s.nextId++}`), expires: s.t + 1 }); break;
      case 'tip': s.flags.tips = { ...(s.flags.tips || {}), [v]: s.t }; break;
      case 'intel': {
        const trains = TARGETS.filter((d) => d.kind === 'train' && (!d.from || yearOf(s.t) >= d.from));
        const best = trains.map((d) => ({ d, r: readTarget(s, d) })).sort((a, z) => z.r.cash - a.r.cash)[0];
        if (best) { s.intel[best.d.id] = { t: s.t, ...best.r }; lines.push(`He names the ${best.d.name}.`); }
        break;
      }
      case 'reveal': {
        const named = followers(s).filter((m) => m.approached || m.stage >= 1);
        for (const m of named) rawMember(s, m.id).suspected = true;
        lines.push(named.length ? `He names ${named.map((m) => m.name).join(' and ')}.` : 'He names nobody in your gang. Maybe that is true.');
        break;
      }
      case 'ride': s.retired = null; lines.push('You dig up the guns.'); break;
      case 'restart': if (s.retired) s.retired.since = s.t + 1; break;
      case 'exposed': s.flags.exposedT = s.t; break;
      case 'childRisk': {
        const kids = s.family.filter((f) => f.core && f.alive && (f.rel === 'son' || f.rel === 'daughter'));
        if (kids.length && rng.chance(v)) { const kid = rng.pick(kids); kid.alive = false; lines.push(`${kid.name.split(' ')[0]} dies of the fever.`); }
        else lines.push('The fever breaks.');
        break;
      }
      case 'lieutenant': s.lieutenant = b.who[0]; lines.push(`${b.names[0]} is your lieutenant.`); break;
      case 'away': { const g = rawMember(s, b.who[0]); if (g && g.status === 'active') { g.status = 'away'; g.returnT = s.t + v; if (s.lieutenant === g.id) s.lieutenant = null; } break; }
      case 'quitChance': {
        if (!rng.chance(v)) { lines.push('He swallows it.'); break; }
        const g = rawMember(s, b.who[0]);
        if (!g || g.status !== 'active') break;
        g.status = 'gone'; g.leftT = s.t; g.loyalty = Math.max(0, g.loyalty - 10); g.stage = Math.max(g.stage, 1);
        const friend = followers(s).filter((m) => m.kin !== 'family').sort((x, y) => x.loyalty - y.loyalty)[0];
        if (friend) { const fg = rawMember(s, friend.id); fg.status = 'gone'; fg.leftT = s.t; fg.stage = Math.max(fg.stage, 1); }
        lines.push(`${b.names[0]} saddles up and rides off${friend ? `, and ${friend.name} goes with him` : ''}.`);
        break;
      }
      case 'killSheriff': { const ev = []; sheriffKilled(s, b.county, rng, ev); lines.push(...ev.map((e) => e.text)); break; }
      case 'chance': {
        const win = rng.chance(v.p);
        lines.push(win ? v.winText : v.loseText);
        apply(s, win ? v.win : v.lose, b, rng, lines);
        break;
      }
    }
  }
}
