/**
 * Statistik pro Zeichen -- Versuche, Treffer, Reaktionszeiten.
 *
 * Reine Daten und reine Funktionen: kein DOM, kein localStorage. *Wo* das landet,
 * entscheidet die UI (src/ui/useProgress.ts); *was* drinsteht, entscheidet hier.
 *
 * Zwei Festlegungen, die man kennen muss, um die Zahlen richtig zu lesen:
 *
 * 1. **Reaktionszeiten werden nur bei richtigen Antworten erfasst.** Die Zeit bis
 *    zu einer falschen Antwort misst das Zoegern vor einem Fehlgriff, nicht die
 *    Sicherheit beim Erkennen. Beides in einen Median zu werfen, ergaebe eine Zahl,
 *    die nichts behauptet.
 * 2. **Reaktionszeit ist ein Naeherungswert fuer Sicherheit, nicht ihr Mass.**
 *    Sie enthaelt auch Motorik, Ablenkung und die Suche auf dem Antwort-Gitter.
 *    Wo die UI sie zeigt, muss sie das sagen (CLAUDE.md 2.6).
 *
 * Es werden nur die letzten `RECENT_SAMPLES` Zeiten je Zeichen behalten. Das haelt
 * den Speicher ueber eine lange Sitzung beschraenkt (CLAUDE.md 7) und laesst die
 * Gewichtung auf den *aktuellen* Stand reagieren statt auf den Anfaengerzustand
 * von vor drei Wochen.
 */

import { CHARACTER_WPM, STARTING_CHARACTERS, STARTING_EFFECTIVE_WPM } from './settings';
import { emptyStreak, parseStreak, type Streak } from './streak';

/** Wie viele Reaktionszeiten je Zeichen aufgehoben werden. */
export const RECENT_SAMPLES = 10;

/**
 * Wie viele der juengsten Antworten (richtig/falsch, ueber alle Zeichen)
 * aufgehoben werden. Das ist das rollierende Fenster der Wachstumsregel
 * (growth.ts) -- und zugleich die Obergrenze des Speichers dafuer.
 */
export const RECENT_ANSWER_WINDOW = 30;

/**
 * Was an *einem* Tag geuebt wurde. Bewusst nur der laufende Tag, keine Historie:
 * die Fusszeile zeigt "Today ...", und mehr braucht sie nicht. Wer spaeter eine
 * Reihe ueber Wochen will (Streak), baut sie daneben -- nicht indem er hier
 * heimlich eine Liste wachsen laesst (CLAUDE.md 7: kein unbegrenztes Wachstum).
 *
 * `date` ist ein lokaler Kalendertag als `YYYY-MM-DD`. Lokal und nicht UTC, weil
 * "heute" die Frage des Nutzers ist, nicht die des Servers -- einen Server gibt
 * es hier ohnehin nicht.
 */
export interface DayStats {
  date: string;
  attempts: number;
  hits: number;
  /** Verschiedene Zeichen, die an diesem Tag drankamen. */
  characters: string[];
  /**
   * Abgeschickte Wort-Aufgaben an diesem Tag (Ruling #87).
   *
   * Eine eigene Zahl neben `attempts`, weil sie etwas anderes zaehlt: eine
   * Wort-Aufgabe schreibt bis zu fuenf Versuche (einen je Position), ist aber
   * *eine* Aufgabe. Sie hier zu fuehren und nicht in einem zweiten Eimer
   * daneben hat einen Grund: der Tageswechsel ist derselbe, und zwei Eimer
   * mit zwei Datumsangaben koennten auseinander laufen (`dayFor`).
   *
   * Additiv mit Default 0 -- ein Stand von vor dieser Regel hat sie nicht.
   */
  words: number;
  /**
   * Abgeschickte Sende-Versuche an diesem Tag (Ruling #90, Teil A.2) --
   * dieselbe Rolle wie `words`, nur fuer den Sende-Modus: die stille Auskunft
   * "N sent today" und die Schwelle, ab der der Tag als geuebt gilt
   * (`WORDS_STREAK_MIN_ANSWERS`, dieselbe Konstante wie beim Wort-Modus).
   * Additiv mit Default 0.
   */
  sent: number;
}

