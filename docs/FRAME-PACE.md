# Frame: pace, the quiet years, and more to decide

## The author's request (2026-10-28, after playing the sandbox build)

> "Continue [increasing] the depth and possibilities. We should increase the speed
> of time or something, it dragged trying to get to 73. And the 15 months of
> quiet life is boring"

## The problems

- **Dead seasons.** Between jobs a season of lying low was a screen of choices that
  changed nothing, then a report that said little. Before the trains open (1873)
  there were only banks and stagecoaches.
- **The quiet years were a button.** Retiring needs 10 to 20 quiet seasons, each one
  a tap on "Another quiet season" with nothing to decide.
- **Decisions only came from the season action.** Nothing happened to you that asked
  a question.

## Design

**1. Lie low for a year.** "Lie low" gets a second button: *For a year*. It runs up
to four seasons at the same hideout and stops early, after the season in which
anything happens: an incident that needs an answer, a warning, a raid, a known
man looking for you, a tip, a state item that changes the numbers, or Northfield.
One report covers the stretch.

**2. The quiet years, a year at a time.** Retired, you play a year per tap. Each
year brings one decision from a table of retirement incidents, real to the
period:

| Incident | Choices |
|---|---|
| An old friend writes for money | Send $300 / refuse (he may talk) / move house ($200, cover falls) |
| A man in the feed store looks at you twice | Move ($200, cover falls) / stay (more chance you are recognised) |
| Grain futures (Jesse James lost money speculating) | Put in $1,000 (half the time it doubles) / stay out |
| The itch: an old acquaintance has a job | Ride once more (the quiet years start again) / say no |
| A child is sick | A doctor, $100 / nurse them yourself (a small chance you lose the child) |
| The church wants Mr. Howard as a deacon | Accept (cover +15) / decline |
| Pinkerton circulars with a sketch of you | Stay indoors a season (a season's income lost) / carry on |

**3. Incidents while riding.** Most seasons something asks a question, before you
choose the season's action. Each choice says what is at stake, computed from what
it does. 16 incidents, gated by year, place and state:

- A widow's mortgage (pay $200: sympathy +8 in the county / refuse).
- A sheriff wants a cut to look away (pay $150 a season of his heat / refuse / threaten him: heat, legend).
- A newspaperman wants an interview (legend +6 and reward +$400 / refuse).
- Two of your men quarrel (side with one: he +10, the other -10 / make them shake: both -3).
- Horse races at the county fair (bet $100: win $200 or lose it; legend +2 either way).
- A Union veteran recognises you in town (pay him $100 / threaten him: heat +20 / ride on: reward +$300).
- A Pinkerton man wants to sell names (pay $200: learn who has been approached / refuse).
- A wounded stranger at the safe house, an old bushwhacker (take him in: a recruit / send him on).
- A tip, paid for or not: the army paymaster's wagon, the county tax collector, a
  Missouri River steamboat, the Kansas City Exposition gate (1872). Each is a
  one-season target.
- A girl from home wants to marry one of your men (let him: +15, but he wants out
  sooner / forbid it: -10).
- A preacher denounces you from the pulpit (donate $100 to his church: sympathy +5 / ignore: -3).
- A railroad agent offers to tell you which trains carry money (from 1873: $300 for a scouted train target this year).

**4. Tip jobs: one season, before the trains.**

| Target | Where | Cash | Guard / town | Note |
|---|---|---|---|---|
| Army paymaster's wagon | Platte road (Platte, hide via Clay) | $3,000-8,000 | 2 / 0 | Southern counties cheer; the reward climbs |
| County tax collector | Daviess | $800-2,500 | 0 / 0 | Robbing the tax man is popular |
| Steamboat at the Lexington landing | Lafayette | $1,500-5,000 | 1 / 1 | Passengers' money: locals lose too |
| Kansas City Exposition gate | Jackson, autumn 1872 | $1,000-3,000 | 1 / 2 | The crowd; a child was shot here in 1872 |

## What will be measured

- Taps to reach 1873 for a careful player (by season actions): before and after.
- Taps in the quiet years: before (one per season) and after (one per year).
- Win rate stays 15-20% for the reference bot; re-tune if not.
- Every incident effect is read (an unknown effect key fails the build).

## Measured (as built)

- **Quiet years:** with peak legend 60, a retirement took 14.4 taps a season at a
  time; a year at a time it takes 6.0, of which 2.6 are questions (40 seeds).
- **Lying low for a year:** with money in the purse, 198 of 200 stretches ran the
  full four seasons; the other two stopped for a known man looking for you. Broke,
  a stretch stops at the lean season (that is worth stopping for).
- **First cut was too busy:** with a question in 55% of seasons, no stretch ever
  finished a year (0 of 30). Now: 30% a season while riding, never within two
  seasons of the last, and questions held back during a stretch arrive as one
  when it ends.
- **Balance** (200 seeds, reference bot): 18.0% retired (SE 2.7), 33.5% killed,
  32.5% captured; without the end-game purchases 6.0%. In the 15-20% band.
