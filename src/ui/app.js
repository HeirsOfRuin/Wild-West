// The page. It reads the engine and computes nothing: every number on screen
// comes from derive.js (view, forecast, targetList) or the engine's own state.

import { newGame, dateOf, yearOf, SAVE_KEY, serialize, deserialize, toCode, fromCode, K } from '../engine/state.js';
import { act, secondProblem } from '../engine/season.js';
import { view, targetList, forecast, hideouts, band } from '../engine/derive.js';
import { targetDef } from '../engine/job.js';
import { retireNeeded } from '../engine/ending.js';
import { familyRecord, familyCode } from '../engine/dynasty.js';
import { COUNTIES, CASH_BAND } from '../data/world.data.js';
import { TRAITS, BACKGROUNDS, GEAR } from '../data/gang.data.js';
import { companionChoices, creationProblem, backgroundOf } from '../engine/people.js';
import { CONFIG } from '../data/config.data.js';
import { lsGet, lsSet, STORAGE_OK } from './storage.js';
import { mapSvg, targetsIn } from './map.js';

const app = document.getElementById('app');
let S = null; // the game
const U = { tab: 'season', screen: null, target: null, plan: null, give: 0, confirm: null, toast: null, showCode: false, cr: null, county: null };

const $ = (n) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Exact (scouted) values get a phrase; a believed range gets short words.
const GUARD = ['none to speak of', 'a pistol behind the counter', 'armed guards', 'guards and a time lock'];
const GUARD_SHORT = ['none', 'light', 'heavy', 'very heavy'];
const FIGHT = ['will not fight', 'a few will shoot', 'will fight', 'will fight to a man'];
const FIGHT_SHORT = ['meek', 'a few guns', 'will fight', 'armed to a man'];
const rangeWords = (words, [lo, hi]) => {
  if (lo === hi) return words[lo];
  const short = words === GUARD ? GUARD_SHORT : FIGHT_SHORT;
  return `somewhere from ${short[lo]} to ${short[hi]}`;
};

function save() { if (S) lsSet(SAVE_KEY, serialize(S)); }
function load() {
  const raw = lsGet(SAVE_KEY);
  if (!raw) return null;
  try { return deserialize(raw); } catch { return null; }
}

function doAct(a) {
  try {
    const before = S.t;
    S = act(S, a);
    save();
    if (S.outcome || S.t !== before) { U.screen = 'result'; U.target = null; U.plan = null; U.give = 0; U.tab = 'season'; }
    U.confirm = null;
    window.scrollTo(0, 0);
  } catch (e) {
    U.toast = e.message;
  }
  render();
}

// ---- pieces -------------------------------------------------------------------

function bar(v) {
  return `<header class="bar">
    <div class="date"><span>${v.date}</span><span class="who">${esc(v.me.first)} ${esc(v.me.last)}</span><button class="help-link" data-act="help">How it works</button></div>
    <div class="stats">
      <span>Purse <b>${$(v.purse)}</b></span>
      <span>Legend <b>${v.legend}</b></span>
      <span>Reward <b>${$(v.reward)}</b></span>
      ${v.pinkerton === null ? '' : `<span>Pinkertons <b>${v.pinkerton}</b></span>`}
      <span>Gang <b>${v.gang.length - 1}</b></span>
    </div></header>`;
}

function tabs() {
  const t = (id, label, dot) => `<button data-tab="${id}" aria-current="${U.tab === id && !U.screen}">${label}${dot ? '<span class="dot"></span>' : ''}</button>`;
  const sus = S && view(S).gang.some((m) => m.suspected);
  return `<nav class="tabs">${t('season', 'Season', !!S?.incident)}${t('gang', 'Gang', sus)}${t('map', 'Map')}${t('news', 'News')}</nav>`;
}

function events(list) {
  if (!list?.length) return '';
  return `<ul class="events">${list.map((e) => `<li class="${e.kind}">${e.title ? `<span class="t">${esc(e.title)}</span>` : ''}${esc(e.text)}</li>`).join('')}</ul>`;
}

function paper(r) {
  if (!r) return '';
  const j = r.job;
  return `<article class="paper">
    <div class="masthead">THE LIBERTY TRIBUNE · ${dateOf(r.t).toUpperCase()}</div>
    <div class="headline">${esc(j ? j.headline : r.title)}</div>
    ${j ? j.beats.map((b) => `<p>${esc(b)}</p>`).join('') : ''}
    ${j?.second ? `<div class="headline" style="font-size:16px">ALSO: ${esc(j.second.headline)}</div>${j.second.beats.map((b) => `<p>${esc(b)}</p>`).join('')}` : ''}
    ${events(r.events)}
  </article>`;
}

function lockLine(why) { return why ? `<div class="lock">${esc(why)}</div>` : ''; }

// ---- screens --------------------------------------------------------------------

function titleScreen() {
  if (U.cr) return createScreen();
  const saved = load();
  return `<div class="title">
    <h1>Dead or Alive</h1>
    <div class="sub">Missouri, 1866–1882</div>
    <div class="rule"></div>
    <p>The war is over. You and a few of your own come home with your guns. Rob banks, trains and stagecoaches; buy better horses and safe houses; keep the counties on your side; watch your own men. Nobody rides forever.</p>
    <div class="btns" style="justify-content:center">
      ${saved && !saved.outcome ? `<button class="btn" data-act="continue">Continue (${dateOf(saved.t)})</button>` : ''}
      ${saved?.outcome ? `<button class="btn secondary" data-act="continue">How the last game ended${saved.outcome.kind === 'retired' ? ' (and the family code)' : ''}</button>` : ''}
      <button class="btn ${saved && !saved.outcome ? 'secondary' : ''}" data-act="new">New outlaw</button>
    </div>
    ${STORAGE_OK ? '' : '<p class="small">This browser will not keep a save here. Use the save code on the News tab to keep your game.</p>'}
    <details style="margin-top:24px;text-align:left"><summary>Load a save code</summary>
      <textarea id="code-in" placeholder="OUTLAW1.…"></textarea>
      <button class="btn small" data-act="import">Load</button></details>
  </div>`;
}

function companionsHtml(c) {
  const want = backgroundOf(c.background).companions;
  const picks = companionChoices(c.seed, c.last.trim() || 'Smith');
  return `<h3>Who rides with you (${c.companions.length} of ${want})</h3>
    <p class="small">Your brother and cousin are blood: they never sell you. The others might.</p>
    ${picks.map((p) => `<button class="choice" data-act="cr-comp" data-v="${p.kind}" aria-pressed="${c.companions.includes(p.kind)}">
      <b>${esc(p.name)}</b><span>${esc(p.rel)}. ${esc(p.pitch)}</span>
      <small>Gun ${p.gun} · Nerve ${p.nerve} · Horse ${p.horse}${p.traits.length ? ` · ${p.traits.join(', ')}` : ''}</small></button>`).join('')}`;
}

