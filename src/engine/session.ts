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

import { maybeGrow } from './growth';
import { pickNext } from './selection';
import { beginSession, recordAttempt, type Progress } from './stats';
import { recordPracticeDay } from './streak';
import { drawPromptTone, drawSessionSound, type SessionSound } from './variability';

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

/**
 * Was fuer ein Lauf das ist.
 *
 * `practice` ist die normale Sitzung ueber den aktiven Zeichensatz.
 * `drill` ist die "Speed round" (engine/drill.ts): dieselben Uebungsregeln,
 * aber ein eigener, kleiner Zeichensatz -- und **ausserhalb des
 * Wachstumsfensters**. Siehe `submitAnswer`.
 */
export type SessionKind = 'practice' | 'drill';

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
  /** Normale Sitzung oder Drill -- die Unterschiede stehen bei `SessionKind`. */
  readonly kind: SessionKind;
  /** Die geuebten Zeichen: der aktive Satz aus dem Fortschritt, waechst mit ihm. */
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
  /** Mit dieser Antwort neu eingefuehrtes Zeichen -- fuer die Ankuendigung im Feedback. */
  readonly introduced: string | null;
  /** Fortschritt ueber alle Sitzungen -- Grundlage der Gewichtung. */
  readonly progress: Progress;
  /**
   * Der Kalendertag dieser Sitzung, `YYYY-MM-DD`. Wird hereingereicht statt hier
   * gelesen: die Engine bleibt ohne Uhr und ohne DOM (CLAUDE.md 4).
   */
  readonly today: string;
  /** Der Klang dieser Sitzung: Stufe, Sitzungs-Ton, Gesamttempo (variability.ts). */
  readonly sound: SessionSound;
  /**
   * Die Tonhoehe der laufenden Abfrage. Unter Stufe 2 immer der Sitzungs-Ton;
   * ab Stufe 2 pro Abfrage gezogen. Eine Wiederholung derselben Abfrage
   * behaelt sie -- "noch mal hoeren" wiederholt dasselbe Signal.
   */
  readonly promptToneHz: number;
  /**
   * Ob diese Sitzung die einmalige Variabilitaets-Zeile auf dem Start-Screen
   * zeigt. Nur beim ersten Aktivwerden von Stufe 1 true; das Merken uebernimmt
   * `progress.variabilityNoticeSeen`.
   */
  readonly showVariabilityNotice: boolean;
}

export interface SessionOptions {
  totalRounds: number;
  progress: Progress;
  /** Zufallszahl in [0,1). Als Parameter, damit Tests nicht wuerfeln muessen. */
  random: () => number;
  /** Kalendertag als `YYYY-MM-DD`. Ebenfalls Parameter, aus demselben Grund. */
  today: string;
  /**
   * Der Heimton dieses Geraets in Hz (engine/deviceSettings.ts). Er traegt die
   * Sitzung auf Variabilitaets-Stufe 0; ab Stufe 1 haben die Baender Vorrang.
   * Fehlt er, bleibt es bei DEFAULT_TONE_HZ.
   */
  homeToneHz?: number;
  /** Normale Sitzung (Default) oder Drill. */
  kind?: SessionKind;
  /**
   * Ein **abweichender** Zeichensatz. Nur der Drill setzt ihn (er uebt gezielt
   * ein paar Zeichen, engine/drill.ts); ohne Angabe bleibt es beim aktiven
   * Satz aus dem Fortschritt. Es gibt bewusst keinen dritten Weg, an einen
   * Pool zu kommen.
   */
  pool?: readonly string[];
}

/**
 * Beginnt eine Sitzung. Geuebt wird der aktive Zeichensatz aus dem Fortschritt
 * -- oder, nur beim Drill, der mitgegebene kleine Satz (engine/drill.ts).
 */
