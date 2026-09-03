/**
 * Der Wort-Loop als reiner Zustandsautomat: hoeren -> tippen -> abschicken ->
 * Feedback -> naechste Aufgabe (Ruling #83, Teil A; offen seit Ruling #87).
 *
 * **Dieser Modus hat kein Ende.** Bis Runde F2 war er eine Einheit aus zehn
 * Aufgaben mit Fortschrittsbalken und Abschluss-Screen. Das war eine
 * Forderung, wo eine Einladung hingehoert: wer ueben will, tippt "Next word",
 * und wer aufhoeren will, hoert auf -- verlassen wird ueber das Menue. Was an
 * die Stelle der Forderung tritt, ist eine **Auskunft**: wie viele Aufgaben an
 * diesem Kalendertag gelaufen sind (`wordsHeardToday`). Eine Zahl, die
 * berichtet, statt eine, die etwas verlangt (CLAUDE.md 2.8).
 *
 * Die Phasen sind dieselben wie im Einzelzeichen-Loop (`engine/session.ts`) und
 * aus denselben Gruenden: waehrend des Tons kann nicht geantwortet werden (eine
 * Folge ist erst am Ende eindeutig), und nach der Antwort kommt erst die
 * Aufloesung. Was **nicht** dasselbe ist, ist die Antwort selbst -- ein ganzes
 * Wort statt eines Zeichens, mit Vertippen, Loeschen und einem Absenden. Genau
 * deshalb steht der Loop hier und ist nicht in `session.ts` mit
 * hineingebaut: eine gemeinsame Maschine muesste zwei Antwortmodelle
 * auseinanderhalten, und der Einzelzeichen-Loop ist der, an dem die Statistik
 * und die Wachstumsregel haengen. Doppelter Zustandsautomat ist hier billiger
 * als eine Abstraktion, die beide traegt (CLAUDE.md 4).
 *
 * **Was dieser Modus mit der Statistik macht -- und was nicht.**
 *
 * - **Jede Position verbucht ihr Zeichen.** Richtig ist eine Position, wenn an
 *   ihr das gesendete Zeichen getippt wurde. Die Antworten sind echt, also
 *   werden sie verbucht -- Versuche und Treffer, wie ueberall.
 * - **Keine Reaktionszeit.** Gemessen wuerde die Zeit fuer das *ganze* Wort,
 *   also fuer Hoeren, Halten, Tippen und Nachdenken ueber fuenf Positionen.
 *   Sie einer Position zuzuschreiben waere eine erfundene Zahl -- und sie waere
 *   sofort im Umlauf, denn "langsames Zeichen" (drill.ts) und die Gewichtung
 *   nach Schwaeche (selection.ts) lesen genau diese Reihe (CLAUDE.md 2.6).
 *   Deshalb `reactionSeconds: null` (stats.ts).
 * - **Kein Wachstumsfenster, kein Zeichen-Wachstum.** Genau wie beim Drill,
 *   und mit denselben zwei Riegeln: `countTowardGrowth: false` haelt
 *   `recentAnswers` und die beiden Sperren an, und `maybeGrow` wird gar nicht
 *   erst gefragt. Das ist Absicht (Ruling #83, A.8): ueber Wachstum
 *   entscheidet der Einzelzeichen-Loop. Zehn Aufgaben ergeben bis zu fuenfzig
 *   Positionen -- ein daraus gefuelltes Dreissiger-Fenster waere kein Bild der
 *   normalen Uebung mehr, und die Wachstumsregel entschiede darauf ueber den
 *   naechsten Buchstaben.
 *
 * Kein DOM, keine Audio-API, keine Uhr. Der Kalendertag kommt herein.
 */

import { dayFor, recordAttempt, recordWordPrompt, type Progress } from './stats';
import { recordPracticeDay } from './streak';
import { drawPromptTone, drawSessionSound, type SessionSound } from './variability';
import { PROMPT_MAX_LENGTH, WORDS_STREAK_MIN_ANSWERS, nextPrompt } from './words';