function createScreen() {
  const c = U.cr;
  const bg = backgroundOf(c.background);
  const statOf = (k) => 2 + (bg.bonus[k] || 0) + (c.bonus === k ? 1 : 0);
  const why = creationProblem(c);
  const seg = (act, value, label, on) => `<button data-act="${act}" data-v="${value}" aria-pressed="${on}">${label}</button>`;
  return `<h1 style="margin-top:12px">A new outlaw</h1>
    <div class="card"><h3>Your name</h3>
      <div class="names"><label>First <input id="cr-first" value="${esc(c.first)}" maxlength="16" autocomplete="off"></label>
      <label>Surname <input id="cr-last" value="${esc(c.last)}" maxlength="16" autocomplete="off"></label></div></div>
    <div class="card"><h3>What the war made you</h3>
      ${BACKGROUNDS.map((b) => `<button class="choice" data-act="cr-bg" data-v="${b.id}" aria-pressed="${c.background === b.id}">
        <b>${esc(b.name)}</b><span>${esc(b.text)}</span>
        <small>${[b.bonus.gun ? 'Gun +1' : '', b.bonus.nerve ? 'Nerve +1' : '', b.bonus.horse ? 'Horse +1' : '',
          `legend ${b.legend}`, b.purse ? `$${b.purse} more` : '', b.reward ? `$${b.reward} reward on you already` : '',
          b.southern ? `Southern counties +${b.southern}` : '', b.home ? `home county ${b.home > 0 ? '+' : ''}${b.home}` : '',
          b.loyalty ? `companions +${b.loyalty} loyalty` : '', `${b.companions} companions`].filter(Boolean).join(' · ')}</small></button>`).join('')}
    </div>
    <div class="card"><h3>Home county</h3><p class="small">The family farm is here. Your home county likes you more, and hides you for nothing.</p>
      <div class="seg">${COUNTIES.map((k) => seg('cr-home', k.id, `${k.name}`, c.home === k.id)).join('')}</div>
      <p class="small">${esc(COUNTIES.find((k) => k.id === c.home).note)} Sympathy to start: ${COUNTIES.find((k) => k.id === c.home).base}.</p></div>
    <div class="card"><h3>One more thing you are good at</h3>
      <div class="seg">${seg('cr-bonus', 'gun', 'Gun', c.bonus === 'gun')}${seg('cr-bonus', 'nerve', 'Nerve', c.bonus === 'nerve')}${seg('cr-bonus', 'horse', 'Horse', c.bonus === 'horse')}</div>
      <p class="skills" style="margin-top:6px">You: Gun ${statOf('gun')} · Nerve ${statOf('nerve')} · Horse ${statOf('horse')}</p>
      <p class="small">Gun holds a street. Nerve handles a cashier. Horse outruns a posse. Skills run from 1 to 4.</p></div>
    <div class="card" id="cr-comps">${companionsHtml(c)}</div>
    ${lockLine(why)}
    <div class="btns"><button class="btn" data-act="cr-start">Ride out</button><button class="btn secondary" data-act="cr-cancel">Back</button></div>`;
}

function seasonTab(v) {
  if (v.outcome) return endScreen(v);
  const parts = [];
  if (S.report && U.screen === 'result') {
    const span = S.report.seasons > 1 ? `${dateOf(S.report.t)} to ${dateOf(S.report.t + S.report.seasons - 1)}` : dateOf(S.report.t);
    parts.push(`<h2>${esc(span)}</h2>${S.report.stoppedEarly ? '<p class="small">Stopped early: something needs your attention.</p>' : ''}${paper(S.report)}<button class="btn block" data-act="done">On to ${esc(v.date)}</button>`);
    return parts.join('');
  }
  if (S.report) parts.push(`<details><summary>${S.report.seasons > 1 ? `Last stretch: ${esc(dateOf(S.report.t))} to ${esc(dateOf(S.report.t + S.report.seasons - 1))}` : `Last season: ${esc(dateOf(S.report.t))}`}</summary>${paper(S.report)}</details>`);
  if (S.stateLine?.t === S.t) parts.push(`<div class="statebox"><span class="t">The State · ${esc(v.date)}</span>${esc(S.stateLine.text)}</div>`);
  if (v.incident) {
    const inc = v.incident;
    parts.push(`<div class="card incident"><span class="t">Before anything else</span><h3>${esc(inc.title)}</h3><p>${esc(inc.text)}</p>
      ${inc.options.map((o) => `<button class="choice" data-act="answer" data-v="${o.id}" ${o.lock ? 'disabled' : ''}><b>${esc(o.label)}</b>
        <small>${esc(o.stakes.join(' · ') || 'nothing changes')}${o.lock ? ` · ${esc(o.lock)}` : ''}</small></button>`).join('')}</div>`);
    return parts.join('');
  }
  parts.push(`<h2>${v.date}: what will you do?</h2>`);
  if (v.retired) {
    const left = retireNeeded(S) - (S.t - v.retired.since);
    parts.push(`<div class="card"><h3>Mr. Howard's quiet life</h3>
      <p>${left} more quiet season${left === 1 ? '' : 's'} and the world forgets you. It costs ${$(K(S, 'retireCost'))} a season. Old friends who know where you live are the danger.</p>
      <div class="btns"><button class="btn" data-act="wait" data-n="4">Live the next year</button>
      <button class="btn secondary" data-act="wait" data-n="1">One season</button>
      <button class="btn secondary" data-act="rideagain">Dig up the guns</button></div></div>`);
    return parts.join('');
  }
  const offer = S.flags.northfieldOffer === S.t;
  parts.push(`<div class="card"><h3>Plan a job</h3>
    <p>Scout a bank, a train or a stage, pick who goes and what each man does, and choose where you run to.${offer ? ' <b>Chadwell\'s Minnesota bank is on offer this season only.</b>' : ''}</p>
    <button class="btn block" data-act="screen" data-screen="job">Choose a target</button></div>`);
  parts.push(`<div class="card"><h3>Lie low</h3>
    <p>Hide with friends while the posses give up. Money given away buys sympathy where you hide.</p>
    <button class="btn secondary block" data-act="screen" data-screen="lielow">Choose where</button></div>`);
  parts.push(`<div class="card"><h3>Live as Mr. Thomas Howard</h3>
    <p>A respectable life under a false name: the Pinkertons lose the trail, but the men grow restless and it costs money.${v.cover.place ? ` Your cover in ${esc(coverName(v.cover.place))}: ${v.cover.level} of 100.` : ''}</p>
    <button class="btn secondary block" data-act="screen" data-screen="cover">Choose where</button></div>`);
  if (S.flags.edwards) {
    parts.push(`<div class="card ${v.actions.letter ? 'locked' : ''}"><h3>Write to the Kansas City Times</h3>
      <p>Answer for last season's job in John Newman Edwards's paper. Legend +${K(S, 'letterLegend')}, Southern counties +${K(S, 'letterSym')}, Union counties ${K(S, 'letterSymNorth')}, reward +${$(K(S, 'letterReward'))}. Twice in a row reads as arrogance. Does not end the season.</p>
      ${lockLine(v.actions.letter)}
      <button class="btn secondary block" data-act="letter" ${v.actions.letter ? 'disabled' : ''}>Write the letter</button></div>`);
  }
  parts.push(`<div class="card ${v.actions.retire ? 'locked' : ''}"><h3>Quit the life</h3>
    <p>Retire as Mr. Howard with the gang gone and the family alive, and survive the quiet years after. Few manage it.</p>
    ${lockLine(v.actions.retire)}
    <button class="btn secondary block" data-act="retire" ${v.actions.retire ? 'disabled' : ''}>Retire</button></div>`);
  parts.push(`<h2>Plans for after</h2><p class="small">Bigger things to buy, for the day you stop. None of them ends the season.</p>
    ${v.assets.map((a) => `<div class="card ${a.owned ? '' : a.lock ? 'locked' : ''}"><div class="row"><h3>${esc(a.name)}</h3><span class="small">${a.owned ? 'Yours' : $(a.cost)}</span></div>
      <p class="small">${esc(a.text)}</p>${a.owned ? '' : `${lockLine(a.lock)}<button class="btn small" data-act="asset" data-v="${a.id}" ${a.lock ? 'disabled' : ''}>Buy${a.id === 'business' && a.where ? ` in ${esc(coverName(a.where))}` : ''}</button>`}</div>`).join('')}`);
  return parts.join('');
}