export interface CharacterRecord {
  /** Wie oft das Zeichen abgefragt wurde. */
  attempts: number;
  /** Wie oft es richtig beantwortet wurde. */
  hits: number;
  /** Die letzten Reaktionszeiten in Sekunden -- nur von richtigen Antworten. */
  recentReactions: number[];
}

/**
 * Die Sende-Statistik eines Zeichens (Ruling #90, Teil F.17) -- **getrennt**
 * von `CharacterRecord`, nicht als weiteres Feld darin. Zwei Gruende:
 *
 * 1. **Zwei verschiedene Fertigkeiten.** Ein Zeichen zu hoeren und es zu
 *    senden sind unterschiedliche motorische Aufgaben; sie in denselben
 *    Zaehlern zu fuehren wuerde eine Trefferquote behaupten, die niemand so
 *    erlebt hat (CLAUDE.md 2.6).
 * 2. **Diese Zahlen duerfen nirgends mitrechnen.** Sie fliessen nie in die
 *    Gewichtung nach Schwaeche (selection.ts), die Wachstumsregel
 *    (growth.ts), ICR-Drills (drill.ts) oder die Tempo-Progression
 *    (tempo.ts) des Hoertrainings ein -- waeren sie Teil von
 *    `CharacterRecord`, muesste jede dieser Stellen sie explizit ausschliessen.
 *    Getrennt gehalten, muss keine es tun: sie lesen dieses Feld schlicht nie.
 */
export interface SendCharacterRecord {
  /** Wie oft dieses Zeichen zum Senden aufgegeben wurde. */
  attempts: number;
  /** Wie oft die Eingabe richtig dekodiert wurde. */
  correct: number;
  /**
   * Die Verhaeltnisse des juengsten **getasteten** Versuchs (engine/sending.ts)
   * -- null ohne einen einzigen, oder wenn der letzte Versuch ueber "Tap it
   * in" kam (dort gibt es kein Timing zu berichten, siehe Ruling Teil E.16).
   * "Juengste", nicht gemittelte Werte: ein Mittelwert ueber viele Versuche
   * waere eine Zahl ohne einen Moment, den sie beschreibt.
   */
  lastDahDitRatio: number | null;
  lastGapRatio: number | null;
}

/**
 * Der persistierte Fortschritt.
 *
 * `version` dient der Wiedererkennung, nicht der Migration: neue Felder kommen
 * additiv mit Default dazu, und `parseProgress` fuellt sie beim Lesen auf. Alte
 * Staende bleiben damit lesbar, ohne dass jemand einen Migrationspfad pflegt
 * (CLAUDE.md 4).
 */
