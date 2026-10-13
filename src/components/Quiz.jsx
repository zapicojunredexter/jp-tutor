import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildChoices, checkTyped, requeueIndex, MAX_RETRIES } from '../lib/quiz'
import { canSpeak, speak } from '../lib/speech'
import { IconArrowRight, IconCheck, IconClose, IconSound } from './Icons'

const PRAISE = ['Nice!', 'That’s it!', 'Yes!', 'Got it!', 'Well done!', 'Spot on!']
const pick = (list) => list[Math.floor(Math.random() * list.length)]

export default function Quiz({ initialDeck, poolIds, settings, onRecord, onFinish, onExit }) {
  const { mode } = settings
  const direction = mode === 'type' ? 'kana' : settings.direction

  const [deck, setDeck] = useState(initialDeck)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('ask') // 'ask' | 'answered'
  const [flipped, setFlipped] = useState(false)
  const [picked, setPicked] = useState(null)
  const [typed, setTyped] = useState('')
  const [lastCorrect, setLastCorrect] = useState(null)
  const [praise, setPraise] = useState(PRAISE[0])
  const results = useRef(new Map()) // char.id -> { char, firstTry, misses }
  const inputRef = useRef(null)
  const advanceTimer = useRef(null)

  const card = deck[index]
  const char = card.char

  const choices = useMemo(
    () => (mode === 'choice' ? buildChoices(char, poolIds) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.key, mode],
  )

  const finish = useCallback(() => {
    onFinish([...results.current.values()])
  }, [onFinish])

  const next = useCallback(() => {
    clearTimeout(advanceTimer.current)
    if (index + 1 >= deck.length) return finish()
    setIndex((i) => i + 1)
    setPhase('ask')
    setFlipped(false)
    setPicked(null)
    setTyped('')
    setLastCorrect(null)
  }, [index, deck.length, finish])

  const answer = useCallback(
    (correct) => {
      if (phase === 'answered') return
      onRecord(char.id, correct)
      const r = results.current.get(char.id)
      if (!r) results.current.set(char.id, { char, firstTry: correct, misses: correct ? 0 : 1 })
      else if (!correct) r.misses += 1

      if (!correct && card.retry < MAX_RETRIES) {
        setDeck((d) => {
          const copy = [...d]
          copy.splice(requeueIndex(index, d.length), 0, { key: `${card.key}r${card.retry + 1}`, char, retry: card.retry + 1 })
          return copy
        })
      }
      setLastCorrect(correct)
      setPraise(pick(PRAISE))
      setPhase('answered')
      if (settings.autoSound && mode !== 'flash') speak(char.kana)
    },
    [phase, char, card, index, onRecord, settings.autoSound, mode],
  )

  // Flashcards: flip reveals, then self-grade moves on immediately
  const flip = useCallback(() => {
    if (flipped) return
    setFlipped(true)
    if (settings.autoSound) speak(char.kana)
  }, [flipped, settings.autoSound, char.kana])

  const grade = useCallback(
    (knew) => {
      if (!flipped) return
      answer(knew)
      // let the state settle, then move on
      advanceTimer.current = setTimeout(() => setPhase('advance'), 0)
    },
    [flipped, answer],
  )

  useEffect(() => {
    if (phase === 'advance') next()
  }, [phase, next])

  // Multiple choice: auto-advance gently after a correct answer
  const choose = (c) => {
    if (phase === 'answered') return
    setPicked(c.id)
    const correct = c.id === char.id
    answer(correct)
    if (correct) advanceTimer.current = setTimeout(next, 900)
  }

  const submitTyped = (e) => {
    e?.preventDefault()
    if (phase === 'answered') return next()
    if (!typed.trim()) return
    answer(checkTyped(char, typed))
  }

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  useEffect(() => {
    if (mode === 'type' && phase === 'ask') inputRef.current?.focus()
  }, [mode, phase, card.key])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const inInput = e.target.tagName === 'INPUT'
      if (mode === 'flash') {
        if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault()
          flip()
        } else if (flipped && (e.key === '1' || e.key === 'ArrowLeft')) grade(false)
        else if (flipped && (e.key === '2' || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          grade(true)
        }
      } else if (mode === 'choice') {
        const n = Number(e.key)
        if (phase === 'ask' && n >= 1 && n <= choices.length) choose(choices[n - 1])
        else if (phase === 'answered' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
          e.preventDefault()
          next()
        }
      } else if (mode === 'type' && !inInput && phase === 'answered' && e.key === 'Enter') {
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const total = deck.length
  const progress = (index / total) * 100
  const revealed = mode === 'flash' ? flipped : phase === 'answered'
  const scriptName = char.script === 'h' ? 'hiragana' : 'katakana'

  const promptText = direction === 'kana' ? char.kana : char.romaji
  const answerText = direction === 'kana' ? char.romaji : char.kana
  const promptIsKana = direction === 'kana'

  return (
    <div className="quiz">
      <header className="quiz-top">
        <button className="icon-btn" onClick={onExit} aria-label="Stop and go back to the chart" title="Back to chart">
          <IconClose />
        </button>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-label">
          {index + 1} / {total}
        </span>
      </header>

      <div className="quiz-stage">
        {card.retry > 0 && <div className="retry-badge">Coming back around — no rush</div>}

        {mode === 'flash' ? (
          <button
            className={`flashcard ${flipped ? 'flipped' : ''}`}
            onClick={flip}
            aria-label={flipped ? `Answer: ${answerText}` : 'Show answer'}
            key={card.key}
          >
            <div className="flashcard-inner">
              <div className="face front">
                <span className="face-script">{scriptName}</span>
                <Prompt text={promptText} isKana={promptIsKana} tag={!promptIsKana && char.tag} />
                <span className="face-hint">Tap or press Space to flip</span>
              </div>
              <div className="face back">
                <span className="face-script">{scriptName}</span>
                <span className={`answer-big ${promptIsKana ? '' : 'jp'}`}>{answerText}</span>
                <span className="answer-pair">
                  {promptIsKana ? <span className="jp">{char.kana}</span> : <span>{char.romaji}</span>}
                </span>
                {char.note && <span className="note">{char.note}</span>}
              </div>
            </div>
          </button>
        ) : (
          <div className={`prompt-card ${phase === 'answered' ? (lastCorrect ? 'is-correct' : 'is-wrong') : ''}`} key={card.key}>
            <span className="face-script">{scriptName}</span>
            <Prompt text={promptText} isKana={promptIsKana} tag={!promptIsKana && char.tag} />
          </div>
        )}

        {/* Answer area */}
        <div className="answer-area">
          {mode === 'flash' &&
            (flipped ? (
              <div className="grade-row">
                <button className="btn btn-soft btn-again" onClick={() => grade(false)}>
                  Still learning <kbd>1</kbd>
                </button>
                <button className="btn btn-good" onClick={() => grade(true)}>
                  I knew it <kbd>2</kbd>
                </button>
              </div>
            ) : (
              <button className="btn btn-primary btn-wide" onClick={flip}>
                Show answer <kbd>Space</kbd>
              </button>
            ))}

          {mode === 'choice' && (
            <div className="choices">
              {choices.map((c, i) => {
                let cls = ''
                if (phase === 'answered') {
                  if (c.id === char.id) cls = 'correct'
                  else if (c.id === picked) cls = 'wrong'
                  else cls = 'dim'
                }
                return (
                  <button key={c.id} className={`choice ${cls}`} onClick={() => choose(c)} disabled={phase === 'answered'}>
                    <kbd>{i + 1}</kbd>
                    <span className={direction === 'kana' ? 'choice-romaji' : 'choice-kana jp'}>
                      {direction === 'kana' ? c.romaji : c.kana}
                    </span>
                    {cls === 'correct' && <IconCheck className="choice-icon" />}
                  </button>
                )
              })}
            </div>
          )}

          {mode === 'type' && (
            <form className="type-form" onSubmit={submitTyped}>
              <input
                ref={inputRef}
                className={`type-input ${phase === 'answered' ? (lastCorrect ? 'correct' : 'wrong') : ''}`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                readOnly={phase === 'answered'}
                placeholder="type the sound…"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Your answer in romaji"
              />
              {phase === 'ask' ? (
                <div className="type-actions">
                  <button type="button" className="btn-text" onClick={() => answer(false)}>
                    I don’t know yet
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={!typed.trim()}>
                    Check <kbd>Enter</kbd>
                  </button>
                </div>
              ) : null}
            </form>
          )}

          {mode !== 'flash' && phase === 'answered' && (
            <div className={`feedback ${lastCorrect ? 'good' : 'gentle'}`} role="status">
              <div className="feedback-text">
                {lastCorrect ? (
                  <strong>{praise}</strong>
                ) : (
                  <>
                    <strong>Not quite.</strong> <span className="jp">{char.kana}</span> is <strong>{char.romaji}</strong>.
                    {card.retry < MAX_RETRIES && <span className="muted"> You’ll see it again soon.</span>}
                  </>
                )}
                {char.note && <div className="note">{char.note}</div>}
              </div>
              <div className="feedback-actions">
                {canSpeak() && (
                  <button className="icon-btn" onClick={() => speak(char.kana)} aria-label="Hear it" title="Hear it">
                    <IconSound />
                  </button>
                )}
                <button className="btn btn-primary" onClick={next}>
                  {index + 1 >= total ? 'See results' : 'Next'} <IconArrowRight width={16} height={16} />
                </button>
              </div>
            </div>
          )}

          {mode === 'flash' && flipped && canSpeak() && (
            <button className="btn-text hear" onClick={() => speak(char.kana)}>
              <IconSound width={16} height={16} /> Hear it
            </button>
          )}
        </div>

        {revealed || <ShortcutHint mode={mode} />}
      </div>
    </div>
  )
}

function Prompt({ text, isKana, tag }) {
  return (
    <span className={`prompt ${isKana ? 'jp prompt-kana' : 'prompt-romaji'} ${text.length > 1 && isKana ? 'two' : ''}`}>
      {text}
      {tag && <span className="prompt-tag">{tag}</span>}
    </span>
  )
}

function ShortcutHint({ mode }) {
  const text = {
    flash: 'Space to flip · 1 still learning · 2 knew it',
    choice: 'Press 1–4 to choose',
    type: 'Hepburn or other spellings are fine (shi / si)',
  }[mode]
  return <p className="shortcut-hint">{text}</p>
}
