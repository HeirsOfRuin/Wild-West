// Making a character, outfitting, safe houses, old saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, deserialize, SAVE_VERSION } from '../src/engine/state.js';
import { act } from '../src/engine/season.js';
import { companionChoices, creationProblem } from '../src/engine/people.js';
import { forecast, view } from '../src/engine/derive.js';
import { ledgerSum } from '../src/engine/money.js';
import { step } from '../sim/bot.js';
import { retirePurse } from '../src/engine/ending.js';

const base = { first: 'Ike', last: 'Carver', background: 'farmer', home: 'ray', bonus: 'nerve', companions: ['brother', 'neighbour', 'hand'] };

test('creation: refuses with a reason, and builds what was chosen', () => {
  assert.match(creationProblem({ ...base, first: ' ' }), /name/);
  assert.match(creationProblem({ ...base, companions: ['brother'] }), /Choose 3/);
  assert.match(creationProblem({ ...base, background: 'drifter' }), /Choose 4/);
  const s = newGame(5, {}, base);
  assert.equal(s.home, 'ray');
  assert.equal(s.gang.length, 4);
  const me = s.gang.find((g) => g.leader);
  assert.equal(me.name, 'Ike Carver');
  assert.deepEqual([me.gun, me.nerve, me.horse], [2, 3, 3]); // farmer: horse +1; bonus: nerve
  assert.equal(s.gang.find((g) => g.id === 'c-brother').name.split(' ')[1], 'Carver');
  assert.equal(s.purse, ledgerSum(s));
});

test('creation: the same seed offers the same companions', () => {
  assert.deepEqual(companionChoices(9, 'Carver'), companionChoices(9, 'Carver'));
  assert.notDeepEqual(companionChoices(9, 'Carver'), companionChoices(10, 'Carver'));
});

test('a better horse and better guns move the forecast the right way', () => {
  let s = newGame(3);
  s.purse = 5000; s.ledger.push({ t: 0, amount: 5000 - ledgerSum(s), why: 'test' });
  const plan = { target: 'richmond-bank', approach: 'bold', hideout: 'farm', cut: 'even',
    crew: [{ id: 'me', role: 'street' }, { id: 'c-brother', role: 'inside' }, { id: 'c-cousin', role: 'horses' }, { id: 'c-warfriend', role: 'street' }] };
  const before = forecast(s, plan).mid;
  for (const id of ['me', 'c-warfriend', 'c-cousin']) { s = act(s, { type: 'buy', id, item: 'gun' }); s = act(s, { type: 'buy', id, item: 'horse' }); }
  const after = forecast(s, plan).mid;
  assert.ok(after.hit < before.hit, `street risk ${before.hit} -> ${after.hit}`);
  assert.ok(after.catch < before.catch, `catch ${before.catch} -> ${after.catch}`);
  assert.equal(s.purse, ledgerSum(s));
});

test('a safe house lets you hide where friends will not, and charges upkeep', () => {
  let s = newGame(3);
  s.purse = 3000; s.ledger.push({ t: 0, amount: 3000 - ledgerSum(s), why: 'test' });
  s.sym.daviess = 25;
  assert.ok(view(s).lieLow.find((o) => o.id === 'daviess').lock);
  s = act(s, { type: 'house', county: 'daviess' });
  assert.equal(view(s).lieLow.find((o) => o.id === 'daviess').lock, null);
  const p = s.purse;
  s = act(s, { type: 'lielow', at: 'daviess' });
  assert.ok(s.ledger.some((r) => /Keeping the house/.test(r.why)));
  assert.ok(s.purse < p);
});

test('a version-1 save opens and plays on to an ending', () => {
  let s = deserialize(readFileSync(new URL('./fixtures/save-v1.json', import.meta.url), 'utf8'));
  assert.equal(s.v, SAVE_VERSION);
  assert.equal(s.gang.find((g) => g.leader).name, 'Jesse James');
  let n = 0;
  while (!s.outcome && n++ < 500) s = act(s, step(s, 'careful'));
  assert.ok(s.outcome, 'the migrated game reached an ending');
  assert.equal(s.purse, ledgerSum(s));
});

test('plans for after: a farm cuts the cash to retire; a lawyer speeds the reward away; money quiets an old friend', () => {
  let s = newGame(4);
  s.purse = 20000; s.ledger.push({ t: 0, amount: 20000 - ledgerSum(s), why: 'test' });
  assert.match(view(s).assets.find((a) => a.id === 'farm').lock, /marry/);
  s = act(s, { type: 'marry' });
  s = act(s, { type: 'asset', id: 'farm' });
  assert.ok(s.assets.farm);
  assert.equal(retirePurse(s), 3000);
  s.reward = 10000;
  const lawyerless = act(s, { type: 'lielow', at: 'farm' }).reward;
  s = act(s, { type: 'asset', id: 'lawyer' });
  assert.ok(act(s, { type: 'lielow', at: 'farm' }).reward < lawyerless);
  s = act(s, { type: 'dismiss', id: 'c-warfriend' });
  const before = s.gang.find((g) => g.id === 'c-warfriend').loyalty;
  s = act(s, { type: 'hush', id: 'c-warfriend' });
  assert.ok(s.gang.find((g) => g.id === 'c-warfriend').loyalty > before);
  assert.equal(s.purse, ledgerSum(s));
});
