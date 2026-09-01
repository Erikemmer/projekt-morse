/**
 * Der Streak mit Freeze-Gnade (Produktentscheidung, Notion-Log #29).
 *
 * Er zeigt Kontinuität und verzeiht einen Aussetzer, statt ihn zu bestrafen —
 * das ist der ganze Zweck (CLAUDE.md 2.8). Deshalb steht hier nirgends eine
 * Strafe: ein verpasster Tag kostet den Freeze, nicht den Fortschritt, und ein
 * beendeter Streak nimmt niemandem etwas weg, was schon verbucht war.
 *
 * Reine Funktionen, kein DOM, **keine Uhr**: der Kalendertag kommt als
 * `YYYY-MM-DD` herein, so wie überall in der Engine (CLAUDE.md 4). Tests
 * prüfen damit Monatswechsel, Schaltjahr und Jahreswechsel, ohne die
 * Systemzeit zu stellen.
 *
 * Die Regeln, in der Reihenfolge, in der sie greifen:
 *
 * 1. **Ein Tag zählt als geübt, sobald an ihm eine Sitzung beendet wurde.**
 *    Zweimal am selben Tag zählt einmal — `recordPracticeDay` ist idempotent.
 * 2. **Ein einzelner verpasster Tag verbraucht den Freeze**, falls einer im
 *    Vorrat liegt. Der Streak läuft dann weiter, als wäre nichts gewesen; nur
 *    der Vorrat ist leer.
 * 3. **Zwei oder mehr verpasste Tage beenden den Streak** — auch mit Freeze.
 *    Ein Freeze deckt einen Tag, nicht eine Woche.
 * 4. **Der Vorrat ist höchstens einer** und füllt sich nach
 *    `FREEZE_EARNED_AFTER_DAYS` geübten Tagen in Folge. Gezählt wird nur,
 *    solange der Vorrat leer ist: ein verbrauchter Freeze muss neu verdient
 *    werden, sonst wäre er nach der ersten Woche dauerhaft geschenkt.
 *
 * Zwei Setzungen, die die Vorgabe nicht nennt, hier aber einen Wert brauchen:
 *
 * - **Ein beendeter Streak kostet den Vorrat nicht.** Zwei verpasste Tage
 *   enden den Streak — das ist die Folge. Den Freeze zusätzlich einzuziehen
 *   wäre eine zweite Strafe für dieselbe Pause (CLAUDE.md 2.8).
 * - **Ein Tag vor dem zuletzt geübten ändert nichts.** Eine zurückgestellte
 *   Uhr oder ein Zeitzonensprung darf keinen Streak zurückstufen.
 */

/** So viele geübte Tage in Folge füllen den Vorrat wieder auf. */
export const FREEZE_EARNED_AFTER_DAYS = 7;

/** Höchstens ein Freeze liegt im Vorrat — der Wert steht als Name da, nicht als 1 im Code. */
export const FREEZE_STOCK_MAX = 1;

/**
 * Der gespeicherte Streak-Stand.
 *
 * Alle Felder sind additiv zu `Progress` dazugekommen; `emptyStreak()` ist der
 * Default für jeden Stand, der sie noch nicht kennt (CLAUDE.md 4).
 */
export interface Streak {
  /** Der letzte Tag mit einer beendeten Sitzung, `YYYY-MM-DD`. `''` = noch keiner. */
  readonly lastPracticedDay: string;
  /** Länge des laufenden Streaks in Tagen, wie sie am `lastPracticedDay` stand. */
  readonly days: number;
  /** Ob ein Freeze im Vorrat liegt. */
  readonly freezeReady: boolean;
  /**
   * Geübte Tage in Folge, seit der Vorrat zuletzt leer wurde. Zählt nur bei
   * leerem Vorrat; bei vollem steht er auf 0 (Regel 4).
   */
  readonly daysTowardFreeze: number;
  /** Der Tag, für den zuletzt ein Freeze verbraucht wurde, `YYYY-MM-DD` oder `''`. */
  readonly freezeUsedDay: string;
}

export function emptyStreak(): Streak {
  return {
    lastPracticedDay: '',
    days: 0,
    freezeReady: false,
    daysTowardFreeze: 0,
    freezeUsedDay: '',
  };
}

/**
 * Wie der Streak **heute** dasteht — ohne etwas zu verändern.
 *
 * Der gespeicherte Stand beschreibt den zuletzt geübten Tag. Was daraus heute
 * geworden ist, hängt an den seither vergangenen Tagen, und genau das rechnet
 * diese Funktion aus. Ohne sie zeigte der Start-Screen nach einer Woche Pause
 * noch immer "Day 12" — eine Zahl, die niemand mehr hat (CLAUDE.md 2.6).
 */
