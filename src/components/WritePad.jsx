import { useEffect, useRef, useState } from 'react'
import { BOX, buildGlyph, gradeStroke, loadStrokes, strokeOffset } from '../lib/strokes'
import { IconRedo } from './Icons'

const HINT_AFTER = 2 // misses on one stroke before its outline is shown
const DEMO_STROKE_MS = 550
const DEMO_GAP_MS = 150

/**
 * Drawing surface for one kana. The learner draws stroke by stroke; each stroke
 * is graded as soon as the pen lifts. Calls onComplete({ clean }) once every
 * stroke is in — `clean` is false if a hint or the demo was needed.
 */
export default function WritePad({ kana, onComplete }) {
  const [glyph, setGlyph] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(0)
  const [live, setLive] = useState(null) // points of the stroke being drawn
  const [miss, setMiss] = useState(null) // { points, id } of the last rejected stroke
  const [misses, setMisses] = useState(0) // misses on the current stroke
  const [message, setMessage] = useState(null)
  const [hinted, setHinted] = useState(false)
  const [trace, setTrace] = useState(false) // after the demo: show the whole glyph to trace over
  const [demo, setDemo] = useState(null) // id of a running demo, or null
  const svgRef = useRef(null)
  const drawing = useRef(null)
  const timers = useRef([])
  const drift = useRef({ x: 0, y: 0, n: 0 }) // learner's average offset over accepted strokes

  useEffect(() => {
    let alive = true
    loadStrokes()
      .then((data) => alive && setGlyph(buildGlyph(data, kana)))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [kana])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  const total = glyph?.strokes.length ?? 0
  const complete = glyph && done >= total
  const busy = complete || demo !== null

  const toSvg = (e) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM().inverse())
    return { x: p.x, y: p.y }
  }

  const onPointerDown = (e) => {
    if (busy || !glyph || drawing.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    try {
      svgRef.current.setPointerCapture(e.pointerId) // keep the stroke going if the pen leaves the box
    } catch {
      /* capture isn't essential */
    }
    drawing.current = { id: e.pointerId, points: [toSvg(e)] }
    setLive(drawing.current.points)
  }

  const onPointerMove = (e) => {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    // Coalesced events give smoother lines on fast pens; fall back to the event itself
    const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? []
    const events = coalesced.length ? coalesced : [e.nativeEvent]
    d.points = [...d.points, ...events.map(toSvg)]
    setLive(d.points)
  }

  const onPointerUp = (e) => {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    drawing.current = null
    setLive(null)
    submit(d.points)
  }

  const submit = (points) => {
    const { result, other } = gradeStroke(points, glyph.strokes, done, drift.current)
    if (result === 'ignore') return
    if (result === 'ok') {
      const off = strokeOffset(points, glyph.strokes[done])
      const d = drift.current
      drift.current = { x: (d.x * d.n + off.x) / (d.n + 1), y: (d.y * d.n + off.y) / (d.n + 1), n: d.n + 1 }
      const next = done + 1
      setDone(next)
      setMisses(0)
      setMiss(null)
      setMessage(null)
      if (next >= total) later(() => onComplete({ clean: !hinted }), 350)
      return
    }
    const n = misses + 1
    setMisses(n)
    setMiss({ points, id: Date.now() })
    const strokeNo = done + 1
    const text = {
      direction: `Right shape, but stroke ${strokeNo} goes the other way.`,
      order: `That’s stroke ${other + 1}. Stroke ${strokeNo} comes first.`,
      shape: `Not quite — try stroke ${strokeNo} again.`,
    }[result]
    if (n >= HINT_AFTER && !trace) {
      setHinted(true)
      setMessage({ kind: 'hint', text: `${text} Follow the outline, starting at the dot.` })
    } else {
      setMessage({ kind: 'warn', text })
    }
  }

  const showMe = () => {
    if (!glyph || demo !== null) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setHinted(true)
    setDone(0)
    drift.current = { x: 0, y: 0, n: 0 }
    setMisses(0)
    setMiss(null)
    setMessage(null)
    const id = Date.now()
    setDemo(id)
    later(() => {
      setDemo(null)
      setTrace(true)
      setMessage({ kind: 'hint', text: 'Your turn — trace it in the same order.' })
    }, total * (DEMO_STROKE_MS + DEMO_GAP_MS) + 300)
  }

  const restart = () => {
    if (demo !== null) return
    setDone(0)
    drift.current = { x: 0, y: 0, n: 0 }
    setMisses(0)
    setMiss(null)
    setMessage(null)
  }

  if (error) return <div className="write-card write-error">Couldn’t load the stroke data. Check your connection and try again.</div>
  if (!glyph) return <div className="write-card write-loading" aria-busy="true" />

  const showHint = !complete && demo === null && misses >= HINT_AFTER
  const current = glyph.strokes[done]
  const strokePath = (s, key, props) => <path key={key} d={s.d} transform={s.transform} {...props} />

  return (
    <div className="write">
      <div className={`write-card ${glyph.width > BOX ? 'wide' : ''} ${complete ? 'is-complete' : ''}`} style={{ aspectRatio: `${glyph.width} / ${glyph.height}` }}>
        <svg
          ref={svgRef}
          className="write-pad"
          viewBox={`0 0 ${glyph.width} ${glyph.height}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="img"
          aria-label={`Writing area. Stroke ${Math.min(done + 1, total)} of ${total}.`}
        >
          <g className="guides">
            <line x1={BOX / 2} y1="4" x2={BOX / 2} y2={BOX - 4} />
            <line x1="4" y1={BOX / 2} x2={BOX - 4} y2={BOX / 2} />
          </g>

          {trace && !complete && <g className="ghost">{glyph.strokes.slice(done).map((s, i) => strokePath(s, i))}</g>}

          {showHint && current && (
            <g className="hint" key={`hint-${done}`}>
              {strokePath(current, undefined, { pathLength: 1 })}
              <circle cx={current.points[0].x} cy={current.points[0].y} r="3.2" />
            </g>
          )}

          <g className="ink">{glyph.strokes.slice(0, done).map((s, i) => strokePath(s, i))}</g>

          {demo !== null && (
            <g className="demo" key={demo}>
              {glyph.strokes.map((s, i) =>
                strokePath(s, i, {
                  pathLength: 1,
                  style: { animationDelay: `${i * (DEMO_STROKE_MS + DEMO_GAP_MS)}ms`, animationDuration: `${DEMO_STROKE_MS}ms` },
                }),
              )}
            </g>
          )}

          {miss && <polyline key={miss.id} className="miss" points={miss.points.map((p) => `${p.x},${p.y}`).join(' ')} />}
          {live && <polyline className="live" points={live.map((p) => `${p.x},${p.y}`).join(' ')} />}
        </svg>
      </div>

      <div className="write-bar">
        <span className="write-count">
          {complete ? 'Done' : `Stroke ${done + 1} of ${total}`}
        </span>
        <div className="write-actions">
          <button className="btn-text" onClick={restart} disabled={busy || done === 0}>
            <IconRedo width={15} height={15} /> Start over
          </button>
          <button className="btn btn-soft" onClick={showMe} disabled={busy}>
            Show me
          </button>
        </div>
      </div>

      <p className={`write-message ${message?.kind ?? ''}`} role="status" aria-live="polite">
        {message?.text ?? ' '}
      </p>
    </div>
  )
}
