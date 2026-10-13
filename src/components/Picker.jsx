import { useMemo, useState } from 'react'
import { SCRIPTS, CHAR_BY_ID } from '../data/kana'
import { isWeak, masteryLevel, MASTERY_LABELS } from '../lib/storage'
import { IconChevron, IconPlay, IconThrough } from './Icons'
import Segmented from './Segmented'

const MODES = [
  { id: 'flash', title: 'Flashcards', desc: 'Flip the card, then say if you knew it' },
  { id: 'choice', title: 'Multiple choice', desc: 'Pick the answer from 4 options' },
  { id: 'type', title: 'Type it', desc: 'Type the romaji for each kana' },
]

export default function Picker({ selection, setSelection, stats, onClearWeak, settings, setSettings, onStart }) {
  const [view, setView] = useState(settings.view || 'h')
  const script = SCRIPTS[view]

  const selectedIds = useMemo(() => [...selection], [selection])
  const countFor = (s) => selectedIds.filter((id) => CHAR_BY_ID[id]?.script === s).length

  const toggle = (ids, on) => {
    const next = new Set(selection)
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
    setSelection(next)
  }

  const changeView = (v) => {
    setView(v)
    setSettings({ ...settings, view: v })
  }

  const weakIds = useMemo(() => Object.keys(CHAR_BY_ID).filter((id) => isWeak(stats[id])), [stats])

  const emptyWeak = () => {
    const ok = window.confirm(
      `Clear your ${weakIds.length} weak spot${weakIds.length === 1 ? '' : 's'}?\n\nYour progress dots stay the same. A character comes back here only if you miss it again.`,
    )
    if (ok) onClearWeak(weakIds)
  }

  const typeMode = settings.mode === 'type'

  return (
    <div className="picker">
      <header className="hero">
        <div className="hero-mark" aria-hidden>
          かな
        </div>
        <div>
          <h1>Kana Practice</h1>
          <p>Pick the characters you’re learning, then practice just those. Take it slow — there’s no timer.</p>
        </div>
      </header>

      <div className="picker-layout">
        <main className="chart-area">
          <div className="chart-toolbar">
            <div className="script-tabs" role="tablist" aria-label="Writing system">
              {Object.values(SCRIPTS).map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={view === s.id}
                  className={`script-tab ${view === s.id ? 'active' : ''}`}
                  onClick={() => changeView(s.id)}
                >
                  <span className="script-tab-sample jp">{s.sample}</span>
                  <span>{s.name}</span>
                  {countFor(s.id) > 0 && <span className="pill">{countFor(s.id)}</span>}
                </button>
              ))}
            </div>
            <div className="quick-actions">
              {weakIds.length > 0 && (
                <button className="btn-text" onClick={() => setSelection(new Set(weakIds))} title="Characters you’ve missed recently">
                  Select my weak spots ({weakIds.length})
                </button>
              )}
              {weakIds.length > 0 && (
                <button className="btn-text" onClick={emptyWeak} title="Empty the weak spots list (progress is kept)">
                  Clear weak spots
                </button>
              )}
              <button className="btn-text" onClick={() => setSelection(new Set())} disabled={selection.size === 0}>
                Clear all
              </button>
            </div>
          </div>

          <p className="tip">
            Tip: tap a character to add it. Tap a row label to add the whole row, or{' '}
            <IconThrough width={14} height={14} className="inline-icon" /> to add every row up to that one.
          </p>

          {script.sections.map((section) => (
            <Section key={section.id} section={section} selection={selection} stats={stats} toggle={toggle} />
          ))}

          <div className="legend" aria-label="Progress legend">
            {MASTERY_LABELS.map((label, i) => (
              <span key={label} className="legend-item">
                <span className={`dot level-${i}`} /> {label}
              </span>
            ))}
          </div>
        </main>

        <aside className="setup card">
          <h2>Your practice set</h2>
          {selection.size === 0 ? (
            <p className="muted empty-deck">Nothing picked yet. Choose a few characters from the chart — even 5 is a great start.</p>
          ) : (
            <div className="deck-preview jp" aria-label={`${selection.size} characters selected`}>
              {selectedIds.slice(0, 48).map((id) => (
                <span key={id} className="deck-chip">
                  {CHAR_BY_ID[id]?.kana}
                </span>
              ))}
              {selection.size > 48 && <span className="deck-chip more">+{selection.size - 48}</span>}
            </div>
          )}

          <fieldset className="field">
            <legend>How do you want to practice?</legend>
            <div className="mode-list">
              {MODES.map((m) => (
                <label key={m.id} className={`mode-option ${settings.mode === m.id ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="mode"
                    value={m.id}
                    checked={settings.mode === m.id}
                    onChange={() => setSettings({ ...settings, mode: m.id })}
                  />
                  <span className="mode-title">{m.title}</span>
                  <span className="mode-desc">{m.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <span className="field-label">Show me</span>
            <Segmented
              value={typeMode ? 'kana' : settings.direction}
              onChange={(v) => setSettings({ ...settings, direction: v })}
              disabled={typeMode}
              options={[
                { value: 'kana', label: <><span className="jp">あ</span> → a</> },
                { value: 'romaji', label: <>a → <span className="jp">あ</span></> },
              ]}
            />
            {typeMode && <small className="muted">Typing mode always shows the kana.</small>}
          </div>

          <div className="field">
            <span className="field-label">Round length</span>
            <Segmented
              value={settings.repeats}
              onChange={(v) => setSettings({ ...settings, repeats: v })}
              options={[
                { value: 1, label: 'Each once' },
                { value: 2, label: 'Each twice' },
              ]}
            />
          </div>

          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.autoSound}
              onChange={(e) => setSettings({ ...settings, autoSound: e.target.checked })}
            />
            <span className="switch" aria-hidden />
            <span>Play the sound when the answer shows</span>
          </label>

          <button className="btn btn-primary btn-start" disabled={selection.size === 0} onClick={onStart}>
            <IconPlay width={16} height={16} />
            Start practice
            {selection.size > 0 && <span className="btn-count">{selection.size * settings.repeats} cards</span>}
          </button>
        </aside>
      </div>

      {/* Mobile quick-start bar */}
      <div className={`mobile-bar ${selection.size ? 'show' : ''}`}>
        <span>
          <strong>{selection.size}</strong> selected
        </span>
        <button className="btn btn-primary" onClick={onStart} disabled={!selection.size}>
          Start
        </button>
      </div>
    </div>
  )
}

function Section({ section, selection, stats, toggle }) {
  const allIds = section.rows.flatMap((r) => r.cells.filter(Boolean).map((c) => c.id))
  const count = allIds.filter((id) => selection.has(id)).length
  const [open, setOpen] = useState(section.id === 'basic' || count > 0)

  return (
    <section className={`kana-section card ${open ? 'open' : ''}`}>
      <div className="section-head">
        <button className="section-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          <IconChevron className="chev" />
          <span>
            <span className="section-title">{section.title}</span>
            <span className="section-sub">{section.subtitle}</span>
          </span>
        </button>
        <span className="section-count">
          {count}/{allIds.length}
        </span>
        <div className="section-actions">
          <button className="btn-text" onClick={() => toggle(allIds, true)} disabled={count === allIds.length}>
            All
          </button>
          <button className="btn-text" onClick={() => toggle(allIds, false)} disabled={count === 0}>
            None
          </button>
        </div>
      </div>

      {open && (
        <div className={`kana-grid cols-${section.columns}`}>
          {section.rows.map((row, ri) => {
            const ids = row.cells.filter(Boolean).map((c) => c.id)
            const n = ids.filter((id) => selection.has(id)).length
            const state = n === 0 ? 'none' : n === ids.length ? 'all' : 'some'
            const throughIds = section.rows.slice(0, ri + 1).flatMap((r) => r.cells.filter(Boolean).map((c) => c.id))
            return (
              <div className="kana-row" key={row.id}>
                <button
                  className={`row-label ${state}`}
                  onClick={() => toggle(ids, state !== 'all')}
                  title={state === 'all' ? 'Remove this row' : 'Add this whole row'}
                  aria-label={`${state === 'all' ? 'Remove' : 'Add'} ${row.label} row`}
                >
                  {row.label}
                </button>
                {row.cells.map((c, ci) =>
                  c ? (
                    <button
                      key={c.id}
                      className={`kana-cell ${selection.has(c.id) ? 'selected' : ''}`}
                      aria-pressed={selection.has(c.id)}
                      aria-label={`${c.kana} ${c.romaji}`}
                      onClick={() => toggle([c.id], !selection.has(c.id))}
                    >
                      <span className={`dot level-${masteryLevel(stats[c.id])}`} title={MASTERY_LABELS[masteryLevel(stats[c.id])]} />
                      <span className="cell-kana jp">{c.kana}</span>
                      <span className="cell-romaji">{c.romaji}</span>
                    </button>
                  ) : (
                    <span key={ci} className="kana-cell empty" aria-hidden />
                  ),
                )}
                <button
                  className="row-through"
                  onClick={() => toggle(throughIds, true)}
                  title="Add every row from the top up to this one"
                  aria-label={`Add all rows up to ${row.label}`}
                >
                  <IconThrough width={16} height={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