export interface StreakStanding {
  /** Länge des Streaks, wie er heute gilt. 0 heisst: keiner. */
  readonly days: number;
  /** Ob ein Freeze bereitliegt. */
  readonly freezeReady: boolean;
  /** Ob der Freeze für **gestern** verbraucht wurde — nur dann sagt die UI es. */
  readonly freezeUsedYesterday: boolean;
}

/**
 * Der Streak aus heutiger Sicht.
 *
 * "Heute noch nicht geübt" ist ausdrücklich **kein** Bruch: wer gestern geübt
 * hat, hat den ganzen heutigen Tag Zeit. Erst der übernächste Tag entscheidet.
 */
export function streakStanding(streak: Streak, today: string): StreakStanding {
  const gap = daysBetween(streak.lastPracticedDay, today);

  // Kein geübter Tag, unlesbares Datum oder ein Stand aus der Zukunft
  // (zurückgestellte Uhr): dann gilt, was gespeichert ist, unverändert.
  if (gap === null) {
    return {
      days: streak.days,
      freezeReady: streak.freezeReady,
      freezeUsedYesterday: isYesterday(streak.freezeUsedDay, today),
    };
  }

  // gap 0 = heute schon geübt, gap 1 = gestern. Beides hält den Streak.
  // gap 2 = ein Tag ausgelassen: er hält nur, wenn ein Freeze bereitliegt --
  // verbraucht ist der aber erst, wenn heute wirklich geübt wird.
  const alive = gap <= 1 || (gap === 2 && streak.freezeReady);

  return {
    days: alive ? streak.days : 0,
    freezeReady: streak.freezeReady,
    freezeUsedYesterday: alive && isYesterday(streak.freezeUsedDay, today),
  };
}

/**
 * Verbucht `today` als geübten Tag und gibt einen **neuen** Stand zurück.
 *
 * Aufgerufen wird das genau einmal: wenn eine Sitzung beendet ist
 * (`engine/session.ts`). Ein zweiter Aufruf am selben Tag ändert nichts.
 */
export function recordPracticeDay(streak: Streak, today: string): Streak {
  if (!isDay(today)) return streak;

  const gap = daysBetween(streak.lastPracticedDay, today);

  // Schon heute verbucht, oder ein Tag vor dem zuletzt geübten (zurückgestellte
  // Uhr, Zeitzonensprung): nichts anfassen, nie zurückstufen.
  if (gap !== null && gap <= 0) return streak;

  // gap === null heisst hier: es gab noch keinen geübten Tag. Der Streak
  // faengt bei 1 an, wie nach einem Bruch auch.
  const continues = gap === 1;
  const usesFreeze = gap === 2 && streak.freezeReady;

  const base: Streak = usesFreeze
    ? {
        ...streak,
        // Der Freeze deckt den ausgelassenen Tag -- den Tag *vor* heute.
        freezeUsedDay: dayBefore(today),
        freezeReady: false,
        // Der Vorrat ist leer, also faengt das Zaehlen zum naechsten Freeze
        // wieder von vorn an (Regel 4).
        daysTowardFreeze: 0,
      }
    : continues
      ? streak
      : // Bruch oder erster Tag ueberhaupt: der Streak faengt neu an. Der
        // Vorrat bleibt, wie er ist -- die Pause hat den Streak gekostet, das
        // genuegt als Folge (siehe Kopf).
        { ...streak, days: 0, freezeUsedDay: '' };

  const days = continues || usesFreeze ? base.days + 1 : 1;

  // Der Vorrat fuellt sich nur, solange er leer ist -- sonst waere er nach der
  // ersten Woche dauerhaft voll und der Freeze nie wieder zu verdienen.
  const counting = base.freezeReady ? 0 : base.daysTowardFreeze + 1;
  const earns = !base.freezeReady && counting >= FREEZE_EARNED_AFTER_DAYS;

  return {
    lastPracticedDay: today,
    days,
    freezeReady: base.freezeReady || earns,
    daysTowardFreeze: earns ? 0 : counting,
    freezeUsedDay: base.freezeUsedDay,
  };
}

/**
 * Legt zwei Streak-Stände zusammen (Sync, `engine/sync.ts`).
 *
 * **Der Stand mit dem jüngeren zuletzt geübten Tag führt** — er weiss am
 * meisten über die Gegenwart. Bei Gleichstand gewinnt `local`, wie überall im
 * Merge ("lokal bleibt Quelle").
 *
 * **Und nichts wird dabei zurückgestuft.** Der ältere Stand kennt Tage, die
 * der jüngere nie gesehen hat: wer auf dem Telefon übt und danach am Rechner,
 * hat auf dem Rechner einen kurzen Streak stehen, obwohl der lange stimmt.
 * Deshalb wird der ältere Streak einmal auf den jüngsten geübten Tag
 * fortgeschrieben (`recordPracticeDay`) — lebte er da noch, zählt er weiter;
 * war er tot, kommt genau 1 heraus. Das Maximum aus beiden ist dann der
 * Streak, den es wirklich gab, und **keine geschenkte Zahl**: ein Stand aus
 * dem letzten Monat kann so nichts mehr behaupten (CLAUDE.md 2.6).
 *
 * Der Vorrat ist ein logisches Oder — ein verdienter Freeze verschwindet nicht
 * durch einen Merge, und mehr als einen kann es ohnehin nicht geben.
 */
