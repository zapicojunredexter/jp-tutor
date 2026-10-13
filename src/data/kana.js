// Kana data. Rows follow the traditional gojūon order so sequential
// learners can work through them top to bottom.
//
// Each row lists 5 slots (a, i, u, e, o). `null` = empty slot in the chart.
// Combination (yōon) rows use 3 slots (ya, yu, yo).

const BASIC = [
  { key: 'a', label: 'a', h: 'あいうえお', k: 'アイウエオ', r: ['a', 'i', 'u', 'e', 'o'] },
  { key: 'k', label: 'k', h: 'かきくけこ', k: 'カキクケコ', r: ['ka', 'ki', 'ku', 'ke', 'ko'] },
  { key: 's', label: 's', h: 'さしすせそ', k: 'サシスセソ', r: ['sa', 'shi', 'su', 'se', 'so'] },
  { key: 't', label: 't', h: 'たちつてと', k: 'タチツテト', r: ['ta', 'chi', 'tsu', 'te', 'to'] },
  { key: 'n', label: 'n', h: 'なにぬねの', k: 'ナニヌネノ', r: ['na', 'ni', 'nu', 'ne', 'no'] },
  { key: 'h', label: 'h', h: 'はひふへほ', k: 'ハヒフヘホ', r: ['ha', 'hi', 'fu', 'he', 'ho'] },
  { key: 'm', label: 'm', h: 'まみむめも', k: 'マミムメモ', r: ['ma', 'mi', 'mu', 'me', 'mo'] },
  { key: 'y', label: 'y', h: 'や_ゆ_よ', k: 'ヤ_ユ_ヨ', r: ['ya', null, 'yu', null, 'yo'] },
  { key: 'r', label: 'r', h: 'らりるれろ', k: 'ラリルレロ', r: ['ra', 'ri', 'ru', 're', 'ro'] },
  { key: 'w', label: 'w', h: 'わ___を', k: 'ワ___ヲ', r: ['wa', null, null, null, 'wo'] },
  { key: 'nn', label: 'n', h: 'ん____', k: 'ン____', r: ['n', null, null, null, null] },
]

const DAKUTEN = [
  { key: 'g', label: 'g', h: 'がぎぐげご', k: 'ガギグゲゴ', r: ['ga', 'gi', 'gu', 'ge', 'go'] },
  { key: 'z', label: 'z', h: 'ざじずぜぞ', k: 'ザジズゼゾ', r: ['za', 'ji', 'zu', 'ze', 'zo'] },
  { key: 'd', label: 'd', h: 'だぢづでど', k: 'ダヂヅデド', r: ['da', 'ji', 'zu', 'de', 'do'] },
  { key: 'b', label: 'b', h: 'ばびぶべぼ', k: 'バビブベボ', r: ['ba', 'bi', 'bu', 'be', 'bo'] },
  { key: 'p', label: 'p', h: 'ぱぴぷぺぽ', k: 'パピプペポ', r: ['pa', 'pi', 'pu', 'pe', 'po'] },
]

// Combinations: base "i" kana + small ya/yu/yo
const COMBO_BASES = [
  { key: 'ky', h: 'き', k: 'キ', r: ['kya', 'kyu', 'kyo'] },
  { key: 'sh', h: 'し', k: 'シ', r: ['sha', 'shu', 'sho'] },
  { key: 'ch', h: 'ち', k: 'チ', r: ['cha', 'chu', 'cho'] },
  { key: 'ny', h: 'に', k: 'ニ', r: ['nya', 'nyu', 'nyo'] },
  { key: 'hy', h: 'ひ', k: 'ヒ', r: ['hya', 'hyu', 'hyo'] },
  { key: 'my', h: 'み', k: 'ミ', r: ['mya', 'myu', 'myo'] },
  { key: 'ry', h: 'り', k: 'リ', r: ['rya', 'ryu', 'ryo'] },
  { key: 'gy', h: 'ぎ', k: 'ギ', r: ['gya', 'gyu', 'gyo'] },
  { key: 'j', h: 'じ', k: 'ジ', r: ['ja', 'ju', 'jo'] },
  { key: 'by', h: 'び', k: 'ビ', r: ['bya', 'byu', 'byo'] },
  { key: 'py', h: 'ぴ', k: 'ピ', r: ['pya', 'pyu', 'pyo'] },
]
const SMALL = { h: ['ゃ', 'ゅ', 'ょ'], k: ['ャ', 'ュ', 'ョ'] }

