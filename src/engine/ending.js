// How it ends, and what the run is worth.
//
// Loss: killed, captured or betrayed. The rare "win": retire quietly with the
// family alive and the gang dissolved, and survive the quiet years after. The
// score is reported plainly as its parts; the dead are listed, not added.

import { K, yearOf } from './state.js';
import { followers } from './gang.js';
import { familyMemberPresent } from './pressure.js';

export function familyAlive(s) {
  return s.family.filter((f) => ['zee', 'jessejr', 'mary'].includes(f.id) && familyMemberPresent(s, f.id)).every((f) => f.alive);
}

/** Why you cannot retire yet, or null. Each condition names its lever. */
export function retireProblem(s) {
  if (s.retired) return 'You already have.';
  if (yearOf(s.t) < K(s, 'retireFrom')) return `There is nobody to quit for yet. A man retires to a wife and a farm (you marry Zee in ${K(s, 'retireFrom')}).`;
  const n = followers(s).length;
  if (n) return `The gang has to be gone first: ${n} still ride with you (dismiss them from the Gang screen).`;
  if (!s.cover.place) return 'You need a respectable life to retire into: live as Mr. Howard first.';
  if (s.cover.level < K(s, 'retireNeedCover')) return `Mr. Howard is not yet believed (cover ${Math.round(s.cover.level)} of ${K(s, 'retireNeedCover')}). Live it longer.`;
  if (s.purse < K(s, 'retireNeedPurse')) return `You need $${K(s, 'retireNeedPurse').toLocaleString('en-US')} to live on (you have $${s.purse.toLocaleString('en-US')}).`;
  if (!familyAlive(s)) return 'There is no family left to retire for.';
  return null;
}

/** Quiet seasons a retirement needs: more the more famous you were. */
export function retireNeeded(s) {
  return K(s, 'retireSeasons') + Math.floor((s.legendPeak || 0) / K(s, 'retireSeasonsPerLegend'));
}

export function finalScore(s) {
  const years = Math.round(((s.t + 1) / 4) * 10) / 10;
  return {
    years,
    wealth: s.purse,
    legend: Math.round(s.legend),
    take: s.stats.take,
    jobs: s.stats.jobs,
    dead: s.dead.map((d) => d.name),
    killed: s.stats.cashiers + s.stats.bystanders,
    familyAlive: familyAlive(s),
    retired: s.outcome?.kind === 'retired',
  };
}
