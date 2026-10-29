# Dead or Alive: design and build record

Stages done in this first session: 1 (spec, `docs/SPEC.md`), 2 (kill gate, run on
the real engine rather than a separate prototype), 3 (this document) and 4
(engine, instruments, placeholder-quality UI, PWA). Stage 3 was not approved
before stage 4 was built; the author sent a one-page concept and the scope it
set was followed. Everything below is open to the author's veto.

## Stack

| Choice | Decision | Why |
|---|---|---|
| Shape | Vanilla ES modules, no build step, bundled to one file (shape B) | A simulation game; the engine runs headless in Node for bots and tests. Proven in Centennial Farm and The Lists. |
| Engine | Pure `(state, action) -> state`, no DOM, no `Math.random`, no `Date.now` | Bots, tests and saves depend on it. |
| Randomness | Named streams from (seed, season, label) (`src/engine/rng.js`, copied unchanged from Farmyard) | Nothing to save, nothing to reroll on reload. |
| Shown numbers | `src/engine/derive.js` only; the resolver and the forecast call the same formulas in `src/engine/odds.js` | Rule 1: one derivation per number. |
| Money | `src/engine/money.js` `pay()` writes the ledger in the same call | Purse == ledger is a test. |
| Saves | `outlaw.save.v1` key (a contract), `v` in the payload, migration chain, `OUTLAW1.` text code | Rule 9. |
| Dependencies | None. Playwright is preinstalled in cloud sessions for the smoke tests. | |

## Modules (import direction: data <- engine <- derive <- ui; sim reads derive)

| File | What |
|---|---|
| `src/data/world.data.js` | Counties, links, map grid, target kinds, 12 targets, Northfield |
| `src/data/gang.data.js` | 7 starting men, 7 recruits, traits, family |
| `src/data/config.data.js` | Every tuning number |
| `src/engine/state.js` | New game, clock, target rolls, belief vs truth, save versioning |
| `src/engine/odds.js` | The job formulas, shared by resolver and forecast |
| `src/engine/job.js` | The job resolver; its log is the report |
| `src/engine/gang.js` | Members, mood, recruiting, dismissal, loyalty, betrayal stages |
| `src/engine/pressure.js` | Posses, Pinkertons, reward, informers, recognition |
| `src/engine/season.js` | `act()`, free actions, the season pipeline in fixed order, history |
| `src/engine/ending.js` | Retirement conditions, score |
| `src/engine/derive.js` | `view()`, `targetList()`, `forecast()` |
| `src/ui/*` | The page; reads the engine, computes nothing |
| `sim/*` | Bots, batch runner, kill gate, inert check, tracer |
| `test/*` | Invariants and forecast agreement |

## How a job resolves (odds.js)

- **Alarm** (quiet only; bold is always loud): 6% + 16% per guard + 6% per man over
  four + heat/250 + 6% if not scouted + 30% on a train (the whistle), minus 7% per
  point of inside nerve over 1, minus 4% per street man (up to two).
- **Vault**: inside power = inside men + (their mean nerve - 1); need = guard (+1 on
  a train). Quiet and unseen: all of it if power >= need, else 60%. Quiet and seen:
  60%, 30% or nothing. Bold: 90% or 50%.
- **Killing inside**: low unless the alarm is up, the inside is outmatched, a
  hothead is inside, or you went in bold. A steady man lowers it.
- **The street** (only if the alarm is up): the town's power is its fight, cowed by
  street guns (bold cows harder). Each man's chance to be hit depends on it and his
  role. Hit men are wounded, killed, or (if there were too few horse-holders) left
  behind.
- **The road**: a posse forms from the alarm, the town, the guard, the heat and any
  killing; the chance it catches you falls with the sympathy of the county you
  leave and the one you run to, and with your riding.

The plan screen runs these same formulas on what you believe (a range if not
scouted) and shows the result in words ("unlikely", "even odds") plus a take range.

## Pressure, sympathy, loyalty (summary; numbers in config.data.js)

- Posse heat per county, halves each season. Pinkertons from 1874 or the first
  train: grow with legend, fade slowly (fastest when you are under cover in
  Nashville); their operations raid the farm once, approach the least loyal man,
  or send a detective. The reward barely fades; it drives informers (worse in
  hostile counties and with a drinker in the gang) and temptation.
- Sympathy drifts toward a baseline: the county's base, minus the war fading from
  1872, plus Edwards's letters (fading) and legend (more in Southern counties).
- Loyalty is hidden; a mood word is shown with noise that shrinks over 10 seasons.
  Broke, idle, frightened men lose loyalty; shares, pride, bonuses and stakes win
  it. Under 45, a man climbs the betrayal stages; at 2 he talks to the law (and may
  set up an ambush on a job he does not ride); at 3 he gives himself up and leads
  a posse to you, or, if ambitious (Bob Ford), shoots you at home. Signs show at
  stage 2, more often with Frank around or among friends. James kin never turn.

