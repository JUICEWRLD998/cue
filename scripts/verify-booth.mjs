// Click-path check of the public booth, driven in real Chrome over CDP.
// Usage: node scripts/verify-booth.mjs http://localhost:3101
import {spawn} from 'node:child_process'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const base = process.argv[2] ?? 'http://localhost:3101'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'cue-booth-'))
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--autoplay-policy=no-user-gesture-required', 'about:blank'], {stdio: 'ignore'})
let ws, id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, {resolve, reject}); ws.send(JSON.stringify({id: i, method, params})) })
const ev = async (e) => { const r = await send('Runtime.evaluate', {expression: e, returnByValue: true}); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value }
const results = []
const check = (name, ok, detail = '') => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  ' + detail : '')) }
const sel = (label) => JSON.stringify('[aria-label="' + label + '"]')
const pressed = (label) => ev('(() => { const b = document.querySelector(' + sel(label) + '); return b ? b.getAttribute("aria-pressed") : "missing" })()')
const clickLabel = (label) => ev('document.querySelector(' + sel(label) + ').click()')
const clickText = (t) => ev('Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === ' + JSON.stringify(t) + ').click()')
const text = (sel) => ev('(document.querySelector(' + JSON.stringify(sel) + ') || {}).textContent || ""')
try {
  let target
  for (let i = 0; i < 40 && !target; i++) { try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page') } catch { await sleep(250) } }
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result) } }
  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.navigate', {url: base + '/booth'})
  for (let i = 0; i < 40; i++) { if ((await pressed('Kick, step 1')) !== 'missing') break; await sleep(250) }

  // planted control: the first section has a kick on step 1 and none on step 2, so the probe must tell them apart
  check('CONTROL: probe distinguishes a punched hole from an empty one', (await pressed('Kick, step 1')) === 'true' && (await pressed('Kick, step 2')) === 'false')
  check('starts identical to the room', (await text('[aria-live]')).includes('Same as the room'))
  check('reset is disabled with no changes', await ev('Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Reset to the room").disabled'))

  await clickLabel('Kick, step 2'); await sleep(200)
  check('clicking an empty step punches it', (await pressed('Kick, step 2')) === 'true')
  check('count says 1 change', (await text('[aria-live]')).includes('1 change'), await text('[aria-live]'))
  check('reset becomes available', !(await ev('Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Reset to the room").disabled')))

  await clickLabel('Kick, step 2'); await sleep(200)
  check('punching the same hole again returns to identical', (await text('[aria-live]')).includes('Same as the room'), await text('[aria-live]'))

  await clickLabel('Snare, step 5'); await sleep(200)
  await clickText('Reset to the room'); await sleep(1500)
  check('reset restores the room song', (await pressed('Snare, step 5')) === 'false' && (await text('[aria-live]')).includes('Same as the room'))

  await clickText('Hear my draft'); await sleep(1500)
  const stopLabel = await ev('Array.from(document.querySelectorAll("button")).some(b => b.textContent.trim() === "Stop my draft")')
  const head = await ev('!!document.querySelector("[class*=headTrack]")')
  check('hearing the draft shows the cue head', stopLabel && head)
  await clickText('Stop my draft'); await sleep(500)
  check('stopping returns the button and hides the head', (await ev('Array.from(document.querySelectorAll("button")).some(b => b.textContent.trim() === "Hear my draft")')) && !(await ev('!!document.querySelector("[class*=headTrack]")')))
} catch (e) {
  check('driver ran without error', false, String(e))
} finally {
  try { ws?.close() } catch {}
  chrome.kill()
  await sleep(500)
  try { rmSync(profile, {recursive: true, force: true}) } catch {}
}
const failed = results.filter((r) => !r).length
console.log(failed ? failed + ' FAILED' : 'ALL PASSED')
process.exit(failed ? 1 : 0)
