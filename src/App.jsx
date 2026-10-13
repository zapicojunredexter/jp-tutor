import { useCallback, useEffect, useState } from 'react'
import Picker from './components/Picker'
import Quiz from './components/Quiz'
import Results from './components/Results'
import { buildDeck } from './lib/quiz'
import { store, recordAnswer, clearWeak } from './lib/storage'
import { CHAR_BY_ID } from './data/kana'

const DEFAULT_SETTINGS = { mode: 'flash', direction: 'kana', repeats: 1, autoSound: false, view: 'h' }

export default function App() {
  const [selection, setSelection] = useState(() => new Set(store.loadSelection().filter((id) => CHAR_BY_ID[id])))
  const [settings, setSettings] = useState(() => store.loadSettings(DEFAULT_SETTINGS))
  const [stats, setStats] = useState(() => store.loadStats())
  const [screen, setScreen] = useState('pick') // 'pick' | 'quiz' | 'results'
  const [round, setRound] = useState(null) // { deck, poolIds, id }
  const [results, setResults] = useState([])

  useEffect(() => store.saveSelection([...selection]), [selection])
  useEffect(() => store.saveSettings(settings), [settings])
  useEffect(() => store.saveStats(stats), [stats])

  const startRound = useCallback(
    (ids) => {
      setRound({ deck: buildDeck(ids, { repeats: settings.repeats }), poolIds: [...selection], id: Date.now() })
      setScreen('quiz')
      window.scrollTo(0, 0)
    },
    [settings.repeats, selection],
  )

  const onRecord = useCallback((id, correct) => setStats((s) => recordAnswer(s, id, correct)), [])

  return (
    <div className={`app screen-${screen}`}>
      {screen === 'pick' && (
        <Picker
          selection={selection}
          setSelection={setSelection}
          stats={stats}
          onClearWeak={(ids) => setStats((s) => clearWeak(s, ids))}
          settings={settings}
          setSettings={setSettings}
          onStart={() => startRound([...selection])}
        />
      )}
      {screen === 'quiz' && round && (
        <Quiz
          key={round.id}
          initialDeck={round.deck}
          poolIds={round.poolIds}
          settings={settings}
          onRecord={onRecord}
          onFinish={(items) => {
            setResults(items)
            setScreen('results')
          }}
          onExit={() => setScreen('pick')}
        />
      )}
      {screen === 'results' && (
        <Results
          items={results}
          onRetryMissed={(ids) => startRound(ids)}
          onAgain={() => startRound([...new Set(results.map((r) => r.char.id))])}
          onBack={() => setScreen('pick')}
        />
      )}
    </div>
  )
}
