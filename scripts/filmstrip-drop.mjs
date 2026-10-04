// Films the Drop: starts the room, publishes a different pattern, records screencast frames
// from the moment the change is queued until a second after it lands, and tiles them.
// Usage: node scripts/filmstrip-drop.mjs <baseUrl> <outDir> [scheme]
import {spawn, execFileSync} from 'node:child_process'
import {mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync} from 'node:fs'
import {tmpdir, homedir} from 'node:os'
import {join} from 'node:path'

const [base, out, scheme = 'dark'] = process.argv.slice(2)
mkdirSync(out, {recursive: true})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const token = JSON.parse(readFileSync(join(homedir(), '.config', 'sanity', 'config.json'), 'utf8')).authToken
const API = 'https://jwc6peq5.api.sanity.io/v2025-02-19'
const q = await (await fetch(API + '/data/query/production?query=' + encodeURIComponent('*[_id=="song-warmup"][0]'))).json()
const original = q.result
const mutate = async (mutations) => {
  const r = await fetch(API + '/data/mutate/production', {method: 'POST', headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'}, body: JSON.stringify({mutations})})
  if (!r.ok) throw new Error('mutate ' + r.status + ' ' + (await r.text()))
}
const restore = () => {
  const {_rev, _updatedAt, _createdAt, ...doc} = original
  return mutate([{createOrReplace: doc}, {delete: {id: 'drafts.song-warmup'}}])
}

const profile = mkdtempSync(join(tmpdir(), 'cue-film-'))
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--autoplay-policy=no-user-gesture-required', 'about:blank'], {stdio: 'ignore'})
let ws, id = 0
const pending = new Map()
const frames = []
const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, {resolve, reject}); ws.send(JSON.stringify({id: i, method, params})) })
const ev = async (e) => (await send('Runtime.evaluate', {expression: e, returnByValue: true})).result.value
const status = () => ev('document.querySelector("[aria-live]") ? document.querySelector("[aria-live]").textContent : ""')
let recording = false
try {
  let target
  for (let i = 0; i < 40 && !target; i++) { try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page') } catch { await sleep(250) } }
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result) }
    else if (msg.method === 'Page.screencastFrame') {
      if (recording) frames.push({t: msg.params.metadata.timestamp, data: msg.params.data})
      send('Page.screencastFrameAck', {sessionId: msg.params.sessionId}).catch(() => {})
    }
  }
  await send('Page.enable'); await send('Runtime.enable')
  const features = [{name: 'prefers-color-scheme', value: scheme}]
  if (process.argv[5] === 'reduce') features.push({name: 'prefers-reduced-motion', value: 'reduce'})
  await send('Emulation.setEmulatedMedia', {features})
  await send('Emulation.setDeviceMetricsOverride', {width: 1280, height: 800, deviceScaleFactor: 1, mobile: false})
  await send('Page.navigate', {url: base})
  await sleep(2500)
  await ev('Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Start the room")).click()')
  await sleep(2000)
  await send('Page.startScreencast', {format: 'jpeg', quality: 70, everyNthFrame: 1})
  // a visibly different intro: kick on a syncopated pattern, hats on every off-beat
  const next = JSON.parse(JSON.stringify(original))
  for (const s of next.sections) {
    for (const l of s.lanes) {
      if (l.voice._ref === 'voice-kick') l.steps = [0, 3, 6, 8, 11, 14].map((i) => ({_type: 'step', _key: 's' + i, index: i, velocity: 0.9, probability: 1, nudge: 0}))
      if (l.voice._ref === 'voice-hat') l.steps = [1, 3, 5, 7, 9, 11, 13, 15].map((i) => ({_type: 'step', _key: 's' + i, index: i, velocity: 0.6, probability: 1, nudge: 0}))
    }
  }
  const {_rev, _updatedAt, _createdAt, ...doc} = next
  await mutate([{createOrReplace: doc}])
  let queued = false
  for (let i = 0; i < 100 && !queued; i++) { queued = (await status()).includes('queued'); if (!queued) await sleep(40) }
  recording = true
  let dropped = false
  for (let i = 0; i < 200 && !dropped; i++) { dropped = (await status()).includes('Dropped'); if (!dropped) await sleep(40) }
  await sleep(1300)
  recording = false
  await send('Page.stopScreencast')
  console.log('queued seen:', queued, 'dropped seen:', dropped, 'frames:', frames.length)
  // keep about 12 evenly spaced frames
  const pick = []
  const n = Math.min(12, frames.length)
  for (let i = 0; i < n; i++) pick.push(frames[Math.floor((i * (frames.length - 1)) / Math.max(1, n - 1))])
  pick.forEach((f, i) => writeFileSync(join(out, 'frame-' + String(i).padStart(2, '0') + '.jpg'), Buffer.from(f.data, 'base64')))
  const span = frames.length ? (frames[frames.length - 1].t - frames[0].t).toFixed(2) : '0'
  console.log('recorded span (s):', span)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(out, 'frame-%02d.jpg'), '-vf', 'crop=1280:560:0:230,scale=640:-1,tile=3x4', '-frames:v', '1', join(out, 'sheet.jpg')])
  console.log('sheet:', join(out, 'sheet.jpg'))
} finally {
  try { await restore() } catch (e) { console.log('RESTORE FAILED', String(e)) }
  try { ws?.close() } catch {}
  chrome.kill()
  await sleep(500)
  try { rmSync(profile, {recursive: true, force: true}) } catch {}
}
process.exit(0)
