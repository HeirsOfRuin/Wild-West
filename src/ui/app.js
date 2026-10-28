// The page. It reads the engine and computes nothing: every number on screen
// comes from derive.js (view, forecast, targetList) or the engine's own state.

import { newGame, dateOf, yearOf, SAVE_KEY, serialize, deserialize, toCode, fromCode, K } from '../engine/state.js';
import { act } from '../engine/season.js';
import { view, targetList, forecast, hideouts, band } from '../engine/derive.js';
import { targetDef } from '../engine/job.js';
import { retireNeeded } from '../engine/ending.js';
import { COUNTIES, CASH_BAND } from '../data/world.data.js';
import { TRAITS, FAMILY } from '../data/gang.data.js';
import { CONFIG } from '../data/config.data.js';
import { lsGet, lsSet, STORAGE_OK } from './storage.js';
import { mapSvg } from './map.js';

const app = document.getElementById('app');
let S = null; // the game
const U = { tab: 'season', screen: null, target: null, plan: null, give: 0, confirm: null, toast: null, showCode: false };

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
    <div class="date"><span>${v.date}</span><button class="help-link" data-act="help">How it works</button></div>
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
  return `<nav class="tabs">${t('season', 'Season')}${t('gang', 'Gang', sus)}${t('map', 'Map')}${t('news', 'News')}</nav>`;
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
    ${events(r.events)}
  </article>`;
}

function lockLine(why) { return why ? `<div class="lock">${esc(why)}</div>` : ''; }

// ---- screens --------------------------------------------------------------------

function titleScreen() {
  const saved = load();
  return `<div class="title">
    <h1>Dead or Alive</h1>
    <div class="sub">Missouri, 1866–1882</div>
    <div class="rule"></div>
    <p>You lead a band of outlaws after the war. Rob banks, trains and stagecoaches. Keep the counties on your side. Watch your own men. Nobody rides forever.</p>
    <div class="btns" style="justify-content:center">
      ${saved && !saved.outcome ? `<button class="btn" data-act="continue">Continue (${dateOf(saved.t)})</button>` : ''}
      <button class="btn ${saved && !saved.outcome ? 'secondary' : ''}" data-act="new">New game</button>
    </div>
    ${STORAGE_OK ? '' : '<p class="small">This browser will not keep a save here. Use the save code on the News tab to keep your game.</p>'}
    <details style="margin-top:24px;text-align:left"><summary>Load a save code</summary>
      <textarea id="code-in" placeholder="OUTLAW1.…"></textarea>
      <button class="btn small" data-act="import">Load</button></details>
  </div>`;
}

function seasonTab(v) {
  if (v.outcome) return endScreen(v);
  const parts = [];
  if (S.report && U.screen === 'result') {
    parts.push(`<h2>${esc(dateOf(S.report.t))}</h2>${paper(S.report)}<button class="btn block" data-act="done">On to ${esc(v.date)}</button>`);
    return parts.join('');
  }
  if (S.report) parts.push(`<details><summary>Last season: ${esc(dateOf(S.report.t))}</summary>${paper(S.report)}</details>`);
  parts.push(`<h2>${v.date}: what will you do?</h2>`);
  if (v.retired) {
    const left = retireNeeded(S) - (S.t - v.retired.since);
    parts.push(`<div class="card"><h3>Mr. Howard's quiet life</h3>
      <p>${left} more quiet season${left === 1 ? '' : 's'} and the world forgets you. It costs ${$(K(S, 'retireCost'))} a season. Old friends who know where you live are the danger.</p>
      <div class="btns"><button class="btn" data-act="wait">Another quiet season</button>
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
    <div class="card forecast"><h3>As far as you can judge${f.scouted ? '' : ' (not scouted)'}</h3>
      <div class="line"><span>The alarm goes up first</span><span>${f.words.alarm}</span></div>
      <div class="line"><span>Somebody is killed (cashier or townsman)</span><span>${f.words.kill}</span></div>
      <div class="line"><span>One of you is hit in the street</span><span>${f.words.hit}</span></div>
      <div class="line"><span>The posse catches you on the road</span><span>${f.words.catch}</span></div>
      <div class="line"><span>You are killed or taken</span><span>${band(f.mid.leaderRisk)}</span></div>
      <div class="line"><span>Likely take</span><span>${$(f.take[0])}${Math.round(f.take[0]) === Math.round(f.take[1]) ? '' : `–${$(f.take[1])}`}</span></div>
      <div class="line"><span>A share, about</span><span>${$(f.shareEach)}</span></div>
      ${lockLine(f.problem)}
      <button class="btn danger block" data-act="ride" ${f.problem ? 'disabled' : ''}>Ride</button>
    </div>`;
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
      <button class="btn block" data-act="lielow" data-v="${sel}">Lie low for the season</button></div>`;
}

