# Cue

**A drum machine whose song is a Sanity dataset.**
Published is the room. Drafts are the headphones. Publishing is the drop.

Built for the DEV Sanity Challenge, Path Two ("Vibe-code something strange"), by
Mustapha Fadhlullah, independent security researcher.

- Sanity project ID: `jwc6peq5`, dataset `production` (public, read-only for everyone)
- Source: https://github.com/JUICEWRLD998/cue
- Want to test it? Read [TEST.md](TEST.md). Want the honest limits? Read [Honest limits](#honest-limits).

## The idea in one minute

A DJ listens to the next track in headphones while the crowd hears the current one. When the next track is ready,
the DJ brings it in on the beat. Sanity already has the same machine built in: a document has a **draft** and a
**published** version, and two perspectives let you read either one.

Cue makes that literal. The song is a document. A public web page, the **Floor**, plays whatever is *published*. A
private tool, the **Deck**, edits the *draft* and plays it only in the DJ's headphones. Pressing **Drop** publishes the
draft. Every open Floor notices the change and switches to the new song **on the next bar line**, so the beat never
stumbles. Nobody refreshes anything.

No audio files exist in this project. Every sound is synthesised in the browser from parameters stored in Sanity.

## What is in this repo

| Folder | What it is | Who uses it |
|---|---|---|
| `floor/` | Next.js 16 app. The public room (`/`) and the booth (`/booth`). Reads the **published** song, no token. Contains the audio engine in `floor/lib/engine/`. | Anyone with a browser |
| `deck/` | Sanity **App SDK** custom app (React 19, `@sanity/sdk-react`). Edits the **draft**, plays it as a Cue channel, publishes with Drop. Runs inside the Sanity Dashboard. | The DJ (signed in) |
| `studio/` | Sanity Studio 6. The schema, a custom 16-step grid input, and the seed script. | The DJ, schema review |
| `scripts/` | Chrome (CDP) test drivers: publish path, booth click path, palette measurement, screenshots, a Drop filmstrip. | Developers |
| `IMPLEMENTATION.md` | The 10-phase plan, blocker register, verification gates, odds. | Maintainers, judges |
| `TEST.md` | Step-by-step guide to test everything. | Testers |
| `DEMO.md`, `VOICEOVER.md`, `POST.md` | Demo video plan, narration script, DEV post draft. | The author |

## The surfaces

**The Floor (`/`)** shows the published song as a paper player-piano roll: six lanes (kick, snare, clap, closed hat,
sub bass, chord stab) by sixteen steps. Press *Start the room* and a reading head sweeps the roll while the record
turns. When a newer song is published, the page says it is queued and when it will land, then punches the new holes in
from left to right at the next bar line.

**The Booth (`/booth`)** is for people who cannot sign in to Sanity. It loads a copy of the published song, lets you
click holes in or out, and plays your version in your own headphones. Nothing is saved and the room cannot hear it. It
shows the cue-and-drop idea without a login. Only the DJ can Drop, because publishing needs a Sanity login.

**The Deck** shows two rolls: *In your headphones* (teal, the draft) above *In the room right now* (amber, the
published song). The buttons are **Cue**, **Discard draft** and **Drop**. Drop is the only vermilion thing in the whole
interface. The Deck also has a tempo field and section tabs.

**The Studio** is the normal Sanity editor with one change: the `steps` field of a lane is a 16-button grid, not a
plain array list.

## How the drop works

1. The Floor fetches `*[_type == "song"] | order(_updatedAt desc)[0]` with `perspective: 'published'`, `useCdn: false`,
   and no token. It also opens `client.listen()` and polls every 2 seconds as a fallback.
2. In the Deck, `useEditDocument` changes the **draft**. Nothing reaches the Floor, because the Floor never reads drafts.
3. Drop calls `publishDocument` through `useApplyDocumentActions`. The published document changes in one commit.
4. The Floor sees the new `_rev`, shows "A newer published song is queued", and tells the player to swap.
5. The player waits for the next bar boundary, then switches song. The beat continues without a gap.

**Time without a server clock.** Every device computes the step from the wall clock:
`step = floor((Date.now() - EPOCH) / stepMs)` with `EPOCH = 2026-01-01T00:00:00Z`. Two tabs, or two phones, play the
same step at the same time with nothing in between. The Deck's Cue channel uses the same math, so the draft you hear in
your headphones is in time with the room.

**The scheduler.** A 25 ms timer looks 120 ms ahead and schedules Web Audio events on the audio clock, so playback does
not depend on timer jitter. Swing, per-step probability and per-step nudge (in milliseconds) are applied at scheduling time.

## The schema

The schema is the part built to be read. Five types:

```
voice   (document)  name, kind: kick|snare|hat|clap|tom|bass|stab, pitch Hz, decay ms, tone 0-1, gain 0-1
song    (document)  title, bpm 60-200, swing 0-0.5, sections[]
section (object)    title, kind: intro|build|drop|break|outro, bars 1-32, lanes[]
lane    (object)    voice -> reference(voice), steps[]
step    (object)    index 0-15, velocity 0-1, probability 0-1, nudge -60..60 ms
```

Three decisions you can disagree with:

1. **Sections, lanes and steps are embedded in the song document, not separate documents.** In Sanity, publishing a
   document does not publish the documents it references. If lanes were references, a Drop could publish the song while
   its patterns stayed in draft, and the room would play a half-new song. Embedding makes the Drop one atomic commit.
2. **Voices *are* separate documents.** They are a shared kit, published once, and they rarely change. A reference is
   the right tool here, and the Floor reads them with the song.
3. **Steps are objects, not a string like `x...x...x...`.** A string is shorter, but GROQ cannot ask it questions.
   With objects you can query "which lanes hit the off-beat", and each hit can carry velocity, probability and nudge.

Validation: indexes are integers 0 to 15, a lane cannot contain two steps with the same index, and ranges are enforced
on every numeric field.

## Run it

You need Node 22.12 or newer. Chrome is needed only for the test scripts.

```bash
# the public room and booth (no login needed)
cd floor && npm install && npm run dev        # http://localhost:3000

# the Deck (needs a Sanity login in the organization)
cd deck && npm install && npm run dev         # then open the Dashboard URL below
# https://www.sanity.io/@o4h8r4fp1?dev=http%3A%2F%2Flocalhost%3A3333

# the Studio
cd studio && npm install && npx sanity dev --port 3334
```

To point at your own Sanity project, set `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` for the Floor
(or edit `floor/lib/sanity.ts`), edit `PROJECT_ID` and `DATASET` in `deck/src/config.ts`, set `organizationId` in
`deck/sanity.cli.ts`, then seed the voices and the first song:

```bash
cd studio && npx sanity exec scripts/seed.ts --with-user-token
```

The dataset must be public, with a CORS origin of `*` (credentials off) so browsers can read it.

Deploy: the Floor is a standard Next.js app. `deck` and `studio` deploy with `npx sanity deploy`.

## Tests and checks

```bash
cd floor && npm test          # 22 unit tests of the clock, song edit and doc helpers
```

The browser scripts in `scripts/` are described in [TEST.md](TEST.md). Planted controls are used where a probe could
fail silently: the palette script, for example, checks that it can detect a deliberately bad colour pair before it
reports a pass.

## Design

The look is a punched paper roll. Holes are steps, a thin reading head moves across them, and the record on the page
turns once per song loop. There is no stock imagery: the music is the picture.

- Colours are OKLCH tokens with a dark and a light theme. Teal means **draft / headphones**. Amber means **published /
  the room**. Vermilion means **Drop** and nothing else. Contrast and colour distance were measured in both themes.
- Type: Anybody for display, Schibsted Grotesk for text.
- Motion: one signature moment (the Drop, about 900 ms, hole by hole, left to right). Everything else is a short state
  response. With "reduce motion" on, the Drop becomes a fade and the end state is identical.
- Responsive: checked at 320 to 1920 px with no horizontal page scroll. On phones the roll scrolls inside its own box.
- Accessible: native buttons, visible focus, a skip link, a screen-reader summary of the read-only roll.

## Honest limits

What was verified, and what was not.

**Verified in a real browser against the live dataset:**
- A draft edit does not change the room. A publish does, and the new song starts on the next bar. Measured: about 3.2
  seconds from publish to drop at 118 bpm (the change is noticed after 1.4 to 1.9 s, then it waits for the bar).
- The Booth click path (10 of 10 checks), the 22 unit tests, the colour palette in both themes, and no horizontal
  overflow from 320 to 1920 px.
- The author heard the Floor play on a real machine.

**Built but not driven by the author in a signed-in browser:**
- The Deck inside the Sanity Dashboard. It builds and type-checks. See TEST.md section 4 for the first real check.
- The visual look of the Studio step-grid input.

**Known gaps:**
- The Deck can only be opened by someone signed in to the Sanity organization. Judges and visitors get the Floor and the
  Booth instead, plus the demo video.
- Sanity Content Releases would be the natural tool for scheduling a Drop, but they are Enterprise-only. Cue uses plain
  draft and published instead. The earlier idea and its correction are recorded in `IMPLEMENTATION.md`.
- A Drop lands on the next bar for devices with a correct clock. A device with a badly wrong clock plays out of time.
- Browsers block audio until a click, so the Floor needs the *Start the room* press.
- The browser look-ahead scheduler is accurate to a few milliseconds, but it is not studio-grade timing.
- A design-system audit and an independent visual critique were not run. The automated UI scorer gave 91 of 100.

## Credits

Made with Claude Code, Sanity (Studio, App SDK, GROQ, client), Next.js, `motion`, and the Web Audio API.
