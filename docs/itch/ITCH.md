# Dead or Alive — itch.io page kit

Everything needed to put the game on itch.io, and the things that are a
decision rather than a task. Copy to `docs/itch/ITCH.md` and fill the blanks.
Every count in the copy is read out of the build, not from memory.

## Files

| File | What it is | Built by |
|---|---|---|
| `release/dead-or-alive-web.zip` | The game, played on the page (index.html at the zip root, no service worker) | `node tools/build-itch.mjs` |
| `release/dead-or-alive.html` | The game as one file: a download that opens in any browser (not Safari) | the bundler, then `build-itch.mjs --single` |
| `release/dead-or-alive.apk` | Android app (Android 7.0 and later): the single-file build in a WebView | `bash tools/build-apk.sh` |
| `release/dead-or-alive-offline.zip` | The single file and a README, for the desktop download | `build-itch.mjs --single` |
| `release/dead-or-alive-itch-kit.zip` | All of the above, the page text and images, and START-HERE.txt | `node tools/make-itch-kit.mjs` |

## Upload settings

| Field | Value |
|---|---|
| Kind of project | HTML |
| Upload 1 (played on the page) | `dead-or-alive-web.zip`, tick "This file will be played in the browser" |
| Upload 2 (download) | `dead-or-alive.html`, Windows, macOS and Linux ticked (the kit's choice; `dead-or-alive-offline.zip` adds a README, either works) |
| Upload 3 (download) | `dead-or-alive.apk`, Android ticked |
| Embed | **390 x 844** (measured with `node tools/embed-measure.mjs`; table below) |
| Mobile friendly | On, orientation portrait |
| Fullscreen button | On |
| Automatically start on page load | Off (a title screen is the start) |
| Classification | Games |
| Release status | Released |
| Pricing | No payments (or Donate, $0 minimum: the author's call) |
| Genre | Strategy |
| Tags | western, outlaws, turn-based, strategy, historical, management, singleplayer, text-based, mobile, offline |
| Cover | `cover-630x500.png` (check `cover-preview-315x250.png`: that is how browse listings show it) |
| Screenshots | shot1-plan-a-job, shot2-the-map, shot3-the-gang, shot4-the-papers (a real game the careful bot played to winter 1869, as Will Harlan) |
| Links | None yet: the GitHub Pages copy deploys from the default branch, and this work is not merged |
| Community | Comments on, so players can post save codes with bug reports |

Embed measurement (`node tools/embed-measure.mjs`):

```
embed      game width  chrome  content  overflow  wasted
360 x 640         360       0      640         0       0
390 x 844         390       0      844         0       0
480 x 820         480       0      820         0       0
600 x 800         600       0      800         0       0
800 x 820         640       0      820         0     160
960 x 760         640       0      760         0     320
```

## AI disclosure

itch asks whether the project uses generative AI, and for which parts. Say
plainly what was generated and what was yours. Tick the boxes that apply (Text,
Graphics, Code, Sound). Suggested wording, to adjust to your own:

> Made with AI assistance. I designed the game, its systems and its world, and
> directed, edited and play-tested it; the code, the text and the drawn art were
> generated with an AI model to that design.

## Short description (the one-line field, under ~120 characters)

> Lead an outlaw gang in Missouri, 1866-1882. Rob banks and trains, keep the counties on your side, watch your own men.

## Known constraints (say them on the page)

- Saves live in this browser. If a browser blocks site data in embedded frames,
  open the game fullscreen or use the save code (Menu).
- Saves on itch and in the installed copy are separate; the save code moves a game.
- One difficulty. A careful player gets out (retires) about one game in five (the kill gate's careful policy, 18% over 200 seeds); most careers end killed, captured or betrayed.
- The page fetches Google Fonts (Rye, Old Standard TT, Libre Franklin) and nothing else; without them it plays the same in system fonts.
- The Android app is unsigned by any store: players allow "install unknown apps" once. It was built and its signature verified here, but not yet run on a device: install it on a phone before ticking it public.
- The desktop download is the game as one HTML file (opens in any browser, plays offline; Safari will not keep saves from a file).

## Before going public

- [ ] `npm run check` green on the commit being released
- [ ] `node tools/pre-public.mjs --zip=release/dead-or-alive-web.zip` clean (the zip in an itch-style frame, storage blocked and allowed; copy checks)
- [ ] `node tools/update-check.mjs` clean (a new deploy reaches someone who already has the app)
- [ ] Every number in the description confirmed against the build (pre-public lists them)
- [ ] Tutorial and help re-read against the build
- [ ] Cover checked at 315 x 250; shots looked at on the press sheet
- [ ] Played the uploaded draft yourself, in a private window and on a phone: start, a few turns, copy a save code, reload, load it
- [ ] Then Public

## After publishing

Watch the comments the first week; ask for a save code with every bug report.
Each fix: rebuild, `build-itch.mjs`, upload over the old file (the page stays);
a devlog for anything players would notice (`devlog.md`).