const coverName = (p) => ({ kc: 'Kansas City', stjoe: 'St. Joseph', nashville: 'Nashville' }[p]);

function jobScreen(v) {
  if (!U.target) {
    const list = targetList(S);
    return `<button class="btn secondary small" data-act="back">Back</button><h2>Choose a target</h2>
      <p class="small">Not scouted, you know the town's name and what your own robberies taught it, give or take a man. Scouting (${$(K(S, 'scoutCost'))}, ${K(S, 'maxScoutsPerSeason')} a season) shows this year's truth and makes the county ${K(S, 'scoutHeat')} hotter. It does not end the season.</p>
      ${list.map((t) => `<div class="card ${t.lock ? 'locked' : ''}">
        <div class="row"><h3>${esc(t.name)}</h3><span class="tag">${t.kindName}</span></div>
        <div class="small">${esc(t.countyName)}${t.far ? '' : ` · sympathy ${Math.round(t.sym)} · heat ${Math.round(t.heat)}`}${t.robbed ? ` · robbed ${t.robbed}×` : ''}</div>
        ${t.lock ? lockLine(t.lock) : `<dl class="kv" style="margin-top:6px">
          <dt>Cash</dt><dd>${t.intel.cash[0] === t.intel.cash[1] ? $(t.intel.cash[0]) : CASH_BAND(...t.intel.cash)}</dd>
          <dt>Guard</dt><dd>${rangeWords(GUARD, t.intel.guard)}</dd>
          <dt>Town</dt><dd>${rangeWords(FIGHT, t.intel.fight)}</dd>
          <dt>Known</dt><dd>${t.intel.scouted ? '<b>Scouted this year</b>' : 'Reputation only'}</dd></dl>
          ${t.intel.note ? `<p class="small">${esc(t.intel.note)}</p>` : ''}
          <div class="btns">
            <button class="btn small" data-act="pick" data-id="${t.id}">Plan this job</button>
            <button class="btn small secondary" data-act="scout" data-id="${t.id}" ${t.intel.scouted || t.scoutLock ? 'disabled' : ''}>Scout (${$(K(S, 'scoutCost'))})</button>
          </div>${!t.intel.scouted && t.scoutLock ? `<div class="small">${esc(t.scoutLock)}</div>` : ''}`}
      </div>`).join('')}`;
  }
  const def = targetDef(U.target);
  const plan = U.plan;
  const crew = Object.entries(plan.crew).filter(([, r]) => r !== 'stay').map(([id, role]) => ({ id, role }));
  const full = { type: 'job', target: U.target, crew, approach: plan.approach, hideout: plan.hideout, cut: plan.cut };
  const f = forecast(S, full);
  const hides = hideouts(S, def);
  const info = targetList(S).find((t) => t.id === U.target).intel;
  const role = (m, r, label) => `<button data-act="role" data-id="${m.id}" data-role="${r}" aria-pressed="${plan.crew[m.id] === r}">${label}</button>`;
  return `<button class="btn secondary small" data-act="untarget">Other targets</button>
    <h2>${esc(def.name)}</h2>
    <p class="small">${info.scouted ? 'Scouted: ' : 'Believed: '}cash ${info.cash[0] === info.cash[1] ? $(info.cash[0]) : CASH_BAND(...info.cash)}; guard: ${rangeWords(GUARD, info.guard)}; the town ${rangeWords(FIGHT, info.fight)}.</p>
    <div class="card"><h3>Who goes, and what they do</h3>
      <p class="small"><b>Inside</b> men handle the cashier or messenger (nerve). <b>Street</b> men hold the town and watch for trouble (gun). <b>Horses</b>: one holder for every four riders, or mounts bolt and wounded men are left behind (horse). More men are louder.</p>
      ${v.gang.map((m) => `<div class="man"><div class="row"><span class="name">${esc(m.name)}</span>
        <span class="skills">Gun ${m.gun} · Nerve ${m.nerve} · Horse ${m.horse}</span></div>
        <div>${m.traits.map((t) => `<span class="tag" title="${esc(TRAITS[t])}">${t}</span>`).join('')}${m.wounded ? '<span class="tag bad">wounded</span>' : ''}${m.suspected ? '<span class="tag warn">suspected</span>' : ''}</div>
        <div class="seg" style="margin-top:4px">${m.leader ? '' : role(m, 'stay', 'Stays')}${role(m, 'inside', 'Inside')}${role(m, 'street', 'Street')}${role(m, 'horses', 'Horses')}</div></div>`).join('')}
    </div>
    <div class="card"><h3>How you go in</h3>
      <div class="seg"><button data-act="approach" data-v="quiet" aria-pressed="${plan.approach === 'quiet'}">Quiet</button><button data-act="approach" data-v="bold" aria-pressed="${plan.approach === 'bold'}">Bold</button></div>
      <p class="small">${plan.approach === 'quiet'
        ? 'Walk in like customers. If nobody shouts, nobody fights; if the alarm goes up first, you may get little and the town arms.'
        : 'Ride in shooting. The alarm is certain, but street guns cow the town and the vault opens to enough inside men. More killings, more legend.'}</p>
      <h3 style="margin-top:10px">Where you run to</h3>
      <div class="seg">${hides.map((h) => `<button data-act="hide" data-v="${h.id}" aria-pressed="${plan.hideout === h.id}" ${h.lock ? 'disabled' : ''}>${esc(h.name)}</button>`).join('')}</div>
      ${hides.filter((h) => h.lock).length ? `<p class="small">${hides.filter((h) => h.lock).map((h) => `${esc(h.name)}: ${esc(h.lock)}`).join('<br>')}</p>` : ''}
      <h3 style="margin-top:10px">The split</h3>
      <div class="seg"><button data-act="cut" data-v="even" aria-pressed="${plan.cut === 'even'}">Even shares</button><button data-act="cut" data-v="leader" aria-pressed="${plan.cut === 'leader'}">A double share for you</button></div>
      <p class="small">Every rider gets a share, you get one and the gang's purse one. A double share for you costs every rider's goodwill.</p>
    </div>
    ${secondCrewCard(v, plan, def)}
    <div class="card forecast"><h3>As far as you can judge${f.scouted ? '' : ' (not scouted)'}</h3>
      <div class="line"><span>The alarm goes up first</span><span>${f.words.alarm}</span></div>
      <div class="line"><span>Somebody is killed (cashier or townsman)</span><span>${f.words.kill}</span></div>
      <div class="line"><span>One of you is hit in the street</span><span>${f.words.hit}</span></div>
      <div class="line"><span>The posse catches you on the road</span><span>${f.words.catch}</span></div>
      <div class="line"><span>You are killed or taken</span><span>${band(f.mid.leaderRisk)}</span></div>
      <div class="line"><span>Likely take</span><span>${$(f.take[0])}${Math.round(f.take[0]) === Math.round(f.take[1]) ? '' : `–${$(f.take[1])}`}</span></div>
      <div class="line"><span>A share, about</span><span>${$(f.shareEach)}</span></div>
      ${lockLine(f.problem)}
      ${lockLine(f.problem || secondLock(full))}
      <button class="btn danger block" data-act="ride" ${f.problem || secondLock(full) ? 'disabled' : ''}>Ride${U.plan2 ? ' (both crews)' : ''}</button>
    </div>`;
}

