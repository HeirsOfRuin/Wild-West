// The family code: the contract with the sequel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/engine/state.js';
import { act } from '../src/engine/season.js';
import { ledgerSum } from '../src/engine/money.js';
import { familyCode, familyRecord, readFamilyCode, FAMILY_PREFIX } from '../src/engine/dynasty.js';
import { playGame } from '../sim/bot.js';

function retiredGame() {
  for (let seed = 1; seed < 400; seed++) {
    const s = playGame(seed * 7919, 'careful', {}, newGame);
    if (s.outcome.kind === 'retired') return s;
  }
  throw new Error('no retirement in 400 games');
}

test('a retirement leaves a family code that reads back whole', () => {
  const s = retiredGame();
  const code = familyCode(s);
  assert.ok(code.startsWith(FAMILY_PREFIX));
  const r = readFamilyCode(code);
  assert.deepEqual(r, familyRecord(s));
  assert.equal(r.founder.last, s.me.last);
  assert.equal(r.inheritance.cash, s.purse);
  assert.ok(['gun', 'nerve', 'horse'].includes(r.founder.takesAfter));
  assert.ok(r.family.some((f) => f.rel === 'wife'));
});

test('no family code unless you retired', () => {
  const s = playGame(3, 'raider', {}, newGame);
  assert.notEqual(s.outcome.kind, 'retired');
  assert.equal(familyCode(s), null);
});

test('a bad or newer code is refused with a reason', () => {
  assert.throws(() => readFamilyCode('OUTLAW1.abc'), /not a family code/);
  assert.throws(() => readFamilyCode('DOAFAM9.e30='), /newer version/);
  assert.throws(() => readFamilyCode('DOAFAM1.e30='), /damaged/);
});

test('friends who kept faith and men who sold you are told apart', () => {
  let s = newGame(5);
  s.purse = 20000; s.ledger.push({ t: 0, amount: 20000 - ledgerSum(s), why: 'test' });
  s = act(s, { type: 'marry' });
  s = act(s, { type: 'dismiss', id: 'c-warfriend', stake: true });
  s.gang.find((g) => g.id === 'c-cousin').status = 'turned';
  for (const g of s.gang) if (!g.leader && g.status === 'active') g.status = 'gone';
  s.outcome = { kind: 'retired', t: s.t };
  s.retired = { since: s.t };
  const r = familyRecord(s);
  assert.ok(r.friends.some((f) => f.name === s.gang.find((g) => g.id === 'c-warfriend').name));
  assert.ok(r.enemies.some((f) => f.name === s.gang.find((g) => g.id === 'c-cousin').name));
});