export function mergeStreak(local: Streak, remote: Streak): Streak {
  const remoteIsYounger = laterDay(remote.lastPracticedDay, local.lastPracticedDay);
  const younger = remoteIsYounger ? remote : local;
  const older = remoteIsYounger ? local : remote;

  if (older.lastPracticedDay === '') return younger;

  // Der aeltere Stand, fortgeschrieben auf den juengsten geuebten Tag.
  const carried = recordPracticeDay(older, younger.lastPracticedDay);

  const freezeReady = younger.freezeReady || carried.freezeReady;

  return {
    lastPracticedDay: younger.lastPracticedDay,
    days: Math.max(younger.days, carried.days),
    freezeReady,
    // Bei vollem Vorrat wird nicht gezaehlt (Regel 4) -- die Invariante gilt
    // auch nach einem Merge.
    daysTowardFreeze: freezeReady
      ? 0
      : Math.max(younger.daysTowardFreeze, carried.daysTowardFreeze),
    freezeUsedDay: younger.freezeUsedDay,
  };
}

/**
 * Liest einen Streak aus unbekannten Daten.
 *
 * Wie überall in der Persistenz: alles Unplausible fällt auf den Default
 * zurück, statt den Stand zu verwerfen (CLAUDE.md 4). Die Invariante "voller
 * Vorrat zählt nicht" wird dabei hergestellt, nicht geglaubt.
 */
export function parseStreak(raw: unknown): Streak {
  if (typeof raw !== 'object' || raw === null) return emptyStreak();

  const entry = raw as Partial<Streak>;
  const lastPracticedDay = isDay(entry.lastPracticedDay) ? entry.lastPracticedDay : '';
  // Ohne geuebten Tag gibt es keinen Streak -- eine Zahl ohne Tag waere eine
  // Behauptung ohne Beleg.
  const days = lastPracticedDay === '' ? 0 : positiveOrZero(entry.days);
  const freezeReady = entry.freezeReady === true;

  return {
    lastPracticedDay,
    days,
    freezeReady,
    daysTowardFreeze: freezeReady
      ? 0
      : Math.min(positiveOrZero(entry.daysTowardFreeze), FREEZE_EARNED_AFTER_DAYS),
    freezeUsedDay: isDay(entry.freezeUsedDay) ? entry.freezeUsedDay : '',
  };
}

// --- Kalender ---------------------------------------------------------------
//
// Nur Datumsarithmetik auf `YYYY-MM-DD`, und nur so viel, wie der Streak
// braucht. Gerechnet wird in UTC: die Zeitzone steckt schon im String -- er
// entstand aus der lokalen Zeit des Geräts (ui/today.ts). Ein zweites Mal
// umzurechnen verschöbe den Tageswechsel.

const DAY_MS = 86_400_000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Ein brauchbarer Kalendertag.
 *
 * Der Hin- und Rueckweg muss denselben String ergeben: `Date.UTC` rollt
 * Unmoegliches stillschweigend weiter (der 30. Februar wird der 2. Maerz), und
 * ein gerollter Tag waere ein erfundener Tag.
 */
function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
  const epoch = toEpochDay(value);
  return Number.isFinite(epoch) && fromEpochDay(epoch) === value;
}

/**
 * Wie viele Kalendertage zwischen `from` und `to` liegen — oder `null`, wenn
 * einer der beiden kein brauchbarer Tag ist.
 *
 * Negativ heisst: `to` liegt vor `from`.
 */
function daysBetween(from: string, to: string): number | null {
  if (!isDay(from) || !isDay(to)) return null;
  return Math.round((toEpochDay(to) - toEpochDay(from)) / DAY_MS);
}

function dayBefore(day: string): string {
  return fromEpochDay(toEpochDay(day) - DAY_MS);
}

function isYesterday(day: string, today: string): boolean {
  return daysBetween(day, today) === 1;
}

/** Ob `day` nach `other` liegt. Ein leerer Tag liegt vor allem anderen. */
function laterDay(day: string, other: string): boolean {
  if (!isDay(day)) return false;
  if (!isDay(other)) return true;
  // Das Format sortiert lexikografisch wie chronologisch -- deshalb steht es so
  // in der Persistenz.
  return day > other;
}

function toEpochDay(day: string): number {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

function fromEpochDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function positiveOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