/** The second crew's plan as the engine takes it, or null. */
function secondPlan() {
  if (!U.plan2) return null;
  const crew = Object.entries(U.plan2.crew).filter(([id, r]) => r !== 'stay' && U.plan.crew[id] === 'stay').map(([id, role]) => ({ id, role }));
  return { target: U.plan2.target, crew, approach: U.plan2.approach, hideout: U.plan2.hideout };
}
function secondLock(full) {
  const b = secondPlan();
  if (!b) return null;
  const why = secondProblem(S, { ...full, second: b });
  if (why) return why;
  const f2 = forecast(S, { type: 'job', ...b, cut: 'even' });
  return f2.problem ? `Second crew: ${f2.problem}` : null;
}

function secondCrewCard(v, plan, def) {
  const lt = v.gang.find((m) => m.id === v.lieutenant);
  if (!lt) return '';
  if (plan.crew[lt.id] !== 'stay') return `<p class="small">Leave ${esc(lt.short)} out of this crew and he can lead a second one on another target this season.</p>`;
  if (!U.plan2) return `<button class="btn secondary block" data-act="second">Send a second crew under ${esc(lt.short)}</button>`;
  const p2 = U.plan2;
  const targets = targetList(S).filter((t) => !t.lock && t.id !== def.id);
  const def2 = targetDef(p2.target);
  const hides = hideouts(S, def2);
  const men = v.gang.filter((m) => !m.leader && plan.crew[m.id] === 'stay');
  const role = (m, r, label) => `<button data-act="role2" data-id="${m.id}" data-role="${r}" aria-pressed="${(p2.crew[m.id] || 'stay') === r}">${label}</button>`;
  const b = secondPlan();
  const f2 = forecast(S, { type: 'job', ...b, cut: 'even' });
  return `<div class="card second"><div class="row"><h3>Second crew, under ${esc(lt.name)}</h3><button class="btn small secondary" data-act="second">Call it off</button></div>
    <p class="small">The same season, another target. ${esc(lt.short)} stands in your place: if it goes wrong, you are not there.</p>
    <div class="seg">${targets.map((t) => `<button data-act="target2" data-v="${t.id}" aria-pressed="${p2.target === t.id}">${esc(t.name.split(',')[0])}</button>`).join('')}</div>
    ${men.map((m) => `<div class="man"><div class="row"><span class="name">${esc(m.name)}${m.id === lt.id ? ' <span class="tag">lieutenant</span>' : ''}</span><span class="skills">Gun ${m.gun} · Nerve ${m.nerve} · Horse ${m.horse}</span></div>
      <div class="seg">${m.id === lt.id ? '' : role(m, 'stay', 'Stays')}${role(m, 'inside', 'Inside')}${role(m, 'street', 'Street')}${role(m, 'horses', 'Horses')}</div></div>`).join('')}
    <div class="seg" style="margin-top:8px"><button data-act="approach2" data-v="quiet" aria-pressed="${p2.approach === 'quiet'}">Quiet</button><button data-act="approach2" data-v="bold" aria-pressed="${p2.approach === 'bold'}">Bold</button></div>
    <div class="seg" style="margin-top:6px">${hides.map((h) => `<button data-act="hide2" data-v="${h.id}" aria-pressed="${p2.hideout === h.id}" ${h.lock ? 'disabled' : ''}>${esc(h.name)}</button>`).join('')}</div>
    <div class="forecast" style="margin-top:8px">
      <div class="line"><span>The alarm goes up first</span><span>${f2.words.alarm}</span></div>
      <div class="line"><span>Somebody is killed</span><span>${f2.words.kill}</span></div>
      <div class="line"><span>A man of this crew is lost</span><span>${band(Math.min(1, f2.mid.losses))}</span></div>
      <div class="line"><span>Likely take</span><span>${$(f2.take[0])}${Math.round(f2.take[0]) === Math.round(f2.take[1]) ? '' : `–${$(f2.take[1])}`}</span></div>
    </div></div>`;
}

function lieLowScreen(v) {
  const opts = v.lieLow;
  const sel = U.hide || opts.find((o) => !o.lock)?.id;
  const gives = [0, 100, 300];
  return `<button class="btn secondary small" data-act="back">Back</button><h2>Lie low</h2>
    <p class="small">Posse heat halves every season, faster where you hide. Informers in unfriendly counties sell you for the reward. Safe house: ${$(K(S, 'safeHouseFee'))} a season (the farm is free). Your own living: ${$(K(S, 'leaderLiving'))}.</p>
    ${opts.map((o) => `<div class="card ${o.lock ? 'locked' : ''}"><div class="row"><h3>${esc(o.name)}</h3>
      <button class="btn small ${sel === o.id ? '' : 'secondary'}" data-act="hidepick" data-v="${o.id}" ${o.lock ? 'disabled' : ''}>${sel === o.id ? 'Chosen' : 'Choose'}</button></div>
      <div class="small">Sympathy ${v.sym[o.county]} · heat ${v.heat[o.county]} · an informer: ${band(v.risks.inform[o.county])}${o.note ? ` · ${esc(o.note)}` : ''}</div>${lockLine(o.lock)}</div>`).join('')}
    <div class="card"><h3>Give money away</h3>
      <p class="small">A widow's mortgage, a church roof. +1 sympathy for every ${$(K(S, 'giveScale'))} where you hide, halved each time in the same year.</p>
      <div class="seg">${gives.map((g) => `<button data-act="give" data-v="${g}" aria-pressed="${U.give === g}" ${g > v.purse ? 'disabled' : ''}>${g ? $(g) : 'Nothing'}</button>`).join('')}</div>
      <div class="btns"><button class="btn" data-act="lielow" data-v="${sel}" data-n="1">For the season</button>
      <button class="btn secondary" data-act="lielow" data-v="${sel}" data-n="4">For a year</button></div>
      <p class="small">A year stops early if anything happens: a question, a warning, a raid, a known man, a tip. Money is given away only in the first season.</p></div>`;
}

function coverScreen(v) {
  return `<button class="btn secondary small" data-act="back">Back</button><h2>Live as Mr. Howard</h2>
    <p class="small">Cover grows each season you live it, and is lost if you move. Riding out on a job costs ${K(S, 'coverJobLoss')} cover. The family comes with you. Men left idle at home grow restless. Recognition depends on your legend and your cover.</p>
    ${v.coverOptions.map((o) => `<div class="card ${o.lock ? 'locked' : ''}"><div class="row"><h3>${esc(o.name)}</h3><span class="small">${$(o.cost)} a season</span></div>
      <div class="small">Cover +${o.gain} a season · recognised: ${band(v.risks.recognise[o.id])}${o.id === 'nashville' ? ' · out of the state: the Pinkertons lose you fastest' : ''}${v.cover.place === o.id ? ` · <b>your cover here: ${v.cover.level}</b>` : ''}</div>
      ${lockLine(o.lock)}<button class="btn block" data-act="cover" data-v="${o.id}" ${o.lock ? 'disabled' : ''}>Live here this season</button></div>`).join('')}`;
}

