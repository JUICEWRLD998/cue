// Screenshots a route at several widths and colour schemes over CDP.
// Usage: node scripts/shoot.mjs <baseUrl> <outDir> <route> <widths,comma> <scheme:dark|light> [click text]
import {spawn} from 'node:child_process'
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const [base, out, routeArg = 'root', widthsArg = '1280', scheme = 'dark', clickText = ''] = process.argv.slice(2)
const route = routeArg === 'root' ? '/' : '/' + routeArg
const widths = widthsArg.split(',').map(Number)
mkdirSync(out, {recursive: true})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'cue-shot-'))
const port = 9344 + Math.floor(Math.random() * 50)
const chrome = spawn(
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', 'about:blank'],
  {stdio: 'ignore'},
)
let ws, id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const i = ++id
  pending.set(i, {resolve, reject})
  ws.send(JSON.stringify({id: i, method, params}))
})
const ev = async (expression) => (await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true})).result.value
try {
  let target
  for (let i = 0; i < 40 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { await sleep(250) }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result) }
  }
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: scheme}]})
  for (const w of widths) {
    const h = w < 500 ? 900 : 800
    await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: w < 500})
    await send('Page.navigate', {url: base + route})
    await sleep(2500)
    if (clickText) {
      await ev(`Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes(${JSON.stringify(clickText)})) && Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes(${JSON.stringify(clickText)})).click()`)
      await sleep(1500)
    }
    const overflow = await ev('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    const shot = await send('Page.captureScreenshot', {format: 'png'})
    const name = `${route.replace(/[^a-z0-9]/gi, '_') || 'root'}-${scheme}-${w}.png`
    writeFileSync(join(out, name), Buffer.from(shot.data, 'base64'))
    console.log(name, 'horizontal overflow px:', overflow)
  }
} finally {
  try { ws?.close() } catch {}
  chrome.kill()
  await sleep(500)
  try { rmSync(profile, {recursive: true, force: true}) } catch {}
}
process.exit(0)
