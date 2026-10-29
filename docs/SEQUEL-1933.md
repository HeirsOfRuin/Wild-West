# The sequel: 1933 — frame for the author's sign-off

Stage 1 record for the second game. Nothing is built. The decisions in **Open
questions** are the author's to make before any code.

## The pitch

May 1933 to the end of 1934, the Midwest. The grandchild of a man who robbed banks
in Missouri sixty years ago and got away with it comes of age in the Depression,
when banks are foreclosing on farms and a bank robber can be a folk hero again. You
take after your grandfather. The question is the same one: how long you last and
who sells you. This time the law learns faster than you do: in fourteen months the
federal government goes from having no jurisdiction over bank robbery to hunting
you with a list, a radio net and the power to shoot.

## Why this period works as a game

- **A world that changes under you.** In 1933 a robber who crossed a state line was
  mostly out of reach; by mid-1934 federal agents could arrest, carry guns and
  pursue across states, and robbing a national bank was a federal crime. The rules
  of the game change in the middle of a career, by date, and the player feels it.
- **Sympathy has a new reason.** Banks failed by the thousand and foreclosed on
  farms; a man who robbed them could be cheered. Then the killing starts and the
  cheering stops.
- **Betrayal has a famous face.** Dillinger was sold by a woman who wanted to stay in
  the country (Ana Cumpănaș, "the woman in red", July 1934).

## Historical anchors (to be checked against sources before writing content)

| When | What | Game use |
|---|---|---|
| May 1933 | Dillinger paroled from the Indiana State Prison | The start: a man with friends inside |
| June 1933 | The Kansas City Massacre at Union Station | Federal pressure begins; the public turns |
| Sept 1933 | Ten men break out of Michigan City with guns smuggled in | A prison break as a job type |
| Oct 1933 | The Lima, Ohio jail break; Sheriff Jess Sarber killed | Breaking a man out; what a killing costs |
| Jan 1934 | FDIC insurance begins | Bank cash and public sympathy shift |
| Mar 1934 | Crown Point jail escape with a carved wooden gun; a stolen car across the Indiana line makes it federal | The state line as a rule that changes |
| Apr 1934 | Little Bohemia Lodge, Wisconsin: the raid kills a bystander and an agent | The law's mistakes as sympathy events |
| May-June 1934 | Federal crime bills: bank robbery federal; agents armed with arrest powers | The FBI track's big step |
| Late May 1934 | Plastic surgery on a wanted face | A late-game cover purchase |
| July 1934 | Betrayed outside the Biograph Theater, Chicago | The betrayal arc's model |
| 1934 | St. Paul's "layover" arrangement with the underworld ends | A safe city that stops being safe |

Dates are to the month and from general knowledge; each is to be checked against
a source (Bryan Burrough, *Public Enemies*, 2004, is the natural first reference)
before any of it is written into the game.

## What carries over (the family code)

The family code from *Dead or Alive* (`DOAFAM1.`) is optional. A player with one
starts as the founder's grandchild; a player without one makes a character.

| From the code | In 1933 |
|---|---|
| Founder's name and surname | The family name; the papers dig it up once you are known (legend starts higher, so does the reward) |
| `takesAfter` (gun, nerve or horse) | Your best skill (horse becomes driving) |
| Heirlooms | Your grandfather's revolver in a trunk: a small edge, and a story when the papers find it |
| Cash, farm, business | A start: a little money; a farm the bank is about to foreclose (the opening incident); a business front |
| Friends who kept faith | Their grandsons may come looking for you: loyal recruits |
| Men who sold him | Their grandsons may be informers, or turn up as the man who sells you |
| Sheriffs with a grudge | A lawman's grandson in the Bureau, who knows your name |
| Peak legend, townsfolk killed | How the family is remembered: folk hero or murderer's kin |

Without a code: a generated character and family, the same as creation in the
first game.

## What is the same engine, and what is new

| Kept (proven in the first game) | Changed for 1933 |
|---|---|
| Plan / scout / execute resolver with roles and a forecast from the same formulas | Roles: inside men, a wheelman (replaces horses), lookouts; cars instead of horses |
| Hidden loyalty, mood, stories, lieutenant, two crews | A girlfriend (a "moll") as a person in the story, with her own loyalty and her own reasons |
| Incidents with stakes worded from effects | New tables: foreclosures, radio bulletins, crooked police, the papers |
| Named lawmen | Local police and sheriffs, plus federal agents whose powers grow by date |
| Safe houses, gear, outfit | Tourist courts and lodges; cars (a Ford V-8 outruns most police cars); Thompsons; armour vests |
| Retirement as the rare win | Disappearing: a new face, a new name, Mexico or the West |
| Turns of one season | **Turns of one month** (the era is 20 months; Dillinger's whole run was about 14) |

**New systems the period needs:**

- **State lines.** The map is several states, not counties. Crossing a line shakes
  local pursuit early on; after mid-1934 it brings in the federal men instead.
- **The federal track.** One number that rises with your name and with dates:
  1933 (no jurisdiction, cooperation only), early 1934 (stolen cars across a line),
  May-June 1934 (bank robbery and assault on agents are federal; agents armed). The
  agents' skill and reach grow with it.
- **Radio.** Police radio spreads city by city; where it exists, the posse forms
  faster and the escape window shrinks. A purchase: a radio in your own car to hear
  the bulletins.
- **Public Enemy.** A ranking instead of legend: the higher you are, the more the
  public cheers, the more the reward, the more men want to join and to sell you.
- **Corruption.** Some cities and police can be bought (the St. Paul arrangement);
  the arrangement can end, by date or by your own killing.

## Scope of a first playable

Indiana, Illinois, Ohio, Wisconsin, Minnesota (5 states, about 12 towns and 2
cities, Chicago and St. Paul); 3 target kinds (banks, police arsenals for guns,
a jail to break a man out of); 6-8 named men; the federal track with its three
dates; radio by city; one betrayal arc (the woman in red); the family code read.

## The kill gate (before any UI)

The same as the first game: fixed policies on the same seeds, numbers only. It
must show that crossing a state line is a real decision that changes value by date,
that the federal track ends careers in 1934 that would have lasted in 1933, and
that disappearing is reachable but rare (the author's 15-20% band, unless he sets
another).

## Open questions for the author

1. **Real names or fictional?** The first game made you a fictional outlaw among
   real men. Same here (Dillinger, Nelson and Purvis as known men and lawmen), or
   fictional throughout?
2. **One month a turn?** The era is short; months give about 20 turns. Weeks would be
   too fine for a phone game; seasons too coarse for 1934.
3. **How dark?** The period's violence was public and ugly (bystanders, agents,
   the Kansas City Massacre). The first game shows the cost in plain words; the
   same here?
4. **Bonnie and Clyde?** They were in Texas and the Southwest, outside this map. A
   newspaper presence only, or a later map?
5. **A separate repository** (as each of the Workshop's games has had), with the
   shared engine parts copied and the family code as the only link?

## Decisions (2026-10-29)

The author: "ok, I am good with that" to the recommended answers.

| Question | Decision |
|---|---|
| Real names or fictional? | Real names (Dillinger, Nelson, Purvis and others) as known men and lawmen; the player's character is fictional, as in the first game |
| Turn length | One month |
| How dark? | As plain as the first game: the cost shown in plain words |
| Bonnie and Clyde | Newspaper presence only (outside this map) |
| Where it lives | Its own repository; the family code (`DOAFAM1.`) is the only link |

Next: in the new repository, the one-page spec (from this frame), then the kill
gate (numbers only) before any UI, as with the first game.
