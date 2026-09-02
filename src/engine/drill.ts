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

/**
 * Ab so vielen langsamen Zeichen lädt der Start-Screen zum Drill ein.
 *
 * Eins genügt (Ruling Notion-Log #69). Zu warten, bis ein zweites Zeichen
 * hängt, hiesse dem Nutzer eine Hilfe vorzuenthalten, die schon greifen
 * könnte — und der Kontrast, der einen Ein-Zeichen-Drill erst zu einer
 * Erkennungsaufgabe macht, kommt ohnehin über `DRILL_MIN_POOL` dazu.
 */
export const DRILL_INVITATION_MIN_SLOW = 1;

/**
 * So viele Zeichen hat ein Drill mindestens — langsame zuerst, aufgefüllt mit
 * den schnellsten sicheren als Kontrast (Ruling Notion-Log #69).
 *
 * Der Grund ist nicht Vollständigkeit, sondern Messbarkeit: ein Drill aus
 * einem oder zwei Zeichen wird zur Tipp-Übung. Wer weiss, dass gleich fast
 * sicher dasselbe Zeichen kommt, muss nicht mehr hinhören — und gemessen
 * würde die Motorik, nicht das Erkennen (CLAUDE.md 2.2). Drei Zeichen halten
 * die Aufgabe eine Unterscheidung.
 *
 * Die Kontrast-Zeichen sind **sicher und schnell**: sie sollen den Drill nicht
 * um ein Verwechslungsproblem erweitern, das hier gar nicht behandelt wird.
 * Und sie zählen beim Vergleich am Ende nicht mit (`attemptMedianOver`) — sie
 * sind Beiwerk, kein Fortschritt.
 */
export const DRILL_MIN_POOL = 3;

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
 * Die langsamen Zeichen zuerst, danach mit den schnellsten sicheren aufgefüllt,
 * bis `DRILL_MIN_POOL` erreicht ist (Ruling #69). Gibt es mehr langsame
 * Zeichen als das Minimum, kommt kein Kontrast dazu — dann ist die Aufgabe
 * schon eine Unterscheidung.
 *
 * Sind gar nicht genug aktive Zeichen da, kommen eben weniger zurück: ein
 * kurzer Drill ist besser als keiner.
 */
export function drillPool(progress: Progress): string[] {
  const slow = slowCharacters(progress);
  if (slow.length === 0) return [];
  if (slow.length >= DRILL_MIN_POOL) return slow;

  return [...slow, ...contrastCharacters(progress, slow, DRILL_MIN_POOL - slow.length)];
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
 * Die schnellsten **sicheren** Zeichen als Kontrast, ausser den
 * ausgeschlossenen.
 *
 * "Sicher" heisst: gemessen und mit einer Trefferquote von mindestens
 * `DRILL_MIN_HIT_RATE` -- dieselbe Schwelle, an der ein langsames Zeichen als
 * Tempo- und nicht als Verwechslungsfall gilt. Ein wackliges Zeichen als
 * Kontrast hineinzunehmen hiesse, in einen Tempo-Drill ein
 * Verwechslungsproblem zu mischen, das er nicht behandelt.
 *
 * Reicht das nicht, um `count` zu fuellen, kommen die uebrigen aktiven Zeichen
 * dahinter -- ein Drill mit weniger perfektem Kontrast ist besser als eine
 * Wiederholungsuebung. Ein Zeichen ohne Messung gilt dabei nicht als schnell,
 * sondern als unbekannt, und steht deshalb hinten.
 */
function contrastCharacters(
  progress: Progress,
  exclude: readonly string[],
  count: number,
): string[] {
  const candidates = progress.activeCharacters.filter((char) => !exclude.includes(char));
  const byPace = (a: string, b: string) =>
    (medianOf(progress, a) ?? Infinity) - (medianOf(progress, b) ?? Infinity);

  const safe = candidates.filter((char) => isSafe(progress, char)).sort(byPace);
  const rest = candidates.filter((char) => !isSafe(progress, char)).sort(byPace);

  return [...safe, ...rest].slice(0, count);
}

/** Gemessen und zuverlaessig genug, um als Kontrast zu taugen. */
function isSafe(progress: Progress, char: string): boolean {
  const record = recordFor(progress, char);
  if (record.recentReactions.length === 0) return false;

  const rate = hitRate(record);
  return rate !== null && rate >= DRILL_MIN_HIT_RATE;
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
