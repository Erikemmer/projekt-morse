/**
 * ICR-Drills — die „Speed round" (Produktentscheidung, Notion-Log #66).
 *
 * ICR heisst *instant character recognition*: ein Zeichen ist erst gekonnt,
 * wenn es ohne Nachdenken landet. Ein Zeichen, das zuverlässig richtig
 * beantwortet wird, aber jedes Mal zwei Sekunden braucht, ist genau der Fall,
 * den die normale Auswahl nach Schwäche zu schwach gewichtet: die Fehlerquote
 * ist in Ordnung, also fällt es kaum auf — und trotzdem bremst es später jedes
 * Wort aus.
 *
 * Deshalb die drei Bedingungen unten zusammen: **genug Belege** (nicht nach
 * zwei Antworten urteilen), **die Quote stimmt** (sonst ist es kein
 * ICR-Problem, sondern ein Verwechslungsproblem — das löst die normale
 * Gewichtung besser) und **der Median ist zu hoch**.
 *
 * Reine Funktionen, kein DOM. Die Reaktionszeit bleibt dabei, was sie überall
 * in dieser Engine ist: ein *Näherungswert* für Sicherheit, der auch Motorik
 * und die Suche auf dem Antwort-Gitter enthält (stats.ts). Ein Drill behandelt
 * also einen Verdacht, keine Diagnose — und die UI sagt „still slow to land",
 * nicht „du kannst das nicht".
 *
 * **Was ein Drill mit der Statistik macht — und was nicht.** Seine Antworten
 * werden ganz normal pro Zeichen verbucht (`recordAttempt`): sie sind echt.
 * Sie zählen aber **nicht** ins Wachstumsfenster (`recentAnswers`,
 * `answersSinceGrowth`) — ein Fenster aus lauter Problemzeichen behauptete ein
 * Niveau, das es nicht gab, und die Wachstumsregel entschiede darauf über den
 * nächsten Buchstaben. Drills sind gezielte Therapie; über Wachstum
 * entscheidet die normale Übung (Log #66, siehe `RecordOptions` in stats.ts
 * und `submitAnswer` in session.ts).
 */

import type { Attempt } from './session';
import { hitRate, medianReaction, recordFor, type Progress } from './stats';

/** So viele Reaktionszeiten muss ein Zeichen haben, bevor es als langsam gilt. */
export const DRILL_MIN_SAMPLES = 5;

/** Ab dieser Trefferquote ist es ein Tempo- und kein Verwechslungsproblem. */
export const DRILL_MIN_HIT_RATE = 0.8;

/** Über diesem Median (Sekunden) landet ein Zeichen nicht mehr sofort. */
export const DRILL_SLOW_MEDIAN_SECONDS = 2;

/** Abfragen in einem Drill. Kürzer als eine Sitzung: er ist eine Zugabe, keine zweite Pflicht. */
export const DRILL_ROUNDS = 10;

/** Ab so vielen langsamen Zeichen lädt der Start-Screen zum Drill ein. */
export const DRILL_INVITATION_MIN_SLOW = 2;

/**
 * Wie viele schnelle Zeichen zum Kontrast dazukommen, wenn es nur **ein**
 * langsames gibt.
 *
 * Ohne sie wäre der Drill zehnmal dasselbe Zeichen — dann braucht niemand mehr
 * hinzuhören, und gemessen würde das Tippen (CLAUDE.md 2.2). Zwei schnelle
 * daneben machen aus der Wiederholung wieder eine Erkennungsaufgabe.
 */
export const DRILL_CONTRAST_CHARACTERS = 2;

/**
 * Die Zeichen, die zwar sitzen, aber zu lange brauchen — das langsamste zuerst.
 *
 * Geprüft wird nur der aktive Zeichensatz: was nicht geübt wird, kann auch
 * nicht langsam sein.
 */