// What a man's story looks like from outside, before it happens.
const STORY_HINT = {
  lead: 'Watches how you plan. He thinks he could do it.',
  drink: 'Drinks more than he should.',
  family: 'Writes home often. Things are hard there.',
  score: 'Talks about the war as if it were not over.',
  farm: 'Saves every dollar. He means to buy land one day.',
};

function gearLine(m) {
  return `${esc(GEAR.horse[m.gear.horse].name)}, ${esc(GEAR.gun[m.gear.gun].name)}`;
}

function gangTab(v) {
  const recruits = v.recruits;
  const rel = (m) => (m.kin === 'family' ? m.rel || 'your kin' : m.kin ? `${m.kin} kin` : m.rel);
  return `<h2>The gang</h2>
    <p class="small">You cannot see what a man thinks, only how he seems. New men are hard to read; the longer he rides with you, the truer the read. Broke, idle and frightened men turn. Each man costs ${$(K(S, 'keepPerMan'))} a season in keep.</p>
    ${v.gang.map((m) => `<div class="card"><div class="row"><h3>${esc(m.name)}</h3><span class="small">${m.leader ? 'You' : `${m.mood.word}${m.mood.readable ? '' : ' (hard to read)'}`}</span></div>
      <div class="skills">Gun ${m.base.gun}${m.gear.gun ? `<b>+${m.gun - m.base.gun}</b>` : ''} · Nerve ${m.nerve} · Horse ${m.base.horse}${m.gear.horse ? `<b>+${m.horse - m.base.horse}</b>` : ''}${m.leader ? '' : ` · pocket ${$(m.pocket)}`} · ${m.jobs} job${m.jobs === 1 ? '' : 's'}</div>
      <div class="small">Rides ${gearLine(m)}.</div>
      <div>${m.lieutenant ? '<span class="tag warn">lieutenant</span>' : ''}${!m.leader && rel(m) ? `<span class="tag">${esc(rel(m))}</span>` : ''}${m.traits.map((t) => `<span class="tag" title="${esc(TRAITS[t])}">${t}</span>`).join('')}${m.wounded ? '<span class="tag bad">wounded</span>' : ''}${m.suspected ? '<span class="tag warn">suspected</span>' : ''}</div>
      ${m.traits.map((t) => `<div class="small">${t}: ${esc(TRAITS[t])}</div>`).join('')}
      ${m.story ? `<div class="small"><i>${esc(STORY_HINT[m.story])}</i></div>` : ''}
      <div class="btns">${m.outfit.filter((o) => !o.done).map((o) => `<button class="btn small" data-act="buy" data-id="${m.id}" data-item="${o.item}" ${o.lock ? 'disabled' : ''} title="${esc(o.lock || '')}">Buy ${esc(o.next)} (${$(o.cost)})</button>`).join('')}
        ${m.wounded ? `<button class="btn small" data-act="doctor" data-id="${m.id}" ${m.doctor.lock ? 'disabled' : ''}>A doctor (${$(m.doctor.cost)})</button>` : ''}</div>
      ${m.outfit.filter((o) => !o.done && o.lock).map((o) => `<div class="small">${o.item === 'horse' ? 'Horse' : 'Guns'}: ${esc(o.lock)}</div>`).join('')}
      ${m.leader ? '' : U.confirm === m.id ? `<p class="blood">Kill ${esc(m.short)}? Every man will fear you, his kin may ride off, and the counties will hear of it.</p>
        <div class="btns"><button class="btn danger small" data-act="kill" data-id="${m.id}">Do it</button><button class="btn secondary small" data-act="unconfirm">No</button></div>`
      : `<details><summary>Pay, send home, or worse</summary><div class="btns">
        <button class="btn small secondary" data-act="bonus" data-id="${m.id}" ${v.purse < 100 ? 'disabled' : ''}>Pay him ${$(100)}</button>
        <button class="btn small secondary" data-act="dismiss" data-id="${m.id}" data-stake="1" ${v.purse < K(S, 'stake') ? 'disabled' : ''}>Send home with ${$(K(S, 'stake'))}</button>
        <button class="btn small secondary" data-act="dismiss" data-id="${m.id}">Send home with nothing</button>
        <button class="btn small secondary" data-act="confirm" data-id="${m.id}">Kill him</button>
        ${m.lieutenant ? '' : `<button class="btn small secondary" data-act="lieutenant" data-id="${m.id}" ${m.makeLt.lock ? 'disabled' : ''}>Make him your lieutenant</button>`}</div>
        ${!m.lieutenant && m.makeLt.lock ? `<div class="small">${esc(m.makeLt.lock)}</div>` : ''}</details>`}
    </div>`).join('')}
    <h2>Men looking for you</h2>
    ${recruits.length ? recruits.map((r) => `<div class="card ${r.lock ? 'locked' : ''}"><div class="row"><h3>${esc(r.name)}</h3><span class="small">${r.leaves <= 0 ? 'leaves after this season' : 'here two seasons'}</span></div>
      <div class="skills">Gun ${r.gun} · Nerve ${r.nerve} · Horse ${r.horse}${r.traits.length ? ` · ${r.traits.join(', ')}` : ''}${r.known ? ' · <b>a known man</b>' : ''}</div>
      <p>${esc(r.pitch)}</p>${lockLine(r.lock)}
      <button class="btn small" data-act="recruit" data-id="${r.id}" ${r.lock ? 'disabled' : ''}>Take him on (${$(K(S, 'recruitCost'))})</button></div>`).join('')
      : `<p class="small">Nobody this season. More men come, and better ones, as your legend grows (legend 15 brings one a season, 40 brings two).</p>`}
    ${v.gone.length ? `<h2>Gone</h2><p class="small">Men who went home still know your face and your hiding places. When their money runs out the reward looks better. Money sent now buys back goodwill (${$(K(S, 'hushCost'))}).</p>
      <ul class="events">${v.gone.map((g) => `<li class="${g.status === 'dead' ? 'bad' : ''}">${esc(g.name)}: ${{ dead: 'dead', captured: 'in prison', gone: 'gone home', turned: 'turned on you', away: 'away' }[g.status]}
      ${g.status === 'away' ? ` (back in ${dateOf(g.returnT)})` : ''}${g.status === 'gone' ? `<br><button class="btn small secondary" data-act="hush" data-id="${g.id}" ${g.hush.lock ? 'disabled' : ''}>Send him ${$(g.hush.cost)}</button>` : ''}</li>`).join('')}</ul>` : ''}
    <h2>Family</h2>
    <ul class="events">${v.family.map((f) => `<li class="${f.alive ? '' : 'bad'}">${esc(f.name)}, your ${esc(f.rel)}${f.alive ? (f.injured ? ' (maimed)' : '') : ' (dead)'}</li>`).join('')}</ul>
    <p class="small">The family lives ${S.familyAt === 'farm' ? `on the farm in ${esc(COUNTIES.find((c) => c.id === v.home).name)} County` : `with you in ${coverName(S.familyAt)}`}.</p>
    ${v.married ? '' : `<div class="card"><h3>Marry</h3><p>A wife and a farm are what a man retires to. You cannot quit the life without one. ${$(K(S, 'marryCost'))} for the wedding and a house.</p>
      ${lockLine(v.marry)}<button class="btn small" data-act="marry" ${v.marry ? 'disabled' : ''}>Marry</button></div>`}`;
}

