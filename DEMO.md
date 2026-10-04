# Demo video plan

Goal: a judge who never opens the app understands Cue and hears the Drop in under 75 seconds.
Two cuts from one recording session:

- **Main cut**: about 70 seconds, with voiceover (script in [VOICEOVER.md](VOICEOVER.md)). For the DEV post and the README.
- **Short cut**: 15 seconds, no voiceover, captions only. For social posts and the top of the DEV post.

The audio is the product. The beat must be clearly heard. Never bury it under music or a loud voice.

## What the viewer must take away

1. The song is a Sanity document.
2. Published is what the room hears. The draft is what the DJ hears alone.
3. Publishing is the drop, and it lands on the bar line.

## Before you record (10 minutes)

1. Reset the data so the first minute is predictable:
   `cd studio && npx sanity exec scripts/seed.ts --with-user-token`
2. Start the Floor: `cd floor && npm run dev`, open http://localhost:3000. For the final take, use your deployed
   address (or `npm run build && npm start`) so the address bar is clean.
3. Start the Deck: `cd deck && npm run dev`. Open https://www.sanity.io/@o4h8r4fp1?dev=http%3A%2F%2Flocalhost%3A3333
   in a second browser window and confirm it loads and the Cue toggle makes sound.
   If the Deck does not load, use the fallback at the end of this file.
4. Screen: 1920 by 1080. Browser zoom 100 percent. Hide the bookmarks bar. Close other tabs. Turn off notifications.
5. Layout: Floor window on the left half, Deck window on the right half, both fully visible. Dark theme for both.
6. Audio: close every app that makes sound. Set the system volume so the beat peaks around 70 percent. Test a
   5 second recording and listen to it with headphones.
7. Pick the edit you will perform in the Deck. Plan: add a clap on steps 4 and 12, and a bass note on step 0.
   Rehearse it twice. It should take about 6 seconds.

## Tools

- Recording: OBS Studio (free). Add a Display Capture and a Desktop Audio source. 1080p, 60 fps, MP4 or MKV.
  Windows Game Bar (Win+G) also works but records one window at a time.
- Editing: DaVinci Resolve (free), CapCut, or any editor. You only need cuts, a voiceover track and captions.
- Voiceover: generate it from VOICEOVER.md and import it as a separate audio track.

## Shot list, main cut (about 70 s)

Times are targets. The voiceover paragraphs match these shots in order.

| # | Time | On screen | Action | Voiceover paragraph |
|---|---|---|---|---|
| 1 | 0:00-0:06 | Floor, full window | Press **Start the room**. The beat starts, the amber head sweeps, the record turns. | 1 |
| 2 | 0:06-0:16 | Floor, slow zoom on the roll | Hold on the roll. Point the cursor at a hole, no clicks. | 2 |
| 3 | 0:16-0:26 | Split screen: Floor left, Deck right | Show the Deck's two rolls, teal on top, amber below. The Floor keeps playing. | 3 |
| 4 | 0:26-0:40 | Deck | Toggle the clap and bass holes in the teal roll. Text changes to "The draft differs from the room." Press **Cue off** so it reads "Cue is on". The Floor still plays the old beat. | 4 |
| 5 | 0:40-0:55 | Split screen | Press **Drop**. Then say nothing. Let the Floor line "A newer published song is queued" appear, then the new holes punching in, and the new beat arriving on the bar. **Hold 6 seconds with no voice.** | 5 (one short line, then silence) |
| 6 | 0:55-1:03 | Studio, **Song** document | Show the 16-button step grid in a lane. Then the schema list: voice, song, section, lane, step. | 6 |
| 7 | 1:03-1:10 | Floor `/booth`, then end card | Click a few holes in the Booth. Cut to the end card: project ID, GitHub address, title. | 7 |

End card text, on a flat dark background with the teal and amber colours:
`Cue` / `Published is the room. Drafts are the headphones.` / `Sanity project jwc6peq5` / `github.com/JUICEWRLD998/cue`

## Short cut (15 s), no voiceover

| Time | On screen | Caption (burned in) |
|---|---|---|
| 0:00-0:03 | Floor playing | The room plays what is published |
| 0:03-0:07 | Deck: toggle holes, Cue on | The DJ hears the draft |
| 0:07-0:12 | Press Drop. Beat changes at the bar | Publish is the drop |
| 0:12-0:15 | End card | Cue, a drum machine made of Sanity |

## Recording tips

- Record each shot as its own take where you can, 2 or 3 times. Pick the best. Do not try one perfect long take.
- Shot 5 is the one that matters. Record it until the Drop lands cleanly and the viewer can both see and hear it.
  Keep the whole queue-to-drop window on screen: about 3 seconds at 118 bpm.
- Move the mouse slowly. Do not wiggle it while talking.
- Leave one second of silence before and after each voiceover line so you have room to cut.
- Captions: burn them in for the short cut. Use 36 pt or larger, white text on a dark bar.
- Mix: voiceover about -14 LUFS. Keep the beat under the voice while it speaks, and back to full during shot 5.
- Export: 1080p MP4 (H.264), under 100 MB. Check the final file with headphones and with a phone speaker.

## Where the video goes

- Upload to YouTube as unlisted, or attach it to the DEV post if the editor allows. Embed with `{% embed URL %}`.
- Put the 15 s cut at the top of the post and in the README.
- Keep a still of the Drop filmstrip as a fallback image. `node scripts/filmstrip-drop.mjs` makes one.

## Fallback if the Deck will not load

The Deck is the one screen the author has not yet driven in a signed-in browser. If it fails on the day:

- Replace shots 3 to 5 with the **Studio**: edit the step grid in the draft, show the unpublished badge, then press
  **Publish**. The Floor behaves the same way, because a publish is a publish.
- Say "the Studio" instead of "the Deck" in those voiceover lines, and drop the split-screen "two rolls" shot.
- Show the Booth for the draft-in-headphones idea.
- Never show or claim a screen that did not work. State in the post which surface you used.

## Claims that must stay true in the video

- The room never hears the draft. Show it: the Floor does not change until Drop.
- Do not say "instant". The Drop lands on the next bar, about 3 seconds at 118 bpm.
- Do not say the sounds are recordings. Every sound is synthesised from parameters stored in Sanity.
