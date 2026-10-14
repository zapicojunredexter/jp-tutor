// Stroke geometry for the "Write it" mode: loads KanjiVG stroke data, builds
// glyphs (including two-part combinations like きゃ) and grades drawn strokes.
// Everything runs in the browser — no server involved.

export const BOX = 109 // KanjiVG glyphs are drawn in a 109×109 box
const SAMPLES = 32

let dataPromise = null
/** Lazy-load the stroke data so it only ships when writing mode is used. */
export function loadStrokes() {
  dataPromise ??= import('../data/strokes.js').then((m) => m.default)
  return dataPromise
}

// Path sampling uses the browser's own SVG geometry engine.
let measurer = null
function samplePath(d) {
  if (!measurer) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('aria-hidden', 'true')
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
    measurer = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    svg.appendChild(measurer)
    document.body.appendChild(svg)
  }
  measurer.setAttribute('d', d)
  const len = measurer.getTotalLength()
  const pts = []
  for (let i = 0; i <= 64; i++) {
    const p = measurer.getPointAtLength((len * i) / 64)
    pts.push({ x: p.x, y: p.y })
  }
  return pts
}

const bbox = (pts) => ({
  minX: Math.min(...pts.map((p) => p.x)),
  maxX: Math.max(...pts.map((p) => p.x)),
  minY: Math.min(...pts.map((p) => p.y)),
  maxY: Math.max(...pts.map((p) => p.y)),
})

/**
 * Build the glyph for a kana string. Single kana use the KanjiVG box as is.
 * Combinations (base + small ゃ/ゅ/ょ) put the small kana, scaled down, to the
 * lower right of the base — the way it's written by hand.
 * Returns { width, height, strokes: [{ d, transform, points, length }] }.
 */
export function buildGlyph(data, kana) {
  const parts = [...kana]
  const strokes = []
  let width = BOX
  parts.forEach((ch, partIndex) => {
    const paths = data[ch]
    if (!paths) throw new Error(`No stroke data for ${ch}`)
    const raw = paths.map(samplePath)
    let t = { dx: 0, dy: 0, s: 1 }
    if (partIndex > 0) {
      const prev = bbox(strokes.flatMap((st) => st.points))
      const own = bbox(raw.flat())
      const s = 0.6
      t = { s, dx: prev.maxX + 6 - own.minX * s, dy: prev.maxY - own.maxY * s }
      width = Math.ceil(own.maxX * s + t.dx + Math.max(8, prev.minX * 0.6))
    }
    paths.forEach((d, i) => {
      const points = raw[i].map((p) => ({ x: p.x * t.s + t.dx, y: p.y * t.s + t.dy }))
      strokes.push({
        d,
        transform: t.s === 1 ? undefined : `translate(${t.dx} ${t.dy}) scale(${t.s})`,
        points,
        length: pathLength(points),
      })
    })
  })
  return { width, height: BOX, strokes }
}

function pathLength(pts) {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return len
}

/** Evenly re-space a polyline into n points so two strokes can be compared point by point. */
export function resample(pts, n = SAMPLES) {
  if (pts.length === 1) return Array.from({ length: n }, () => ({ ...pts[0] }))
  const total = pathLength(pts)
  if (total === 0) return Array.from({ length: n }, () => ({ ...pts[0] }))
  const step = total / (n - 1)
  const out = [{ ...pts[0] }]
  let acc = 0
  let i = 1
  let prev = pts[0]
  while (out.length < n - 1 && i < pts.length) {
    const cur = pts[i]
    const seg = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    if (acc + seg >= step && seg > 0) {
      const t = (step - acc) / seg
      const p = { x: prev.x + (cur.x - prev.x) * t, y: prev.y + (cur.y - prev.y) * t }
      out.push(p)
      prev = p
      acc = 0
    } else {
      acc += seg
      prev = cur
      i++
    }
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1] })
  return out
}

const meanDistance = (a, b) => a.reduce((sum, p, i) => sum + Math.hypot(p.x - b[i].x, p.y - b[i].y), 0) / a.length

/** How far (in glyph units) a drawn stroke is from an expected one, both ways round. */
function compare(drawn, expected) {
  const a = resample(drawn)
  const b = resample(expected.points)
  return { forward: meanDistance(a, b), backward: meanDistance(a, [...b].reverse()) }
}

/**
 * True when the stroke travels against the expected start → end direction
 * (e.g. ソ drawn upwards, which makes it look like ン). Skipped for strokes whose
 * ends are too close together for direction to be meaningful.
 */
function wrongWay(drawn, expected) {
  const ex = expected[expected.length - 1].x - expected[0].x
  const ey = expected[expected.length - 1].y - expected[0].y
  const dx = drawn[drawn.length - 1].x - drawn[0].x
  const dy = drawn[drawn.length - 1].y - drawn[0].y
  const el = Math.hypot(ex, ey)
  const dl = Math.hypot(dx, dy)
  if (el < 8 || dl < 3) return false
  return (ex * dx + ey * dy) / (el * dl) < -0.3
}

// Tolerance in glyph units (the box is 109 wide). Short strokes such as the
// dakuten ticks get a little extra room since they're hard to place exactly.
const tolerance = (stroke) => (stroke.length < 20 ? 17 : 14)

/**
 * How far a drawn stroke sits from where it should be, on average. The pad keeps
 * a running drift so someone who writes a little off-centre isn't penalised.
 */
export function strokeOffset(drawn, expected) {
  const a = resample(drawn)
  const b = resample(expected.points)
  const n = a.length
  return {
    x: a.reduce((s, p, i) => s + p.x - b[i].x, 0) / n,
    y: a.reduce((s, p, i) => s + p.y - b[i].y, 0) / n,
  }
}

/**
 * Grade one drawn stroke against the stroke the learner should write next.
 * `drift` is the learner's average offset so far (from strokeOffset).
 * Returns { result: 'ok' | 'direction' | 'order' | 'shape' | 'ignore', other? }.
 */
export function gradeStroke(rawDrawn, strokes, nextIndex, drift = { x: 0, y: 0 }) {
  const drawn = rawDrawn.map((p) => ({ x: p.x - drift.x, y: p.y - drift.y }))
  const expected = strokes[nextIndex]
  const drawnLength = pathLength(drawn)
  // A stray tap on a long stroke is most likely an accident, not an attempt.
  if (drawnLength < 3 && expected.length > 15) return { result: 'ignore' }

  const { forward, backward } = compare(drawn, expected)
  const distance = Math.min(forward, backward)

  // Does it fit a later stroke? Neighbours like the two dakuten ticks can both be
  // within tolerance, so a later stroke only wins when it fits clearly better.
  let later = null
  for (let i = nextIndex + 1; i < strokes.length; i++) {
    const other = compare(drawn, strokes[i])
    const d = Math.min(other.forward, other.backward)
    if (d <= tolerance(strokes[i]) && (!later || d < later.d)) later = { i, d }
  }

  if (distance <= tolerance(expected) && !(later && later.d < distance * 0.5)) {
    return { result: wrongWay(drawn, expected.points) ? 'direction' : 'ok' }
  }
  if (later) return { result: 'order', other: later.i }
  return { result: 'shape' }
}
