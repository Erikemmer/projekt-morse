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

import { STARTING_CHARACTERS } from './settings';

/** Wie viele Reaktionszeiten je Zeichen aufgehoben werden. */
export const RECENT_SAMPLES = 10;

/**
 * Wie viele der juengsten Antworten (richtig/falsch, ueber alle Zeichen)
 * aufgehoben werden. Das ist das rollierende Fenster der Wachstumsregel
 * (growth.ts) -- und zugleich die Obergrenze des Speichers dafuer.
 */
export const RECENT_ANSWER_WINDOW = 30;

export interface CharacterRecord {
  /** Wie oft das Zeichen abgefragt wurde. */
  attempts: number;
  /** Wie oft es richtig beantwortet wurde. */
  hits: number;
  /** Die letzten Reaktionszeiten in Sekunden -- nur von richtigen Antworten. */
  recentReactions: number[];
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
}

export function emptyRecord(): CharacterRecord {
  return { attempts: 0, hits: 0, recentReactions: [] };
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    characters: {},
    activeCharacters: [...STARTING_CHARACTERS],
    recentAnswers: [],
    answersSinceGrowth: 0,
  };
}

/** Liest den Datensatz zu einem Zeichen -- fehlt er, kommt ein leerer zurueck. */
export function recordFor(progress: Progress, char: string): CharacterRecord {
  return progress.characters[char] ?? emptyRecord();
}

/**
 * Verbucht einen Versuch und gibt einen *neuen* Fortschritt zurueck.
 *
 * Ohne Seiteneffekt auf die Eingabe, damit React-Zustand und Tests dieselbe
 * Funktion benutzen koennen.
 */
export function recordAttempt(
  progress: Progress,
  char: string,
  correct: boolean,
  reactionSeconds: number,
): Progress {
  const previous = recordFor(progress, char);

  const recentReactions = correct
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
    recentAnswers: [...progress.recentAnswers, correct].slice(-RECENT_ANSWER_WINDOW),
    answersSinceGrowth: progress.answersSinceGrowth + 1,
  };
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
  };
}

function finiteOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
