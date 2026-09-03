/**
 * Wann der Zeichensatz waechst.
 *
 * Die Regel (Produktentscheidung, siehe Notion-Log): ein neues Zeichen kommt
 * dazu, wenn
 *
 *   (a) die rollierende Trefferquote ueber die letzten RECENT_ANSWER_WINDOW
 *       Antworten mindestens GROWTH_WINDOW_ACCURACY erreicht,
 *   (b) jedes aktive Zeichen mindestens GROWTH_MIN_ATTEMPTS Versuche hat und
 *   (c) keines unter GROWTH_MIN_CHARACTER_ACCURACY liegt.
 *
 * Nach einer Einfuehrung ist die naechste fuer GROWTH_LOCKOUT_ANSWERS Antworten
 * gesperrt: das neue Zeichen soll erst *ankommen*, bevor das uebernaechste den
 * Boden weich macht. (a) prueft das aktuelle Niveau, (b) verhindert, dass ein
 * kaum gefragtes Zeichen als "gekonnt" durchrutscht, (c) faengt den Fall, dass
 * der Durchschnitt ein einzelnes Problemzeichen verdeckt.
 *
 * Kandidaten kommen aus CHARACTER_ORDER (settings.ts), der Reihe nach. Reine
 * Funktionen, kein DOM.
 */

import { CHARACTER_ORDER } from './settings';
import { RECENT_ANSWER_WINDOW, hitRate, recordFor, type Progress } from './stats';

/**
 * Mindest-Trefferquote im rollierenden Antwortfenster (a).
 *
 * 0,85 statt der fruehreren 0,9 (Ruling #103d, Owner-Befund: neue Zeichen
 * kamen zu langsam). Die 85-%-Regel (Wilson 2019), auf die sich dieses
 * Projekt in den eigenen Learn-Artikeln beruft, nennt rund 15 % Fehlerquote
 * als optimal fuers Lerntempo -- die eigenen 90 % waren strenger als die
 * Evidenz, auf die wir uns berufen. Bei RECENT_ANSWER_WINDOW = 30 heisst
 * 0,85 mindestens 26 von 30 richtig.
 */
export const GROWTH_WINDOW_ACCURACY = 0.85;

/** Mindestzahl Versuche je aktivem Zeichen (b). */
export const GROWTH_MIN_ATTEMPTS = 5;

/** Mindest-Trefferquote je aktivem Zeichen (c). */
export const GROWTH_MIN_CHARACTER_ACCURACY = 0.75;

/**
 * So viele Antworten liegen nach einer Einfuehrung mindestens vor der
 * naechsten. 10 statt der fruehreren 20 (Ruling #103d) -- halbiert, damit ein
 * neues Zeichen schneller ankommt, ohne die Sperre ganz aufzugeben.
 *
 * Dieselbe Konstante traegt die Sperre der Tempo-Progression
 * (`SPEED_LOCKOUT_ANSWERS`, tempo.ts) -- sie steigt also mit, sobald alle 36
 * Zeichen aktiv sind. Das ist gewollt, nicht nur eine Nebenwirkung: dieselbe
 * Bedingung ("das sitzt gerade") gilt fuer beide Belohnungen.
 */
export const GROWTH_LOCKOUT_ANSWERS = 10;

/** Das naechste Zeichen der Reihe, das noch nicht aktiv ist -- oder null. */
export function nextCandidate(progress: Progress): string | null {
  const active = new Set(progress.activeCharacters);
  return CHARACTER_ORDER.find((char) => !active.has(char)) ?? null;
}

/** Prueft die Regel, ohne etwas zu veraendern. Exportiert fuer Tests und Anzeige. */
export function isReadyToGrow(progress: Progress): boolean {
  if (nextCandidate(progress) === null) return false;
  if (progress.answersSinceGrowth < GROWTH_LOCKOUT_ANSWERS) return false;

  // (a) Das Fenster muss voll sein: 27 von 30 sind belastbar, 9 von 10 nicht.
  const window = progress.recentAnswers;
  if (window.length < RECENT_ANSWER_WINDOW) return false;
  const windowAccuracy = window.filter(Boolean).length / window.length;
  if (windowAccuracy < GROWTH_WINDOW_ACCURACY) return false;

  // (b) und (c) je aktivem Zeichen.
  return progress.activeCharacters.every((char) => {
    const record = recordFor(progress, char);
    const rate = hitRate(record);
    return record.attempts >= GROWTH_MIN_ATTEMPTS && rate !== null && rate >= GROWTH_MIN_CHARACTER_ACCURACY;
  });
}

export interface GrowthResult {
  progress: Progress;
  /** Das neu eingefuehrte Zeichen -- oder null, wenn die Regel nicht griff. */
  introduced: string | null;
}

/**
 * Fuehrt das naechste Zeichen ein, wenn die Regel greift.
 *
 * Gibt sonst den Fortschritt unveraendert (identisch, ===) zurueck, damit
 * Aufrufer und React-Zustand billig erkennen, dass nichts passiert ist.
 */
export function maybeGrow(progress: Progress): GrowthResult {
  if (!isReadyToGrow(progress)) return { progress, introduced: null };

  const introduced = nextCandidate(progress);
  if (introduced === null) return { progress, introduced: null };

  return {
    progress: {
      ...progress,
      activeCharacters: [...progress.activeCharacters, introduced],
      answersSinceGrowth: 0,
    },
    introduced,
  };
}
