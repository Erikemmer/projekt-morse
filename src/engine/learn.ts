/**
 * Der Lernmodus: ein Zeichen vorstellen, dann kurz abfragen.
 *
 * Bisher hat die App nur abgefragt. Wer neu anfaengt, raet die ersten Runden --
 * es gab keinen Ort, an dem ein Zeichen *eingefuehrt* wird. Genau den baut
 * dieses Modul: pro Zeichen eine Karte (Buchstabe, Ton, danach das Muster),
 * anschliessend ein Echo-Check aus wenigen Abrufen nach den normalen
 * Uebungsregeln.
 *
 * Reiner Zustandsautomat, kein DOM, keine Uhr, kein Zufall ohne Parameter
 * (CLAUDE.md 4). Die UI spielt Toene und meldet Ereignisse; was daraus folgt,
 * steht hier.
 *
 * **Der Echo-Check fasst die Statistik nicht an.** Es gibt hier bewusst kein
 * `recordAttempt`: die Statistik misst Koennen, und wer ein Zeichen gerade
 * zum ersten Mal gehoert hat, kann es noch nicht. Wuerden diese Antworten
 * mitzaehlen, verschoeben sie die Gewichtung (selection.ts) und die
 * Wachstumsregel (growth.ts) gegen den Nutzer -- die Zahlen behaupteten dann
 * etwas anderes, als sie messen (CLAUDE.md 2.6). Der Lernmodus schreibt genau
 * ein Feld: welche Zeichen vorgestellt wurden.
 */

/** Wie viele Abrufe ein Echo-Check hat. Die Vorgabe nennt zwei bis drei. */
export const ECHO_ROUNDS = 3;

export type LearnPhase =
  /** Karte offen, der Ton war noch nicht zu hoeren. */
  | 'card'
  /** Der Ton lief mindestens einmal -- ab hier ist das Muster sichtbar. */
  | 'card-heard'
  /** Echo-Check: bereit, noch nichts gespielt. */
  | 'echo-ready'
  /** Der Ton laeuft. */
  | 'echo-listening'
  /** Ton durch, Antwort offen. */
  | 'echo-answering'
  /** Antwort gegeben, Aufloesung sichtbar. */
  | 'echo-feedback'
  /** Alle Zeichen des Laufs durch. */
  | 'done';

export interface EchoAttempt {
  readonly char: string;
  readonly answer: string;
  readonly correct: boolean;
}

export interface LearnState {
  /** Die Zeichen dieses Laufs, in der Reihenfolge der Einfuehrung. */
  readonly queue: readonly string[];
  /** Position in `queue`. Bei `done` steht sie auf `queue.length`. */
  readonly index: number;
  /**
   * Zeichen, die vor diesem Lauf schon eingefuehrt waren. Zusammen mit dem
   * bisher Durchlaufenen ergibt das die Antwortoptionen.
   */
  readonly known: readonly string[];
  readonly phase: LearnPhase;
  /** Der Abruf, der gerade laeuft -- nicht zwingend das Zeichen der Karte. */
  readonly echoPrompt: string;
  readonly echoDone: number;
  readonly lastEcho: EchoAttempt | null;
  /**
   * Ob nach der Karte ein Echo-Check kommt. Beim freien Wiederholen nicht:
   * dort will jemand einen Klang nachhoeren, nicht geprueft werden.
   */
  readonly requireEcho: boolean;
}

export interface LearnOptions {
  /** Was eingefuehrt werden soll. Mindestens ein Zeichen. */
  queue: readonly string[];
  /** Was vorher schon eingefuehrt war. */
  known?: readonly string[];
  requireEcho?: boolean;
}

/** Das Zeichen, dessen Karte gerade offen ist. */
export function currentCharacter(state: LearnState): string {
  return state.queue[state.index] ?? '';
}

/**
 * Die Antwortoptionen: alles, was bis hier eingefuehrt ist -- vorher Bekanntes
 * plus die Karten dieses Laufs bis einschliesslich der aktuellen.
 *
 * Bei der ersten Karte eines neuen Nutzers ist das genau ein Zeichen. Der
 * Abruf ist dann keine Unterscheidung, sondern eine Bestaetigung ("war das
 * eben K?"). Das ist die Folge der Vorgabe, nur Eingefuehrtes anzubieten, und
 * ehrlicher, als eine Auswahl aus Zeichen zu bauen, die noch niemand kennt.
 */
export function answerPool(state: LearnState): string[] {
  const soFar = state.queue.slice(0, state.index + 1);
  const pool = [...state.known];
  for (const char of soFar) if (!pool.includes(char)) pool.push(char);
  return pool;
}

