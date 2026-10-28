// The plan screen and the resolver must agree. On a scouted target with no
// informer, the forecast's alarm and take must match what jobs actually do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/engine/state.js';
import { act } from '../src/engine/season.js';
import { forecast } from '../src/engine/derive.js';
import { seRate } from '../sim/stats.js';

test('forecast alarm and take match resolved jobs (scouted, 600 jobs)', () => {
  const plans = [
    { target: 'richmond-bank', approach: 'quiet', crew: [{ id: 'me', role: 'street' }, { id: 'c-brother', role: 'inside' }, { id: 'c-cousin', role: 'horses' }] },
    { target: 'gallatin-bank', approach: 'quiet', crew: [{ id: 'me', role: 'horses' }, { id: 'c-brother', role: 'inside' }, { id: 'c-cousin', role: 'inside' }, { id: 'c-warfriend', role: 'street' }] },
  ];
  for (const p of plans) {
    let predA = 0, gotA = 0, predT = 0, gotT = 0;
    const N = 300;
    for (let seed = 1; seed <= N; seed++) {
      let s = newGame(seed * 31);
      s = act(s, { type: 'scout', target: p.target });
      const plan = { type: 'job', hideout: 'farm', cut: 'even', ...p };
      const f = forecast(s, plan);
      predA += f.mid.alarm; predT += f.mid.take;
      const after = act(s, plan);
      gotA += after.lastJob.alarm ? 1 : 0; gotT += after.lastJob.loot;
    }
    const pa = predA / N, ga = gotA / N;
    assert.ok(Math.abs(pa - ga) * 100 < 3 * seRate(pa, N) + 1, `${p.target}: alarm forecast ${pa.toFixed(3)} vs ${ga.toFixed(3)}`);
    assert.ok(Math.abs(predT - gotT) / gotT < 0.08, `${p.target}: take forecast ${Math.round(predT / N)} vs ${Math.round(gotT / N)}`);
  }
});