function coverScreen(v) {
  return `<button class="btn secondary small" data-act="back">Back</button><h2>Live as Mr. Howard</h2>
    <p class="small">Cover grows each season you live it, and is lost if you move. Riding out on a job costs ${K(S, 'coverJobLoss')} cover. The family comes with you. Men left idle at home grow restless. Recognition depends on your legend and your cover.</p>
    ${v.coverOptions.map((o) => `<div class="card ${o.lock ? 'locked' : ''}"><div class="row"><h3>${esc(o.name)}</h3><span class="small">${$(o.cost)} a season</span></div>
      <div class="small">Cover +${K(S, 'coverGain')[o.id]} a season · recognised: ${band(v.risks.recognise[o.id])}${o.id === 'nashville' ? ' · out of the state: the Pinkertons lose you fastest' : ''}${v.cover.place === o.id ? ` · <b>your cover here: ${v.cover.level}</b>` : ''}</div>
      ${lockLine(o.lock)}<button class="btn block" data-act="cover" data-v="${o.id}" ${o.lock ? 'disabled' : ''}>Live here this season</button></div>`).join('')}`;
}

function gangTab(v) {
  const recruits = v.recruits;
  return `<h2>The gang</h2>
    <p class="small">You cannot see what a man thinks, only how he seems. New men are hard to read; the longer he rides with you, the truer the read. Broke men, idle men and frightened men turn. A share, a bonus or a stake to go home on buys goodwill.</p>
    ${v.gang.map((m) => `<div class="card"><div class="row"><h3>${esc(m.name)}</h3><span class="small">${m.leader ? 'You' : `${m.mood.word}${m.mood.readable ? '' : ' (hard to read)'}`}</span></div>
      <div class="skills">Gun ${m.gun} · Nerve ${m.nerve} · Horse ${m.horse}${m.leader ? '' : ` · pocket ${$(m.pocket)}`}</div>
      <div>${m.traits.map((t) => `<span class="tag">${t}</span>`).join('')}${m.kin && !m.leader ? `<span class="tag">${m.kin === 'james' ? 'your kin' : `${m.kin} kin`}</span>` : ''}${m.wounded ? '<span class="tag bad">wounded</span>' : ''}${m.suspected ? '<span class="tag warn">suspected</span>' : ''}</div>
      ${m.traits.map((t) => `<div class="small">${t}: ${esc(TRAITS[t])}</div>`).join('')}
      ${m.leader ? '' : U.confirm === m.id ? `<p class="blood">Kill ${esc(m.short)}? Every man will fear you, his kin may ride off, and the counties will hear of it.</p>
        <div class="btns"><button class="btn danger small" data-act="kill" data-id="${m.id}">Do it</button><button class="btn secondary small" data-act="unconfirm">No</button></div>`
      : `<div class="btns">
        <button class="btn small secondary" data-act="bonus" data-id="${m.id}" ${v.purse < 100 ? 'disabled' : ''}>Pay him ${$(100)}</button>
        <button class="btn small secondary" data-act="dismiss" data-id="${m.id}" data-stake="1" ${v.purse < K(S, 'stake') ? 'disabled' : ''}>Send home with ${$(K(S, 'stake'))}</button>
        <button class="btn small secondary" data-act="dismiss" data-id="${m.id}">Send home with nothing</button>
        <button class="btn small secondary" data-act="confirm" data-id="${m.id}">Kill him</button></div>`}
    </div>`).join('')}
    <h2>Men looking for you</h2>
    ${recruits.length ? recruits.map((r) => `<div class="card ${r.lock ? 'locked' : ''}"><h3>${esc(r.name)}</h3><p>${esc(r.pitch)}</p>${lockLine(r.lock)}
      <button class="btn small" data-act="recruit" data-id="${r.id}" ${r.lock ? 'disabled' : ''}>Take him on (${$(K(S, 'recruitCost'))})</button></div>`).join('')
      : `<p class="small">Nobody yet. New men come looking as the years pass and your name spreads.</p>`}
    ${v.gone.length ? `<h2>Gone</h2><ul class="events">${v.gone.map((g) => `<li class="${g.status === 'dead' ? 'bad' : ''}">${esc(g.name)}: ${{ dead: 'dead', captured: 'in prison', gone: 'gone home', turned: 'turned on you' }[g.status]}</li>`).join('')}</ul>` : ''}
    <h2>Family</h2>
    <ul class="events">${FAMILY.filter((f) => yearOf(S.t) >= f.from).map((f) => { const st = S.family.find((x) => x.id === f.id); return `<li class="${st.alive ? '' : 'bad'}">${esc(f.name)}, your ${f.rel}${st.alive ? (st.injured ? ' (maimed)' : '') : ' (dead)'}</li>`; }).join('')}
    </ul><p class="small">Family lives ${S.familyAt === 'farm' ? 'at the farm in Clay County' : `with you in ${coverName(S.familyAt)}`}.</p>`;
}