/**
 * Wie viele Versuche der Zustand aufhebt.
 *
 * Der Modus laeuft jetzt ohne Ende, also waechst `attempts` ohne Ende -- und
 * unbegrenztes Wachstum ueber eine lange Sitzung ist genau das, was das
 * Leistungsbudget ausschliesst (CLAUDE.md 7). Fuenfzig, aus demselben Gedanken
 * wie `RECENT_SAMPLES` in stats.ts: genug, um etwas ueber den aktuellen Stand
 * zu sagen, und wenig genug, um nicht der Anfaengerzustand von vor einer
 * Stunde zu sein. Verbucht ist ohnehin alles -- die Statistik je Zeichen
 * haengt nicht an dieser Liste.
 */
export const WORD_ATTEMPTS_KEPT = 50;

export type WordPhase =
  /** Aufgabe steht bereit, wurde aber noch nicht abgespielt. */
  | 'ready'
  /** Der Ton laeuft. Keine Eingabe moeglich, nichts auf dem Schirm. */
  | 'listening'
  /** Ton vorbei, Eingabe faellig. */
  | 'answering'
  /** Abgeschickt, Aufloesung sichtbar. */
  | 'feedback';

export interface WordAttempt {
  /** Was gesendet wurde -- ein Wort oder eine Gruppe. */
  readonly prompt: string;
  /** Was getippt und abgeschickt wurde. */
  readonly answer: string;
  /** Ob die ganze Antwort stimmt -- Zeichen fuer Zeichen und gleich lang. */
  readonly correct: boolean;
  /**
   * Je Position der Aufgabe: stimmte sie. Genauso lang wie `prompt`, damit die
   * UI die Aufloesung Position fuer Position markieren kann. Eine Position,
   * die gar nicht getippt wurde (zu kurze Antwort), ist falsch.
   */
  readonly marks: readonly boolean[];
  /**
   * Was ueber die Laenge der Aufgabe hinaus getippt wurde -- meist leer.
   * Steht hier, damit die UI es zeigen kann, statt es stillschweigend zu
   * verschlucken; verbucht wird es nicht, denn es gehoert zu keiner Position.
   */
  readonly extra: string;
  /** Wie oft der Ton vor dem Abschicken wiederholt wurde. */
  readonly replays: number;
}

export interface WordSessionState {
  /** Die Zeichen, aus denen gebaut wird: der aktive Satz aus dem Fortschritt. */
  readonly pool: readonly string[];
  readonly prompt: string;
  readonly phase: WordPhase;
  /** Was bisher getippt ist, hoechstens `PROMPT_MAX_LENGTH` Zeichen. */
  readonly typed: string;
  readonly replays: number;
  /** Die juengsten Versuche, hoechstens `WORD_ATTEMPTS_KEPT`. */
  readonly attempts: readonly WordAttempt[];
  readonly lastAttempt: WordAttempt | null;
  readonly progress: Progress;
  /** Der Kalendertag dieser Einheit, `YYYY-MM-DD`. Hereingereicht, nicht gelesen. */
  readonly today: string;
  /** Der Klang dieser Einheit (variability.ts) -- dieselbe Mechanik wie im Training. */
  readonly sound: SessionSound;
  /** Die Tonhoehe der laufenden Aufgabe. Eine Wiederholung behaelt sie. */
  readonly promptToneHz: number;
}

export interface WordSessionOptions {
  progress: Progress;
  /** Zufallszahl in [0,1). Als Parameter, damit Tests nicht wuerfeln muessen. */
  random: () => number;
  /** Kalendertag als `YYYY-MM-DD`. Ebenfalls Parameter, aus demselben Grund. */
  today: string;
  /** Der Heimton dieses Geraets in Hz; gilt auf Variabilitaets-Stufe 0. */
  homeToneHz?: number;
}

/**
 * Beginnt den Modus.
 *
 * **`sessionsStarted` bleibt stehen.** Der Zaehler beschriftet die laufende
 * Sitzung auf dem Trainings-Screen ("Session 12"), und dieser Modus laeuft
 * *neben* ihr, nicht an ihrer Stelle -- ein Drill ersetzt die Sitzung, das
 * Wort-Training nicht. Ihn hier hochzusetzen hiesse, dass die Zeile auf dem
 * Trainings-Screen nach der Rueckkehr eine andere Zahl traegt, obwohl es
 * dieselbe Sitzung ist (CLAUDE.md 2.6). Der Tages-Eimer zieht dagegen auf
 * heute nach, denn die Antworten von hier zaehlen zum Tag.
 */
