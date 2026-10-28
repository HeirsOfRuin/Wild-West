// Every trait changes what happens. sim/inert.js proves the common ones on whole
// games (tune.offTraits switches a trait off); the rare ones need a scene that
// reaches them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/engine/state.js';
import { act } from '../src/engine/season.js';
import { informChance } from '../src/engine/pressure.js';
import { makeMember } from '../src/engine/people.js';
import { forecast } from '../src/engine/derive.js';

const man = (fields) => makeMember({ gun: 2, nerve: 2, horse: 2, loyalty: 50, rode: 4, ...fields });

test('ambitious: a turned admirer shoots you; without the trait he only talks', () => {
  const run = (tune) => {
    let shot = 0;
    for (let seed = 1; seed <= 80; seed++) {
      let s = newGame(seed, tune);
      s.t = 4 * 15; // spring 1881
      const bob = man({ id: 'bobford', name: 'Bob Ford', traits: ['ambitious', 'young'], loyalty: 10 });
      bob.stage = 3;
      s.gang.push(bob);
      s = act(s, { type: 'lielow', at: 'farm' });
      if (s.outcome?.kind === 'betrayed') shot++;
    }
    return shot;
  };
  assert.ok(run({}) > 10, 'ambitious men should act');
  assert.equal(run({ offTraits: ['ambitious'] }), 0);
});

test('drinker: a drinker in the gang raises the informer risk', () => {
  const s = newGame(1);
  s.reward = 8000;
  s.gang.push(man({ id: 'sot', name: 'Ike Sot', traits: ['drinker'] }));
  const off = { ...s, tune: { offTraits: ['drinker'] } };
  assert.ok(informChance(s, 'daviess') > informChance(off, 'daviess') * 1.4);
});

test('greedy: a greedy man is moved more by money', () => {
  const s = newGame(1);
  s.purse = 1000;
  s.ledger.push({ t: 0, amount: 1000 - s.ledger.reduce((a, r) => a + r.amount, 0), why: 'test' });
  s.gang.push(man({ id: 'g', name: 'Gus Greed', traits: ['greedy'] }));
  const gain = (st) => act(st, { type: 'bonus', id: 'g', amount: 200 }).gang.find((g) => g.id === 'g').loyalty - 50;
  assert.ok(gain(s) > gain({ ...s, tune: { offTraits: ['greedy'] } }));
});

test('hothead and steady: who goes inside changes the chance of a killing', () => {
  const s = newGame(1);
  s.gang.push(man({ id: 'h', name: 'Hot Head', traits: ['hothead'], nerve: 2 }));
  s.gang.push(man({ id: 'st', name: 'Cool Hand', traits: ['steady'], nerve: 2 }));
  const plan = (inside) => ({ target: 'richmond-bank', approach: 'quiet', hideout: 'farm', cut: 'even',
    crew: [{ id: 'me', role: 'street' }, { id: inside, role: 'inside' }, { id: 'c-cousin', role: 'horses' }] });
  const kill = (st, inside) => forecast(st, plan(inside)).mid.kill;
  assert.ok(kill(s, 'h') > kill({ ...s, tune: { offTraits: ['hothead'] } }, 'h'));
  assert.ok(kill(s, 'st') < kill({ ...s, tune: { offTraits: ['steady'] } }, 'st'));
});

test('young: good and bad news move a young man further', () => {
  const s = newGame(1);
  s.purse = 1000;
  s.ledger.push({ t: 0, amount: 1000 - s.ledger.reduce((a, r) => a + r.amount, 0), why: 'test' });
  s.gang.push(man({ id: 'y', name: 'Kid Young', traits: ['young'] }));
  const gain = (st) => act(st, { type: 'bonus', id: 'y', amount: 200 }).gang.find((g) => g.id === 'y').loyalty - 50;
  assert.ok(gain(s) > gain({ ...s, tune: { offTraits: ['young'] } }));
});