export interface Progress {
  version: 1;
  characters: Record<string, CharacterRecord>;
  /**
   * Die Zeichen, die derzeit geuebt werden, in Einfuehrungsreihenfolge.
   * Waechst ueber die Wachstumsregel (growth.ts); Default ist der
   * Start-Zeichensatz.
   */
  activeCharacters: string[];
  /** Die juengsten Antworten, true = richtig. Hoechstens RECENT_ANSWER_WINDOW. */
  recentAnswers: boolean[];
  /**
   * Antworten seit der letzten Einfuehrung eines Zeichens. Traegt die Sperre
   * der Wachstumsregel; startet bei 0, was nichts blockiert, weil das
   * rollierende Fenster ohnehin erst gefuellt sein muss (30 > Sperre 20).
   */
  answersSinceGrowth: number;
  /**
   * Wie viele Sitzungen begonnen wurden. Traegt die Kopfzeile ("Session N").
   * Gezaehlt wird der Beginn, nicht der Abschluss -- die Zeile beschriftet die
   * laufende Sitzung, und eine abgebrochene ist trotzdem eine gewesen.
   */
  sessionsStarted: number;
  /** Der laufende Kalendertag. Wechselt das Datum, faengt er bei null an. */
  day: DayStats;
  /** Ob die Einfuehrung schon gelaufen ist. Default false: neue Staende sehen sie. */
  introSeen: boolean;
  /**
   * Zeichen, die im Lernmodus vorgestellt wurden -- in der Reihenfolge, in der
   * das passiert ist.
   *
   * Der Unterschied zu `activeCharacters` ist der ganze Sinn: aktiv heisst
   * "wird abgefragt", eingefuehrt heisst "wurde einmal als Klang gezeigt". Was
   * aktiv, aber nicht eingefuehrt ist, steht zur Einfuehrung an -- das gilt
   * fuer den Erstlauf genauso wie fuer ein Zeichen, das die Wachstumsregel
   * gerade dazugelegt hat. Ein Ort, zwei Einstiegspunkte.
   */
  introducedCharacters: string[];
  /**
   * Ob die einmalige Zeile zur Klang-Variabilitaet schon gezeigt wurde
   * ("From here on, the pitch varies between sessions"). Additiv mit Default
   * false: Bestandsnutzer sehen sie beim ersten Aktivwerden von Stufe 1 --
   * fuer sie ist das genauso das erste Mal.
   */
  variabilityNoticeSeen: boolean;
  /**
   * Der Streak mit Freeze-Gnade (engine/streak.ts). Additiv mit Default:
   * ein Stand von vor dieser Regel faengt bei "noch kein geuebter Tag" an --
   * eine Reihe rueckwirkend zu behaupten, waere eine erfundene Zahl
   * (CLAUDE.md 2.6).
   */
  streak: Streak;
  /**
   * Das erreichte Gesamttempo in WpM (Farnsworth) -- das Tempo-Niveau der
   * Tempo-Progression (engine/tempo.ts).
   *
   * Es beschreibt die *Pausen*, nie die Zeichen: die spielen immer
   * CHARACTER_WPM (CLAUDE.md 2.3). Additiv mit Default
   * STARTING_EFFECTIVE_WPM -- ein Stand von vor dieser Regel steht damit
   * genau da, wo er vorher stand, denn vorher war dieser Wert die Konstante.
   */
  effectiveWpm: number;
  /**
   * Antworten seit der letzten Tempo-Stufe. Traegt die Sperre der
   * Tempo-Progression, genau wie `answersSinceGrowth` die der Wachstumsregel
   * -- und wird von denselben Antworten gezaehlt (nur denen, die ins
   * Wachstumsfenster zaehlen; siehe `RecordOptions`).
   */
  answersSinceSpeedUp: number;
  /**
   * Die Sende-Statistik je Zeichen (Ruling #90, Teil F.17) -- additiv mit
   * Default `{}`. Getrennt von `characters` und ohne jede Wirkung auf
   * Gewichtung, Wachstum, ICR-Drills oder Tempo-Progression des
   * Hoertrainings (siehe `SendCharacterRecord`).
   */
  sendCharacters: Record<string, SendCharacterRecord>;
}

export function emptyRecord(): CharacterRecord {
  return { attempts: 0, hits: 0, recentReactions: [] };
}

export function emptySendRecord(): SendCharacterRecord {
  return { attempts: 0, correct: 0, lastDahDitRatio: null, lastGapRatio: null };
}

export function emptyDay(date = ''): DayStats {
  return { date, attempts: 0, hits: 0, characters: [], words: 0, sent: 0 };
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    characters: {},
    activeCharacters: [...STARTING_CHARACTERS],
    recentAnswers: [],
    answersSinceGrowth: 0,
    sessionsStarted: 0,
    day: emptyDay(),
    introSeen: false,
    introducedCharacters: [],
    variabilityNoticeSeen: false,
    streak: emptyStreak(),
    effectiveWpm: STARTING_EFFECTIVE_WPM,
    answersSinceSpeedUp: 0,
    sendCharacters: {},
  };
}

/**
 * Was abgefragt wird, aber noch nie als Klang gezeigt wurde -- in der
 * Reihenfolge des aktiven Satzes.
 */
export function pendingIntroductions(progress: Progress): string[] {
  return progress.activeCharacters.filter((c) => !progress.introducedCharacters.includes(c));
}

/** Merkt, dass Zeichen vorgestellt wurden. Additiv, ohne Dubletten. */
export function markIntroduced(progress: Progress, characters: readonly string[]): Progress {
  const added = characters.filter((c) => !progress.introducedCharacters.includes(c));
  if (added.length === 0) return progress;
  return { ...progress, introducedCharacters: [...progress.introducedCharacters, ...added] };
}

/** Liest den Datensatz zu einem Zeichen -- fehlt er, kommt ein leerer zurueck. */
export function recordFor(progress: Progress, char: string): CharacterRecord {
  return progress.characters[char] ?? emptyRecord();
}

