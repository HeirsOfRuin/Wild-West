// The press shots need a believable mid-career game. This plays the real bot
// (careful) as a fictional outlaw, Will Harlan, to summer 1869 and writes the
// save to release/_press-save.json for tools/press.config.mjs.
//   node tools/press-seed.mjs && node tools/press.mjs
import { step } from '../sim/bot.js';
import { act } from '../src/engine/season.js';
import { newGame, serialize, yearOf } from '../src/engine/state.js';
import { DEFAULT_CREATION } from '../src/engine/people.js';
import { writeFileSync } from 'node:fs';
const creation = { ...DEFAULT_CREATION, first: 'Will', last: 'Harlan', background: 'cavalry' };
for (let seed = 1; seed < 400; seed++) {
  let s = newGame(seed * 7919, {}, creation);
  let n = 0;
  while (!s.outcome && s.t < 15 && n++ < 500) s = act(s, step(s, 'careful'));
  if (s.outcome || s.incident || s.retired) continue;
  if (s.purse > 2500 && s.legend > 40 && s.gang.filter((g) => g.status === 'active').length >= 5) {
    writeFileSync('release/_press-save.json', serialize(s));
    console.log('seed', seed * 7919, 't', s.t, yearOf(s.t), 'purse', s.purse, 'legend', Math.round(s.legend), s.gang.map((g) => `${g.name}:${g.status}`).join(', '));
    break;
  }
}