export function slowCharacters(progress: Progress): string[] {
  return progress.activeCharacters
    .filter((char) => isSlow(progress, char))
    .sort((a, b) => (medianOf(progress, b) ?? 0) - (medianOf(progress, a) ?? 0));
}

/**
 * Der Zeichensatz eines Drills — oder eine leere Liste, wenn es nichts zu
 * üben gibt.
 *
 * Bei genau einem langsamen Zeichen kommen die schnellsten dazu (siehe
 * `DRILL_CONTRAST_CHARACTERS`).
 */
export function drillPool(progress: Progress): string[] {
  const slow = slowCharacters(progress);
  if (slow.length === 0) return [];
  if (slow.length > 1) return slow;

  return [...slow, ...fastestCharacters(progress, slow, DRILL_CONTRAST_CHARACTERS)];
}

/**
 * Der Median über die **gespeicherten** Reaktionszeiten mehrerer Zeichen —
 * der Wert *vor* einem Drill.
 *
 * Zusammengeworfen werden die Einzelmessungen, nicht die Mediane: ein Zeichen
 * mit acht Messungen soll schwerer wiegen als eines mit fünf. Aufgehoben sind
 * je Zeichen nur die letzten `RECENT_SAMPLES` (stats.ts) — die Zahl beschreibt
 * also die jüngste Vergangenheit, nicht das ganze Leben des Standes.
 */
export function storedMedianOver(
  progress: Progress,
  characters: readonly string[],
): number | null {
  return median(characters.flatMap((char) => recordFor(progress, char).recentReactions));
}

/**
 * Der Median der **richtigen** Antworten eines Laufs, beschränkt auf bestimmte
 * Zeichen.
 *
 * Für den Vergleich am Ende eines Drills: verglichen wird, was vergleichbar
 * ist. Die Kontrast-Zeichen (bei nur einem langsamen) gehören nicht dazu — sie
 * sind schnell, und sie mit hineinzurechnen zöge den Median nach unten, ohne
 * dass jemand etwas gelernt hätte (CLAUDE.md 2.6).
 *
 * Falsche Antworten bleiben draussen, wie überall: die Zeit bis zu einem
 * Fehlgriff misst das Zögern davor, nicht das Erkennen.
 */
export function attemptMedianOver(
  attempts: readonly Attempt[],
  characters: readonly string[],
): number | null {
  return median(
    attempts
      .filter((attempt) => attempt.correct && characters.includes(attempt.char))
      .map((attempt) => attempt.reactionSeconds),
  );
}

function isSlow(progress: Progress, char: string): boolean {
  const record = recordFor(progress, char);
  if (record.recentReactions.length < DRILL_MIN_SAMPLES) return false;

  const rate = hitRate(record);
  if (rate === null || rate < DRILL_MIN_HIT_RATE) return false;

  const reaction = medianReaction(record);
  return reaction !== null && reaction > DRILL_SLOW_MEDIAN_SECONDS;
}

/**
 * Die schnellsten aktiven Zeichen ausser den ausgeschlossenen.
 *
 * Ein Zeichen ohne Messung gilt nicht als schnell -- es gilt als unbekannt und
 * steht deshalb hinten. Sind gar nicht genug Zeichen da, kommen eben weniger
 * zurueck: ein Drill mit zwei Zeichen ist besser als keiner.
 */
function fastestCharacters(
  progress: Progress,
  exclude: readonly string[],
  count: number,
): string[] {
  return progress.activeCharacters
    .filter((char) => !exclude.includes(char))
    .sort((a, b) => (medianOf(progress, a) ?? Infinity) - (medianOf(progress, b) ?? Infinity))
    .slice(0, count);
}

function medianOf(progress: Progress, char: string): number | null {
  return medianReaction(recordFor(progress, char));
}

/** Median einer Messreihe in Sekunden, oder null. */
function median(samples: readonly number[]): number | null {
  if (samples.length === 0) return null;

  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
