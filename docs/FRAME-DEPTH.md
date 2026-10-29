# Frame: lawmen with names, men with stories, two crews

## The author's request (2026-10-29)

Offered three ways to deepen the game (named lawmen; the men's own stories;
splitting the gang to run two jobs in a season), the author answered "Go ahead
with an 3", read as all three. They build on each other: a story can make a
man your lieutenant, and a lieutenant can lead the second crew.

## 1. The law has faces

**Sheriffs.** Each of the six counties has a named sheriff with a skill (1-3),
a grudge against you (0-100), and a lean (friendly, neutral or hostile).

| Field | What it does |
|---|---|
| skill | Adds 6 a point to posse strength for jobs in his county |
| lean: friendly | Posse strength -10 in his county; his heat fades twice as fast; paying him costs half |
| lean: hostile | Paying him costs 1.5x |
| grudge | +20 when you rob his county, +30 for a killing there, -5 a season. At 60 he will not take money, and he rides after you: +10 heat a season where you hide, if that is his county or next to it |

**Elections** every autumn of an even year (1866, 1868 ... 1880), as Missouri held
them. The sitting man loses one time in four, more if the county likes you and
he is hostile. The new man is friendly with a chance that grows with the county's
sympathy. You can **back a candidate** ($300, that autumn): the incumbent is more
likely to lose and his replacement more likely to be friendly.

**Killing a sheriff** (an incident, when a sheriff with a grudge closes in):
legend +6, reward +$2,000, sympathy -6 everywhere, heat 60 in the county, and the
next man starts with a grudge of 40. It happened: in March 1874, near Roscoe in
St. Clair County, the Youngers shot it out with Pinkerton operative Louis Lull and
former deputy sheriff Edwin Daniels; Lull, Daniels and John Younger died.

**Detectives.** When the Pinkertons are on you, one operative leads the hunt: a
name and a skill, in a county. Each season he moves one county toward where you
hide. When he is in your county the Pinkertons act more often (+20% a point of
skill), and their raids and infiltration come from him by name. If he is killed,
the agency sends another after two seasons, with a grudge.

## 2. The men have their own stories

Every man gets a story, or none. Each plays out as a question, once, when its
condition is met:

| Story | When | The question |
|---|---|---|
| wants to lead | 4+ jobs, gun or nerve 3+ | Make him your lieutenant (+15, he takes a double share) / refuse (-12; a man with a friend in the gang may leave with him) |
| a weakness for drink | drinker, after a job | Loose talk in a Liberty saloon: dry him out ($100, he sits out next season) / send him home / let it go (heat +15 where he drank) |
| family trouble | any time after 2 years | His mother is sick: send $200 (+12) / he goes home for a year (leaves, returns in 4 seasons) |
| an old score | bushwhacker companions and veterans | The militia captain who burned his family's farm lives in Ray County: help him (legend +4, heat +25, he +20) / refuse (-15) |
| saving for a farm | pocket over $1,500 | He wants out with his money: let him go with your blessing / ask him to stay one more year (-10) |

## 3. Two crews in one season

With a lieutenant, the job planner offers a **second crew**: men you do not take
yourself, under him, on a different target. Each crew is resolved by the same
resolver; the lieutenant stands in your place (if he is hit, he is hurt, not you).
You see a forecast for each. Afterwards the takes are pooled and the split is the
usual: a share each, the lieutenant double, one for the purse.

Why it is worth it: two takes in one season. Why it is not free: your best men are
split; the lieutenant has his own nerve and judgement; both counties heat up; you
are not there when it goes wrong.

## What will be measured

- The reference bot uses a lieutenant and second crews when it has one; same
  seeds with and without second crews: win rate, deaths, jobs, money.
- Win rate stays in 15-20%.
- Every new knob through the inert check; each story by a scene test.

## Measured (as built)

Reference set, 200 seeds each (`node sim/run.js 200`):

| Policy | Retired | Killed | Captured | Turncoat raids |
|---|---|---|---|---|
| careful (one crew) | 18.0% | 34.5% | 32.0% | 7.5% |
| twocrews (a lieutenant and a second crew whenever it pays, before 1874) | 11.5% | 36.0% | 33.5% | 9.5% |
| noendgame | 9.0% | 34.0% | 33.5% | 6.5% |
| plain (never spends) | 6.0% | 31.5% | 45.0% | 4.0% |
| stayer | 0% | 46.0% | 50.0% | 31.5% |
| raider | 0% | 56.5% | 43.5% | 0.5% |

**Two crews** bring in more (median take +9%) but double the reward and the heat, and
a bigger gang costs more in keep and gear. For a man who means to retire, that is a
bad trade (11.5% vs 18%); for a man who wants the money and the legend, it is the
way to get them. It is kept as a trade, not tuned away. The second crew pays you
a planner's share even when you do not ride.

**What the instruments found on the way:**

- The plan screen's "you are killed or taken" had ignored your street risk since
  the sandbox round: it still looked for the old leader id. It now matches what
  happens (12.7% shown vs 12.6% resolved on a bold city-bank job, 1,500 jobs); a
  test holds it there. With true risk the reference bot chose smaller jobs and
  never saved enough to quit, so its retirement plan was rewritten (quit at
  $5,500 from 1873, buying the farm); the quiet years went from 10 to 9 seasons.
- The first crew's job could close the second crew's hideout (a killing turns a
  county), which threw an error mid-season and ended one game in 200. The second
  crew now re-picks an open hideout or calls the job off, and says so.
- Men sent home by their stories soured too fast (turncoat raids 5.5% -> 25.8%). A
  man who left on good terms now only sours if he is broke and the reward passes
  $5,000.
- A man "away for a year" came back a season late. Fixed and tested.
- Four sheriffs named Garrett at once: sitting sheriffs no longer share a surname.
- Election news was too frequent (about 9 a game); only changes that matter to you
  reach the season's report.
- Inert check: 0 of 109 knob settings inert.