function mapTab(v) {
  return `<h2>Western Missouri</h2>
    ${mapSvg(v, S.where)}
    <div class="key"><span><i style="background:var(--sym-hi)"></i>Will hide you</span><span><i style="background:var(--sym-mid)"></i>Wavering</span><span><i style="background:var(--sym-lo)"></i>Hostile (no safe house under ${K(S, 'safeSym')})</span><span>▲ posse heat</span><span>★ you</span></div>
    <p class="small">Sympathy falls when you rob a county's own bank, kill a townsman or a cashier, and as the war fades. It rises with generosity, with Pinkerton outrages, and in Southern counties when you rob the railroads or write to Edwards.</p>
    ${COUNTIES.map((c) => `<div class="card"><div class="row"><h3>${c.name} County</h3><span class="small">${c.town}</span></div>
      <div class="small">Sympathy ${v.sym[c.id]} · heat ${v.heat[c.id]} · informer risk ${band(v.risks.inform[c.id])} · ${v.safe[c.id] ? 'safe houses' : 'no safe house'}</div>
      <div class="meter"><i style="width:${v.sym[c.id]}%"></i></div><p class="small">${esc(c.note)}</p></div>`).join('')}`;
}

function newsTab(v) {
  const log = [...S.log].reverse().slice(0, 60);
  return `<h2>The record</h2>
    <ul class="events">${log.map((e) => `<li class="${e.kind}"><span class="t">${dateOf(e.t)}${e.title ? ` · ${esc(e.title)}` : ''}</span>${esc(e.text)}</li>`).join('')}</ul>
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
  <div class="card"><h3>Ending</h3><p>Killed, captured or betrayed ends it. To win, retire from ${C.retireFrom}: the gang gone, cover ${C.retireNeedCover}+, ${$(C.retireNeedPurse)} saved, the family alive; then survive ${C.retireSeasons} quiet seasons, plus one for every ${C.retireSeasonsPerLegend} points of your peak legend. After ${C.endYear} the era is over.</p></div>`;
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
    <button class="btn block" data-act="new">Ride again</button></div>`;
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
  if (!byNerve[0]) crew.jesse = 'inside';
  const def = targetDef(U.target);
  const hide = hideouts(S, def).filter((h) => !h.lock).sort((a, b) => (S.sym[b.id === 'farm' ? 'clay' : b.id] ?? 0) - (S.sym[a.id === 'farm' ? 'clay' : a.id] ?? 0))[0];
  return { crew, approach: def.kind === 'bank' ? 'quiet' : 'bold', hideout: hide?.id ?? null, cut: 'even' };
}

app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act],[data-tab]');
  if (!el || el.disabled) return;
  if (el.dataset.tab) { U.tab = el.dataset.tab; U.screen = null; window.scrollTo(0, 0); return render(); }
  const d = el.dataset;
  switch (d.act) {
    case 'new': S = newGame((Date.now() ^ (Math.random() * 1e9)) >>> 0); save(); Object.assign(U, { tab: 'season', screen: null, target: null }); break;
    case 'continue': S = load(); break;
    case 'import': try { S = fromCode(document.getElementById('code-in').value); save(); } catch (e) { U.toast = e.message; } break;
    case 'quit': S = null; break;
    case 'help': U.screen = 'help'; break;
    case 'done': U.screen = null; break;
    case 'back': U.screen = null; U.target = null; break;
    case 'screen': U.screen = d.screen; U.target = null; U.hide = null; U.give = 0; break;
    case 'pick': U.target = d.id; U.plan = defaultPlan(); break;
    case 'untarget': U.target = null; break;
    case 'scout': return doAct({ type: 'scout', target: d.id });
    case 'role': U.plan.crew[d.id] = d.role; break;
    case 'approach': U.plan.approach = d.v; break;
    case 'hide': U.plan.hideout = d.v; break;
    case 'cut': U.plan.cut = d.v; break;
    case 'ride': {
      const crew = Object.entries(U.plan.crew).filter(([, r]) => r !== 'stay').map(([id, role]) => ({ id, role }));
      return doAct({ type: 'job', target: U.target, crew, approach: U.plan.approach, hideout: U.plan.hideout, cut: U.plan.cut });
    }
    case 'hidepick': U.hide = d.v; break;
    case 'give': U.give = Number(d.v); break;
    case 'lielow': return doAct({ type: 'lielow', at: d.v, give: U.give });
    case 'cover': return doAct({ type: 'cover', place: d.v });
    case 'retire': return doAct({ type: 'retire' });
    case 'wait': return doAct({ type: 'wait' });
    case 'rideagain': return doAct({ type: 'rideagain' });
    case 'letter': return doAct({ type: 'letter' });
    case 'bonus': return doAct({ type: 'bonus', id: d.id, amount: 100 });
    case 'dismiss': return doAct({ type: 'dismiss', id: d.id, stake: !!d.stake });
    case 'confirm': U.confirm = d.id; break;
    case 'unconfirm': U.confirm = null; break;
    case 'kill': return doAct({ type: 'kill', id: d.id });
    case 'recruit': return doAct({ type: 'recruit', id: d.id });
    case 'code': U.showCode = !U.showCode; break;
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

const theme = lsGet('outlaw.theme');
if (theme) document.documentElement.dataset.theme = theme;
render();
// Exposed for the smoke test only.
globalThis.__outlaw = { get state() { return S; } };
