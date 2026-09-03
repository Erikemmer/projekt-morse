/**
 * Dekodierung einer gesendeten Morse-Eingabe -- der Kern des Sende-Trainings
 * (Konzept-Ruling Notion-Log #90, Präzisierungen #101).
 *
 * **Relativ, nicht absolut** (#90): bewertet werden Verhältnisse, nicht
 * Millisekunden gegen eine feste Tabelle. Das eigene dit wird aus der
 * Eingabe selbst geschätzt (das kürzeste Element, sobald ein Kontrast
 * besteht), ein dah beginnt ab dem `SEND_DAH_THRESHOLD_MULTIPLIER`-fachen
 * davon. Bewertet werden zwei Verhältnisse: Dah:Dit (Ziel 3,0) und die Pause
 * *innerhalb* eines Zeichens gegen das dit (Ziel 1). Das Tempo (WpM) folgt
 * daraus und wird nur berichtet.
 *
 * **Der Fall ohne Kontrast** (#101a): ein einzelnes Element -- "E" oder "T"
 * -- lässt sich relativ nicht entscheiden, denn ein Punkt und ein Strich
 * unterscheiden sich nur absolut. Auch mehrere Elemente können ohne Kontrast
 * sein (alle innerhalb `SEND_CONTRAST_RATIO`). In beiden Fällen entscheidet
 * die **Sitzungs-Schätzung** des eigenen dits -- der Median der bisher als
 * dit erkannten Elemente dieser Sitzung, zu Beginn mit dem Zieldit bei
 * 20 WPM angesetzt (`SEND_TARGET_DIT_SECONDS`). `usedSessionEstimate` sagt,
 * ob das nötig war, damit die Auflösung eine Schätzung nie als Messung
 * ausgibt (CLAUDE.md 2.6).
 *
 * Reine Funktionen und reine Daten -- kein DOM, keine Audio-API, keine Uhr:
 * Zeitpunkte kommen als Sekunden herein (von `MorsePlayer.currentTime`).
 */

import { decodePattern } from './alphabet';
import { CHARACTER_WPM } from './settings';

/** Ab welchem Verhältnis von längstem zu kürzestem Element eine Eingabe Kontrast hat. */
export const SEND_CONTRAST_RATIO = 1.6;

/** Ein Element gilt als dah ab dem so-vielfachen der Dit-Schätzung. */
export const SEND_DAH_THRESHOLD_MULTIPLIER = 2;

/** Ziel- und sauberer Bereich für das Verhältnis Dah:Dit (ARRL: 3:1). */
export const SEND_DAH_DIT_TARGET = 3.0;
export const SEND_DAH_DIT_CLEAN = Object.freeze({ min: 2.5, max: 3.5 });

/** Ziel- und sauberer Bereich für die Pause *innerhalb* eines Zeichens, in Dit-Einheiten. */
export const SEND_GAP_TARGET = 1.0;
export const SEND_GAP_CLEAN = Object.freeze({ min: 0.7, max: 1.5 });

/** Das Zieldit bei Zeichentempo (20 WPM = 60 ms) -- der Startwert der Sitzungs-Schätzung. */
export const SEND_TARGET_DIT_SECONDS = 1.2 / CHARACTER_WPM;

/**
 * Wie viele als dit erkannte Elemente die Sitzungs-Schätzung höchstens
 * aufhebt. Eine Sitzung kann lange laufen (CLAUDE.md 7: kein unbegrenztes
 * Speicherwachstum); zwanzig Messwerte genügen für einen stabilen Median und
 * lassen ihn auf die *aktuelle* Handhaltung reagieren, nicht auf die vom
 * Anfang der Sitzung.
 */
export const SEND_DIT_HISTORY_KEPT = 20;

/** Ein Tastendruck: Zeitpunkte auf der Audio-Uhr, in Sekunden. */
export interface SendInterval {
  readonly downAt: number;
  readonly upAt: number;
}

export type SendElementKind = 'dit' | 'dah';

/** Ein dekodiertes Element mit seiner gemessenen Dauer. */
export interface SendElement {
  readonly duration: number;
  readonly kind: SendElementKind;
}

export interface SendDecode {
  /** Das dekodierte Muster, z. B. ".-.". */
  readonly pattern: string;
  /** Das dekodierte Zeichen -- oder null, wenn das Muster keinem entspricht. */
  readonly character: string | null;
  /** Jedes Element mit seiner Dauer und seiner Einordnung -- fürs Fortschreiben der Sitzungs-Schätzung. */
  readonly elements: readonly SendElement[];
  /** Verhältnis Dah:Dit -- null ohne einen einzigen dah. */
  readonly dahDitRatio: number | null;
  /** Verhältnis der Zeichenpause zum dit -- null bei einem einzelnen Element (keine Pause). */
  readonly gapRatio: number | null;
  /** Das abgeleitete Tempo in WpM (1,2 / dit) -- berichtet, nicht bewertet. */
  readonly wpm: number;
  /** Ob die Sitzungs-Schätzung einspringen musste, weil die Eingabe keinen Kontrast hatte. */
  readonly usedSessionEstimate: boolean;
}

/**
 * Dekodiert eine gesendete Folge von Tastendrücken.
 *
 * `sessionDitSeconds` ist die aktuelle Sitzungs-Schätzung (siehe
 * `estimateDitSeconds`) -- sie wird nur herangezogen, wenn die Eingabe selbst
 * keinen Kontrast hat.
 */
