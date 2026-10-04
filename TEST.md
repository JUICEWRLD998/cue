# Testing Cue

This is a hands-on test guide. Work top to bottom. Each step says what to do and what you should see or hear.
Time needed: about 15 minutes. Use headphones or speakers; the app is a drum machine.

Project ID: `jwc6peq5`. Dataset: `production` (public). Organization: `o4h8r4fp1`.

## 0. Setup

You need Node 22.12 or newer (Node 24 was used). Install each app once:

```bash
cd floor  && npm install
cd ../deck   && npm install
cd ../studio && npm install
```

Sections 1 to 3 need no login. Sections 4 to 6 need a Sanity login that belongs to the organization
(`npx sanity login`).

## 1. Automated checks (no login)

```bash
cd floor
npm test        # 22 tests: clock math, song edit, doc helpers. Expect: 22 pass, 0 fail.
npx tsc --noEmit
npm run build   # Expect: routes /, /booth, /_not-found, all static.
```

Browser scripts in `scripts/` drive Chrome over the DevTools protocol (Chrome must be installed; no extra packages):

```bash
cd floor && npm run build && npx next start -p 3140      # leave running
# new terminal, from the repo root:
node scripts/verify-booth.mjs http://localhost:3140       # click path on /booth. Expect 10/10 checks.
node scripts/measure-palette.mjs http://localhost:3140    # contrast + colour distance, both themes. Expect ALL PASSED.
node scripts/shoot.mjs http://localhost:3140 ./shots root 320,768,1280 dark   # screenshots, prints overflow px (expect 0)
```

`verify-phase3.mjs` and `filmstrip-drop.mjs` publish a real change to the dataset and then restore it. They read the
Sanity CLI token from `~/.config/sanity/config.json`, so run `npx sanity login` first. Only run them against your own project.

## 2. The Floor (the room)

```bash
cd floor && npm run dev        # http://localhost:3000
```

| Step | Do | Expect |
|---|---|---|
| 2.1 | Open the page. | A record on the left, the song title "Warm-up", "118 bpm. Published in Sanity.", and a paper roll with six lanes. The roll is the preview of the published song. No sound yet. |
| 2.2 | Press **Start the room**. | A kick, hats and a snare start within a moment. An amber reading head sweeps the roll. The record turns once per song loop. The button becomes **Mute**. |
| 2.3 | Press **Mute**, then unmute. | Sound stops and returns. The head keeps moving. |
| 2.4 | Open the page in a second tab and start it. | Both tabs are in time with each other. There is no server clock; both read the wall clock. |
| 2.5 | Scroll down. | Short text explains published and draft. Footer carries the byline. |
| 2.6 | Use the nav. | **The room**, **The booth**, and a GitHub icon with "Source" that opens https://github.com/JUICEWRLD998/cue. On a 320 px wide window the word "Source" hides and only the icon shows. |
| 2.7 | Toggle the system theme (light/dark). | Colours change. Text stays readable. The roll stays cream in both. |
| 2.8 | Turn on "reduce motion" in your OS. Reload. | No sliding. State changes still show. |

## 3. The Booth (try the draft idea without logging in)

Open http://localhost:3000/booth.

| Step | Do | Expect |
|---|---|---|
| 3.1 | Look at the roll. | The same song as the room, as a copy. Text says "Same as the room." |
| 3.2 | Click holes in the kick lane. | A hole punches in. Text says "1 change from the room.", then 2, 3. Clicking a hole twice is back to 0 changes. |
| 3.3 | Press **Hear my draft**. | Your draft plays. A teal head sweeps. The button becomes **Stop my draft**. |
| 3.4 | Edit while it plays. | The change is audible on the next pass. |
| 3.5 | Switch the section tabs. | Each section has its own pattern. |
| 3.6 | Press **Reset to the room**. | Back to the published copy, "Same as the room." |
| 3.7 | Keyboard: Tab to a hole, press Space. | The hole toggles. A visible focus ring shows. |
| 3.8 | Open the room in another tab. | The room never changes from what you do in the Booth. Nothing is saved. |

## 4. The Deck (needs login, the real DJ tool)

```bash
cd deck && npm run dev         # serves on http://localhost:3333
```

