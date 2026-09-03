/**
 * Der Sende-Loop als reiner Zustandsautomat: Zeichen zeigen -> optional hoeren
 * -> senden -> Aufloesung -> weiter (Konzept-Ruling Notion-Log #90,
 * Praezisierungen #101).
 *
 * **Dieser Modus zeigt das Zeichen, nicht sein Muster.** Anders als das
 * Hoertraining ist die Aufgabe hier bekannt ("sende R") -- geuebt wird die
 * Produktion, nicht das Erkennen. "Hear it" spielt die Referenz auf Zuruf,
 * ohne dass je Punkte oder Striche zu sehen waeren (Teil A.3, CLAUDE.md 2.2).
 *
 * **Offen wie der Wort-Modus** (Ruling #87, hier von Anfang an so
 * entschieden statt spaeter nachgezogen): keine Runden, kein Abschluss. Die
 * stille Auskunft ist `sentToday`, der Streak-Tag faellt nach
 * `WORDS_STREAK_MIN_ANSWERS` abgeschickten Versuchen -- **dieselbe
 * Konstante** wie beim Wort-Modus (Teil A.1/A.2), keine zweite Zahl.
 *
 * **Zwei Eingabewege, eine Aufgabe.** `mode: 'keyed'` ist der Kern -- Timing
 * ist heilig (CLAUDE.md 2.1), die Dekodierung uebernimmt
 * `engine/sending.ts`. `mode: 'tapped'` ("Tap it in instead", Teil E.16) ist
 * die selbstgesteuerte Alternative (CLAUDE.md 6): zwei Tasten fuer · und −,
 * ohne Zeitdruck, bewertet wird nur die Richtigkeit. Beide Wege muenden in
 * denselben Zustandsautomaten und dieselbe Statistik -- ein Versuch ist ein
 * Versuch, gleich auf welchem Weg er kam.
 *
 * **Was dieser Modus mit der Statistik macht -- und was nicht** (Teil F.17):
 * Versuche und Treffer gehen in eine **eigene** Sende-Statistik je Zeichen
 * (`stats.ts`, `recordSendAttempt`), niemals in `progress.characters`. Sie
 * fliesst nirgends in die Gewichtung nach Schwaeche, die Wachstumsregel, ICR-
 * Drills oder die Tempo-Progression des Hoertrainings ein -- diese Stellen
 * lesen das Feld schlicht nie, weil es ein anderes ist.
 *
 * **Die Sitzungs-Schaetzung des eigenen dits** (#101a) lebt hier, nicht in
 * `Progress`: sie ist Sitzungszustand wie `SessionSound`, keine dauerhafte
 * Nutzerstatistik, und beginnt bei jeder neuen Einheit wieder beim Zieldit
 * bei 20 WPM (`engine/sending.ts`, `estimateDitSeconds`).
 *
 * Kein DOM, keine Audio-API, keine Uhr. Zeitpunkte (Tastenintervalle) kommen
 * fertig herein, so wie ueberall in dieser Engine.
 */

import { decodePattern, encodeChar } from './alphabet';
import {
  appendDitHistory,
  biggestSendDeviation,
  decodeSend,
  estimateDitSeconds,
  type SendDeviationKind,
  type SendInterval,
} from './sending';

export type { SendDeviationKind, SendInterval };
import { dayFor, recordSendAttempt, type Progress } from './stats';
import { recordPracticeDay } from './streak';
import { drawPromptTone, drawSessionSound, type SessionSound } from './variability';
import { WORDS_STREAK_MIN_ANSWERS } from './words';

/**
 * Wie viele Versuche der Zustand aufhebt -- derselbe Gedanke wie
 * `WORD_ATTEMPTS_KEPT`: der Modus laeuft ohne Ende, die Liste darf es nicht
 * (CLAUDE.md 7).
 */
export const SEND_ATTEMPTS_KEPT = 50;

/**
 * Laengstes Morse-Muster im aktiven Satz dieses Modus -- die Ziffern mit fuenf
 * Elementen (z. B. "0" = -----). Satzzeichen kommen im aktiven Satz nicht vor
 * (settings.ts, CHARACTER_ORDER). Begrenzt die getippte Eingabe von "Tap it
 * in": laenger als das laengste moegliche Muster kann keine richtige Antwort
 * sein.
 */
export const SEND_MAX_TAP_LENGTH = 5;

