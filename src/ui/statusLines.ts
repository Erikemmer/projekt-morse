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

/**
 * "9 of 36 active" -- und, wenn Zeichen ueber "Add now" vorgezogen wurden,
 * "· 1 added early" dazu (aus PR #5): sonst bedeutete die Zahl nicht dasselbe
 * wie bei jemandem, der sie eruebt hat. Settings und Randspalte tragen sie.
 */
export function activeLine(active: number, total: number, addedEarly: number): string {
  return `${active} of ${total} active` + (addedEarly > 0 ? ` · ${addedEarly} added early` : '');
}

/** Die Tagesquote als Satz -- Fusszeile und Randspalte tragen dieselbe. */
export function dayQuotaLine(day: DayStats): string {
  const accuracy = dayAccuracy(day);
  if (accuracy === null) return 'Today — no answers yet';
  const characters = day.characters.length;
  return `Today ${Math.round(accuracy * 100)}% · ${characters} character${characters === 1 ? '' : 's'}`;
}
