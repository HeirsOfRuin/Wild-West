// Batch runner skeleton: play N seeded games with a reference policy, refuse to
// report on games that did not progress, and print every result with its noise
// floor. Copy into sim/run.js and fill in the three adapters.
//
// Why the refusal matters: Cradle's suite stayed green for three rounds while
// every campaign sat on turn 1. Farmyard's first batch "played" eleven years and
// took zero harvests. The Lists refuses a career that never reached a winter,
// entered no tourney, fought no bout, ran no course or met no card.
//
// Usage pattern:
//   import { runBatch } from './harness.js';
//   const r = runBatch({ runs: 300, seed0: 1, play, progress, metrics });
//   console.log(r.report);

import { seRate, summarize } from './stats.js';

/**
 * play(seed, opts)       -> final state (pure: same seed + opts -> same state)
 * progress(state)        -> list of strings naming what did NOT happen ([] = fine)
 *                           e.g. s.turn < 20 ? ['never reached turn 20'] : []
 * metrics(state)         -> { win: bool, ruined: bool, treasury: number, ... }
 * Booleans are reported as rates with SE; numbers as median/p10/p90.
 */
export function runBatch({ runs = 200, seed0 = 1, opts = {}, play, progress, metrics, label = '' }) {
  const t0 = Date.now();
  const rows = [];
  const stalled = [];
  const crashed = [];
  for (let i = 0; i < runs; i++) {
    const seed = seed0 + i * 7919; // spaced seeds; any fixed scheme works
    let s;
    try { s = play(seed, opts); } catch (e) { crashed.push(`seed ${seed}: ${e.message}`); continue; }
    const missing = progress(s);
    if (missing.length) { stalled.push(`seed ${seed}: ${missing.join('; ')}`); continue; }
    rows.push(metrics(s));
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const lines = [`${label || 'batch'}: ${rows.length}/${runs} runs reported, ${secs}s`];
  if (crashed.length) lines.push(`!! ${crashed.length} crashed (rare branches — see soak):`, ...crashed.slice(0, 5).map((x) => '   ' + x));
  if (stalled.length) lines.push(`!! ${stalled.length} did not progress — results below EXCLUDE them:`, ...stalled.slice(0, 5).map((x) => '   ' + x));
  const keys = rows.length ? Object.keys(rows[0]) : [];
  for (const k of keys) {
    const vals = rows.map((r) => r[k]);
    if (typeof vals[0] === 'boolean') {
      const p = vals.filter(Boolean).length / vals.length;
      lines.push(`  ${k.padEnd(28)} ${(100 * p).toFixed(1).padStart(6)}%   ±${seRate(p, vals.length).toFixed(1)} (1 SE)`);
    } else {
      const s = summarize(vals);
      lines.push(`  ${k.padEnd(28)} median ${s.median.toFixed(1)}  p10 ${s.p10.toFixed(1)}  p90 ${s.p90.toFixed(1)}${s.bad ? `  !! ${s.bad} NaN` : ''}`);
    }
  }
  const failed = stalled.length > 0 || crashed.length > 0;
  return { rows, stalled, crashed, failed, report: lines.join('\n') };
}

/**
 * Ablation: the same seeds with one subsystem switched off, diffed against the
 * baseline on EVERY metric (not just the one being tuned).
 * variants: { 'no investments': { investments: false }, ... }
 * An ablation LOCATES an effect; it does not ATTRIBUTE it. "No change" can mean
 * the subsystem is decoration or that the bot does not use it. Check the bot.
 */
export function ablate({ runs, seed0 = 1, base = {}, variants, play, progress, metrics }) {
  const baseline = runBatch({ runs, seed0, opts: base, play, progress, metrics, label: 'baseline' });
  const out = [baseline.report];
  for (const [name, delta] of Object.entries(variants)) {
    const v = runBatch({ runs, seed0, opts: { ...base, ...delta }, play, progress, metrics, label: name });
    out.push(v.report);
    for (const k of Object.keys(baseline.rows[0] || {})) {
      const a = baseline.rows.map((r) => r[k]), b = v.rows.map((r) => r[k]);
      if (typeof a[0] !== 'boolean') continue;
      const pa = a.filter(Boolean).length / a.length, pb = b.filter(Boolean).length / b.length;
      const gap = 100 * (pb - pa);
      const floor = 2 * Math.hypot(seRate(pa, a.length), seRate(pb, b.length));
      out.push(`    ${k.padEnd(26)} ${gap >= 0 ? '+' : ''}${gap.toFixed(1)} pts (floor ${floor.toFixed(1)})${Math.abs(gap) < floor ? '  noise' : ''}`);
    }
  }
  return out.join('\n');
}
