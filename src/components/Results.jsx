import { IconRedo, IconCheck } from './Icons'

function message(pct) {
  if (pct === 100) return 'Every one on the first try. Wonderful!'
  if (pct >= 80) return 'Really solid. A couple more rounds and these will stick.'
  if (pct >= 50) return 'Good progress — repetition is exactly how this works.'
  return 'Every round helps. Try a smaller set, then add more as they click.'
}

export default function Results({ items, onRetryMissed, onAgain, onBack }) {
  const firstTry = items.filter((i) => i.firstTry).length
  const missed = items.filter((i) => !i.firstTry)
  const pct = items.length ? Math.round((firstTry / items.length) * 100) : 0
  const r = 52
  const circ = 2 * Math.PI * r

  return (
    <div className="results">
      <div className="card results-card">
        <div className="score-ring" aria-label={`${pct}% on the first try`}>
          <svg viewBox="0 0 120 120" width="140" height="140">
            <circle cx="60" cy="60" r={r} className="ring-bg" />
            <circle
              cx="60"
              cy="60"
              r={r}
              className="ring-fg"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="score-text">
            <strong>{firstTry}</strong>
            <span>of {items.length}</span>
          </div>
        </div>
        <h2>Round complete</h2>
        <p className="muted">
          You knew {firstTry} of {items.length} on the first try. {message(pct)}
        </p>

        <div className="results-actions">
          {missed.length > 0 && (
            <button className="btn btn-primary" onClick={() => onRetryMissed(missed.map((m) => m.char.id))}>
              <IconRedo width={16} height={16} /> Practice the {missed.length} I missed
            </button>
          )}
          <button className={`btn ${missed.length ? 'btn-soft' : 'btn-primary'}`} onClick={onAgain}>
            Same set again
          </button>
          <button className="btn-text" onClick={onBack}>
            Change my selection
          </button>
        </div>
      </div>

      {missed.length > 0 && <ResultGroup title="Worth another look" items={missed} kind="missed" />}
      {firstTry > 0 && <ResultGroup title="Knew these" items={items.filter((i) => i.firstTry)} kind="ok" />}
    </div>
  )
}

function ResultGroup({ title, items, kind }) {
  return (
    <section className="card result-group">
      <h3>
        {title} <span className="muted">({items.length})</span>
      </h3>
      <div className="result-tiles">
        {items.map(({ char }) => (
          <div key={char.id} className={`result-tile ${kind}`}>
            {kind === 'ok' && <IconCheck className="tile-check" width={14} height={14} />}
            <span className="jp tile-kana">{char.kana}</span>
            <span className="tile-romaji">{char.romaji}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