/** Liest die Sende-Statistik eines Zeichens -- fehlt sie, kommt eine leere zurueck. */
export function sendRecordFor(progress: Progress, char: string): SendCharacterRecord {
  return progress.sendCharacters[char] ?? emptySendRecord();
}

export interface RecordOptions {
  /**
   * Ob die Antwort ins **Wachstumsfenster** zaehlt (`recentAnswers`,
   * `answersSinceGrowth`). Default true -- der Normalfall ist die normale
   * Uebung.
   *
   * Ein ICR-Drill ("Speed round") setzt das auf false: er fragt gezielt die
   * paar langsamen Zeichen ab, und ein Fenster aus lauter Problemzeichen
   * behauptete ein Niveau, das es nicht gab -- die Wachstumsregel liesse den
   * Zeichensatz danach zu frueh oder gar nicht wachsen. Die Statistik pro
   * Zeichen wird trotzdem geschrieben: die Antworten sind echt.
   * (Produktentscheidung, Notion-Log #66; siehe engine/drill.ts.)
   *
   * Das Wort-Training (Ruling #83) setzt es aus demselben Grund auf false --
   * dort steht die Begruendung noch schaerfer: zehn Aufgaben ergeben bis zu
   * 50 Positionen, ein aus ihnen gefuelltes Dreissiger-Fenster waere kein
   * Bild der normalen Uebung mehr. Dasselbe Flag traegt die Sperre der
   * Tempo-Progression (`answersSinceSpeedUp`).
   */
  readonly countTowardGrowth?: boolean;
}

/**
 * Verbucht einen Versuch und gibt einen *neuen* Fortschritt zurueck.
 *
 * Ohne Seiteneffekt auf die Eingabe, damit React-Zustand und Tests dieselbe
 * Funktion benutzen koennen.
 *
 * **`reactionSeconds` darf `null` sein** -- dann bleibt die Messreihe des
 * Zeichens unberuehrt, Versuche und Treffer werden trotzdem verbucht. Das ist
 * der Fall des Wort-Trainings (engine/wordSession.ts): dort gilt die gemessene
 * Zeit dem *ganzen Wort*, nicht einer seiner Positionen. Sie auf die Positionen
 * zu verteilen waere eine erfundene Zahl, und sie waere sofort im Umlauf --
 * "langsames Zeichen" (engine/drill.ts) und die Gewichtung nach Schwaeche
 * (engine/selection.ts) lesen genau diese Reihe (CLAUDE.md 2.6).
 */
export function recordAttempt(
  progress: Progress,
  char: string,
  correct: boolean,
  reactionSeconds: number | null,
  today: string,
  options: RecordOptions = {},
): Progress {
  const countTowardGrowth = options.countTowardGrowth ?? true;
  const previous = recordFor(progress, char);
  const day = dayFor(progress, today);

  const recentReactions =
    correct && reactionSeconds !== null
      ? [...previous.recentReactions, Math.max(0, reactionSeconds)].slice(-RECENT_SAMPLES)
      : previous.recentReactions;

  return {
    ...progress,
    characters: {
      ...progress.characters,
      [char]: {
        attempts: previous.attempts + 1,
        hits: previous.hits + (correct ? 1 : 0),
        recentReactions,
      },
    },
    recentAnswers: countTowardGrowth
      ? [...progress.recentAnswers, correct].slice(-RECENT_ANSWER_WINDOW)
      : progress.recentAnswers,
    answersSinceGrowth: progress.answersSinceGrowth + (countTowardGrowth ? 1 : 0),
    // Dieselbe Bedingung, weil es dieselbe Sorte Sperre ist: die Tempo-Stufe
    // haengt am Wachstumsfenster, also darf sie nur zaehlen, was darin steht
    // (engine/tempo.ts).
    answersSinceSpeedUp: progress.answersSinceSpeedUp + (countTowardGrowth ? 1 : 0),
    day: {
      date: today,
      attempts: day.attempts + 1,
      hits: day.hits + (correct ? 1 : 0),
      characters: day.characters.includes(char) ? day.characters : [...day.characters, char],
      // Wort-Aufgaben zaehlt `recordWordPrompt`, Sende-Versuche
      // `recordSendAttempt` -- nicht diese Funktion.
      words: day.words,
      sent: day.sent,
    },
  };
}

