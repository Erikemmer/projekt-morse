/**
 * Der Kern-Lernloop als reiner Zustandsautomat: hoeren -> antworten -> Feedback.
 *
 * Retrieval-only. Es gibt keinen Mitlese- oder Berieselungsmodus: auf jeden Ton
 * folgt eine aktive Antwort, und erst danach die Aufloesung. Abrufen ist das, was
 * das Erinnern baut; Zuschauen fuehlt sich nur so an.
 *
 * Zwei Regeln stecken in den Uebergaengen und sind keine Willkuer:
 *
 * - **Waehrend des Hoerens kann man nicht antworten.** Ein Muster ist erst am Ende
 *   eindeutig ('.' ist der Anfang von '..' und von '...'), eine Antwort davor waere
 *   geraten -- und die gemessene Zeit waere Unsinn.
 * - **Alle Zeitstempel liegen auf der Uhr des AudioContext**, nie auf `Date.now()`.
 *   Der Ton wird auf dieser Uhr geplant; mischte man zwei Uhren, waere die
 *   Reaktionszeit die Differenz zweier Groessen, die nichts miteinander zu tun
 *   haben. Diese Datei sieht davon nur Sekunden als Zahl -- sie kennt weder
 *   AudioContext noch DOM.
 */

import { pickNext } from './selection';
import { recordAttempt, type Progress } from './stats';

export type Phase =
  /** Zeichen steht bereit, wurde aber noch nicht abgespielt. */
  | 'ready'
  /** Der Ton laeuft. Keine Antwort moeglich, keine Anzeige des Musters. */
  | 'listening'
  /** Ton vorbei, Antwort faellig. Ab hier laeuft die Reaktionszeit. */
  | 'answering'
  /** Antwort gegeben, Aufloesung sichtbar. */
  | 'feedback'
  /** Alle Runden durch. */
  | 'finished';

export interface Attempt {
  /** Das gesendete Zeichen. */
  char: string;
  /** Was der Nutzer gewaehlt hat. */
  answer: string;
  correct: boolean;
  /**
   * Sekunden zwischen dem Ende des Tons und der Antwort. Naeherungswert fuer
   * Sicherheit -- er enthaelt auch Motorik und die Suche auf dem Antwort-Gitter.
   */
  reactionSeconds: number;
  /** Wie oft der Ton vor der Antwort wiederholt wurde. */
  replays: number;
}

export interface SessionState {
  readonly pool: readonly string[];
  readonly totalRounds: number;
  /** Laufende Runde, 1-basiert. */
  readonly round: number;
  readonly prompt: string;
  readonly phase: Phase;
  /** Ende des Tons auf der Audio-Uhr, oder null solange nichts geplant ist. */
  readonly promptEndsAt: number | null;
  readonly replays: number;
  readonly attempts: readonly Attempt[];
  readonly lastAttempt: Attempt | null;
  /** Fortschritt ueber alle Sitzungen -- Grundlage der Gewichtung. */
  readonly progress: Progress;
}

export interface SessionOptions {
  pool: readonly string[];
  totalRounds: number;
  progress: Progress;
  /** Zufallszahl in [0,1). Als Parameter, damit Tests nicht wuerfeln muessen. */
  random: () => number;
}

export function createSession(options: SessionOptions): SessionState {
  if (options.pool.length === 0) throw new RangeError('Der Zeichensatz darf nicht leer sein');
  if (options.totalRounds < 1) throw new RangeError('Eine Sitzung braucht mindestens eine Runde');

  return {
    pool: options.pool,
    totalRounds: options.totalRounds,
    round: 1,
    prompt: pickNext(options.pool, options.progress, { random: options.random }),
    phase: 'ready',
    promptEndsAt: null,
    replays: 0,
    attempts: [],
    lastAttempt: null,
    progress: options.progress,
  };
}

/**
 * Meldet, dass die Wiedergabe geplant ist und wann sie endet (Audio-Uhr).
 *
 * Ein erneuter Aufruf vor der Antwort ist eine Wiederholung und wird gezaehlt --
 * sie gehoert zum Versuch. Nach der Antwort ist Hoeren dagegen Nachhoeren und
 * aendert nichts mehr am Datensatz.
 */
export function beginPlayback(state: SessionState, endsAt: number): SessionState {
  switch (state.phase) {
    case 'ready':
      return { ...state, phase: 'listening', promptEndsAt: endsAt };
    case 'listening':
    case 'answering':
      return { ...state, phase: 'listening', promptEndsAt: endsAt, replays: state.replays + 1 };
    default:
      return state;
  }
}

/** Der Ton ist durch: ab jetzt zaehlt die Zeit bis zur Antwort. */
export function promptFinished(state: SessionState): SessionState {
  return state.phase === 'listening' ? { ...state, phase: 'answering' } : state;
}

/**
 * Verbucht die Antwort. `atAudioTime` ist der Zeitpunkt auf der Audio-Uhr.
 *
 * Ausserhalb von 'answering' passiert nichts -- ein zweiter Klick auf dieselbe
 * Antwort darf keinen zweiten Versuch erzeugen.
 */
export function submitAnswer(
  state: SessionState,
  answer: string,
  atAudioTime: number,
): SessionState {
  if (state.phase !== 'answering' || state.promptEndsAt === null) return state;

  const correct = answer === state.prompt;
  const attempt: Attempt = {
    char: state.prompt,
    answer,
    correct,
    // Negativ kann sie nicht sein; ein Vorzeichen hier waere ein Uhrenfehler.
    reactionSeconds: Math.max(0, atAudioTime - state.promptEndsAt),
    replays: state.replays,
  };

  return {
    ...state,
    phase: 'feedback',
    attempts: [...state.attempts, attempt],
    lastAttempt: attempt,
    progress: recordAttempt(state.progress, attempt.char, correct, attempt.reactionSeconds),
  };
}

/**
 * Weiter zur naechsten Runde -- oder ans Ende der Sitzung.
 *
 * Nur aus 'feedback' heraus: eine Runde ohne Antwort zu ueberspringen wuerde die
 * Statistik verduennen, ohne dass jemand etwas geuebt haette.
 */
export function advance(state: SessionState, random: () => number): SessionState {
  if (state.phase !== 'feedback') return state;
  if (state.round >= state.totalRounds) return { ...state, phase: 'finished' };

  return {
    ...state,
    round: state.round + 1,
    prompt: pickNext(state.pool, state.progress, { random, avoid: state.prompt }),
    phase: 'ready',
    promptEndsAt: null,
    replays: 0,
  };
}

export interface SessionSummary {
  rounds: number;
  hits: number;
  /** Trefferquote 0..1, oder null wenn nichts beantwortet wurde. */
  accuracy: number | null;
  /** Median der Reaktionszeiten *richtiger* Antworten, oder null. */
  medianReactionSeconds: number | null;
}

/** Fasst die laufende Sitzung zusammen. Reine Ableitung, kein Zustand. */
export function summarize(state: SessionState): SessionSummary {
  const hits = state.attempts.filter((attempt) => attempt.correct);
  const reactions = hits.map((attempt) => attempt.reactionSeconds).sort((a, b) => a - b);

  const middle = Math.floor(reactions.length / 2);
  const medianReactionSeconds =
    reactions.length === 0
      ? null
      : reactions.length % 2 === 1
        ? reactions[middle]
        : (reactions[middle - 1] + reactions[middle]) / 2;

  return {
    rounds: state.attempts.length,
    hits: hits.length,
    accuracy: state.attempts.length === 0 ? null : hits.length / state.attempts.length,
    medianReactionSeconds,
  };
}