export type SendPhase =
  /** Aufgabe steht bereit. "Hear it" und die Taste sind beide moeglich. */
  | 'ready'
  /** Die Referenz spielt. Die Taste ist gesperrt (siehe MorsePlayer.keyDown). */
  | 'listening'
  /** Es wurde mindestens ein Element gesendet oder getippt, noch nicht abgeschickt. */
  | 'sending'
  /** Abgeschickt, Aufloesung sichtbar. */
  | 'feedback';

export type SendMode = 'keyed' | 'tapped';

export interface SendAttempt {
  /** Das Zeichen, das gesendet werden sollte. */
  readonly prompt: string;
  /** Sein Muster, aus dem Alphabet -- fuer die Aufloesung (Teil D.13). */
  readonly targetPattern: string;
  readonly mode: SendMode;
  /** Das dekodierte bzw. getippte Muster. */
  readonly decodedPattern: string;
  readonly decodedCharacter: string | null;
  readonly correct: boolean;
  /** Nur bei `mode: 'keyed'` -- sonst null (kein Timing zu berichten). */
  readonly dahDitRatio: number | null;
  readonly gapRatio: number | null;
  readonly wpm: number | null;
  readonly usedSessionEstimate: boolean;
  /** Die groesste Abweichung dieses Versuchs -- null bei "Tap it in" oder sauberem Timing. */
  readonly deviation: SendDeviationKind | null;
}

export interface SendSessionState {
  /** Die Zeichen, aus denen gebaut wird: der aktive Satz aus dem Fortschritt. */
  readonly pool: readonly string[];
  readonly prompt: string;
  readonly phase: SendPhase;
  readonly mode: SendMode;
  /** Die Tastenintervalle des laufenden, getasteten Versuchs. */
  readonly intervals: readonly SendInterval[];
  /** Das getippte Muster des laufenden "Tap it in"-Versuchs. */
  readonly taps: readonly ('.' | '-')[];
  /** Die juengsten Versuche, hoechstens `SEND_ATTEMPTS_KEPT`. */
  readonly attempts: readonly SendAttempt[];
  readonly lastAttempt: SendAttempt | null;
  readonly progress: Progress;
  /** Der Kalendertag dieser Einheit, `YYYY-MM-DD`. Hereingereicht, nicht gelesen. */
  readonly today: string;
  readonly sound: SessionSound;
  readonly promptToneHz: number;
  /**
   * Die Sitzungs-Schaetzung des eigenen dits (#101a) -- die Historie der
   * als dit erkannten Elemente dieser Einheit, aus der `estimateDitSeconds`
   * den Median zieht. Lebt nur hier, nicht in `Progress` (siehe Kopf).
   */
  readonly ditHistory: readonly number[];
}

export interface SendSessionOptions {
  progress: Progress;
  /** Zufallszahl in [0,1). Als Parameter, damit Tests nicht wuerfeln muessen. */
  random: () => number;
  /** Kalendertag als `YYYY-MM-DD`. Ebenfalls Parameter, aus demselben Grund. */
  today: string;
  /** Der Heimton dieses Geraets in Hz; gilt auf Variabilitaets-Stufe 0. */
  homeToneHz?: number;
}

/** Beginnt den Modus. */
export function createSendSession(options: SendSessionOptions): SendSessionState {
  const pool = options.progress.activeCharacters;
  if (pool.length === 0) throw new RangeError('Der Zeichensatz darf nicht leer sein');

  const progress: Progress = {
    ...options.progress,
    day: dayFor(options.progress, options.today),
  };
  const sound = drawSessionSound(progress, options.random, options.homeToneHz);

  return {
    pool,
    prompt: pickPrompt(pool, options.random, null),
    phase: 'ready',
    mode: 'keyed',
    intervals: [],
    taps: [],
    attempts: [],
    lastAttempt: null,
    progress,
    today: options.today,
    sound,
    promptToneHz: drawPromptTone(sound, options.random),
    ditHistory: [],
  };
}

/**
 * Spielt die Referenz ("Hear it"). Nur aus `'ready'` -- waehrend gesendet
 * oder getippt wird, gibt es nichts mehr zu hoeren, das die Eingabe nicht
 * schon beeinflusst haette, und nach dem Abschicken zeigt die Aufloesung das
 * Muster ohnehin (Teil D.13).
 */
export function beginSendPlayback(state: SendSessionState): SendSessionState {
  return state.phase === 'ready' ? { ...state, phase: 'listening' } : state;
}

