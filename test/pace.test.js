// Incidents, tip jobs, and seasons in a stretch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, deserialize, SAVE_VERSION } from '../src/engine/state.js';
import { act } from '../src/engine/season.js';
import { stakes } from '../src/engine/incidents.js';
import { INCIDENTS } from '../src/data/incidents.data.js';
import { view, targetList } from '../src/engine/derive.js';
import { ledgerSum } from '../src/engine/money.js';
import { step } from '../sim/bot.js';

const b = { who: ['a', 'b'], names: ['A', 'B'], shorts: ['A', 'B'], county: 'clay', countyName: 'Clay' };

test('every incident option words its stakes, and uses only known effects', () => {
  for (const inc of INCIDENTS) for (const o of inc.options) {
    const words = stakes(o.effects, b);
    assert.ok(Array.isArray(words), `${inc.id}/${o.id}`);
  }
  assert.throws(() => stakes({ sparkle: 1 }, b), /Unknown incident effect/);
});

test('an incident blocks the season until answered, and the answer takes effect', () => {
  let s = newGame(2);
  s.incident = { id: 'widow', t: s.t, bind: { who: [], county: 'clay' } };
  assert.throws(() => act(s, { type: 'lielow', at: 'farm' }), /answer first/);
  const sym = s.sym.clay;
  s = act(s, { type: 'answer', choice: 'pay' });
  assert.equal(s.incident, null);
  assert.equal(s.sym.clay, sym + 8);
  assert.equal(s.purse, ledgerSum(s));
});

test('a tip opens a one-season job that closes after the season', () => {
  let s = newGame(2);
  s.incident = { id: 'tip-tax', t: s.t, bind: { who: [], county: null } };
  s = act(s, { type: 'answer', choice: 'take' });
  assert.ok(targetList(s).some((t) => t.id === 'taxman' && !t.lock));
  s = act(s, { type: 'lielow', at: 'farm' });
  assert.ok(!targetList(s).some((t) => t.id === 'taxman'));
});

test('lying low for a year runs up to four seasons and stops when something happens', () => {
  let stopped = 0, full = 0;
  for (let seed = 1; seed <= 30; seed++) {
    let s = newGame(seed);
    s.purse = 3000; s.ledger.push({ t: 0, amount: 3000 - ledgerSum(s), why: 'test' });
    const t0 = s.t;
    s = act(s, { type: 'lielow', at: 'farm', seasons: 4 });
    const ran = s.t - t0;
    assert.ok(ran >= 1 && ran <= 4, `ran ${ran}`);
    assert.equal(s.report.seasons, ran);
    if (ran === 4) full++; else { stopped++; assert.ok(s.report.events.some((e) => e.kind === 'bad' || e.kind === 'warn') || s.offers.some((o) => o.known) || s.outcome || /\(/.test(s.stateLine?.text || ''), `seed ${seed} stopped for nothing`); }
  }
  assert.ok(full >= 25, `full years ${full} of 30 (stopped early ${stopped})`);
  // Broke, it stops when the money runs out: that is worth stopping for.
  let s = newGame(1);
  s = act(s, { type: 'lielow', at: 'farm', seasons: 4 });
  assert.ok(s.report.seasons < 4 && s.report.events.some((e) => /lean season/.test(e.text)));
});

test('a version-2 save opens and plays on to an ending', () => {
  let s = deserialize(readFileSync(new URL('./fixtures/save-v2.json', import.meta.url), 'utf8'));
  assert.equal(s.v, SAVE_VERSION);
  assert.equal(s.incident, null);
  let n = 0;
  while (!s.outcome && n++ < 500) s = act(s, step(s, 'careful'));
  assert.ok(s.outcome);
  assert.equal(s.purse, ledgerSum(s));
});

test('the quiet years: a year a tap, with a question most years', () => {
  let taps = 0, questions = 0;
  for (let seed = 1; seed <= 20; seed++) {
    let s = newGame(seed);
    s.purse = 50000; s.ledger.push({ t: 0, amount: 50000 - ledgerSum(s), why: 'test' });
    s.married = true; s.family.push({ id: 'wife', name: 'Ann X', rel: 'wife', alive: true, core: true });
    for (const g of s.gang) if (!g.leader) g.status = 'gone';
    s.cover = { level: 80, place: 'nashville' };
    s = act(s, { type: 'retire' });
    while (!s.outcome && s.retired && taps < 400) {
      if (s.incident) { questions++; s = act(s, { type: 'answer', choice: view(s).incident.options.find((o) => !o.lock).id }); continue; }
      s = act(s, { type: 'wait', seasons: 4 });
      taps++;
    }
  }
  assert.ok(taps / 20 < 8, `${(taps / 20).toFixed(1)} taps per retirement`);
  assert.ok(questions > 20, `${questions} questions in 20 retirements`);
});