function mapTab(v) {
  const id = U.county || v.home;
  const c = COUNTIES.find((k) => k.id === id);
  const house = v.houseOptions.find((o) => o.county === id);
  const br = v.bribe[id];
  const level = v.houses[id] || 0;
  const sh = v.law?.sheriffs?.[id];
  return `<h2>Western Missouri</h2>
    ${mapSvg(v, id)}
    <div class="key"><span><i style="background:var(--sym-hi)"></i>Friendly (55+)</span><span><i style="background:var(--sym-mid)"></i>Wavering</span><span><i style="background:var(--sym-lo)"></i>Hostile (under 35)</span><span><b class="blood">▲</b> posse heat</span><span><b class="blood">⌂</b> the farm</span><span>⌂ your safe house</span><span><b class="blood">★</b> you</span><span><b class="blood">⚲</b> the Pinkerton man</span><span>┼┼ railroad</span></div>
    <p class="small">Tap a county.</p>
    <div class="card"><div class="row"><h3>${c.name} County</h3><span class="small">${c.town}${id === v.home ? ' · home' : ''}</span></div>
      <p class="small">${esc(c.note)}</p>
      <dl class="kv"><dt>Sympathy</dt><dd>${v.sym[id]} ${v.safe[id] ? '(will hide you)' : `(will not hide you: needs ${level ? K(S, 'houseSym') : K(S, 'safeSym')})`}</dd>
        <dt>Posse heat</dt><dd>${v.heat[id]}</dd>
        <dt>Informers</dt><dd>${band(v.risks.inform[id])}</dd>
        <dt>To rob</dt><dd>${targetsIn(id).map((t) => esc(t.name.split(',')[0])).join('; ')}</dd>
        <dt>Your house</dt><dd>${level ? (level === 2 ? 'A hidden room and fresh horses' : 'A safe house') : 'None'}</dd>
        ${sh ? `<dt>Sheriff</dt><dd>${esc(sh.name)}, who ${esc(sh.leanWord)}. Skill ${'★'.repeat(sh.skill)}${'☆'.repeat(3 - sh.skill)}. Grudge: ${esc(sh.grudgeWord)}.</dd>` : ''}
        ${v.law?.detective?.county === id ? `<dt>Pinkerton</dt><dd class="blood">${esc(v.law.detective.name)} is here</dd>` : ''}</dl>
      ${sh ? `<p class="small" style="margin-top:6px">A sheriff's skill adds to every posse in his county. A friendly one lets the heat die faster and takes half the money. With a grudge of 60 he will not take money at all and he rides after you. Elections: autumn of even years.</p>
        ${sh.back.lock && /autumn/.test(sh.back.lock) ? '' : `${lockLine(sh.back.lock)}<button class="btn small secondary" data-act="back" data-v="${id}" ${sh.back.lock ? 'disabled' : ''}>Back his rival in the election (${$(sh.back.cost)})</button>`}` : ''}
      ${house.done ? '' : `<p class="small" style="margin-top:8px"><b>${esc(house.name)}</b>: ${esc(house.text)} ${level ? `Informer risk a quarter; posses catch you less often when you run here.` : `Hide here down to sympathy ${K(S, 'houseSym')}, no fee, half the informer risk.`} Then ${$(K(S, 'houseUpkeep'))} a season. Lost if a posse raids it.</p>
        ${lockLine(house.lock)}<button class="btn small" data-act="house" data-v="${id}" ${house.lock ? 'disabled' : ''}>${esc(house.name)} (${$(house.cost)})</button>`}
      <p class="small" style="margin-top:8px"><b>Pay off the sheriff</b>: halves the posse heat. ${$(K(S, 'bribePerHeat'))} a point of heat${c.southern ? '' : ', double in a Union county'}.</p>
      ${lockLine(br.lock)}<button class="btn small secondary" data-act="bribe" data-v="${id}" ${br.lock ? 'disabled' : ''}>Pay him (${$(br.cost)})</button>
    </div>`;
}

function newsTab(v) {
  const log = [...S.log].reverse().slice(0, 60);
  return `<h2>The record</h2>
    <ul class="events">${log.map((e) => `<li class="${e.kind}"><span class="t">${dateOf(e.t)}${e.title ? ` · ${esc(e.title)}` : ''}</span>${esc(e.text)}</li>`).join('')}</ul>
    ${v.law ? `<h2>The law</h2>
    <dl class="kv">${COUNTIES.map((c) => { const sh = v.law.sheriffs[c.id]; return `<dt>${c.name}</dt><dd>${esc(sh.name)}, who ${esc(sh.leanWord)}${sh.hunting ? ' — <b class="blood">hunting you</b>' : sh.grudge >= 30 ? ' — holds a grudge' : ''}</dd>`; }).join('')}
      ${v.law.detective ? `<dt>Pinkertons</dt><dd>${esc(v.law.detective.name)}, in ${esc(COUNTIES.find((c) => c.id === v.law.detective.county)?.name ?? '')} County</dd>` : ''}</dl>
    ${v.law.past.length ? `<p class="small">${v.law.past.slice(-3).reverse().map((p) => `${esc(p.name)} (${esc(p.role)}): ${esc(p.fate)}, ${dateOf(p.t)}.`).join(' ')}</p>` : ''}` : ''}
    <h2>The ledger</h2>
    <dl class="kv">${[...S.ledger].reverse().slice(0, 30).map((r) => `<dt>${dateOf(r.t)}</dt><dd>${r.amount > 0 ? '+' : ''}${$(r.amount)} ${esc(r.why)}</dd>`).join('')}</dl>
    <h2>Save</h2>
    <p class="small">The game saves itself in this browser after every season. A save code moves it to another device.</p>
    <div class="btns"><button class="btn small secondary" data-act="code">${U.showCode ? 'Hide' : 'Show'} save code</button>
    <button class="btn small secondary" data-act="theme">Light / dark</button>
    <button class="btn small secondary" data-act="quit">Title screen</button></div>
    ${U.showCode ? `<textarea readonly>${toCode(S)}</textarea>` : ''}`;
}