/** Die Referenz ist durch: zurueck in den Ausgangszustand, beide Wege offen. */
export function sendPlaybackFinished(state: SendSessionState): SendSessionState {
  return state.phase === 'listening' ? { ...state, phase: 'ready' } : state;
}

/**
 * Waehlt den Eingabeweg. Nur aus `'ready'` moeglich (bevor irgendetwas
 * eingegeben ist) -- ein Wechsel mitten in einer angefangenen Eingabe muesste
 * entscheiden, was mit ihr passiert, und das ist keine Entscheidung, die
 * diese Funktion treffen sollte. Ohne Wirkung, wenn der Modus schon gilt.
 */
export function setSendMode(state: SendSessionState, mode: SendMode): SendSessionState {
  if (state.phase !== 'ready' || state.mode === mode) return state;
  return { ...state, mode, intervals: [], taps: [] };
}

/**
 * Ein Tastenintervall anfuegen (`mode: 'keyed'`). Das erste hebt die Aufgabe
 * von `'ready'` nach `'sending'`.
 *
 * Nimmt fertige Intervalle entgegen (Zeitpunkte von `MorsePlayer.keyDown()`/
 * `keyUp()`) -- die Engine kennt keinen "halb gedrueckten" Zustand, das haelt
 * die UI in einer lokalen Variablen, bis die Taste wieder losgelassen ist.
 */
export function appendSendInterval(
  state: SendSessionState,
  interval: SendInterval,
): SendSessionState {
  if (state.mode !== 'keyed') return state;
  if (state.phase !== 'ready' && state.phase !== 'sending') return state;
  return { ...state, phase: 'sending', intervals: [...state.intervals, interval] };
}

/**
 * Ein Element antippen (`mode: 'tapped'`, Teil E.16). Gedeckelt auf
 * `SEND_MAX_TAP_LENGTH` -- laenger als das laengste moegliche Muster kann nur
 * ein Vertipper sein.
 */
export function appendTap(state: SendSessionState, symbol: '.' | '-'): SendSessionState {
  if (state.mode !== 'tapped') return state;
  if (state.phase !== 'ready' && state.phase !== 'sending') return state;
  if (state.taps.length >= SEND_MAX_TAP_LENGTH) return state;
  return { ...state, phase: 'sending', taps: [...state.taps, symbol] };
}

/** Das letzte getippte Element loeschen (`mode: 'tapped'`). Bei leerer Eingabe passiert nichts. */
export function deleteTap(state: SendSessionState): SendSessionState {
  if (state.mode !== 'tapped' || state.taps.length === 0) return state;
  const taps = state.taps.slice(0, -1);
  return { ...state, taps, phase: taps.length === 0 ? 'ready' : 'sending' };
}

/**
 * Schickt die laufende Eingabe ab -- ueber "Done" oder automatisch nach
 * 1,5 s Stille (Teil B.8, die Stille selbst zaehlt die UI, nicht die Engine).
 * Ohne eine einzige Eingabe passiert nichts: sie waere kein Versuch, sondern
 * ein Uebersprung (dieselbe Regel wie ueberall in dieser App).
 */
export function submitSend(state: SendSessionState): SendSessionState {
  if (state.phase !== 'sending') return state;
  return state.mode === 'keyed' ? finishKeyed(state) : finishTapped(state);
}

function finishKeyed(state: SendSessionState): SendSessionState {
  if (state.intervals.length === 0) return state;

  const ditEstimate = estimateDitSeconds(state.ditHistory);
  const decode = decodeSend(state.intervals, ditEstimate);
  const targetPattern = encodeChar(state.prompt) ?? '';

  const attempt: SendAttempt = {
    prompt: state.prompt,
    targetPattern,
    mode: 'keyed',
    decodedPattern: decode.pattern,
    decodedCharacter: decode.character,
    correct: decode.character === state.prompt,
    dahDitRatio: decode.dahDitRatio,
    gapRatio: decode.gapRatio,
    wpm: decode.wpm,
    usedSessionEstimate: decode.usedSessionEstimate,
    deviation: biggestSendDeviation(decode),
  };

  return finalizeAttempt(
    state,
    attempt,
    { dahDitRatio: decode.dahDitRatio, gapRatio: decode.gapRatio },
    appendDitHistory(state.ditHistory, decode),
  );
}

