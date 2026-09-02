/**
 * Zwei Saetze, die App.tsx und die Randspalte (Runde D1) sich teilen: die
 * Streak-Zeile und die Tagesquote. Ein eigenes Modul statt eines Imports
 * zwischen den beiden Komponenten -- App.tsx rendert die Randspalte
 * (`MarginColumn`), ein Ruecklauf-Import waere ein Zirkel (CLAUDE.md 4:
 * verallgemeinern beim zweiten Bedarf, nicht verdoppeln).
 */

import type { DayStats } from '../engine/stats';
import { dayAccuracy } from '../engine/stats';
import type { StreakStanding } from '../engine/streak';

/**
 * Die eine Streak-Zeile (Notion-Log #29).
 *
 * Kein Ausrufezeichen, kein "Don't break it", kein Zaehler, der etwas
 * androht -- die Zeile stellt fest und geht wieder (CLAUDE.md 2.8). Auch
 * "Starting fresh." ist bewusst neutral formuliert: es ist der Zustand nach
 * einer Pause und **kein** Verlust, den jemand zu verantworten haette.
 */
export function streakLine(streak: StreakStanding): string {
  if (streak.days === 0) return 'Starting fresh.';
  if (streak.freezeUsedYesterday) return `Day ${streak.days} — freeze used yesterday.`;
  if (streak.freezeReady) return `Day ${streak.days} — freeze ready.`;
  return `Day ${streak.days}.`;
}

/** Die Tagesquote als Satz -- Fusszeile und Randspalte tragen dieselbe. */
export function dayQuotaLine(day: DayStats): string {
  const accuracy = dayAccuracy(day);
  if (accuracy === null) return 'Today — no answers yet';
  const characters = day.characters.length;
  return `Today ${Math.round(accuracy * 100)}% · ${characters} character${characters === 1 ? '' : 's'}`;
}
