# Kana Practice

A calm, no-timer flashcard app for learning hiragana and katakana at your own pace.
Pick exactly the characters you're studying, then quiz yourself on only those.

## Run it

Requires Node.js 20.19+ (or 22+).

```bash
npm install
npm run dev
```

Then open http://localhost:5180

## Features

- **Pick your set** – tap single characters, a whole row (row label), or every row up
  to a point (↑ button) for sequential learning. Basic, dakuten and combination kana.
- **Three practice modes** – Flashcards (flip + self-check), Multiple choice, Type the romaji.
- **Both directions** – kana → romaji or romaji → kana.
- **Gentle repetition** – missed cards come back a few cards later (up to twice).
- **Progress dots** – each character shows New / Learning / Getting there / Solid.
- **"Select my weak spots"** – one click to practice what you've recently missed.
- **Pronunciation** – "Hear it" uses your browser's Japanese voice.
- Keyboard shortcuts, dark mode, and mobile layout. Everything saves in your browser.

## Project structure

```
src/
  data/kana.js        all kana, rows and accepted spellings
  lib/storage.js      persistence (localStorage) – swap for API calls when adding a backend
  lib/quiz.js         deck building, answer checking, multiple-choice options
  lib/speech.js       text-to-speech helper
  components/         Picker, Quiz, Results, small UI pieces
```

Adding a backend later: replace the functions in `src/lib/storage.js` with fetch calls
(e.g. save stats per user) — the UI only talks to that module.
