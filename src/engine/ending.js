// How it ends, and what the run is worth.
//
// Loss: killed, captured or betrayed. The rare "win": retire quietly with the
// family alive and the gang dissolved, and survive the quiet years after. The
// score is reported plainly as its parts; the dead are listed, not added.

import { K, yearOf } from './state.js';
import { followers } from './gang.js';

export function familyAlive(s) {
  return s.family.filter((f) => f.core).every((f) => f.alive);
}

/** Why you cannot retire yet, or null. Each condition names its lever. */
export function retireProblem(s) {
  if (s.retired) return 'You already have.';
  if (!s.married) return 'There is nobody to quit for. A man retires to a wife and a farm (marry first: Gang screen, Family).';
  const n = followers(s).length;
  if (n) return `The gang has to be gone first: ${n} still ride with you (dismiss them from the Gang screen).`;
  if (!s.cover.place) return 'You need a respectable life to retire into: live as Mr. Howard first.';
  if (s.cover.level < K(s, 'retireNeedCover')) return `Mr. Howard is not yet believed (cover ${Math.round(s.cover.level)} of ${K(s, 'retireNeedCover')}). Live it longer.`;
  const need = retirePurse(s);
  if (s.purse < need) return `You need $${need.toLocaleString('en-US')} to live on (you have $${s.purse.toLocaleString('en-US')})${s.assets?.farm ? '' : '; a farm in Tennessee cuts that'}.`;
  if (!familyAlive(s)) return 'There is no family left to retire for.';
  return null;
}

/** Cash a retirement needs: half with a farm to live off. */
export const retirePurse = (s) => Math.round(K(s, 'retireNeedPurse') * (s.assets?.farm ? K(s, 'farmPurseShare') : 1));

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