Open https://www.sanity.io/@o4h8r4fp1?dev=http%3A%2F%2Flocalhost%3A3333 (the Deck only renders inside the signed-in
Sanity Dashboard; opening localhost:3333 directly shows nothing useful).

| Step | Do | Expect |
|---|---|---|
| 4.1 | Wait for load. | Title "The Deck". Text says "Draft and room are identical." Two rolls: "In your headphones" (teal) above "In the room right now" (amber). **Drop** and **Discard draft** are disabled. |
| 4.2 | Toggle holes in the draft roll. | Text changes to "The draft differs from the room. Only you can hear it." **Drop** enables. The room roll does not change. |
| 4.3 | Press **Cue off** (it becomes **Cue is on**). | Your draft plays locally. |
| 4.4 | Change **Tempo** to 130. | The draft plays faster. The room does not change. |
| 4.5 | Press **Discard draft**. | Draft returns to match the room. |
| 4.6 | Edit again, then press **Drop**. | The room roll punches in the new holes from left to right, then text says "Dropped. The room now plays your draft." |

If 4.1 is blank or an error, see section 8.

## 5. The Studio (schema and the custom step grid)

```bash
cd studio && npx sanity dev --port 3334     # http://localhost:3334
```

| Step | Do | Expect |
|---|---|---|
| 5.1 | Open **Song**, then **Warm-up**. | Fields: title, bpm, swing, sections. |
| 5.2 | Open a section, then a lane. | The `steps` field is a 16-button grid, not a plain array list. Lit buttons are hits. |
| 5.3 | Click a button. | A step is added or removed. The Studio shows an unpublished-changes badge. |
| 5.4 | Open **Voice**. | Six voices: kick, snare, hat, clap, bass, stab. Each has pitch, decay, tone, gain. No audio files anywhere. |
| 5.5 | Try to add two steps with the same index through the array view. | A validation error says two steps share an index. |

## 6. The Drop end to end (the main thing)

You need the Floor running and started (section 2), and the Deck or Studio open.

1. In the Floor, press **Start the room**. Listen to the beat.
2. In the Deck, change the pattern (add a snare, clap or bass line). Do not press Drop. The Floor must not change.
   This is the draft/published split.
3. Press **Cue is on** in the Deck. You hear the draft; the Floor tab still plays the old song.
4. Press **Drop**.
5. In the Floor tab, a line says a newer song is queued with a time. At the next bar line (about 2 s at 118 bpm) the
   new pattern takes over. The holes punch in left to right and the beat does not stumble.

Measured in an earlier run: change noticed about 1.4 to 1.9 s after publish, then the next bar line, 3.2 s total at 118 bpm.

To reset the song, use the Studio to restore values, or run `cd studio && npx sanity exec scripts/seed.ts --with-user-token`
(this re-seeds the voices and `song-warmup`).

## 7. Responsive and accessibility pass

Resize the browser (or use device mode) to 320, 375, 768, 1024, 1280 and 1920 px on `/` and `/booth`.

- No horizontal page scroll at any width.
- On phones the roll scrolls sideways inside its own box; holes stay round and large enough to tap.
- Tab through the page. Every control shows a focus ring. The first Tab stop is "Skip to content".
- Screen reader: the room roll reads as a list of lanes and steps; the Booth holes announce as toggle buttons.
- Text zoom to 200 percent keeps everything readable.

## 8. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Floor says it could not load the song | Network or CORS. The dataset must allow origin `*` (no credentials) under Sanity project settings, API, CORS origins. Reload. |
| No sound | The browser blocks audio until a click. Press **Start the room** or **Hear my draft**. Check tab and system volume. |
| Deck page is blank | Open it through the Dashboard URL in section 4, signed in to the `o4h8r4fp1` organization. Check `deck/` dev server is running on 3333. |
| Studio will not start | Run `npx sanity login`, then `npx sanity dev --port 3334` inside `studio/`. |
| Port already in use | An old server holds it. Start on another port (`-p 3150`) or kill the old process. |
| Windows line-ending warnings from git | Harmless. |

## 9. What this guide does not cover

The Deck inside the Dashboard and the Studio step grid are built and type-checked, but were not driven in a signed-in
browser by the author. Steps 4 and 5 are the first real check. Report anything unexpected.