export function createWordSession(options: WordSessionOptions): WordSessionState {
  const pool = options.progress.activeCharacters;
  if (pool.length === 0) throw new RangeError('Der Zeichensatz darf nicht leer sein');

  const progress: Progress = {
    ...options.progress,
    day: dayFor(options.progress, options.today),
  };
  const sound = drawSessionSound(progress, options.random, options.homeToneHz);

  return {
    pool,
    prompt: nextPrompt(progress, { random: options.random }),
    phase: 'ready',
    typed: '',
    replays: 0,
    attempts: [],
    lastAttempt: null,
    progress,
    today: options.today,
    sound,
    promptToneHz: drawPromptTone(sound, options.random),
  };
}

/**
 * Meldet, dass die Wiedergabe laeuft.
 *
 * Ein erneuter Aufruf vor dem Abschicken ist eine Wiederholung und wird
 * gezaehlt -- sie gehoert zum Versuch. Anders als im Einzelzeichen-Loop wird
 * hier **kein Endzeitpunkt** gebraucht: es gibt keine Reaktionszeit, also auch
 * keine Uhr, gegen die man sie messen muesste.
 */
export function beginWordPlayback(state: WordSessionState): WordSessionState {
  switch (state.phase) {
    case 'ready':
      return { ...state, phase: 'listening' };
    case 'listening':
    case 'answering':
      return { ...state, phase: 'listening', replays: state.replays + 1 };
    default:
      return state;
  }
}

/** Der Ton ist durch: ab jetzt darf getippt werden. */
export function wordPromptFinished(state: WordSessionState): WordSessionState {
  return state.phase === 'listening' ? { ...state, phase: 'answering' } : state;
}

/**
 * Ein Zeichen anfuegen.
 *
 * **Seit Ruling Notion-Log #112 auch in `'listening'`, nicht mehr nur in
 * `'answering'`.** Die Sperre auf `'listening'` war eine Fehlentscheidung:
 * ihr einziger Grund waere gewesen, eine Reaktionszeit zu schuetzen -- und
 * die gibt es in diesem Modus grundsaetzlich nicht (`reactionSeconds: null`,
 * siehe Kopf). Ohne diesen Grund sperrte die alte Regel nur, ohne etwas zu
 * gewinnen: ein Wort dauert bei niedrigem Tempo mehrere Sekunden, und wer
 * mitschreibt, was er schon gehoert hat, verlor seine ersten Buchstaben --
 * die Aufloesung meldete sie faelschlich als "zu kurz gehoert". Mitschreiben,
 * waehrend der Rest noch laeuft, ist im Funkverkehr sogar das *richtige*
 * Verhalten ("copy behind"). `submitWord` bleibt bewusst auf `'answering'`
 * beschraenkt -- abgeschickt wird erst, wenn die Aufgabe zu Ende gespielt ist.
 *
 * Sonst unveraendert: nur Zeichen aus dem geuebten Satz, und nicht mehr als
 * `PROMPT_MAX_LENGTH` -- laenger als die laengste moegliche Aufgabe kann keine
 * richtige Antwort sein. Aus jedem ablehnenden Fall kommt der Zustand
 * identisch (===) zurueck.
 */
export function typeCharacter(state: WordSessionState, char: string): WordSessionState {
  if (state.phase !== 'answering' && state.phase !== 'listening') return state;
  if (state.typed.length >= PROMPT_MAX_LENGTH) return state;

  const upper = char.toUpperCase();
  if (!state.pool.includes(upper)) return state;

  return { ...state, typed: state.typed + upper };
}

/**
 * Das letzte Zeichen loeschen. Bei leerer Eingabe passiert nichts.
 *
 * Auch in `'listening'` (Ruling Notion-Log #112) -- aus demselben Grund wie
 * `typeCharacter`: wer waehrend der Wiedergabe mitschreibt, muss sich dort
 * genauso korrigieren koennen wie danach.
 */
export function deleteCharacter(state: WordSessionState): WordSessionState {
  if ((state.phase !== 'answering' && state.phase !== 'listening') || state.typed === '') {
    return state;
  }
  return { ...state, typed: state.typed.slice(0, -1) };
}

/**
 * Die Antwort abschicken.
 *
 * Eine leere Antwort wird nicht angenommen: sie waere kein Versuch, sondern
 * ein Ueberspringen -- und das verduennte die Statistik, ohne dass jemand
 * etwas geuebt haette (dieselbe Regel wie in `session.ts`, `advance`).
 *
 * Verbucht wird **positionsweise**: jede Position der Aufgabe schreibt einen
 * Versuch auf ihr Zeichen, ohne Reaktionszeit und ohne Wachstumsfenster
 * (siehe Kopf).
 */