/**
 * Verbucht **eine abgeschickte Wort-Aufgabe** im Tages-Eimer (Ruling #87).
 *
 * Getrennt von `recordAttempt`, weil die beiden Verschiedenes zaehlen: der
 * Wort-Modus ruft `recordAttempt` je Position auf (bis zu fuenf pro Aufgabe)
 * und diese Funktion genau einmal. Die Zahl traegt zwei Dinge -- die stille
 * Auskunft in der Kopfzeile ("7 heard today") und die Schwelle, ab der der Tag
 * als geuebt gilt (engine/wordSession.ts).
 */
export function recordWordPrompt(progress: Progress, today: string): Progress {
  const day = dayFor(progress, today);
  return { ...progress, day: { ...day, date: today, words: day.words + 1 } };
}

/**
 * Verbucht einen Sende-Versuch (Ruling #90, Teil F.17) -- ein Zeichen, ein
 * Versuch, unabhaengig vom Eingabeweg ("Hear it" + Taste oder "Tap it in").
 *
 * **Ruehrt `progress.characters` nicht an** -- das ist die ganze Pointe der
 * Trennung (siehe `SendCharacterRecord`): diese Zahlen duerfen nie in die
 * Gewichtung, die Wachstumsregel, ICR-Drills oder die Tempo-Progression des
 * Hoertrainings einfliessen, und der sicherste Weg, das zu garantieren, ist,
 * gar nicht erst in dieselben Felder zu schreiben.
 *
 * `ratios` ist `null` bei einem getippten Versuch ("Tap it in") -- dort gibt
 * es kein Timing, und die zuletzt gemessenen Verhaeltnisse bleiben stehen
 * (eine Schaetzung durch Abwesenheit zu ersetzen waere eine erfundene Null,
 * CLAUDE.md 2.6).
 */
export function recordSendAttempt(
  progress: Progress,
  char: string,
  correct: boolean,
  ratios: { readonly dahDitRatio: number | null; readonly gapRatio: number | null } | null,
  today: string,
): Progress {
  const previous = sendRecordFor(progress, char);
  const day = dayFor(progress, today);

  const record: SendCharacterRecord = {
    attempts: previous.attempts + 1,
    correct: previous.correct + (correct ? 1 : 0),
    lastDahDitRatio: ratios === null ? previous.lastDahDitRatio : ratios.dahDitRatio,
    lastGapRatio: ratios === null ? previous.lastGapRatio : ratios.gapRatio,
  };

  return {
    ...progress,
    sendCharacters: { ...progress.sendCharacters, [char]: record },
    day: { ...day, date: today, sent: day.sent + 1 },
  };
}

/**
 * Der Eimer des laufenden Tages -- oder ein frischer, wenn das Datum gewechselt
 * hat. Ein Stand von gestern wird damit nicht als "heute" ausgegeben
 * (CLAUDE.md 2.6: jede Zahl auf dem Bildschirm ist eine Behauptung).
 */
export function dayFor(progress: Progress, today: string): DayStats {
  return progress.day.date === today ? progress.day : emptyDay(today);
}

/**
 * Beginnt eine Sitzung: zaehlt sie und zieht den Tages-Eimer auf heute nach.
 * Rein, damit die Kopf- und Fusszeile ohne Browser pruefbar bleiben.
 */
export function beginSession(progress: Progress, today: string): Progress {
  return {
    ...progress,
    sessionsStarted: progress.sessionsStarted + 1,
    day: dayFor(progress, today),
  };
}

/** Merkt, dass die Einfuehrung gesehen wurde. Einmalig, additiv. */
export function markIntroSeen(progress: Progress): Progress {
  return progress.introSeen ? progress : { ...progress, introSeen: true };
}

/** Trefferquote des Tages 0..1, oder null solange nichts beantwortet wurde. */
export function dayAccuracy(day: DayStats): number | null {
  return day.attempts === 0 ? null : day.hits / day.attempts;
}

/** Trefferquote 0..1. Ohne Versuche gibt es keine Quote -- dann null. */
export function hitRate(record: CharacterRecord): number | null {
  return record.attempts === 0 ? null : record.hits / record.attempts;
}