export function decodeSend(
  intervals: readonly SendInterval[],
  sessionDitSeconds: number,
): SendDecode {
  if (intervals.length === 0) {
    throw new RangeError('decodeSend braucht mindestens ein Element');
  }

  const durations = intervals.map((interval) => Math.max(0, interval.upAt - interval.downAt));
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  // Kontrast heisst: die Eingabe selbst unterscheidet kurz von lang. Ohne ihn
  // (auch bei einem einzelnen Element, wo das Verhaeltnis keinen Sinn hat)
  // entscheidet die Sitzungs-Schaetzung (#101a).
  const hasContrast = minDuration > 0 && maxDuration / minDuration >= SEND_CONTRAST_RATIO;
  const usedSessionEstimate = !hasContrast;

  const unitGuess = hasContrast ? minDuration : sessionDitSeconds;
  const threshold = unitGuess * SEND_DAH_THRESHOLD_MULTIPLIER;

  const elements: SendElement[] = durations.map((duration) => ({
    duration,
    kind: duration < threshold ? 'dit' : 'dah',
  }));

  const pattern = elements.map((element) => (element.kind === 'dit' ? '.' : '-')).join('');
  const character = decodePattern(pattern);

  const ditDurations = elements.filter((e) => e.kind === 'dit').map((e) => e.duration);
  const dahDurations = elements.filter((e) => e.kind === 'dah').map((e) => e.duration);

  // Ohne ein einziges als dit erkanntes Element (ein reiner dah-Ausreisser waere
  // dann Kontrast gewesen und haette schon oben ditDurations gefuellt) bleibt
  // die Schaetzung selbst die beste verfuegbare Dit-Dauer.
  const avgDit = ditDurations.length > 0 ? average(ditDurations) : unitGuess;
  const avgDah = dahDurations.length > 0 ? average(dahDurations) : null;
  const dahDitRatio = avgDah === null ? null : avgDah / avgDit;

  const gaps: number[] = [];
  for (let index = 1; index < intervals.length; index += 1) {
    gaps.push(Math.max(0, intervals[index].downAt - intervals[index - 1].upAt));
  }
  const gapRatio = gaps.length === 0 ? null : average(gaps) / avgDit;

  const wpm = 1.2 / avgDit;

  return { pattern, character, elements, dahDitRatio, gapRatio, wpm, usedSessionEstimate };
}

/** Die Dauern der als dit erkannten Elemente eines Dekodierergebnisses. */
export function recognizedDitDurations(decode: SendDecode): number[] {
  return decode.elements.filter((element) => element.kind === 'dit').map((element) => element.duration);
}

/**
 * Schreibt die Sitzungs-Schätzung fort: die neu erkannten dits kommen dazu,
 * gedeckelt auf `SEND_DIT_HISTORY_KEPT`. Ohne einen einzigen erkannten dit
 * (ein einzelner dah ohne Kontrast) bleibt die Historie unverändert.
 */
export function appendDitHistory(
  history: readonly number[],
  decode: SendDecode,
): readonly number[] {
  const added = recognizedDitDurations(decode);
  if (added.length === 0) return history;
  return [...history, ...added].slice(-SEND_DIT_HISTORY_KEPT);
}

/**
 * Die aktuelle Sitzungs-Schätzung des eigenen dits: der Median der Historie,
 * oder das Zieldit bei 20 WPM, solange noch nichts erkannt wurde (#101a).
 */
export function estimateDitSeconds(history: readonly number[]): number {
  return history.length === 0 ? SEND_TARGET_DIT_SECONDS : median(history);
}

export type SendDeviationKind = 'dah-short' | 'dah-long' | 'gap-narrow' | 'gap-wide';

/**
 * Die größte Abweichung eines Dekodierergebnisses -- oder null, wenn beide
 * Verhältnisse im sauberen Bereich liegen (oder gar nicht vorliegen).
 *
 * Verglichen wird die *relative* Abweichung vom jeweiligen Ziel; bei einem
 * Gleichstand gewinnt das Dah:Dit-Verhältnis. Reine Klassifikation -- welcher
 * Satz dazu gehört, entscheidet die UI (CLAUDE.md 4).
 */
export function biggestSendDeviation(
  decode: Pick<SendDecode, 'dahDitRatio' | 'gapRatio'>,
): SendDeviationKind | null {
  const dah = deviationBeyondClean(decode.dahDitRatio, SEND_DAH_DIT_CLEAN, SEND_DAH_DIT_TARGET);
  const gap = deviationBeyondClean(decode.gapRatio, SEND_GAP_CLEAN, SEND_GAP_TARGET);

  if (dah === null && gap === null) return null;
  if (gap === null || (dah !== null && dah.magnitude >= gap.magnitude)) {
    return decode.dahDitRatio! < SEND_DAH_DIT_CLEAN.min ? 'dah-short' : 'dah-long';
  }
  return decode.gapRatio! < SEND_GAP_CLEAN.min ? 'gap-narrow' : 'gap-wide';
}

function deviationBeyondClean(
  ratio: number | null,
  clean: { min: number; max: number },
  target: number,
): { magnitude: number } | null {
  if (ratio === null) return null;
  if (ratio >= clean.min && ratio <= clean.max) return null;
  return { magnitude: Math.abs(ratio - target) / target };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Median einer Messreihe. Leer ist hier kein Fall -- die Aufrufer prüfen das selbst. */
function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
