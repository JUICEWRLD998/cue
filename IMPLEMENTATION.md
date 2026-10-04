# Cue — implementation plan

Mustapha Fadhlullah — independent security researcher
Written 2026-10-04 ~14:30 UTC. Deadline (fact, not a limit): 2026-10-05 06:59 UTC (11:59 PM PDT). Entry: DEV Sanity Challenge, **Path Two**.
Strategy and field data: `strategy/PICK.md`. Build tree: `Desktop/sanity-challenge/cue/`.

## 1. What it is

A drum machine whose song lives in a Sanity dataset.

- **The Floor** (public Next.js page, the live URL): plays the **published** song. Anyone opens it, presses *Start the room*, hears it.
- **The Deck** (Sanity App SDK app): a step grid. The DJ edits the **draft** song, hears it in a *Cue* channel (headphones), then presses **Drop**. Publishing the draft changes the Floor on the next bar.
- **The Studio** (Sanity Studio): schema, plus a custom step-grid input replacing the default array editor.

Pitch line: *published is the room, drafts are the headphones, Publish is the drop.* A DJ cueing a track and a Sanity
perspective are the same machine. (Content Releases were dropped from the pitch: Enterprise-only. See PICK.md.)

## 2. Blocker register (read before starting)

| # | Risk | Status | Plan |
|---|---|---|---|
| B1 | Sanity login + org | CLEARED 2026-10-04 (org o4h8r4fp1 created via management API, project jwc6peq5) | none |
| B2 | App SDK needs React 19, Node >= 22.12, an organization and a Dashboard to host | Node 24.14 OK. Org: VERIFIED required (quickstart: "Choose your organization, or create a new one"). | Create the org in `init`. |
| B3 | App SDK apps deploy to the org Dashboard only; judges can't open the Deck | VERIFIED (docs: "available within your organization dashboard") | Floor is the live URL. Post carries Deck screenshots + a 15 s clip (R1). Not a blocker; a framing rule. |
| B4 | Releases are Enterprise-only | VERIFIED false on Free | Already designed out. |
| B5 | Draft reads need a token | VERIFIED by design | Floor reads `published` from a **public** dataset, no token. Deck runs inside the authenticated App SDK. No token ever ships in the Floor. |
| B6 | Publishing a doc does not publish documents it references | Sanity behaviour, known | Everything the Floor needs is **embedded in the one `song` document**. Voices are separate docs, published once at seed time. The Drop is therefore atomic. This is also the schema story for the writeup. |
| B7 | App SDK action names | **VERIFIED 2026-10-04** in @sanity/sdk-react 2.21.0 typings: `useApplyDocumentActions` with `publishDocument` / `discardDocument`, `useDocument` accepts `perspective`, `useEditDocument` takes an updater | none |
| B8 | `client.listen()` latency | **VERIFIED 2026-10-04**: tokenless listen delivered 4/4 publishes in 226-548 ms (includes the commit round trip). Browser run: change noticed 1.5 s after publish, Drop on the next bar 3.4 s after publish (bpm 118, bar = 2.03 s). | none; polling stays as a 2 s fallback |
| B9 | Browser autoplay | Known | Floor needs a click: the *Start the room* button is the entry gesture. Not a bug, a UI element. |
| B10 | Tab sync between Deck cue and Floor | Design | Both derive the step from wall clock: `step = floor((Date.now() - EPOCH) / stepMs)`. No server clock. Swap on the next bar boundary. |
| B11 | Deploy target for the Floor | Vercel CLI 54.10.2 installed; login UNVERIFIED | Phase 8 runs `vercel whoami`. Fallback: Cloudflare Pages, or Vercel via git. |
| B12 | Sample files / licensing | Avoided | No audio assets. Voices are synthesised in Web Audio from parameters stored in Sanity (`voice` docs). Zero licence risk, zero upload step. |
| B13 | Browser fetches to the Sanity API failed ("Failed to fetch") | **FOUND AND FIXED 2026-10-04**: public dataset still needs a CORS origin. Added `*` without credentials via the management API. | Re-add `*` if the project is ever recreated; Deck origin (Dashboard) is handled by the App SDK. |

No hard blocker after B1. B7 and B8 have fallbacks that keep the pitch intact.

## 3. Architecture

```
cue/
  studio/    Sanity Studio v5: schema, custom StepGrid input, seed script
  deck/      App SDK app (React 19): edit draft, Cue channel, Drop button
  floor/     Next.js App Router: public player, reads published only
  floor/lib/engine/   audio engine (step math, Web Audio scheduler, voice synth); the Deck will import it by relative path (no workspace, installs here are slow)
```