function helpScreen() {
  const C = CONFIG;
  return `<button class="btn secondary small" data-act="back">Back</button><h2>How it works</h2>
  <div class="card"><h3>A season</h3><p>Each season you do one thing: a job, lying low, or living as Mr. Howard. Scouting, letters, pay and recruiting do not end the season.</p></div>
  <div class="card"><h3>Jobs</h3><p>Inside men need nerve against the guard; street men need guns against the town; one horse-holder per four riders. Quiet jobs work until somebody shouts. Bold jobs always bring the town out but cow it. A killing costs sympathy everywhere (${C.symKillAll}) and more in that county (${C.symKillLocal}), and adds ${$(C.rewardKill)} to the reward.</p></div>
  <div class="card"><h3>Three pursuers</h3><p><b>Posses</b>: heat per county, halving each season. <b>Pinkertons</b> (from ${C.pinkStartYear} or your first train): slow to fade, they infiltrate the gang and come for the family. <b>The reward</b>: barely fades; it tempts informers in hostile counties and the men in your gang.</p></div>
  <div class="card"><h3>Sympathy</h3><p>A county under ${C.safeSym} will not hide you. Robbing its bank costs ${C.symBank} (your home county ${C.symHomeBank}). Southern counties like train jobs (+${C.symTrain}). The war fades from ${C.warFadeFrom}.</p></div>
  <div class="card"><h3>Loyalty</h3><p>Hidden. Each man spends ${$(C.livingCost)} a season; broke, idle or frightened men turn. Turning takes seasons and shows signs. Your own kin never sell you.</p></div>
  <div class="card"><h3>The outfit</h3><p>Better horses and guns add half a point a step to a man's riding or shooting, and go where he goes. Safe houses let you hide where friends will not, and fresh horses there shake posses. A paid sheriff halves a county's heat. Men who come through a job unhurt sometimes get better at the work they did. Each man costs ${$(C.keepPerMan)} a season in keep.</p></div>
  <div class="card"><h3>The law</h3><p>Every county has a sheriff with a name, a skill and a lean. His skill adds to every posse in his county; a friendly one lets heat die faster and takes half the money; a grudge of ${C.grudgeHunt} means he will not take money and rides after you. Robbing his county angers him (+${C.grudgeJob}, +${C.grudgeKill} more for a killing). Elections come every autumn of an even year; backing a rival costs ${$(C.backCost)}. One Pinkerton operative leads the hunt and moves a county a season toward you.</p></div>
  <div class="card"><h3>Your men</h3><p>Some men have their own story: a man who wants a say, a drinker, trouble at home, an old score, a man saving for land. Each comes to a head once. A man with ${C.lieutenantJobs} jobs behind him can be your lieutenant: a double share, and he can lead a second crew on another target in the same season.</p></div>
  <div class="card"><h3>Plans for after</h3><p>A farm in Tennessee under another name (retiring needs ${Math.round(C.farmPurseShare * 100)}% of the cash; Mr. Howard is believed faster and recognised less there). A business where you live (cover +${C.businessCoverGain} a season, the life costs ${Math.round(C.businessCostCut * 100)}% as much). A lawyer in Jefferson City (the reward fades faster; captured men keep quiet). Money for men who went home buys back their goodwill.</p></div>
  <div class="card"><h3>Ending</h3><p>Killed, captured or betrayed ends it. To win, marry, then retire: the gang gone, cover ${C.retireNeedCover}+, ${$(C.retireNeedPurse)} saved, the family alive; then survive ${C.retireSeasons} quiet seasons, plus one for every ${C.retireSeasonsPerLegend} points of your peak legend. After ${C.endYear} the era is over.</p></div>`;
}

function familyCard() {
  const r = familyRecord(S);
  const code = familyCode(S);
  const f = r.founder;
  const word = { gun: 'a steady hand with a pistol', nerve: 'a cool head', horse: 'a way with horses' }[f.takesAfter];
  return `<div class="card"><h3>What you leave behind</h3>
    <p>${esc(f.name)} died in bed. The ${esc(r.family.map((m) => m.rel).includes('son') || r.family.map((m) => m.rel).includes('daughter') ? 'children grew up' : 'family lived on')} as Howards, with ${$(r.inheritance.cash)}${r.inheritance.farm ? ', a farm in Tennessee' : ''}${r.inheritance.business ? ' and a business' : ''}, ${esc(f.heirlooms.gun)} in a trunk, and ${esc(word)} that ran in the blood.</p>
    ${r.friends.length ? `<p class="small">Kept faith: ${r.friends.map((x) => esc(x.name)).join(', ')}.</p>` : ''}
    ${r.enemies.length ? `<p class="small">Sold you or tried to: ${r.enemies.map((x) => esc(x.name)).join(', ')}.</p>` : ''}
    <p class="small">Keep this family code. The next game, set in 1933, will read it: a grandchild who takes after you, with what you left them.</p>
    <textarea id="family-code" readonly>${code}</textarea>
    <button class="btn small secondary" data-act="copy-family">Copy the family code</button></div>`;
}

function endScreen(v) {
  const o = v.outcome;
  const sc = o.score;
  const head = { killed: 'Killed', captured: 'Taken alive', betrayed: 'Betrayed', retired: 'You quit the life', era: 'The era is over' }[o.kind];
  return `${S.report ? paper(S.report) : ''}
    <div class="card"><h2 style="margin-top:0">${head}, ${dateOf(o.t)}</h2><p>${esc(o.text)}</p>
    <table class="score"><tr><td>Years</td><td>${sc.years}</td></tr><tr><td>Jobs</td><td>${sc.jobs}</td></tr>
    <tr><td>Taken in all</td><td>${$(sc.take)}</td></tr><tr><td>In the purse</td><td>${$(sc.wealth)}</td></tr>
    <tr><td>Legend</td><td>${sc.legend}</td></tr><tr><td>Townsfolk killed</td><td>${sc.killed}</td></tr>
    <tr><td>Family</td><td>${sc.familyAlive ? 'alive' : 'not all alive'}</td></tr></table>
    ${sc.dead.length ? `<h3 style="margin-top:10px">Died in your service</h3><p>${sc.dead.map(esc).join(', ')}</p>` : ''}
    <button class="btn block" data-act="new">Ride again</button></div>
    ${o.kind === 'retired' ? familyCard() : ''}`;
}

// ---- render and events --------------------------------------------------------

function render() {
  if (!S) { app.innerHTML = titleScreen(); return toast(); }
  const v = view(S);
  let body;
  if (U.screen === 'help') body = helpScreen();
  else if (U.screen === 'job' && !v.outcome) body = jobScreen(v);
  else if (U.screen === 'lielow' && !v.outcome) body = lieLowScreen(v);
  else if (U.screen === 'cover' && !v.outcome) body = coverScreen(v);
  else if (U.screen === 'result') body = seasonTab(v);
  else if (U.tab === 'gang' && !v.outcome) body = gangTab(v);
  else if (U.tab === 'map') body = mapTab(v);
  else if (U.tab === 'news') body = newsTab(v);
  else body = seasonTab(v);
  app.innerHTML = bar(v) + body + tabs();
  toast();
}

function toast() {
  document.querySelector('.toast')?.remove();
  if (!U.toast) return;
  const d = document.createElement('div');
  d.className = 'toast';
  d.setAttribute('role', 'status');
  d.textContent = U.toast;
  document.body.appendChild(d);
  U.toast = null;
  setTimeout(() => d.remove(), 3500);
}

function defaultPlan() {
  const v = view(S);
  const crew = {};
  const others = v.gang.filter((m) => !m.leader && !m.wounded);
  const byNerve = [...others].sort((a, b) => b.nerve - a.nerve);
  for (const m of v.gang) crew[m.id] = m.leader ? 'street' : 'stay';
  if (byNerve[0]) crew[byNerve[0].id] = 'inside';
  if (byNerve[1]) crew[byNerve[1].id] = 'inside';
  const rest = others.filter((m) => crew[m.id] === 'stay').sort((a, b) => b.horse - a.horse);
  if (rest[0]) crew[rest[0].id] = 'horses';
  if (!byNerve[0]) crew.me = 'inside';
  const def = targetDef(U.target);
  const hs = (h) => (S.sym[h.id === 'farm' ? S.home : h.id] ?? 0) + (h.own ? 20 : 0);
  const hide = hideouts(S, def).filter((h) => !h.lock).sort((a, b) => hs(b) - hs(a))[0];
  return { crew, approach: def.kind === 'bank' ? 'quiet' : 'bold', hideout: hide?.id ?? null, cut: 'even' };
}