export function createLearnRun(options: LearnOptions): LearnState {
  if (options.queue.length === 0) throw new RangeError('Ein Lernlauf braucht mindestens ein Zeichen');

  return {
    queue: [...options.queue],
    index: 0,
    known: [...(options.known ?? [])],
    phase: 'card',
    echoPrompt: options.queue[0],
    echoDone: 0,
    lastEcho: null,
    requireEcho: options.requireEcho ?? true,
  };
}

/**
 * Der Ton der Karte ist durchgelaufen.
 *
 * Erst hier wird das Muster sichtbar -- und nur hier. Ein Wiederholen aendert
 * am Zustand nichts mehr.
 */
export function cardHeard(state: LearnState): LearnState {
  return state.phase === 'card' ? { ...state, phase: 'card-heard' } : state;
}

/**
 * Von der Karte in den Echo-Check.
 *
 * Der erste Abruf ist immer das gerade eingefuehrte Zeichen: danach gefragt zu
 * werden, was man eben gehoert hat, ist der Sinn der Uebung. Die weiteren
 * ziehen aus allem Eingefuehrten, damit frueher Gelerntes nicht liegen bleibt.
 */
export function beginEcho(state: LearnState): LearnState {
  if (state.phase !== 'card-heard') return state;

  return {
    ...state,
    phase: 'echo-ready',
    echoPrompt: currentCharacter(state),
    echoDone: 0,
    lastEcho: null,
  };
}

export function beginEchoPlayback(state: LearnState): LearnState {
  return state.phase === 'echo-ready' || state.phase === 'echo-answering'
    ? { ...state, phase: 'echo-listening' }
    : state;
}

export function echoPromptFinished(state: LearnState): LearnState {
  return state.phase === 'echo-listening' ? { ...state, phase: 'echo-answering' } : state;
}

export function answerEcho(state: LearnState, answer: string): LearnState {
  if (state.phase !== 'echo-answering') return state;

  return {
    ...state,
    phase: 'echo-feedback',
    echoDone: state.echoDone + 1,
    lastEcho: { char: state.echoPrompt, answer, correct: answer === state.echoPrompt },
  };
}

/**
 * Ob ein fertiger Lauf seine Zeichen einfuehrt (`markIntroduced` in der UI).
 *
 * Nur ein Lauf mit Echo-Check tut das. Das freie Wiederholen ("Learn the
 * sounds", `requireEcho: false`) hoert einem Zeichen nur zu -- eine reine
 * Neugier-Geste darf `introducedCharacters` nicht veraendern, sonst koennte
 * man sich am Wachstum vorbeihoeren und die Zahl bedeutete nichts mehr
 * (CLAUDE.md 2.6, Ruling Notion-Log #110).
 */
export function introducesCharacters(state: LearnState): boolean {
  return state.phase === 'done' && state.requireEcho;
}

/**
 * Weiter: naechster Abruf, naechste Karte oder Ende.
 *
 * `random` kommt als Parameter herein, damit Tests nicht wuerfeln muessen
 * (wie ueberall in dieser Engine).
 */
export function advanceEcho(state: LearnState, random: () => number): LearnState {
  if (state.phase !== 'echo-feedback') return state;

  if (state.echoDone < ECHO_ROUNDS) {
    return { ...state, phase: 'echo-ready', echoPrompt: pickEchoPrompt(state, random) };
  }

  return nextCard(state);
}

/**
 * Karte fertig, ohne Echo-Check -- der Weg beim freien Wiederholen und der,
 * den `advanceEcho` am Ende eines Checks nimmt.
 */
export function nextCard(state: LearnState): LearnState {
  const index = state.index + 1;
  if (index >= state.queue.length) return { ...state, index: state.queue.length, phase: 'done' };

  return {
    ...state,
    index,
    phase: 'card',
    echoPrompt: state.queue[index],
    echoDone: 0,
    lastEcho: null,
  };
}

/**
 * Der naechste Abruf. Gezogen wird aus allem Eingefuehrten; das gerade
 * eingefuehrte Zeichen ist dabei doppelt gewichtet, weil es das ist, was
 * gerade sitzen soll.
 */
function pickEchoPrompt(state: LearnState, random: () => number): string {
  const pool = answerPool(state);
  const fresh = currentCharacter(state);
  const weighted = [...pool, fresh];
  const index = Math.min(weighted.length - 1, Math.floor(random() * weighted.length));
  return weighted[index];
}
