/**
 * Das Morse-Alphabet nach ITU-R M.1677-1.
 *
 * Reine Daten, keine Logik, kein DOM. Punkt = '.', Strich = '-'.
 */

export const MORSE_ALPHABET: Readonly<Record<string, string>> = Object.freeze({
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  "'": '.----.',
  '!': '-.-.--',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  ':': '---...',
  ';': '-.-.-.',
  '=': '-...-',
  '+': '.-.-.',
  '-': '-....-',
  _: '..--.-',
  '"': '.-..-.',
  $: '...-..-',
  '@': '.--.-.',
});

/** Rueckwaerts-Tabelle: Muster -> Zeichen. Aus MORSE_ALPHABET abgeleitet. */
export const MORSE_TO_CHAR: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(MORSE_ALPHABET).map(([char, pattern]) => [pattern, char])),
);

/** Kodiert ein einzelnes Zeichen. Gibt null zurueck, wenn es kein Morse-Aequivalent hat. */
export function encodeChar(char: string): string | null {
  return MORSE_ALPHABET[char.toUpperCase()] ?? null;
}

/** Dekodiert ein Muster wie '.-'. Gibt null zurueck, wenn es unbekannt ist. */
export function decodePattern(pattern: string): string | null {
  return MORSE_TO_CHAR[pattern] ?? null;
}