- `shared/engine.ts`: `AudioContext` scheduler with 100 ms look-ahead, 25 ms tick. Maps `Date.now()` to `ctx.currentTime` once at start. Pure functions for step math so they are unit tested.
- Floor: GROQ fetch of the published `song` (`useCdn: false`), `client.listen` (or poll) for changes, swap pattern at next bar.
- Deck: `useDocument` / `useEditDocument` on the **draft**; the Cue toggle plays the draft locally; Drop = publish action.
- Studio: deployed with `sanity schema deploy`; the schema is also visible to judges through the public dataset.

## 4. Schema (the scored part: "thoughtfulness of the schema")

```
voice   (doc)   name, kind: kick|snare|hat|clap|tom|bass|stab, pitch(Hz), decay(ms), tone(0-1), gain
song    (doc)   title, bpm, swing, sections[]
section (object, embedded)  title, kind: intro|build|drop|break|outro, bars, lanes[]
lane    (object, embedded)  voice -> ref(voice), steps[]  (16 steps per bar)
step    (object, embedded)  index(0-15), velocity(0-1), probability(0-1), nudge(ms)
drop    (doc, stretch)      summary written on each Drop: when, steps added/removed
```

Why this shape (goes in the writeup, honestly):
- Steps are **objects, not a 16-char string**. GROQ can answer questions like "which lanes put a hit on the off-beat".
- Patterns are **embedded, not referenced**, because publishing a document does not publish its references (B6). Tradeoff: no pattern reuse across songs. Mitigation: `voice` docs ARE shared references (a kit).
- `probability` + `nudge` make the dataset a performance, not a bitmap.

Seed: a script writes 6 `voice` docs (published), one `song` "Warm-up" (published), then edits a draft for the Deck. One dataset `production`, **public** (the submission needs the project ID / public dataset URL anyway).

## 5. Phases (no calendar; every phase has deliverables, an exit check and its own branch + commits)

Git: repo `cue/`, remote `origin` = github.com/JUICEWRLD998/cue, `main` always runs. One branch per phase (`phase/N-name`), many small conventional commits, merged into `main` with `--no-ff` after the exit check passes, then pushed. Status column is updated as work lands.

| Phase | Branch | Deliverable | Exit check (must pass before merge) | Status |
|---|---|---|---|---|
| 1 Foundations | `phase/1-foundations` | git repo + README + `.gitignore`; Sanity project "cue" + public dataset `production`; Studio scaffold in `studio/` | `npx sanity projects list` shows the project; `studio` builds | DONE 2026-10-04 (project jwc6peq5, studio builds) |
| 2 Schema + seed | `phase/2-schema-seed` | `voice`, `song` (embedded section/lane/step) schema; `sanity schema deploy`; seed script (6 voices, song "Warm-up" published) | tokenless `curl` of `*[_type=="song"]` returns the song with embedded steps | DONE 2026-10-04 (schema deployed, 7 docs seeded, tokenless GROQ read verified) |
| 3 Engine + Floor v0 | `phase/3-engine-floor` | `shared/engine` (step math + scheduler, unit tested first); Floor v0 (Next.js) plays the published song; swap on next bar via `listen` or poll | edit draft + Publish in Studio changes the Floor within one bar; latency recorded; planted control: an unpublished draft edit does NOT change the Floor | DONE 2026-10-04 (10/10 engine tests; browser-driven check 6/6 incl. draft control; see scripts/verify-phase3.mjs) |
| 4 Deck | `phase/4-deck` | App SDK app: step grid on the draft, Cue toggle (plays draft locally), Drop button (publish action) | two tabs: Deck Drop changes Floor | BUILT 2026-10-04: typechecks, builds, 16/16 engine tests. NOT browser-verified: App SDK apps render only inside the signed-in Dashboard. Human check: run `npm run dev` in deck/ and open the printed Dashboard URL |
| 5 Studio input | `phase/5-studio-input` | Custom StepGrid input for `lane.steps` in Studio | grid usable inside Studio | BUILT 2026-10-04: typechecks, studio builds. Human check pending (open studio dev, lane steps field) |
| 6 UI pass | `phase/6-ui` | `ui-studio` pipeline over Floor + Deck, section 6 brief | quality bar in `~/.claude/skills/ui-studio/SKILL.md`, rendered, 8 widths, both themes | DONE 2026-10-04 for Floor + Booth + Deck styling. Floor ui-score 91/100 (controls passed), palette measured in both themes, Drop filmed (dark + reduced motion), booth click path 10/10, publish path 6/6. Deck and Studio input NOT browser-verified (need your Dashboard login). Specialists run: frontend-design, emil-design-eng, make-interfaces-feel-better, animate, better-interface (+6 domains). Not run: prototype/variant skills as such (three directions were rendered by hand), hallmark, ecc:browser-qa (playwright MCP down), ecc:design-system audit, true blind critic |
| 7 Signature moment | `phase/7-drop-moment` | The Drop choreography (about 900 ms) + reduced-motion path | filmstrip looked at; reduced-motion ends in same state | todo |
| 8 Deploy | `phase/8-deploy` | `sanity deploy` (Deck), Floor host, hosted Studio | judge path run on the deployed Floor URL from a clean profile | todo |
| 9 Packaging | `phase/9-packaging` | README, `CLAIMS.md`, build writeup, 15 s clip, Agent Session (scrubbed) | pre-submit grep `mock\|fake\|dummy\|lorem\|0x0000\|picsum\|randomuser\|example.com` clean | todo |
| 10 Stretch | `phase/10-stretch` | `drop` history doc + "last 5 drops" strip; Workflows-style `setlist` | only if 1-9 are green | todo |

