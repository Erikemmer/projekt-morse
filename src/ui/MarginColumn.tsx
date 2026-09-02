/**
 * Die Marginalspalte ab 1280 px (Runde D1, Notion-Log #95/#96, Teil A.3).
 *
 * Eine Randnotiz, kein Dashboard (1.1 §7: keine Balken, keine Gauges, keine
 * Kaesten). Drei Zeilen, dieselben Zahlen, die auch die Fusszeile des
 * Trainings-Screens traegt -- **sie aktualisiert im selben Takt**: alle drei
 * haengen an `session.progress`, und das aendert sich erst beim Aufloesen
 * einer Antwort, nie waehrend eine offen ist (App.tsx rechnet, hier wird nur
 * gerendert -- CLAUDE.md 4).
 *
 * **Amberfrei** (Teil B.5): reiner Fliesstext in Newsreader mit grauer
 * Beschriftung, keine Flaeche, kein Rahmen.
 */

import type { StreakStanding } from '../engine/streak';
import { streakLine } from './statusLines';

export function MarginColumn({
  dayLine,
  streak,
  tempoLine,
}: {
  /** „Today 82% · 5 characters" -- dieselbe Zeile wie in der Fusszeile. */
  dayLine: string;
  streak: StreakStanding;
  /** „22 of 36 characters active" (Ruling A.3), plus Tempo, sobald es laeuft. */
  tempoLine: string;
}) {
  return (
    <aside className="margin-column" aria-label="Today at a glance">
      <p className="margin-line">{dayLine}</p>
      <p className="margin-line">{streakLine(streak)}</p>
      <p className="margin-line">{tempoLine}</p>
    </aside>
  );
}
