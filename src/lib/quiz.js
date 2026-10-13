import { ALL_CHARS, CHAR_BY_ID } from '../data/kana'

export function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Build the deck of cards for a round. */
export function buildDeck(ids, { repeats = 1, order = 'shuffle' } = {}) {
  const chars = ids.map((id) => CHAR_BY_ID[id]).filter(Boolean)
  let deck = []
  for (let r = 0; r < repeats; r++) {
    deck = deck.concat(order === 'shuffle' ? shuffle(chars) : chars)
  }
  // Avoid the same character twice in a row when repeating
  for (let i = 1; i < deck.length; i++) {
    if (deck[i].id === deck[i - 1].id) {
      const j = deck.findIndex((c, k) => k > i && c.id !== deck[i].id)
      if (j > -1) [deck[i], deck[j]] = [deck[j], deck[i]]
    }
  }
  return deck.map((char, i) => ({ key: `${char.id}#${i}`, char, retry: 0 }))
}

/** Normalise what the learner typed and check it against accepted spellings. */
export function checkTyped(char, input) {
  const v = input.trim().toLowerCase().replace(/\s+/g, '')
  if (!v) return false
  return char.accepts.includes(v)
}

/**
 * Pick 4 choices (1 correct + 3 distractors). Distractors come from the
 * learner's selected set first so the quiz stays within what they're studying,
 * and never share the answer's sound (e.g. じ / ぢ).
 */
export function buildChoices(char, poolIds) {
  const sameScript = (c) => c.script === char.script
  const valid = (c) => c.id !== char.id && c.romaji !== char.romaji
  const fromPool = shuffle(poolIds.map((id) => CHAR_BY_ID[id]).filter((c) => c && valid(c) && sameScript(c)))
  const picks = []
  const seenRomaji = new Set([char.romaji])
  for (const c of fromPool) {
    if (picks.length >= 3) break
    if (seenRomaji.has(c.romaji)) continue
    seenRomaji.add(c.romaji)
    picks.push(c)
  }
  if (picks.length < 3) {
    // Fill from the whole script, preferring characters of similar length
    const extra = shuffle(ALL_CHARS.filter((c) => valid(c) && sameScript(c) && !seenRomaji.has(c.romaji)))
    extra.sort((a, b) => Math.abs(a.kana.length - char.kana.length) - Math.abs(b.kana.length - char.kana.length))
    for (const c of extra) {
      if (picks.length >= 3) break
      if (seenRomaji.has(c.romaji)) continue
      seenRomaji.add(c.romaji)
      picks.push(c)
    }
  }
  return shuffle([char, ...picks])
}

/** Where to slot a missed card back in so it comes around again soon-ish. */
export function requeueIndex(currentIndex, deckLength) {
  const gap = 3 + Math.floor(Math.random() * 3) // 3–5 cards later
  return Math.min(currentIndex + 1 + gap, deckLength)
}

export const MAX_RETRIES = 2
