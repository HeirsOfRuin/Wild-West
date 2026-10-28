// Every trait changes what happens. The inert check (sim/inert.js) proves the
// common ones on whole games; the rare ones need a scene that reaches them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/engine/state.js';
import { act } from '../src/engine/season.js';
import { informChance } from '../src/engine/pressure.js';
import { RECRUITS, GANG } from '../src/data/gang.data.js';

const withoutTrait = (trait, fn) => {
  const defs = [...GANG, ...RECRUITS];
  const saved = defs.map((d) => d.traits);
  for (const d of defs) d.traits = d.traits.filter((t) => t !== trait);
  try { return fn(); } finally { defs.forEach((d, i) => { d.traits = saved[i]; }); }
};

test('ambitious: a turned Bob Ford shoots you; without it he only talks', () => {
  const run = () => {
    let shot = 0;
    for (let seed = 1; seed <= 80; seed++) {
      let s = newGame(seed);
      s.t = 4 * 15; // spring 1881
      s.gang.push({ id: 'bobford', loyalty: 10, pocket: 0, status: 'active', joined: 0, rode: 4, wounded: 0, stage: 3, approached: false, suspected: false, bonusT: -1, noise: 0 });
      s = act(s, { type: 'lielow', at: 'farm' });
      if (s.outcome?.kind === 'betrayed') shot++;
    }
    return shot;
  };
  assert.ok(run() > 10, 'ambitious men should act');
  assert.equal(withoutTrait('ambitious', run), 0);
});

test('drinker: a drinker in the gang raises the informer risk', () => {
  const s = newGame(1);
  s.reward = 8000;
  const withD = informChance(s, 'daviess');
  const without = withoutTrait('drinker', () => informChance(s, 'daviess'));
  assert.ok(withD > without * 1.4, `${withD} vs ${without}`);
});

test('greedy: a greedy man is moved more by money', () => {
  const s = newGame(1);
  s.purse = 1000;
  const cole0 = s.gang.find((g) => g.id === 'cole').loyalty;
  const a = act(s, { type: 'bonus', id: 'cole', amount: 200 }).gang.find((g) => g.id === 'cole').loyalty - cole0;
  const b = withoutTrait('greedy', () => act(s, { type: 'bonus', id: 'cole', amount: 200 }).gang.find((g) => g.id === 'cole').loyalty - cole0);
  assert.ok(a > b, `${a} vs ${b}`);
});