export function submitWord(state: WordSessionState): WordSessionState {
  if (state.phase !== 'answering' || state.typed === '') return state;

  const marks = [...state.prompt].map((char, index) => state.typed[index] === char);
  const attempt: WordAttempt = {
    prompt: state.prompt,
    answer: state.typed,
    correct: state.typed === state.prompt,
    marks,
    extra: state.typed.slice(state.prompt.length),
    replays: state.replays,
  };

  let progress = state.progress;
  for (let index = 0; index < state.prompt.length; index += 1) {
    progress = recordAttempt(progress, state.prompt[index], marks[index], null, state.today, {
      countTowardGrowth: false,
    });
  }

  // Die Aufgabe selbst, einmal -- sie traegt die Auskunft in der Kopfzeile und
  // die Streak-Schwelle (stats.ts, `recordWordPrompt`).
  progress = recordWordPrompt(progress, state.today);

  /*
   * **Hier faellt der Streak-Tag**, und nicht mehr am Ende einer Einheit: die
   * gibt es nicht mehr (Ruling #87). Die Schwelle steht in words.ts. Ein
   * zweiter Aufruf am selben Tag schreibt nichts doppelt -- `recordPracticeDay`
   * ist idempotent und gibt denselben Stand zurueck (engine/streak.ts).
   */
  if (progress.day.words >= WORDS_STREAK_MIN_ANSWERS) {
    progress = { ...progress, streak: recordPracticeDay(progress.streak, state.today) };
  }

  return {
    ...state,
    phase: 'feedback',
    // Gedeckelt: der Modus laeuft ohne Ende, die Liste darf es nicht.
    attempts: [...state.attempts, attempt].slice(-WORD_ATTEMPTS_KEPT),
    lastAttempt: attempt,
    progress,
  };
}

/**
 * Wie viele Wort-Aufgaben an **diesem** Kalendertag abgeschickt wurden.
 *
 * Reine Ableitung fuer die Kopfzeile: die UI soll den Tages-Eimer nicht selbst
 * gegen das Datum halten (CLAUDE.md 4). Steht der Eimer auf einem anderen Tag,
 * ist die Antwort 0 -- ein Stand von gestern als "heute" auszugeben waere eine
 * falsch beschriftete Zahl (CLAUDE.md 2.6).
 */
export function wordsHeardToday(state: WordSessionState): number {
  const day = state.progress.day;
  return day.date === state.today ? day.words : 0;
}

/**
 * Weiter zur naechsten Aufgabe. **Immer** -- der Modus endet nicht von selbst
 * (Ruling #87); wer aufhoeren will, geht ueber das Menue.
 *
 * Der Streak-Tag faellt nicht hier, sondern in `submitWord`, sobald an diesem
 * Tag `WORDS_STREAK_MIN_ANSWERS` Aufgaben abgeschickt sind. Es gibt kein Ende
 * mehr, an dem er sonst fallen koennte -- und eine einzelne Antwort ist kein
 * geuebter Tag.
 */
export function advanceWord(state: WordSessionState, random: () => number): WordSessionState {
  if (state.phase !== 'feedback') return state;

  return {
    ...state,
    prompt: nextPrompt(state.progress, { random, avoid: state.prompt }),
    phase: 'ready',
    typed: '',
    replays: 0,
    promptToneHz: drawPromptTone(state.sound, random),
  };
}

/**
 * Stellt den Heimton einer laufenden Einheit nach -- **nur auf Stufe 0**,
 * genau wie `retuneHomeTone` im Einzelzeichen-Loop und aus demselben Grund:
 * ein gezogener Wert gehoert der Sitzung, ein Heimton dem Geraet.
 *
 * Der Rueckgabewert ist identisch (===), wenn sich nichts aendert.
 */
export function retuneWordHomeTone(
  state: WordSessionState,
  homeToneHz: number,
): WordSessionState {
  if (state.sound.stage !== 0) return state;
  if (state.sound.sessionToneHz === homeToneHz) return state;

  return {
    ...state,
    sound: { ...state.sound, sessionToneHz: homeToneHz },
    promptToneHz: homeToneHz,
  };
}