function finishTapped(state: SendSessionState): SendSessionState {
  if (state.taps.length === 0) return state;

  const decodedPattern = state.taps.join('');
  const decodedCharacter = decodePattern(decodedPattern);
  const targetPattern = encodeChar(state.prompt) ?? '';

  const attempt: SendAttempt = {
    prompt: state.prompt,
    targetPattern,
    mode: 'tapped',
    decodedPattern,
    decodedCharacter,
    correct: decodedCharacter === state.prompt,
    dahDitRatio: null,
    gapRatio: null,
    wpm: null,
    usedSessionEstimate: false,
    deviation: null,
  };

  // Kein Timing zu verbuchen, die Sitzungs-Schaetzung bleibt unberuehrt.
  return finalizeAttempt(state, attempt, null, state.ditHistory);
}

/** Verbucht einen fertigen Versuch, gleich auf welchem Weg er kam -- der gemeinsame Schlussteil. */
function finalizeAttempt(
  state: SendSessionState,
  attempt: SendAttempt,
  ratios: { readonly dahDitRatio: number | null; readonly gapRatio: number | null } | null,
  ditHistory: readonly number[],
): SendSessionState {
  let progress = recordSendAttempt(
    state.progress,
    state.prompt,
    attempt.correct,
    ratios,
    state.today,
  );

  // Derselbe Streak-Mechanismus wie im Wort-Modus, dieselbe Konstante
  // (Teil A.2): idempotent, ein zweiter Fall am selben Tag schreibt nichts doppelt.
  if (progress.day.sent >= WORDS_STREAK_MIN_ANSWERS) {
    progress = { ...progress, streak: recordPracticeDay(progress.streak, state.today) };
  }

  return {
    ...state,
    phase: 'feedback',
    attempts: [...state.attempts, attempt].slice(-SEND_ATTEMPTS_KEPT),
    lastAttempt: attempt,
    progress,
    ditHistory,
  };
}

/** Wie viele Sende-Versuche an **diesem** Kalendertag abgeschickt wurden. */
export function sentToday(state: SendSessionState): number {
  const day = state.progress.day;
  return day.date === state.today ? day.sent : 0;
}

/**
 * Weiter zur naechsten Aufgabe. **Immer** -- der Modus endet nicht von selbst
 * (wie der Wort-Modus seit Ruling #87).
 *
 * **Der gewaehlte Eingabeweg bleibt ueber die Aufgabe hinweg bestehen.** Wer
 * "Tap it in" gewaehlt hat, waehlt es nicht bei jeder neuen Aufgabe erneut --
 * das waere die selbstgesteuerte Alternative (CLAUDE.md 6) durch eine
 * staendige Huerde ersetzen. Zurueck zur Tastung geht ueber `setSendMode`.
 */
export function advanceSend(state: SendSessionState, random: () => number): SendSessionState {
  if (state.phase !== 'feedback') return state;

  return {
    ...state,
    prompt: pickPrompt(state.pool, random, state.prompt),
    phase: 'ready',
    intervals: [],
    taps: [],
    promptToneHz: drawPromptTone(state.sound, random),
  };
}

/**
 * Stellt den Heimton einer laufenden Einheit nach -- **nur auf Stufe 0**,
 * derselbe Mechanismus wie `retuneHomeTone`/`retuneWordHomeTone` und aus
 * demselben Grund: ein gezogener Wert gehoert der Sitzung, ein Heimton dem
 * Geraet. Der Rueckgabewert ist identisch (===), wenn sich nichts aendert.
 */
export function retuneSendHomeTone(
  state: SendSessionState,
  homeToneHz: number,
): SendSessionState {
  if (state.sound.stage !== 0) return state;
  if (state.sound.sessionToneHz === homeToneHz) return state;

  return {
    ...state,
    sound: { ...state.sound, sessionToneHz: homeToneHz },
    promptToneHz: homeToneHz,
  };
}

/**
 * Die naechste Aufgabe: ein Zeichen aus dem aktiven Satz, gleichverteilt und
 * ohne Wiederholung der vorigen (dieselbe Ruecksicht wie ueberall in dieser
 * App -- zweimal dasselbe Zeichen hintereinander waere keine Uebung im
 * Erkennen). Bewusst **nicht** nach Schwaeche gewichtet: das gewichtet die
 * *Hoer*-Statistik (`selection.ts`), und dieser Modus uebt eine andere
 * Fertigkeit (Teil F.17 -- die beiden Statistiken bleiben getrennt, auch hier).
 */
function pickPrompt(pool: readonly string[], random: () => number, avoid: string | null): string {
  const candidates = pool.length > 1 ? pool.filter((char) => char !== avoid) : pool;
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}