Cuts, in order, if time tightens: 10 -> 5 -> Deck becomes a Next.js page behind a token-gated route (keeps the mechanism, loses the App SDK bonus). Never cut 3: it is the entry. If 3 fails, stop and report.

## 6. UI brief (run through `ui-studio`; floors from its section 1a)

- **Subject vocabulary** (not "neon club", the default trap): a record shop and a DJ's flight case. Masking-tape labels with marker handwriting, crate dividers, cue sheets on paper, sleeve board, safety-orange stickers.
- **Colour (draft, to be measured in OKLCH per the skill):** warm charcoal ground (hue ~55, tinted not grey), cream paper surface, **one accent: vermilion** reserved for the Drop button. Support hues with jobs: **teal = Cue/drafts**, **amber = Room/published**, mustard = playhead. Teal vs amber carries the concept; they must read as different (target dE76 >= 20). Both themes.
- **Imagery:** R1 first: crops of the real step grid with real data. R2: one hand-built sleeve/record SVG graded to the palette for the Floor hero. No stock photos, no AI images.
- **Motion (`motion/react`):** feedback on every step toggle; playhead is a single transform. **Signature moment = The Drop (about 900 ms):** the Cue grid slides into the Room grid, the playhead flares once on the downbeat, the record spins up. Everything else stays quiet. Reduced motion lands on the same end state.
- **Responsive:** Floor works on a phone (a judge may open it there): grid pages horizontally, 8 steps at a time. Deck is desktop-first with a phone fallback message.
- **Hierarchy contract (Floor, first viewport):** where am I = "the Room, live"; what matters = the playing pattern; what can I do = Start / Mute; what just happened = last Drop time; what next = "open the Deck".

## 7. Verification gates

- `shared/engine` unit tests first (TDD): step math, bar-boundary swap, swing.
- Planted control for the latency probe: a draft edit that is NOT published must NOT change the Floor.
- Drive Chrome over CDP for the rendered UI (no inference from build exit codes); screenshots at 320 / 375 / 768 / 1280 / 1920.
- `ecc:security-review`: confirm no token in the Floor bundle (grep the built output for the token string).
- Judge path run on the deployed URL from a clean profile.

## 8. Submission checklist (Path Two)

- Post uses the Path Two template, tag `#sanitychallenge`. **Project ID / public dataset URL in the post.**
- Honest build writeup: what the AI got wrong. The releases correction (B4) and the references trap (B6) are real and make it credible.
- Floor URL, repo, Deck screenshots + clip, Agent Session embed (Public, scrubbed).
- HF26 Derica has the same deadline minute; decide which gets the hours.
- **He presses Publish. Prepared is not submitted.**

## 9. Honest odds

- ~3/10 for a top-2 Path Two spot among ~90 entries. Tie-break is DEV reactions, so the clip and post title matter as much as the code.
- Field leaders: GrantQuest (56 reactions), CHRONOS-HEIST (44), a 3D library (34). Games and toys draw reactions. Cue is a toy too, but one that is also the schema story.
- Weakest links: (a) judges not pressing play, (b) Deck not openable by judges, (c) time. Mitigations: 15 s clip at the top of the post, a Floor that works without the Deck, step 3 done first.