/**
 * Median der letzten Reaktionszeiten in Sekunden, oder null.
 *
 * Median statt Mittelwert: ein einzelnes Verschlucken oder ein Griff zum Kaffee
 * soll die Gewichtung eines Zeichens nicht auf Wochen verzerren.
 */
export function medianReaction(record: CharacterRecord): number | null {
  const samples = record.recentReactions;
  if (samples.length === 0) return null;

  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Liest einen gespeicherten Fortschritt aus unbekannten Daten.
 *
 * Alles, was nicht plausibel ist, wird auf den Default gezogen statt geworfen:
 * ein kaputter oder aelterer Eintrag darf hoechstens seine eigene Statistik
 * kosten, nie die ganze Sitzung (CLAUDE.md 4: Persistenz verliert keine
 * Nutzerdaten).
 */
export function parseProgress(raw: unknown): Progress {
  if (typeof raw !== 'object' || raw === null) return emptyProgress();

  const source = (raw as { characters?: unknown }).characters;
  if (typeof source !== 'object' || source === null) return emptyProgress();

  const characters: Record<string, CharacterRecord> = {};
  for (const [char, value] of Object.entries(source as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const entry = value as Partial<CharacterRecord>;

    const attempts = finiteOrZero(entry.attempts);
    // Mehr Treffer als Versuche waere unmoeglich -- dann lieber deckeln als luegen.
    const hits = Math.min(finiteOrZero(entry.hits), attempts);
    const recentReactions = Array.isArray(entry.recentReactions)
      ? entry.recentReactions
          .filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0)
          .slice(-RECENT_SAMPLES)
      : [];

    characters[char] = { attempts, hits, recentReactions };
  }

  // Additive Felder: ein Stand von vor dieser Regel hat sie nicht -- Defaults,
  // kein Verwerfen. Ein aktiver Satz, der den Start-Zeichensatz nicht enthaelt,
  // waere kein gewachsener Stand, sondern ein kaputter: dann lieber der Default.
  const rawActive = (raw as { activeCharacters?: unknown }).activeCharacters;
  const active = Array.isArray(rawActive)
    ? rawActive.filter((c): c is string => typeof c === 'string' && c.length === 1)
    : [];
  const activeCharacters =
    active.length >= STARTING_CHARACTERS.length && new Set(active).size === active.length
      ? active
      : [...STARTING_CHARACTERS];

  const rawAnswers = (raw as { recentAnswers?: unknown }).recentAnswers;
  const recentAnswers = Array.isArray(rawAnswers)
    ? rawAnswers.filter((a): a is boolean => typeof a === 'boolean').slice(-RECENT_ANSWER_WINDOW)
    : [];

  return {
    version: 1,
    characters,
    activeCharacters,
    recentAnswers,
    answersSinceGrowth: finiteOrZero((raw as { answersSinceGrowth?: unknown }).answersSinceGrowth),
    sessionsStarted: finiteOrZero((raw as { sessionsStarted?: unknown }).sessionsStarted),
    day: parseDay((raw as { day?: unknown }).day),
    introSeen: (raw as { introSeen?: unknown }).introSeen === true,
    streak: parseStreak((raw as { streak?: unknown }).streak),
    // Additiv mit Default: ein Stand von vor der Tempo-Progression stand bei
    // STARTING_EFFECTIVE_WPM, denn das war bis dahin eine Konstante. Ein Wert
    // aus einer kuenftigen Version mit hoeherem Deckel wird in die heutige
    // Spanne gezogen statt verworfen -- dieselbe Haltung wie bei der Tonhoehe
    // in deviceSettings.ts.
    effectiveWpm: parseEffectiveWpm((raw as { effectiveWpm?: unknown }).effectiveWpm),
    answersSinceSpeedUp: finiteOrZero(
      (raw as { answersSinceSpeedUp?: unknown }).answersSinceSpeedUp,
    ),
    variabilityNoticeSeen: (raw as { variabilityNoticeSeen?: unknown }).variabilityNoticeSeen === true,
    introducedCharacters: parseIntroduced(
      (raw as { introducedCharacters?: unknown }).introducedCharacters,
      characters,
      activeCharacters,
    ),
    sendCharacters: parseSendCharacters((raw as { sendCharacters?: unknown }).sendCharacters),
  };
}

/**
 * Die Sende-Statistik aus unbekannten Daten -- additiv mit Default `{}`
 * (Ruling #90, Teil F.17). Ein Stand von vor diesem Feld kennt es nicht, und
 * das ist kein Fehler, sondern noch nie gesendet.
 */
function parseSendCharacters(raw: unknown): Record<string, SendCharacterRecord> {
  if (typeof raw !== 'object' || raw === null) return {};

  const result: Record<string, SendCharacterRecord> = {};
  for (const [char, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const entry = value as Partial<SendCharacterRecord>;

    const attempts = finiteOrZero(entry.attempts);
    // Mehr richtige als Versuche waere unmoeglich -- dann lieber deckeln als luegen.
    const correct = Math.min(finiteOrZero(entry.correct), attempts);

    result[char] = {
      attempts,
      correct,
      lastDahDitRatio: finitePositiveOrNull(entry.lastDahDitRatio),
      lastGapRatio: finitePositiveOrNull(entry.lastGapRatio),
    };
  }
  return result;
}

function finitePositiveOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Welche Zeichen als vorgestellt gelten.
 *
 * Fehlt das Feld, entscheidet die Vorgeschichte: **wer schon geuebt hat, kennt
 * seine Zeichen.** Diesen Staenden den Lernmodus aufzuzwingen waere kein
 * Fortschritt, sondern eine Bevormundung -- sie gelten deshalb als vollstaendig
 * eingefuehrt. Ein Stand ohne einen einzigen Versuch ist dagegen ein Anfang;
 * dort steht die Einfuehrung noch aus (leere Liste).
 *
 * Das ist der additive Default aus CLAUDE.md 4, nur eben kein konstanter: der
 * richtige Wert haengt davon ab, was schon dasteht.
 */
function parseIntroduced(
  raw: unknown,
  characters: Record<string, CharacterRecord>,
  activeCharacters: string[],
): string[] {
  if (Array.isArray(raw)) {
    const seen = new Set<string>();
    for (const c of raw) if (typeof c === 'string' && c.length === 1) seen.add(c);
    return [...seen];
  }

  const hasPractised = Object.values(characters).some((record) => record.attempts > 0);
  return hasPractised ? [...activeCharacters] : [];
}

/**
 * Der Tages-Eimer aus unbekannten Daten. Ohne brauchbares Datum ist er wertlos
 * -- dann lieber leer als falsch beschriftet. Mehr Treffer als Versuche wird
 * gedeckelt, wie bei den Zeichen auch.
 */
function parseDay(raw: unknown): DayStats {
  if (typeof raw !== 'object' || raw === null) return emptyDay();

  const entry = raw as Partial<DayStats>;
  if (typeof entry.date !== 'string' || entry.date === '') return emptyDay();

  const attempts = finiteOrZero(entry.attempts);
  const characters = Array.isArray(entry.characters)
    ? [...new Set(entry.characters.filter((c): c is string => typeof c === 'string' && c.length === 1))]
    : [];

  return {
    date: entry.date,
    attempts,
    hits: Math.min(finiteOrZero(entry.hits), attempts),
    characters,
    // Additiv mit Default 0 (Ruling #87): ein Stand von vor dem offenen
    // Wort-Modus kennt das Feld nicht -- das ist kein Fehler, sondern ein
    // Tag, an dem der Modus noch nicht gezaehlt hat.
    words: finiteOrZero(entry.words),
    // Additiv mit Default 0 (Ruling #90): derselbe Gedanke fuer den Sende-Modus.
    sent: finiteOrZero(entry.sent),
  };
}

/**
 * Das gespeicherte Tempo-Niveau, in die Spanne gezogen.
 *
 * Unter dem Startwert kann es nicht liegen (die Progression geht nie abwaerts),
 * ueber dem Zeichentempo auch nicht -- dort waeren die Pausen kuerzer als null.
 * Nicht ganzzahlige Werte werden abgeschnitten: die Stufe ist ein ganzes WpM.
 */
function parseEffectiveWpm(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return STARTING_EFFECTIVE_WPM;
  return Math.min(CHARACTER_WPM, Math.max(STARTING_EFFECTIVE_WPM, Math.floor(value)));
}

function finiteOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
