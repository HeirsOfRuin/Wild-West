# Dead or Alive

Lead an outlaw gang in western Missouri, 1866-1882, modelled on the James-Younger
gang. Rob banks, trains and stagecoaches while the counties around you decide
whether to hide you or sell you, and the men who ride with you decide the same.
The question is how long you last and who betrays you.

Turn-based, one season per turn, phone-first, works offline, no accounts.

## Playing it

- **From a file:** `node tools/bundle.js`, then open `dist/dead-or-alive.html`.
  It needs nothing beside it.
- **From the repo:** `npm run serve` and open http://localhost:8000.
- **Installable:** `dist/site/` is the Pages build (manifest, icons, offline worker).

## The instruments

| Is it true? | Is it balanced? |
|---|---|
| `npm test`: invariants and forecast agreement | `node sim/killgate.js 100`: paired policies, noise floors |
| `npm run smoke`: the page at 390x844 | `node sim/run.js 200`: every policy, every outcome |
| `npm run check-bundle`: file:// and offline | `node sim/inert.js`: knobs and traits that do nothing |
| | `node sim/trace.js 3 careful`: one game, season by season |

`npm run check` runs the tests, the build, the bundle check and the smoke test.
Measured results are in `docs/DESIGN.md`.

## Layout

```
src/data/     tables only: map, targets, gang, tuning
src/engine/   pure game logic; derive.js is the only place shown numbers come from
src/ui/       the page; computes nothing
sim/          bots, batch runner, kill gate, inert check, tracer
test/         invariants
tools/        bundler, icon generator, smoke and bundle checks
docs/         SPEC.md (what it is), DESIGN.md (how it is built, what was measured)
```

## Rules the code is organised around

1. One derivation per number: the job resolver and the plan screen call the same
   formulas (`src/engine/odds.js`).
2. Nothing declared is decoration: every tuning knob and trait must change a game
   (`sim/inert.js`).
3. The engine is deterministic; randomness comes from named streams.
4. Money moves only through `pay()`, which writes the ledger.
5. The save key `outlaw.save.v1` is never renamed.

## Sources for the history

- T. J. Stiles, *Jesse James: Last Rebel of the Civil War* (2002): the bushwhacker
  background, John Newman Edwards and the Kansas City Times, the Pinkerton raid of
  26 January 1875 (Archie Samuel killed, Zerelda Samuel's arm lost), the Thomas
  Howard alias in Nashville and St. Joseph.
- William A. Settle Jr., *Jesse James Was His Name* (1966): the robbery list
  (Liberty 1866, Richmond 1867, Gallatin 1869 and John W. Sheets, Adair 1873, Gads
  Hill 1874, Otterville 1876, Glendale 1879, Winston and Blue Cut 1881) and
  Governor Crittenden's 1881 proclamation.
- Mark Lee Gardner, *Shot All to Hell* (2013): Northfield, 7 September 1876 (Clell
  Miller and Bill Chadwell killed in the street, the Youngers taken at Madelia,
  $26.70 taken).
- The death of Jesse James, 3 April 1882, St. Joseph, shot by Bob Ford.

Takes and sympathy values are design readings of these accounts, not records.
Uncertain details are marked "traditional" or kept out.
