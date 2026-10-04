// Phase 3 exit check: drives real Chrome over CDP against the running Floor.
// Usage: node scripts/verify-phase3.mjs http://localhost:3100
import {spawn} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync} from 'node:fs'
import {tmpdir, homedir} from 'node:os'
import {join} from 'node:path'

const URL_ = process.argv[2] ?? 'http://localhost:3100'
const PROJECT = 'jwc6peq5'
const API = `https://${PROJECT}.api.sanity.io/v2025-02-19`
const token = JSON.parse(readFileSync(join(homedir(), '.config', 'sanity', 'config.json'), 'utf8')).authToken
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function mutate(mutations) {
  const res = await fetch(`${API}/data/mutate/production?returnDocuments=false`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({mutations}),
  })
  if (!res.ok) throw new Error(`mutate ${res.status} ${await res.text()}`)
}

const profile = mkdtempSync(join(tmpdir(), 'cue-chrome-'))
const port = 9333
const chrome = spawn(
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
   '--autoplay-policy=no-user-gesture-required', '--window-size=1280,900', 'about:blank'],
  {stdio: 'ignore'},
)

let ws
let id = 0
const pending = new Map()
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id
    pending.set(i, {resolve, reject})
    ws.send(JSON.stringify({id: i, method, params}))
  })
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true})
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}
const statusText = () => evalJs('document.querySelector("[aria-live]") ? document.querySelector("[aria-live]").textContent : ""')

const results = []
const check = (name, ok, detail = '') => {
  results.push({name, ok})
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`)
}

try {
  let target
  for (let i = 0; i < 40 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
      target = list.find((t) => t.type === 'page')
    } catch { await sleep(250) }
  }
  if (!target) throw new Error('chrome did not start')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result)
    }
  }
  await send('Page.enable')
  await send('Runtime.enable')
  // clean slate BEFORE the page loads: song at 118 bpm, no draft
  await mutate([{patch: {id: 'song-warmup', set: {bpm: 118}}}, {delete: {id: 'drafts.song-warmup'}}])
  await sleep(1500)
  await send('Page.navigate', {url: URL_})
  await sleep(1500)


  await evalJs('Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Start the room")).click()')
  let live = false
  for (let i = 0; i < 40 && !live; i++) {
    live = await evalJs('document.body.textContent.includes("bpm")')
    if (!live) await sleep(250)
  }
  check('room opens and shows the published song', live)

  const steps = new Set()
  for (let i = 0; i < 30; i++) {
    steps.add(await evalJs('(() => { const h = document.querySelector("[class*=Roll-module][class*=head]:not([class*=headTrack])"); const m = h ? h.style.transform.match(/-?[0-9.]+/) : null; return m ? Number(m[0]) : -1 })()'))
    await sleep(100)
  }
  check('playhead moves on the wall clock', steps.size >= 4, `distinct steps seen: ${steps.size}`)

  const base = await statusText()
  check('starts with no drop', base.includes('No drop yet'), base.slice(0, 60))

  // planted control: an unpublished draft must not change the room
  await mutate([{createOrReplace: {_id: 'drafts.song-warmup', _type: 'song', title: 'DRAFT ONLY', bpm: 140,
    sections: [{_type: 'section', _key: 'x', title: 'x', kind: 'drop', bars: 1, lanes: []}]}}])
  await sleep(5000)
  const afterDraft = await statusText()
  const title = await evalJs('document.body.textContent')
  check('CONTROL: a draft edit does not reach the room', afterDraft.includes('No drop yet') && !title.includes('DRAFT ONLY') && !title.includes('140'))

  // the real thing: publish a change
  const t0 = Date.now()
  await mutate([{patch: {id: 'song-warmup', set: {bpm: 122}}}])
  let queuedAt = 0
  let droppedAt = 0
  for (let i = 0; i < 120 && !droppedAt; i++) {
    const s = await statusText()
    if (!queuedAt && s.includes('queued')) queuedAt = Date.now()
    if (s.includes('Dropped at')) droppedAt = Date.now()
    await sleep(50)
  }
  check('publish is noticed (queued)', queuedAt > 0, queuedAt ? `${queuedAt - t0} ms after publish` : '')
  check('publish drops within two bars', droppedAt > 0 && droppedAt - t0 < 2 * 16 * (60000 / 118 / 4) + 1500,
    droppedAt ? `${droppedAt - t0} ms after publish` : '')
  const final = await statusText()
  console.log('status:', final)
  const shot = await send('Page.captureScreenshot', {format: 'png'})
  const {writeFileSync} = await import('node:fs')
  writeFileSync(join(process.cwd(), 'scripts', 'phase3-floor.png'), Buffer.from(shot.data, 'base64'))
} catch (e) {
  check('driver ran without error', false, String(e))
} finally {
  try { await mutate([{patch: {id: 'song-warmup', set: {bpm: 118}}}, {delete: {id: 'drafts.song-warmup'}}]) } catch {}
  try { ws?.close() } catch {}
  chrome.kill()
  await sleep(500)
  try { rmSync(profile, {recursive: true, force: true}) } catch {}
}
const failed = results.filter((r) => !r.ok).length
console.log(failed ? `${failed} FAILED` : 'ALL PASSED')
process.exit(failed ? 1 : 0)
