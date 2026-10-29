// Lawmen, the men's stories, lieutenants and the second crew.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, deserialize, SAVE_VERSION } from '../src/engine/state.js';
import { act } from '../src/engine/season.js';
import { forecast, view } from '../src/engine/derive.js';
import { ledgerSum } from '../src/engine/money.js';
import { makeMember } from '../src/engine/people.js';
import { step } from '../sim/bot.js';

const funded = (seed, amount = 5000) => {
  const s = newGame(seed);
  s.purse = amount; s.ledger.push({ t: 0, amount: amount - ledgerSum(s), why: 'test' });
  return s;
};
const man = (fields) => makeMember({ gun: 2, nerve: 2, horse: 2, loyalty: 60, rode: 10, ...fields });
const plan = (target, crew, approach = 'quiet') => ({ type: 'job', target, crew, approach, hideout: 'farm', cut: 'even' });

test('a skilled sheriff makes the posse stronger in his county; a friendly one weaker', () => {
  const s = funded(1);
  const p = plan('richmond-bank', [{ id: 'me', role: 'street' }, { id: 'c-brother', role: 'inside' }, { id: 'c-cousin', role: 'horses' }], 'bold');
  s.law.sheriffs.ray = { ...s.law.sheriffs.ray, skill: 1, lean: 'neutral' };
  const low = forecast(s, p).mid.catch;
  s.law.sheriffs.ray.skill = 3;
  const high = forecast(s, p).mid.catch;
  s.law.sheriffs.ray.lean = 'friendly';
  const friendly = forecast(s, p).mid.catch;
  assert.ok(high > low && friendly < high, `${low} ${high} ${friendly}`);
});

test('robbing his county angers the sheriff; at a grudge of 60 he will not take money', () => {
  let s = funded(1);
  const g0 = s.law.sheriffs.ray.grudge;
  s = act(s, plan('richmond-bank', [{ id: 'me', role: 'street' }, { id: 'c-brother', role: 'inside' }, { id: 'c-cousin', role: 'horses' }]));
  if (s.outcome) return;
  assert.ok(s.law.sheriffs.ray.grudge > g0);
  s.law.sheriffs.ray.grudge = 80; s.heat.ray = 50;
  assert.match(view(s).bribe.ray.lock, /wants you, not your money/);
});

test('elections happen in the autumn of even years, and backing a rival is only then', () => {
  let s = funded(2, 20000);
  assert.match(view(s).law.sheriffs.clay.back.lock, /autumn of even years/);
  s.t = 2; // autumn 1866
  s = act(s, { type: 'back', county: 'clay' });
  assert.equal(s.law.backed.clay, 2);
  const before = s.law.sheriffs.clay.name;
  let changed = 0;
  for (let seed = 1; seed <= 40; seed++) {
    let x = funded(seed, 20000); x.t = 2;
    x = act(x, { type: 'back', county: 'clay' });
    x = act(x, { type: 'lielow', at: 'farm' });
    if (x.law.sheriffs.clay.since === 2) changed++;
  }
  assert.ok(changed >= 12, `backed elections changed the sheriff ${changed}/40 times`);
  void before;
});

test('a man who wants a say can be made lieutenant, and a lieutenant leads a second crew', () => {
  let s = funded(3, 8000);
  s.gang.push(man({ id: 'a', name: 'Al A', story: 'lead', gun: 3 }), man({ id: 'b', name: 'Bo B' }), man({ id: 'c', name: 'Cy C' }));
  s.gang.find((g) => g.id === 'a').jobs = 5;
  s.incident = { id: 'story-lead', t: s.t, bind: { who: ['a'], county: null } };
  s = act(s, { type: 'answer', choice: 'yes' });
  assert.equal(s.lieutenant, 'a');
  assert.ok(s.gang.find((g) => g.id === 'a').storyDone);
  const two = { ...plan('richmond-bank', [{ id: 'me', role: 'street' }, { id: 'c-brother', role: 'inside' }, { id: 'c-cousin', role: 'horses' }]),
    second: { target: 'liberty-stage', approach: 'bold', hideout: 'farm', crew: [{ id: 'a', role: 'street' }, { id: 'b', role: 'inside' }, { id: 'c', role: 'horses' }] } };
  assert.throws(() => act(s, { ...two, second: { ...two.second, target: 'richmond-bank' } }), /different target/);
  assert.throws(() => act(s, { ...two, second: { ...two.second, crew: [{ id: 'b', role: 'inside' }, { id: 'c', role: 'horses' }] } }), /lieutenant leads/);
  assert.throws(() => act(s, { ...two, second: { ...two.second, crew: [{ id: 'a', role: 'street' }, { id: 'c-brother', role: 'inside' }] } }), /one crew/);
  const after = act(s, two);
  assert.ok(after.report.job.second, 'the second crew rode');
  assert.deepEqual(after.report.job.second.crew.map((c) => c.id).sort(), ['a', 'b', 'c']);
  assert.equal(after.purse, ledgerSum(after));
});

test('away for a year: a man leaves and comes back', () => {
  let s = funded(4);
  s.gang.push(man({ id: 'f', name: 'Fred F', story: 'family' }));
  s.incident = { id: 'story-family', t: s.t, bind: { who: ['f'], county: null } };
  s = act(s, { type: 'answer', choice: 'go' });
  assert.equal(s.gang.find((g) => g.id === 'f').status, 'away');
  for (let i = 0; i < 4 && !s.outcome; i++) { if (s.incident) s = act(s, { type: 'answer', choice: view(s).incident.options.find((o) => !o.lock).id }); s = act(s, { type: 'lielow', at: 'farm' }); }
  if (!s.outcome) assert.equal(s.gang.find((g) => g.id === 'f').status, 'active');
});

test('refusing an ambitious man can cost two men', () => {
  let left = 0;
  for (let seed = 1; seed <= 30; seed++) {
    let s = funded(seed);
    s.gang.push(man({ id: 'a', name: 'Al A', story: 'lead' }), man({ id: 'b', name: 'Bo B', loyalty: 30 }));
    s.incident = { id: 'story-lead', t: s.t, bind: { who: ['a'], county: null } };
    s = act(s, { type: 'answer', choice: 'no' });
    if (s.gang.find((g) => g.id === 'a').status === 'gone') { left++; assert.equal(s.gang.find((g) => g.id === 'b').status, 'gone'); }
  }
  assert.ok(left > 4 && left < 20, `${left}/30 left`);
});

test('a version-3 save opens and plays on to an ending', () => {
  let s = deserialize(readFileSync(new URL('./fixtures/save-v3.json', import.meta.url), 'utf8'));
  assert.equal(s.v, SAVE_VERSION);
  assert.ok(s.law.sheriffs.clay.name);
  let n = 0;
  while (!s.outcome && n++ < 500) s = act(s, step(s, 'careful'));
  assert.ok(s.outcome);
  assert.equal(s.purse, ledgerSum(s));
});