export function createSession(options: SessionOptions): SessionState {
  const pool = options.pool ?? options.progress.activeCharacters;
  if (pool.length === 0) throw new RangeError('Der Zeichensatz darf nicht leer sein');
  if (options.totalRounds < 1) throw new RangeError('Eine Sitzung braucht mindestens eine Runde');

  // Die Sitzung wird beim Beginn gezaehlt, und der Tages-Eimer zieht auf heute
  // nach -- sonst stuende morgen noch die Quote von gestern unter "Today".
  let progress = beginSession(options.progress, options.today);

  // Der Klang der Sitzung: einmal gezogen, dann fest (variability.ts).
  const sound = drawSessionSound(progress, options.random, options.homeToneHz);

  // Die einmalige Zeile beim ersten Aktivwerden der Variabilitaet. Das Flag
  // wird sofort gesetzt und mit dem normalen Speichern persistiert; gezeigt
  // wird die Zeile ueber showVariabilityNotice auf dem Start-Screen dieser
  // einen Sitzung.
  const showVariabilityNotice = sound.stage >= 1 && !progress.variabilityNoticeSeen;
  if (showVariabilityNotice) progress = { ...progress, variabilityNoticeSeen: true };

  return {
    kind: options.kind ?? 'practice',
    pool,
    totalRounds: options.totalRounds,
    round: 1,
    prompt: pickNext(pool, progress, { random: options.random }),
    phase: 'ready',
    promptEndsAt: null,
    replays: 0,
    attempts: [],
    lastAttempt: null,
    introduced: null,
    progress,
    today: options.today,
    sound,
    promptToneHz: drawPromptTone(sound, options.random),
    showVariabilityNotice,
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

  /*
   * Ein Drill verbucht die Antwort ganz normal beim Zeichen -- sie ist echt --,
   * aber **nicht** im Wachstumsfenster, und er laesst den Zeichensatz nicht
   * wachsen (Produktentscheidung, Notion-Log #66).
   *
   * Beides zusammen ist noetig. Das Fenster fernzuhalten reicht nicht: ein
   * Drill aendert auch Versuche und Trefferquote je Zeichen, und das sind die
   * Bedingungen (b) und (c) der Wachstumsregel -- ein neues Zeichen koennte
   * also mitten in einer Therapiesitzung dazukommen. Ueber Wachstum
   * entscheidet die normale Uebung; die naechste normale Antwort holt es nach.
   */
  const drill = state.kind === 'drill';

  // Erst verbuchen, dann die Wachstumsregel fragen -- diese Antwort zaehlt mit.
  const recorded = recordAttempt(
    state.progress,
    attempt.char,
    correct,
    attempt.reactionSeconds,
    state.today,
    { countTowardGrowth: !drill },
  );
  const growth = drill
    ? { progress: recorded, introduced: null as string | null }
    : maybeGrow(recorded);

  return {
    ...state,
    phase: 'feedback',
    attempts: [...state.attempts, attempt],
    lastAttempt: attempt,
    introduced: growth.introduced,
    pool: growth.introduced === null ? state.pool : growth.progress.activeCharacters,
    progress: growth.progress,
  };
}

/**
 * Weiter zur naechsten Runde -- oder ans Ende der Sitzung.
 *
 * Nur aus 'feedback' heraus: eine Runde ohne Antwort zu ueberspringen wuerde die
 * Statistik verduennen, ohne dass jemand etwas geuebt haette.
 *
 * **Hier faellt der Streak-Tag.** Ein Tag zaehlt als geuebt, sobald an ihm eine
 * Sitzung *beendet* wurde (Notion-Log #29) -- und beendet ist sie genau an
 * dieser Kante. Ein durchgezogener Drill zaehlt dabei mit: er ist eine
 * beendete Sitzung, und der Streak misst Kontinuitaet, nicht Pflichterfuellung
 * (CLAUDE.md 2.8). Sie liegt in der Engine und nicht in der UI, damit "ein Tag
 * gilt als geuebt" ohne Browser pruefbar bleibt; der Kalendertag steht als
 * `state.today` schon fest, eine Uhr braucht es dafuer nicht (CLAUDE.md 4).
 */
export function advance(state: SessionState, random: () => number): SessionState {
  if (state.phase !== 'feedback') return state;
  if (state.round >= state.totalRounds) {
    return {
      ...state,
      phase: 'finished',
      progress: {
        ...state.progress,
        streak: recordPracticeDay(state.progress.streak, state.today),
      },
    };
  }

  return {
    ...state,
    round: state.round + 1,
    prompt: pickNext(state.pool, state.progress, { random, avoid: state.prompt }),
    phase: 'ready',
    promptEndsAt: null,
    replays: 0,
    introduced: null,
    // Pro Abfrage, nicht pro Abspielen: Wiederholungen behalten den Ton.
    promptToneHz: drawPromptTone(state.sound, random),
  };
}

/**
 * Stellt den Heimton einer laufenden Sitzung nach -- **nur auf Stufe 0**.
 *
 * Wer die Tonhoehe in den Einstellungen aendert und zurueck ins Training geht,
 * soll den neuen Ton hoeren und nicht den von vorhin. Auf Stufe 0 ist das
 * unproblematisch: dort *ist* der Sitzungs-Ton der Heimton, es wurde nichts
 * gezogen, was man ueberschriebe.
 *
 * Ab Stufe 1 passiert nichts. Die Tonhoehe dieser Sitzung ist dann ein
 * gezogener Wert, und ein gezogener Wert gehoert der Sitzung -- ihn
 * nachtraeglich zu verschieben, hiesse die Variabilitaet aushebeln.
 *
 * Der Rueckgabewert ist identisch (===), wenn sich nichts aendert.
 */
export function retuneHomeTone(state: SessionState, homeToneHz: number): SessionState {
  if (state.sound.stage !== 0) return state;
  if (state.sound.sessionToneHz === homeToneHz) return state;

  return {
    ...state,
    sound: { ...state.sound, sessionToneHz: homeToneHz },
    // Unter Stufe 2 ist die Tonhoehe der Abfrage der Sitzungs-Ton -- sie muss
    // mitgehen, sonst behauptet das Eyebrow eine Zahl, die nicht gespielt wird.
    promptToneHz: homeToneHz,
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
