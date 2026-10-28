// Impossibilities, not magnitudes: things that must never happen in any game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, serialize, deserialize, toCode, fromCode, lastTurn, SAVE_VERSION } from '../src/engine/state.js';
import { act } from '../src/engine/season.js';
import { ledgerSum } from '../src/engine/money.js';
import { step } from '../sim/bot.js';
import { defOf } from '../src/engine/gang.js';

function play(seed, pol, each) {
  let s = newGame(seed);
  let n = 0;
  while (!s.outcome) {
    const a = step(s, pol);
    const before = s;
    s = act(s, a);
    each?.(before, a, s);
    if (++n > 3000) throw new Error('no end');
  }
  return s;
}

const SEEDS = [1, 2, 3, 4, 5, 6];
const POLS = ['careful', 'stayer', 'raider', 'hermit'];

test('the purse always equals the ledger, and never goes negative', () => {
  for (const pol of POLS) for (const seed of SEEDS) {
    play(seed, pol, (b, a, s) => {
      assert.equal(s.purse, ledgerSum(s), `${pol} seed ${seed} after ${a.type}`);
      assert.ok(s.purse >= 0, `${pol} seed ${seed}: purse ${s.purse} after ${a.type}`);
    });
  }
});

test('the same seed and choices give the same game, byte for byte', () => {
  for (const seed of [11, 12]) assert.equal(serialize(play(seed, 'careful')), serialize(play(seed, 'careful')));
});

test('every game ends, and no later than the last season', () => {
  for (const pol of POLS) for (const seed of SEEDS) {
    const s = play(seed, pol);
    assert.ok(s.outcome && s.t <= lastTurn(), `${pol} ${seed}`);
    assert.ok(['killed', 'captured', 'betrayed', 'retired', 'era'].includes(s.outcome.kind));
  }
});

test('free actions leave the season open; season actions close it', () => {
  play(3, 'careful', (b, a, s) => {
    const free = ['scout', 'recruit', 'dismiss', 'kill', 'bonus', 'letter'].includes(a.type);
    if (free) assert.equal(s.t, b.t, `${a.type} moved the clock`);
    else if (!s.outcome) assert.equal(s.t, b.t + 1, `${a.type} did not move the clock`);
  });
});

test('dead and captured men stay gone: they cannot ride again', () => {
  for (const seed of SEEDS) {
    play(seed, 'stayer', (b, a) => {
      if (a.type !== 'job') return;
      for (const c of a.crew) assert.equal(b.gang.find((g) => g.id === c.id).status, 'active', `${c.id} rode while ${b.gang.find((g) => g.id === c.id).status}`);
    });
  }
  // And the engine refuses it outright.
  let s = newGame(1);
  s.gang.find((g) => g.id === 'cole').status = 'dead';
  assert.throws(() => act(s, { type: 'job', target: 'liberty-bank', approach: 'quiet', hideout: 'farm', cut: 'even',
    crew: [{ id: 'jesse', role: 'horses' }, { id: 'cole', role: 'inside' }] }), /not riding/);
});

test('your own kin never sell you', () => {
  for (const pol of ['stayer', 'hermit']) for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const s = play(seed, pol);
    for (const g of s.gang) if (defOf(g.id).kin === 'james' && !defOf(g.id).leader) assert.ok(g.status !== 'turned' && g.stage === 0, `${g.id} turned`);
    if (s.outcome.by) assert.notEqual(defOf(s.outcome.by).kin, 'james');
  }
});

test('a save survives the round trip, as JSON and as a save code', () => {
  let s = newGame(9);
  for (let i = 0; i < 6; i++) s = act(s, step(s, 'careful'));
  assert.deepEqual(deserialize(serialize(s)), s);
  assert.deepEqual(fromCode(toCode(s)), s);
  assert.throws(() => deserialize(JSON.stringify({ ...s, v: SAVE_VERSION + 1 })), /newer version/);
  assert.throws(() => fromCode('nonsense'), /not a save code/);
});

test('locked choices refuse with a reason, not silently', () => {
  const s = newGame(1);
  assert.throws(() => act(s, { type: 'retire' }), /nobody to quit for/);
  assert.throws(() => act(s, { type: 'letter' }), /newspaper/);
  assert.throws(() => act(s, { type: 'job', target: 'hannibal', crew: [], approach: 'bold', hideout: 'farm' }), /train/);
});
