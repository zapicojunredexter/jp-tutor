import { useMemo, useState } from 'react'
import { SCRIPTS, CHAR_BY_ID } from '../data/kana'
import { isWeak, masteryLevel, MASTERY_LABELS } from '../lib/storage'
import { IconArrowLeft, IconCards, IconChevron, IconChoice, IconKeyboard, IconPen, IconPlay, IconThrough } from './Icons'
import Segmented from './Segmented'

// `directional` modes let the learner pick kana → romaji or romaji → kana
const MODES = [
  { id: 'flash', title: 'Flashcards', Icon: IconCards, directional: true, desc: 'Flip each card, then say whether you knew it.' },
  { id: 'choice', title: 'Choose', Icon: IconChoice, directional: true, desc: 'Pick the right answer from 4 options.' },
  { id: 'type', title: 'Type it', Icon: IconKeyboard, desc: 'See the kana, type how it sounds (romaji).' },
  { id: 'write', title: 'Write it', Icon: IconPen, desc: 'See the sound, draw the kana. Stroke order is checked.' },
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

  const mode = MODES.find((m) => m.id === settings.mode) ?? MODES[0]

  return (
    <div className="picker">
      <div className="picker-layout">
        <main className="chart-area">
          {/* Header lives in the left column so the setup panel can start at the very top */}
          <header className="hero">
            <div className="hero-mark" aria-hidden>
              かな
            </div>
            <div>
              <h1>Kana Practice</h1>
              <p>Pick the characters you’re learning, then practice just those. Take it slow — there’s no timer.</p>
            </div>
          </header>

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

        <aside className="setup card" id="practice-setup" aria-label="Practice setup">
          <div className="setup-body">
            <section className="setup-step">
              <h2 className="step-title">
                <span className="step-num">1</span> Your characters
                {selection.size > 0 && <span className="step-count">{selection.size}</span>}
              </h2>
              {selection.size === 0 ? (
                <p className="empty-deck">
                  <IconArrowLeft width={16} height={16} className="empty-arrow" />
                  Tap characters in the chart to add them. Even 5 is a great start.
                </p>
              ) : (
                <div className="deck-preview jp" aria-label={`${selection.size} characters selected`}>
                  {selectedIds.slice(0, 23).map((id) => (
                    <span key={id} className="deck-chip">
                      {CHAR_BY_ID[id]?.kana}
                    </span>
                  ))}
                  {selection.size > 23 && <span className="deck-chip more">+{selection.size - 23}</span>}
                </div>
              )}
            </section>

            <fieldset className="setup-step">
              <legend className="step-title">
                <span className="step-num">2</span> How to practice
              </legend>
              <div className="mode-grid">
                {MODES.map(({ id, title, Icon }) => (
                  <label key={id} className={`mode-tile ${mode.id === id ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="mode"
                      value={id}
                      checked={mode.id === id}
                      onChange={() => setSettings({ ...settings, mode: id })}
                    />
                    <Icon width={20} height={20} />
                    <span>{title}</span>
                  </label>
                ))}
              </div>
              <p className="mode-explain">{mode.desc}</p>
            </fieldset>

            <section className="setup-step options">
              <h2 className="step-title">Options</h2>
              {mode.directional && (
                <div className="option-row">
                  <span className="option-label">Show</span>
                  <Segmented
                    value={settings.direction}
                    onChange={(v) => setSettings({ ...settings, direction: v })}
                    options={[
                      { value: 'kana', label: <><span className="jp">あ</span> → a</> },
                      { value: 'romaji', label: <>a → <span className="jp">あ</span></> },
                    ]}
                  />
                </div>
              )}
              <div className="option-row">
                <span className="option-label">Each card</span>
                <Segmented
                  value={settings.repeats}
                  onChange={(v) => setSettings({ ...settings, repeats: v })}
                  options={[
                    { value: 1, label: 'Once' },
                    { value: 2, label: 'Twice' },
                  ]}
                />
              </div>
              <label className="switch-row">
                <span>Play the sound with each answer</span>
                <input
                  type="checkbox"
                  checked={settings.autoSound}
                  onChange={(e) => setSettings({ ...settings, autoSound: e.target.checked })}
                />
                <span className="switch" aria-hidden />
              </label>
            </section>
          </div>

          {/* Pinned so the main action never scrolls out of view */}
          <div className="setup-footer">
            <button className="btn btn-primary btn-start" disabled={selection.size === 0} onClick={onStart}>
              <IconPlay width={16} height={16} />
              {selection.size === 0 ? 'Pick characters to start' : 'Start practice'}
              {selection.size > 0 && <span className="btn-count">{selection.size * settings.repeats} cards</span>}
            </button>
          </div>
        </aside>
      </div>

      <footer className="credits">
        Stroke order data from{' '}
        <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer">
          KanjiVG
        </a>{' '}
        by Ulrich Apel, used under{' '}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">
          CC BY-SA 3.0
        </a>
        .
      </footer>

      {/* Mobile: the setup panel sits below the long chart, so keep the essentials in reach */}
      <div className="mobile-bar">
        <div className="mobile-bar-info">
          <span>{selection.size === 0 ? 'Tap kana to pick them' : <><strong>{selection.size}</strong> picked</>}</span>
          <button className="mobile-mode" onClick={() => document.getElementById('practice-setup')?.scrollIntoView({ behavior: 'smooth' })}>
            <mode.Icon width={14} height={14} /> {mode.title} · change
          </button>
        </div>
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