## Instruments

| Tool | Question | Asserts |
|---|---|---|
| `test/invariants.test.js` | Can the impossible happen? | Purse == ledger and never negative; byte-identical replays; every game ends; free actions do not move the clock; the dead and captured never ride; James kin never turn; saves round-trip; locked actions refuse with a reason |
| `test/forecast.test.js` | Does the plan screen tell the truth? | Forecast alarm within 3 SE + 1 point and take within 8% of 600 resolved jobs |
| `sim/run.js` | What happens across many games? | Refuses stalled or crashed runs |
| `sim/killgate.js` | Do the decisions matter? | Paired policies on the same seeds, every axis with its noise floor |
| `sim/inert.js` | Is any knob or trait decoration? | Byte-identical end state = inert = fail |
| `sim/trace.js` | What happened in this one game? | Season-by-season print |
| `tools/smoke.mjs` | Does the page work on a phone? | 390x844: no page errors, no sideways scroll, no raw tokens on any screen, a job runs, 24 seasons by clicking, a reload continues |
| `tools/check-bundle.mjs` | Do the builds work? | Single file from `file://` runs a job; the Pages build serves its manifest and icons, registers its worker, opens offline |

## Measurements (as built, this session)

Kill gate, 100 seeds per policy, same seeds (`node sim/killgate.js 100`). "Floor"
is the gap two rates need before it is a result (2 SE).

| Policy | Retired | Killed | Captured | Median years | Median jobs |
|---|---|---|---|---|---|
| careful (scouts, plans, retires from 1873 with $9,000 or in 1878) | 22% | 28% | 34% | 7.0 | 16 |
| noscout (same, never scouts) | 18% | 28% | 41% | 5.6 | 14 |
| bold-only | 0% | 20% | 43% | 11.3 | 7.5 |
| stayer (careful, never retires) | 0% | 44% | 50% | 7.0 | 17.5 |
| raider (bold, biggest target, every season) | 0% | 56% | 43% | 1.5 | 6 |

- Planning beats greed: raiders last 1.5 years vs 7; +28 points killed (floor 13). Real.
- Quitting pays: stayers are killed or taken 94% of the time vs 62%. Real.
- Scouting helps on every axis (retired +4, captured -7, legend peak 94 vs 80) but
  every gap is inside the noise floor at 100 seeds. An earlier build (before legend
  raised sympathy) measured it as real: retired 43% vs 32%, killed 11% vs 25%, at
  150 seeds. Not resolved for the current build; needs ~600 seeds.
- Bold is best somewhere: per-target forecasts show bold ahead of quiet on the
  guarded Hannibal & St. Joseph express, close on Blue Cut, behind on country banks.
  The careful bot uses bold occasionally (careful 22% vs quiet-only 21% retired).
- The forecast agrees with the resolver on jobs without an informer: alarm 10.1%
  forecast vs 10.5% resolved, take $4,408 vs $4,399 (1,221 jobs). Ambushes (3% of
  jobs) are deliberately invisible to the forecast and kill the leader 29% of the
  time.

Causes of death for the careful bot (150 seeds, before the last tuning pass):
on a job 12%, informer 13%, turncoat raid 7%, recognised under cover 5%.

After the loyalty-drift change (last change this session), `node sim/run.js 150`:

| Policy | Retired | Killed | Captured | Era ended | Median years | Median jobs |
|---|---|---|---|---|---|---|
| careful | 22.7% | 23.3% | 38.0% | 16.0% | 7.5 | 16 |
| noscout | 17.3% | 26.0% | 44.0% | 12.7% | 5.5 | 15 |
| stayer | 0% | 40.0% | 54.7% | 3.3% | 7.4 | 19 |
| raider | 0% | 55.3% | 43.3% | 1.3% | 1.5 | 6 |
| hermit (never rides) | 0% | 18.0% | 43.3% | 38.7% | 7.6 | 0 |

Balance impact of the drift: careful retirement unchanged (22% -> 22.7%, inside
1 SE of 3.4); careful deaths by turncoat fell (7% -> 1.3%) because left-out men
no longer sink without limit, while an idle gang still turns 53% of the time.
Scouting: died on a job 28.7% vs 38.7% without (gap 10, floor 10.9), still just
inside the noise.

## The sandbox round (docs/FRAME-SANDBOX.md)

You now make the outlaw and pick 3-4 companions. The gang grows from men who come
looking. Money buys gear, safe houses, sheriffs, a doctor and a wedding, and the
end game adds a farm, a business, a lawyer and money for old friends. The map uses
the real county layout, and one line of state news runs each season. The author
set a win target of 15-20%.

Final measurements, 200 seeds per policy, same seeds (`node sim/run.js 200`):

