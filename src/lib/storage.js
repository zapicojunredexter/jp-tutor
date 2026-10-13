// Small persistence layer. Everything goes through these functions so it can
// later be swapped for API calls to a backend without touching the UI.

const PREFIX = 'kana-practice:'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage unavailable — app still works for this session */
  }
}

export const store = {
  loadSelection: () => read('selection', []),
  saveSelection: (ids) => write('selection', ids),

  loadSettings: (defaults) => ({ ...defaults, ...read('settings', {}) }),
  saveSettings: (s) => write('settings', s),

  loadStats: () => read('stats', {}),
  saveStats: (stats) => write('stats', stats),
}

/** Record one answer for a character. Returns a new stats object. */
export function recordAnswer(stats, id, correct) {
  const prev = stats[id] || { seen: 0, correct: 0, streak: 0 }
  return {
    ...stats,
    [id]: {
      seen: prev.seen + 1,
      correct: prev.correct + (correct ? 1 : 0),
      streak: correct ? prev.streak + 1 : 0,
      last: Date.now(),
      // a fresh miss brings a cleared character back into the weak spots
      ...(correct && prev.weakCleared ? { weakCleared: true } : {}),
    },
  }
}

/** Missed recently or mostly wrong — unless the user cleared it since the last miss. */
export function isWeak(stat) {
  return !!stat?.seen && !stat.weakCleared && (stat.streak === 0 || stat.correct / stat.seen < 0.6)
}

/** Empty the weak spots list without touching progress. Returns a new stats object. */
export function clearWeak(stats, ids) {
  const next = { ...stats }
  ids.forEach((id) => {
    if (next[id]) next[id] = { ...next[id], weakCleared: true }
  })
  return next
}

/**
 * 0 = not practiced yet, 1 = learning, 2 = getting there, 3 = solid.
 * Based on the current streak so a recent miss lowers the level.
 */
export function masteryLevel(stat) {
  if (!stat || !stat.seen) return 0
  if (stat.streak >= 5) return 3
  if (stat.streak >= 2) return 2
  return 1
}

export const MASTERY_LABELS = ['New', 'Learning', 'Getting there', 'Solid']
