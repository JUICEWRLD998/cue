# DEV post draft (Path Two)

Paste the part below the line into the DEV editor. Items in [square brackets] are for you to fill in before you
publish. Nobody but you should press Publish. The post is judged mostly on the writeup, so the honest parts matter.

Suggested tags: `devchallenge`, `sanitychallenge`, `webdev`, `music`.

---

*This is a submission for the Sanity Challenge, Path Two: Vibe-code something strange.*

# Cue: a drum machine whose song is a Sanity dataset

**Sanity project ID: `jwc6peq5` (dataset `production`, public).** Code: https://github.com/JUICEWRLD998/cue
Live room: [your deployed Floor URL]

[Embed the 15 second clip or the 70 second video here]

## What I built

Cue is a drum machine where the song is a Sanity document.

A DJ listens to the next track in headphones while the crowd hears the current one, then brings the new one in on the
beat. A Sanity document has the same two states: a draft and a published version. So I made the metaphor literal.

- **The Floor** is a public page. It plays the *published* song and reads it with no token.
- **The Deck** is a Sanity App SDK app. It edits the *draft*, and plays it in a Cue channel only the DJ can hear.
- **Drop** publishes the draft. Every open Floor switches to the new song on the next bar line.

Published is the room. Drafts are the headphones. Publishing is the drop.

There are no audio files. Kick, snare, clap, hat, bass and stab are synthesised in the browser with the Web Audio API
from parameters stored in `voice` documents (pitch, decay, tone, gain).

## Why it is a good fit for Sanity

I did not want to use Sanity as storage for something else. I wanted the thing Sanity is good at to be the instrument.
Drafts and published versions, perspectives, real-time listening, and an editor you can reshape are the whole product here.
Nothing else in the project holds state. There is no server of mine between the DJ and the room.

## The schema, and a trap I designed around

```
voice   (document)  name, kind, pitch, decay, tone, gain
song    (document)  title, bpm, swing, sections[]
section (object)    title, kind, bars, lanes[]
lane    (object)    voice -> reference(voice), steps[]
step    (object)    index 0-15, velocity, probability, nudge (ms)
```

**The trap.** The obvious model makes sections and lanes separate documents that the song references. That looks clean.
It breaks the drop. In Sanity, publishing a document does not publish the documents it references. A Drop would
publish the song and leave its patterns in draft, so the room would play a half-new song, or a broken one.

**The fix.** Sections, lanes and steps are embedded objects in the one `song` document. A Drop is a single commit that
carries everything the room needs. Voices stay as references, because they are a shared kit that is published once and
rarely changes.

**Steps are objects, not a string.** `x...x...x...` is shorter. But a string cannot be queried. With objects, GROQ can
answer "which lanes put a hit on the off-beat", and each hit can carry velocity, probability and a nudge in milliseconds.
A lane is also validated: two steps may not share an index.

I also replaced the default array editor for steps with a 16-button grid in the Studio, because editing a drum pattern
as a list of objects is miserable.

## How the drop stays in time with no server clock

Every device computes the step from the wall clock: `step = floor((Date.now() - EPOCH) / stepMs)`. Two tabs, or a
phone and a laptop, are on the same step without talking to each other. The Floor learns about a new published song
through `client.listen()` with a 2 second poll as a fallback, then waits for the next bar boundary before swapping. A
look-ahead scheduler (25 ms tick, 120 ms look-ahead) puts the sounds on the Web Audio clock so timer jitter does not
reach your ears.

Measured in a real Chrome against the live dataset: a publish was noticed after 1.4 to 1.9 seconds, and the new song
started on the next bar, about 3.2 seconds after the publish at 118 bpm. A draft edit that was never published did not
change the room.

## Things that went wrong, and what I changed

- **I planned around Content Releases and they are Enterprise-only.** My first pitch scheduled drops with Releases. I
  checked the plan limits before building and dropped them. The project uses plain draft and published, which turned out
  to be the cleaner metaphor anyway.
- **"Failed to fetch" in the browser, with a public dataset.** A public dataset still needs a CORS origin for
  browser requests. Terminal queries worked, which hid the problem for a while.
- **My own test scripts lied.** Several probes checked for UI that had since changed and reported failures that were not
  real. I added planted controls (a deliberately bad colour pair, for example) so a probe that cannot fail does not get
  to report a pass.
- **The change counter in the Booth counted clicks.** Click a hole twice and it said two changes. It now compares
  against the published song. I wrote the test first.
- **The Floor could start from a stale preview.** Pressing Start now fetches the song again before it plays.
- **Contrast.** The amber reading head on cream paper measured 1.55 to 1, and white text on the Drop button was too weak.
  I measured, added darker inks for use on paper, and re-measured in both themes.

## What I did not verify

- I have not yet driven the **Deck** inside the signed-in Sanity Dashboard myself, only built and type-checked it. [Edit
  this line after you test it.] The Floor, the Booth and the publish path were verified in a real browser.
- The Studio step-grid input is built but its look was not reviewed in the Studio.
- Judges cannot open the Deck unless they belong to the organization, so the post carries a video, and `/booth` lets
  anyone try the draft idea without logging in.
- I did not run a full design-system audit or an independent visual critique. The automated UI scorer gave 91 out of 100.
- Timing is a browser look-ahead scheduler. It is good enough to sound tight, but it is not studio-grade.

## How I built it

I built it with Claude Code over about a day, working in phases with a blocker register up front (`IMPLEMENTATION.md`
in the repo): the Sanity facts that could stop the project were checked first, the audio engine and its tests next,
then the Floor, the Booth, the Deck and the Studio. [Add the Agent Session embed here, set to Public, with keys scrubbed.]

## Try it

1. Open [live Floor URL] and press **Start the room**.
2. Open `/booth`, punch some holes in, and press **Hear my draft**. The room cannot hear you.
3. The repo has `TEST.md`, a step-by-step guide for the Deck, the Studio and the whole drop.

Made by Mustapha Fadhlullah.