// Accepted alternate spellings when typing (Nihon-shiki / Kunrei etc.)
const ALTERNATES = {
  shi: ['si'], chi: ['ti'], tsu: ['tu'], fu: ['hu'], ji: ['zi', 'di'], zu: ['du'],
  wo: ['o'], n: ['nn', "n'"],
  sha: ['sya'], shu: ['syu'], sho: ['syo'],
  cha: ['tya', 'cya'], chu: ['tyu', 'cyu'], cho: ['tyo', 'cyo'],
  ja: ['jya', 'zya'], ju: ['jyu', 'zyu'], jo: ['jyo', 'zyo'],
}

// Small notes for characters that are easy to confuse or have duplicate sounds
const NOTES = {
  'ぢ': 'Same sound as じ — rarely used',
  'づ': 'Same sound as ず — rarely used',
  'ヂ': 'Same sound as ジ — rarely used',
  'ヅ': 'Same sound as ズ — rarely used',
  'を': 'Pronounced “o”; used as a particle',
  'ヲ': 'Pronounced “o”; rare in katakana',
  'ん': 'The only stand-alone consonant',
  'ン': 'The only stand-alone consonant',
  'シ': 'Strokes go up ↗ — compare ツ',
  'ツ': 'Strokes go down ↓ — compare シ',
  'ソ': 'Stroke goes down ↙ — compare ン',
}

function buildRows(defs, script, sectionId) {
  return defs.map((row) => {
    const chars = [...row[script]]
    return {
      id: `${script}-${sectionId}-${row.key}`,
      label: row.label,
      cells: chars.map((kana, i) => {
        if (kana === '_' || !row.r[i]) return null
        // Duplicate-sound kana (ぢ/づ) get a "d" hint so prompts stay unambiguous
        const dupe = sectionId === 'dakuten' && row.key === 'd' && (i === 1 || i === 2)
        return makeChar(script, kana, row.r[i], dupe ? 'd-row' : null)
      }),
    }
  })
}

function buildCombos(script) {
  return COMBO_BASES.map((base) => ({
    id: `${script}-combo-${base.key}`,
    label: base.key,
    cells: SMALL[script].map((small, i) => makeChar(script, base[script] + small, base.r[i])),
  }))
}

function makeChar(script, kana, romaji, tag = null) {
  return {
    id: `${script}:${kana}`,
    script,
    kana,
    romaji,
    tag, // disambiguates same-sound kana in romaji → kana prompts
    accepts: [romaji, ...(ALTERNATES[romaji] || [])],
    note: NOTES[kana] || null,
  }
}

function buildScript(script) {
  return [
    { id: 'basic', title: 'Basic', subtitle: 'The core 46 sounds', columns: 5, rows: buildRows(BASIC, script, 'basic') },
    { id: 'dakuten', title: 'Dakuten', subtitle: 'Voiced sounds like が and ぱ', columns: 5, rows: buildRows(DAKUTEN, script, 'dakuten') },
    { id: 'combo', title: 'Combinations', subtitle: 'Blends like きゃ and しゅ', columns: 3, rows: buildCombos(script) },
  ]
}

export const SCRIPTS = {
  h: { id: 'h', name: 'Hiragana', sample: 'あ', sections: buildScript('h') },
  k: { id: 'k', name: 'Katakana', sample: 'ア', sections: buildScript('k') },
}

export const ALL_CHARS = Object.values(SCRIPTS).flatMap((s) =>
  s.sections.flatMap((sec) => sec.rows.flatMap((row) => row.cells.filter(Boolean))),
)

export const CHAR_BY_ID = Object.fromEntries(ALL_CHARS.map((c) => [c.id, c]))