| Policy | Retired | Killed | Captured | Median years |
|---|---|---|---|---|
| careful (scouts, spends, buys the end game) | 20.0% | 32.0% | 30.0% | 7.0 |
| noendgame (careful, no farm/business/lawyer/hush) | 6.0% | 31.0% | 36.5% | 6.9 |
| plain (careful, never spends on anything) | 2.5% | 37.5% | 41.5% | 5.8 |
| noscout (careful, never scouts) | 18.0% | 39.5% | 30.5% | 5.5 |
| stayer (careful, never quits) | 0% | 51.5% | 46.0% | 7.0 |
| raider | 0% | 57.0% | 43.0% | 2.0 |

- Spending is what the money is for: plain 2.5%, gear and houses 6%, plus the
  end game 20%.
- Scouting no longer moves the win rate much (20% vs 18%), but it keeps you alive
  on jobs (killed 32% vs 39.5%).
- Inert check (`node sim/inert.js`): 0 of 91 knob settings inert. Hothead and
  ambitious changed none of the 12 whole games sampled (a hothead rarely goes
  inside; the Fords arrive late), so `test/traits.test.js` proves every trait with
  a scene.

## What the kill gate found and fixed (in order)

1. A careful bot retired after one $12,000 job in 1866 (85% "wins", 3.3 years).
   Retirement now opens in 1874 and needs $5,000; dismissing men without a stake
   breeds grudges.
2. Then it did three jobs and hid for twelve years (70%). City banks paid $15,000
   at little risk and hiding cost $65 a season. City banks are now guard 3 /
   fight 3, takes were cut toward the historical record, living is $100 a season
   plus $50 for a safe house, and legend never fades below 40% of its peak.
3. Then the bot accepted 7% death per job at the Kansas City bank: the forecast
   understated leader risk (3.7% shown vs 5.1% real). The fate terms were rewritten
   to match the resolver; robbed banks now add guards as well as rifles.
4. "Bold" was never chosen by a careful player: decoration. Bold now cows the town
   harder, kills less, and quiet train jobs face the whistle. Legend now raises
   sympathy (the concept's "high legend raises sympathy"), which gives bold a payoff.
5. Retirement was still 60%. The quiet years now scale with peak legend.

## Decisions log (newest first)

| Date | Decision |
|---|---|
| 2026-10-29 | **Lawmen, stories, two crews** (`docs/FRAME-DEPTH.md`). The author: "Go ahead with an 3" (read as all three). Careful bot 18.0% retired (200 seeds); two crews 11.5%, a deliberate trade. Found and fixed: the leader-risk forecast had ignored street risk since the sandbox round. |
| 2026-10-28 | **Pace and incidents** (`docs/FRAME-PACE.md`). The author: "increase the speed of time or something, it dragged trying to get to 73. And the 15 months of quiet life is boring." Lie low for a year in one tap; the quiet years a year at a time with a question most years (14.4 taps to 6.0); 19 incidents and 4 one-season tip jobs. Win rate 18.0% (200 seeds). |
| 2026-10-28 | **Win target 15-20%; realistic end-game purchases.** The author: "I'd like a win rate around 15-20%" and "bigger purchases that help the retirement end game, but keep it realistic". Farm, business, lawyer, hush money; quiet years 8 -> 10. Measured 20.0% (200 seeds, SE 2.8); first cut was 30.7%. |
| 2026-10-28 | **Sandbox.** The author: "more sandbox, where you make your character, start with 2 or 3 other family members or friends, then build up your gang and upgrade". Built as framed; the 1874 retirement lock became marriage. Careful retirement fell to 9-11% before the end-game round. |
| 2026-10-28 | **First playable built from the concept.** The author's brief: "Fights are rare, fast and deadly. Planning matters more than shooting." and "'Win': retire quietly ... This is rare and hard." Built to it; reference bot retires 22% (100 seeds), raiders never. The target win rate is the author's call (other games: 5-7% crowned, 25% centennial). |
| 2026-10-28 | **Retirement opens in 1874** (marriage to Zee). Kill gate: without it the first job in 1866 was enough. Alternative if the author dislikes a date lock: make the quiet years scale with reward as well as legend. |
| 2026-10-28 | **Player is Jesse James**, with the real gang and family. The concept says "modelled on"; a fictional leader is a small change (names in `gang.data.js`, text in `season.js` and `pressure.js`). |
| 2026-10-28 | **Northfield kept as a one-season offer** despite one-state scope; the town's real guard and fight are hidden behind Chadwell's rumour until scouted, and even scouted the time-lock story holds the vault shut. |

## Known gaps carried forward

- Not playtested by a human. Fun is unmeasured.
- The Bob Ford arc rarely fires: careful games end around 1873, and the Fords
  arrive in 1880. Measured betrayals by assassination: 0% careful, under 3% stayer.
  A later-start scenario (1879, the second gang) would put it in reach.
- Events are few: history anchors plus Pinkerton and betrayal events. No
  generated town incidents, no named cashiers beyond Gallatin.
- No art beyond the icon and the map. No sound.
- Scouting's value is unresolved at 100 seeds (see above).
- Pages deploys only from the default branch, and Pages must be switched on by hand.