app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act],[data-tab]');
  if (!el || el.disabled) return;
  if (el.dataset.tab) { U.tab = el.dataset.tab; U.screen = null; window.scrollTo(0, 0); return render(); }
  const d = el.dataset;
  switch (d.act) {
    case 'new': S = null; U.cr = { seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, first: '', last: '', background: 'bushwhacker', home: 'clay', bonus: 'horse', companions: ['brother', 'cousin', 'warfriend'] }; break;
    case 'cr-bg': {
      U.cr.background = d.v;
      const want = backgroundOf(d.v).companions;
      while (U.cr.companions.length > want) U.cr.companions.pop();
      break;
    }
    case 'cr-home': U.cr.home = d.v; break;
    case 'cr-bonus': U.cr.bonus = d.v; break;
    case 'cr-comp': {
      const list = U.cr.companions;
      const want = backgroundOf(U.cr.background).companions;
      if (list.includes(d.v)) U.cr.companions = list.filter((x) => x !== d.v);
      else if (list.length < want) list.push(d.v);
      else U.toast = `You can take ${want}. Unpick one first.`;
      break;
    }
    case 'cr-cancel': U.cr = null; break;
    case 'cr-start':
      try { S = newGame(U.cr.seed, {}, U.cr); U.cr = null; save(); Object.assign(U, { tab: 'season', screen: null, target: null, county: null }); }
      catch (e) { U.toast = e.message; }
      break;
    case 'buy': return doAct({ type: 'buy', id: d.id, item: d.item });
    case 'doctor': return doAct({ type: 'doctor', id: d.id });
    case 'house': return doAct({ type: 'house', county: d.v });
    case 'bribe': return doAct({ type: 'bribe', county: d.v });
    case 'marry': return doAct({ type: 'marry' });
    case 'asset': return doAct({ type: 'asset', id: d.v });
    case 'hush': return doAct({ type: 'hush', id: d.id });
    case 'county': U.county = d.id; break;
    case 'continue': S = load(); break;
    case 'import': try { S = fromCode(document.getElementById('code-in').value); save(); } catch (e) { U.toast = e.message; } break;
    case 'quit': S = null; break;
    case 'help': U.screen = 'help'; break;
    case 'done': U.screen = null; break;
    case 'back': U.screen = null; U.target = null; break;
    case 'screen': U.screen = d.screen; U.target = null; U.hide = null; U.give = 0; break;
    case 'pick': U.target = d.id; U.plan = defaultPlan(); U.plan2 = null; break;
    case 'untarget': U.target = null; break;
    case 'scout': return doAct({ type: 'scout', target: d.id });
    case 'role': U.plan.crew[d.id] = d.role; break;
    case 'approach': U.plan.approach = d.v; break;
    case 'hide': U.plan.hideout = d.v; break;
    case 'cut': U.plan.cut = d.v; break;
    case 'ride': {
      const crew = Object.entries(U.plan.crew).filter(([, r]) => r !== 'stay').map(([id, role]) => ({ id, role }));
      const second = secondPlan();
      U.plan2 = null;
      return doAct({ type: 'job', target: U.target, crew, approach: U.plan.approach, hideout: U.plan.hideout, cut: U.plan.cut, ...(second ? { second } : {}) });
    }
    case 'second': {
      if (U.plan2) { U.plan2 = null; break; }
      const t2 = targetList(S).find((t) => !t.lock && t.id !== U.target);
      if (!t2) { U.toast = 'There is no other target open this season.'; break; }
      const v2 = view(S);
      const hide = hideouts(S, targetDef(t2.id)).find((h) => !h.lock);
      const crew = {};
      for (const m of v2.gang) if (!m.leader && U.plan.crew[m.id] === 'stay') crew[m.id] = 'stay';
      crew[v2.lieutenant] = 'street';
      const spare = v2.gang.filter((m) => !m.leader && U.plan.crew[m.id] === 'stay' && m.id !== v2.lieutenant).sort((a, b) => b.nerve - a.nerve);
      if (spare[0]) crew[spare[0].id] = 'inside';
      if (spare[1]) crew[spare[1].id] = 'horses';
      U.plan2 = { target: t2.id, crew, approach: 'quiet', hideout: hide?.id ?? 'farm' };
      break;
    }
    case 'target2': {
      U.plan2.target = d.v;
      const h = hideouts(S, targetDef(d.v)).find((x) => !x.lock);
      U.plan2.hideout = h?.id ?? U.plan2.hideout;
      break;
    }
    case 'role2': U.plan2.crew[d.id] = d.role; break;
    case 'approach2': U.plan2.approach = d.v; break;
    case 'hide2': U.plan2.hideout = d.v; break;
    case 'lieutenant': return doAct({ type: 'lieutenant', id: d.id });
    case 'back': return doAct({ type: 'back', county: d.v });
    case 'hidepick': U.hide = d.v; break;
    case 'give': U.give = Number(d.v); break;
    case 'lielow': return doAct({ type: 'lielow', at: d.v, give: U.give, seasons: Number(d.n || 1) });
    case 'answer': return doAct({ type: 'answer', choice: d.v });
    case 'cover': return doAct({ type: 'cover', place: d.v });
    case 'retire': return doAct({ type: 'retire' });
    case 'wait': return doAct({ type: 'wait', seasons: Number(d.n || 1) });
    case 'rideagain': return doAct({ type: 'rideagain' });
    case 'letter': return doAct({ type: 'letter' });
    case 'bonus': return doAct({ type: 'bonus', id: d.id, amount: 100 });
    case 'dismiss': return doAct({ type: 'dismiss', id: d.id, stake: !!d.stake });
    case 'confirm': U.confirm = d.id; break;
    case 'unconfirm': U.confirm = null; break;
    case 'kill': return doAct({ type: 'kill', id: d.id });
    case 'recruit': return doAct({ type: 'recruit', id: d.id });
    case 'code': U.showCode = !U.showCode; break;
    case 'copy-family': {
      const box = document.getElementById('family-code');
      const done = () => { U.toast = 'Copied.'; toast(); };
      navigator.clipboard?.writeText(box.value).then(done).catch(() => { box.select(); U.toast = 'Selected: copy it from the box.'; toast(); });
      return;
    }
    case 'theme': {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark';
      lsSet('outlaw.theme', document.documentElement.dataset.theme);
      break;
    }
  }
  if (['pick', 'untarget', 'screen', 'back', 'help', 'done'].includes(d.act)) window.scrollTo(0, 0);
  render();
});

// Names are typed, not clicked: keep them in the creation state as they change.
app.addEventListener('input', (ev) => {
  if (!U.cr) return;
  if (ev.target.id === 'cr-first') U.cr.first = ev.target.value;
  if (ev.target.id === 'cr-last') U.cr.last = ev.target.value;
});
// A surname changes your brother's name. Redraw only the companions, never the
// fields: a full redraw would drop the keyboard on a phone mid-typing.
app.addEventListener('change', (ev) => {
  if (U.cr && ev.target.id === 'cr-last') document.getElementById('cr-comps').innerHTML = companionsHtml(U.cr);
});

const theme = lsGet('outlaw.theme');
if (theme) document.documentElement.dataset.theme = theme;
render();
// Exposed for the smoke test only.
globalThis.__outlaw = { get state() { return S; } };
