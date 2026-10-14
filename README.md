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

## Deploy (GitHub Pages)

Every push to `main` builds and publishes the app via `.github/workflows/deploy.yml`.

One-time setup after creating the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The site is then served at `https://<user>.github.io/<repo>/` (the build uses relative paths, so any repo name works).

## Features

- **Pick your set** – tap single characters, a whole row (row label), or every row up
  to a point (↑ button) for sequential learning. Basic, dakuten and combination kana.
- **Four practice modes** – Flashcards (flip + self-check), Multiple choice, Type the romaji, Write it.
- **Write it** – draw each kana with mouse, finger or stylus. Every stroke is checked for
  shape, direction and order as you lift the pen; "Show me" animates the correct strokes,
  and after two misses the next stroke is outlined. Runs entirely in the browser.
- **Both directions** – kana → romaji or romaji → kana.
- **Gentle repetition** – missed cards come back a few cards later (up to twice).
- **Progress dots** – each character shows New / Learning / Getting there / Solid.
- **Weak spots** – one click to practice what you've recently missed, or clear the list.
- **Pronunciation** – "Hear it" uses your browser's Japanese voice.
- Keyboard shortcuts, dark mode, and mobile layout. Everything saves in your browser.

## Project structure

```
src/
  data/kana.js        all kana, rows and accepted spellings
  data/strokes.js     stroke paths from KanjiVG (generated, see below)
  lib/storage.js      persistence (localStorage) – swap for API calls when adding a backend
  lib/quiz.js         deck building, answer checking, multiple-choice options
  lib/speech.js       text-to-speech helper
  lib/strokes.js      stroke sampling and grading for writing mode
  components/         Picker, Quiz, WritePad, Results, small UI pieces
scripts/
  build-strokes.mjs   regenerates src/data/strokes.js from KanjiVG SVGs
```

Adding a backend later: replace the functions in `src/lib/storage.js` with fetch calls
(e.g. save stats per user) — the UI only talks to that module.

## Stroke data and credits

Stroke order data comes from [KanjiVG](https://kanjivg.tagaini.net) by Ulrich Apel, licensed under
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). `src/data/strokes.js` is derived from it
and shared under the same license; the rest of the code is separate from that license.

To regenerate it, download the kana SVGs from the [KanjiVG repo](https://github.com/KanjiVG/kanjivg/tree/master/kanji)
(files are named by codepoint, e.g. `03042.svg` for あ) into a folder and run:

```bash
node scripts/build-strokes.mjs path/to/svg-folder
```
