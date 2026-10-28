# Frame: sandbox, upgrades, map, state news

## The author's request (2026-10-28, after playing the first build)

> "Definitely needs something to do with the money, I'd like it to be more
> sandbox, where you make your character, start with 2 or 3 other family members
> or friends, then build up your gang and upgrade with better horses/guns/
> safehouses/etc. improve the map visual, and give the news more life with reports
> on the state in general (not too much tho)"

## The problem with the first build

- Money had nowhere to go. Careful bots ended with a median $14,000 unspent.
- You were Jesse James with the full gang on day one, so there was no rise.
- The map was nine grey boxes.
- The news was only your own jobs and a handful of dated anchors.

## Design

**Making the character.** First name and surname; a background; a home county;
one bonus point; then 3 of 5 companions.

| Background | Gives | Costs |
|---|---|---|
| Rode with Quantrill | Gun +1, legend 15, Southern counties +5 | A $300 reward already on you |
| Farmer's son | Horse +1, home county +10, $200 more | Nothing |
| Confederate cavalry | Nerve +1, companions start 10 loyalty higher | Nothing |
| Drifter | $600 more, 4 companions | Home county -10, nobody owes you anything |

Companions are generated: a brother and a cousin (your kin: they never sell
you), a man from the war, a neighbour's son, a hired hand. Each has stats and
maybe a trait.

**Building the gang.** Recruits come looking for you each season. More come, and
better ones, as your legend grows. The historical men (the Youngers, Clell
Miller, Charlie Pitts, Bill Chadwell, Dick Liddil, the Fords) turn up in their
years as "known men". Riding builds skill: a man who comes through a job unhurt
may improve at the work he did (up to 4).

**Outfitting (the money sink).**

| Item | Cost | Effect |
|---|---|---|
| Good saddle horse | $120 | +0.5 horse (riding, holding horses, outrunning posses) |
| Blooded Kentucky horse | $350 | +1 horse |
| Brace of Navy Colts | $80 | +0.5 gun |
| Winchester '73 and a Colt (from 1873) | $250 | +1 gun |
| Safe house | $400, then $20 a season to the family that keeps it | Hide there down to sympathy 15 (not 35); no fee; half the informer risk |
| A hidden room and fresh horses | $500 more | A quarter of the informer risk; posses catch you less often when you run there |
| Pay off a sheriff | $8 per point of heat (Union counties double) | Halves the county's heat |
| A doctor | $100 | A wounded man rides again next season |

Gear stays with the man. Kit is lost when he dies, is taken, or leaves. A
safe house is lost if a posse raids you there.

**Family and quitting.** Your mother and a younger brother live on the farm in
your home county. Marrying costs $300 and is a choice, not a date. Children come
after. Retiring needs a wife; the rest is as before.

**The map.** The real county layout (Buchanan, DeKalb, Daviess; Clinton,
Caldwell; Platte, Clay, Ray; Jackson, Lafayette). The Missouri River down the
Kansas line and east past Kansas City. Four railroads drawn where they ran.
Towns, your farm, your safe houses, posse heat. Tap a county for its details and
what you can buy there.

**State news.** At most one item a season under "The State": real events from
1866 to 1882 in their seasons (the test oath, the Hannibal Bridge, the Panic of
1873, the Grange, the 1875 amnesty bill, the 1877 strike, Crittenden). A few move
numbers, and the item says how:

| Event | Effect |
|---|---|
| Panic of 1873 | Bank cash x0.7 in 1873 and 1874 |
| Grange movement, 1874-76 | Robbing a train pleases Southern counties twice as much |
| The amnesty bill, 1875 | +5 sympathy everywhere if your legend is 40 or more |
| The 1877 railroad strike | +3 sympathy everywhere for train jobs that year |

Otherwise, on about one season in three, a quiet line about wheat prices, a
county election, the weather.

## What will be measured

- Median purse at the end (the first build: about $14,000 unspent).
- Whether a bot that buys gear does better than one that never does, on the same
  seeds.
- Win rates on every policy, against the first build.
- Every new knob through the inert check.
