// Uses the browser's built-in Japanese text-to-speech voice when available.

let jaVoice = null

function pickVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  jaVoice = voices.find((v) => v.lang === 'ja-JP') || voices.find((v) => v.lang?.startsWith('ja')) || null
  return jaVoice
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice()
  window.speechSynthesis.onvoiceschanged = pickVoice
}

export function canSpeak() {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

export function speak(text) {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = 0.8
  if (jaVoice || pickVoice()) u.voice = jaVoice
  synth.speak(u)
}
