// Measures the Cue palette from floor/styles/tokens.css: WCAG contrast for text and graphic pairs,
// CIE76 delta E for "are these two hues different". Planted controls run first and must give
// known answers, otherwise the scan is blind and no number is trusted.
import {readFileSync} from 'node:fs'

const css = readFileSync(new URL('../floor/styles/tokens.css', import.meta.url), 'utf8')

const TOKEN = /--([a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g

function tokens(src) {
  const out = {}
  for (const [, k, l, c, h] of src.matchAll(TOKEN)) out[k] = [Number(l), Number(c), Number(h)]
  return out
}

const rootStart = css.indexOf(':root {')
const mediaStart = css.indexOf('@media (prefers-color-scheme: light)')
const dark = tokens(css.slice(rootStart, mediaStart))
const light = {...dark, ...tokens(css.slice(mediaStart, css.indexOf(":root[data-theme='light']")))}

if (Object.keys(dark).length < 15 || Object.keys(light).length < 15) {
  console.log('PARSE FAILED: found', Object.keys(dark).length, 'dark tokens and', Object.keys(light).length, 'light tokens')
  process.exit(2)
}
// the light block must really differ from the dark one, or the extractor is blind
if (light.ground[0] === dark.ground[0]) {
  console.log('PARSE FAILED: light theme equals dark theme')
  process.exit(2)
}

function toRgb([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)))
}
const lum = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
const ratio = (a, b) => {
  const x = lum(toRgb(a))
  const y = lum(toRgb(b))
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
function lab(c) {
  const [r, g, b] = toRgb(c)
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]
}
const dE = (a, b) => {
  const p = lab(a)
  const q = lab(b)
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}

// planted controls
const black = [0, 0, 0]
const white = [1, 0, 0]
const c1 = ratio(black, white)
const c2 = ratio(dark.ground, dark.ground)
const c3 = dE(dark.room, dark.room)
const c4 = dE(black, white)
const okCtl = Math.abs(c1 - 21) < 0.1 && Math.abs(c2 - 1) < 1e-9 && c3 === 0 && c4 > 90
console.log(okCtl ? 'controls ok' : 'CONTROLS FAILED', c1.toFixed(2), c2.toFixed(2), c3.toFixed(1), c4.toFixed(1))
if (!okCtl) process.exit(2)

const pairs = [
  ['ink', 'ground', 4.5],
  ['mute', 'ground', 4.5],
  ['mute', 'raise', 4.5],
  ['room', 'ground', 4.5],
  ['cue', 'ground', 4.5],
  ['drop', 'ground', 3],
  ['on-room', 'room', 4.5],
  ['on-cue', 'cue', 4.5],
  ['on-drop', 'drop', 4.5],
  ['paper-ink', 'paper', 4.5],
  ['hole', 'paper', 4.5],
  ['room-ink', 'paper', 3],
  ['cue-ink', 'paper', 3],
  ['paper', 'ground', 1.1],
]
let fails = 0
for (const [name, theme] of [
  ['dark', dark],
  ['light', light],
]) {
  console.log('\n' + name)
  for (const [f, b, min] of pairs) {
    const r = ratio(theme[f], theme[b])
    const ok = r >= min
    if (!ok) fails++
    console.log((ok ? 'ok   ' : 'FAIL ') + f.padEnd(10) + ' on ' + b.padEnd(8) + r.toFixed(2) + ':1  need ' + min)
  }
  for (const [a, b] of [
    ['room', 'cue'],
    ['room', 'drop'],
    ['cue', 'drop'],
    ['room-ink', 'cue-ink'],
  ]) {
    const d = dE(theme[a], theme[b])
    const ok = d >= 20
    if (!ok) fails++
    console.log((ok ? 'ok   ' : 'FAIL ') + (a + ' vs ' + b).padEnd(20) + 'dE76 ' + d.toFixed(1) + '  need 20')
  }
  console.log('chroma  ground ' + theme.ground[1] + ', raise ' + theme.raise[1] + ', room ' + theme.room[1] + ', cue ' + theme.cue[1] + ', drop ' + theme.drop[1])
}
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED')
process.exit(fails ? 1 : 0)
