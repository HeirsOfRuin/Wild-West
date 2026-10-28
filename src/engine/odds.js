// The formulas a job runs on. ONE copy: the resolver (job.js) calls them with
// the true numbers; the plan screen (derive.js) calls them with what the gang
// believes. If the two ever disagree it is because the belief was wrong, never
// because there were two formulas.

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export const ROLES = ['inside', 'street', 'horses'];

/** Who is doing what, and what that adds up to. */
export function crewStats(members, crew) {
  const by = (role) => crew.filter((c) => c.role === role).map((c) => members.find((m) => m.id === c.id)).filter(Boolean);
  const inside = by('inside'), street = by('street'), horses = by('horses');
  const all = [...inside, ...street, ...horses];
  const mean = (xs, k) => (xs.length ? xs.reduce((a, m) => a + m[k], 0) / xs.length : 0);
  const n = all.length;
  return {
    n, inside, street, horses, all,
    insideCount: inside.length,
    insideNerve: mean(inside, 'nerve'),
    streetGun: street.reduce((a, m) => a + m.gun, 0),
    holders: horses.length,
    holdersNeeded: Math.max(1, Math.ceil(n / 4)),
    horseSkill: mean(all, 'horse') + 0.5 * (mean(horses, 'horse') - 1),
    hotheadInside: inside.some((m) => m.traits.includes('hothead')),
    steadyInside: inside.some((m) => m.traits.includes('steady')),
    wounded: all.filter((m) => m.wounded > 0).length,
  };
}

/** Why a plan cannot ride, or null. */
export function planProblem(stats) {
  if (stats.n === 0) return 'Nobody is riding.';
  if (!stats.insideCount) return 'Someone has to go inside for the money.';
  if (!stats.holders) return 'Someone has to hold the horses.';
  return null;
}

/** Chance the alarm is raised before the money is out. Bold is always loud. */
export function alarmChance({ approach, guard, n, heat, scouted, insideNerve, streetCount, kind }) {
  if (approach === 'bold') return 1;
  // A train cannot be robbed quietly for long: the engineer has a whistle.
  return clamp(
    (kind === 'train' ? 0.3 : 0) + 0.06 + 0.16 * guard + 0.06 * Math.max(0, n - 4) + heat / 250 + (scouted ? 0 : 0.06)
      - 0.07 * (insideNerve - 1) - 0.04 * Math.min(streetCount, 2),
    0.03, 0.92,
  );
}

/** What the inside men can do against the guard. */
export function vaultPower(stats) {
  return stats.insideCount + Math.max(0, stats.insideNerve - 1);
}
export function vaultNeed(guard, kind) {
  return guard + (kind === 'train' ? 1 : 0);
}

/** Share of the cash that comes out the door. */
export function takeFraction({ approach, alarm, power, need }) {
  if (approach === 'bold') return power >= need ? 0.9 : 0.5;
  if (!alarm) return power >= need ? 1 : 0.6;
  return power >= need + 1 ? 0.6 : power >= need ? 0.3 : 0;
}

/** Chance a cashier or messenger is shot inside. */
export function insideKillChance({ approach, alarm, power, need, hothead, steady, insideNerve }) {
  return clamp(
    (alarm ? 0.1 : 0.03) + 0.06 * Math.max(0, need - power) + (hothead ? 0.12 : 0) - (steady ? 0.06 : 0)
      + (approach === 'bold' ? 0.04 : 0) - 0.03 * Math.max(0, insideNerve - 1),
    0.01, 0.8,
  );
}

/** How hard the town fights once it knows. Street guns cow it. */
export function townPower({ approach, fight, streetGun }) {
  if (approach === 'bold') return Math.max(0, fight + 0.5 - 0.35 * streetGun);
  return Math.max(0, fight + 1 - 0.15 * streetGun);
}

export const EXPOSURE = { street: 1, horses: 0.8, inside: 0.6 };
export function hitChance(T, exposure) {
  return clamp(0.03 + 0.13 * T, 0, 0.75) * exposure;
}
export function bystanderChance(approach, T) {
  return clamp((approach === 'bold' ? 0.06 : 0.04) + 0.07 * T, 0, 0.8);
}

/** The posse that forms behind you, 0-100. */
export function posseStrength({ alarm, fight, guard, heat, kind, killed }) {
  return clamp(
    (alarm ? 20 + 12 * fight : 5 + 4 * fight) + guard * 3 + heat * 0.3
      + (kind === 'train' ? 10 : 0) + (killed ? 15 : 0),
    0, 100,
  );
}

/** Chance the posse runs you down between the job and the hideout. */
export function catchChance({ Q, symFrom, symTo, horseSkill, wounded, far }) {
  const sym = (symFrom + symTo) / 2;
  return clamp(
    (Q / 100) * (1.2 - sym / 100) - 0.08 * (horseSkill - 2) + 0.06 * wounded + (far ? 0.25 : 0),
    0.02, 0.85,
  );
}

/** Legend from a job: boldness, money, blood. Read by the resolver and the forecast. */
export function legendGain({ approach, loot, killed, far }) {
  return (approach === 'bold' ? 8 : 4) + loot / 1500 + (killed ? 3 : 0) + (far ? 10 : 0) - (loot === 0 ? 7 : 0);
}

/** Words for a probability, so the screen shows judgement, not arithmetic. */
export function band(p) {
  if (p < 0.08) return 'unlikely';
  if (p < 0.25) return 'possible';
  if (p < 0.5) return 'even odds';
  if (p < 0.75) return 'likely';
  return 'near certain';
}
