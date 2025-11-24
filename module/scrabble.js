import { WORD_LIST } from "./wordList.js";

const SCRABBLE_TILES = [
  { letter: "A", count: 14, scoreDe: 1, scoreEn: 1 },
  { letter: "B", count: 4,  scoreDe: 3, scoreEn: 3 },
  { letter: "C", count: 4,  scoreDe: 4, scoreEn: 3 },
  { letter: "D", count: 8,  scoreDe: 1, scoreEn: 2 },
  { letter: "E", count: 27, scoreDe: 1, scoreEn: 1 },
  { letter: "F", count: 4,  scoreDe: 4, scoreEn: 4 },
  { letter: "G", count: 6,  scoreDe: 2, scoreEn: 2 },
  { letter: "H", count: 6,  scoreDe: 2, scoreEn: 4 },
  { letter: "I", count: 15, scoreDe: 1, scoreEn: 1 },
  { letter: "J", count: 2,  scoreDe: 6, scoreEn: 8 },
  { letter: "K", count: 3,  scoreDe: 4, scoreEn: 5 },
  { letter: "L", count: 7,  scoreDe: 2, scoreEn: 1 },
  { letter: "M", count: 6,  scoreDe: 3, scoreEn: 3 },
  { letter: "N", count: 15, scoreDe: 1, scoreEn: 1 },
  { letter: "O", count: 11, scoreDe: 2, scoreEn: 1 },
  { letter: "P", count: 3,  scoreDe: 4, scoreEn: 3 },
  { letter: "Q", count: 2,  scoreDe: 10, scoreEn: 10 },
  { letter: "R", count: 13, scoreDe: 1, scoreEn: 1 },
  { letter: "S", count: 11, scoreDe: 1, scoreEn: 1 },
  { letter: "T", count: 12, scoreDe: 1, scoreEn: 1 },
  { letter: "U", count: 10, scoreDe: 1, scoreEn: 1 },
  { letter: "V", count: 3,  scoreDe: 6, scoreEn: 4 },
  { letter: "W", count: 3,  scoreDe: 3, scoreEn: 4 },
  { letter: "X", count: 2,  scoreDe: 8, scoreEn: 8 },
  { letter: "Y", count: 3,  scoreDe: 10, scoreEn: 4 },
  { letter: "Z", count: 2,  scoreDe: 3, scoreEn: 10 },
  { letter: "_", count: 4,  scoreDe: 0, scoreEn: 0, isBlank: true }
];

function buildTileBag() {
  const bag = [];
  for (const tile of SCRABBLE_TILES) {
    for (let i = 0; i < tile.count; i++) {
      bag.push({
        letter: tile.letter,
        scoreDe: tile.scoreDe,
        scoreEn: tile.scoreEn,
        isBlank: !!tile.isBlank
      });
    }
  }
  return bag;
}


function drawTiles(bag = buildTileBag(), n = 1) {
  const drawn = [];
  for (let i = 0; i < n && bag.length > 0; i++) {
    const index = Math.floor(Math.random() * bag.length);
    const [tile] = bag.splice(index, 1);
    drawn.push(tile);
  }
  return { drawn, bag };
}

function scoreWord(word, lang = "de") {
  const useDe = lang.toLowerCase().startsWith("de");
  const scoreKey = useDe ? "scoreDe" : "scoreEn";

  let total = 0;

  for (const rawChar of word.toUpperCase()) {

    if (rawChar === "_") continue;

    const tileDef = SCRABBLE_TILES.find(t => t.letter === rawChar);
    if (!tileDef) continue; // ignore unknown

    let value = tileDef[scoreKey];

    if (value == null) value = 0;

    total += value;
  }

  return total;
}

function canFormWordFromTiles(word, tiles) {
  const counts = {};
  let blanks = 0;

  for (const tile of tiles) {
    if (tile.isBlank) {
      blanks++;
    } else {
      const c = tile.letter.toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    }
  }

  for (const char of word.toUpperCase()) {
    if (!char.match(/[A-ZÄÖÜ]/)) continue;

    if (counts[char] > 0) {
      counts[char]--;
    } else if (blanks > 0) {
      blanks--;
    } else {
      return false;
    }
  }

  return true;
}

function findPlayableWords(tiles, lang = "de", options = {}) {
  const {
    minLength = 3,
    maxResults = 20,
    sortBy = "score"
  } = options;

  const langNorm = lang.toLowerCase().startsWith("de") ? "de" : "en";

  const candidates = [];

  for (const entry of WORD_LIST) {
    if (entry.lang !== langNorm) continue;
    const w = entry.word.toUpperCase();
    if (w.length < minLength) continue;

    if (!canFormWordFromTiles(w, tiles)) continue;

    const score = scoreWord(w, langNorm);
    candidates.push({ word: w, lang: langNorm, score });
  }

  candidates.sort((a, b) => {
    if (sortBy === "length") return b.word.length - a.word.length || b.score - a.score;
    return b.score - a.score || b.word.length - a.word.length;
  });

  return candidates.slice(0, maxResults);
}

function findPlayableWordsBoth(tiles, options = {}) {
  const {
    minLength = 3,
    maxResults = 20,
    sortBy = "score"
  } = options;

  function searchForLang(lang) {
    const candidates = [];

    for (const entry of WORD_LIST) {
      if (entry.lang !== lang) continue;
      const w = entry.word.toUpperCase();
      if (w.length < minLength) continue;

      if (!canFormWordFromTiles(w, tiles)) continue;

      const score = scoreWord(w, lang);
      candidates.push({ word: w, lang, score });
    }

    candidates.sort((a, b) => {
      if (sortBy === "length") {
        return b.word.length - a.word.length || b.score - a.score;
      }
      return b.score - a.score || b.word.length - a.word.length;
    });

    return candidates.slice(0, maxResults);
  }

  return {
    de: searchForLang("de"),
    en: searchForLang("en")
  };
}

/**
 * Draw tiles and return them along with suggested playable words without posting to chat.
 * @param {number} draw
 * @param {string} lang
 * @param {Object} options
 * @returns {{drawn: Array, words: Array}}
 */
function drawAndFind(draw = 7, lang = 'de', options = {}) {
  const bag = buildTileBag();
  const { drawn } = drawTiles(bag, draw);
  const words = findPlayableWordsBoth(drawn, lang, {
    minLength: options.minLength ?? 2,
    maxResults: options.maxResults ?? 20,
    sortBy: options.sortBy ?? 'score'
  });
  return { drawn, words };
}

export { buildTileBag, drawTiles, scoreWord, canFormWordFromTiles, findPlayableWords, findPlayableWordsBoth, drawAndFind };
