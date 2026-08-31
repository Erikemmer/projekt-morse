/**
 * Welches Zeichen als naechstes drankommt.
 *
 * Entschieden ist: adaptiv nach Schwaeche. Gezogen wird gewichtet aus dem
 * aktuellen Zeichensatz, wobei ein Zeichen umso wahrscheinlicher kommt, je oefter
 * es danebengeht und je laenger die Antwort darauf dauert.
 *
 * Bewusst *kein* Scheduler mit Intervallen (SM-2 und Verwandte): die Sitzung ist
 * kurz und der Zeichensatz klein: hier zaehlt, was gerade wackelt, nicht was in
 * drei Tagen faellig waere.
 *
 * Rein und deterministisch: die Zufallsquelle kommt als Parameter herein, damit
 * der Test dieselbe Funktion mit fester Folge pruefen kann.
 */

import { medianReaction, recordFor, type Progress } from './stats';

/** Grundgewicht, das jedes Zeichen bekommt -- nichts faellt ganz aus der Rotation. */
const BASE_WEIGHT = 1;

/** Ein noch nie abgefragtes Zeichen kommt bevorzugt dran, aber nicht ausschliesslich. */
const UNSEEN_WEIGHT = 4;

/** Wie stark die Fehlerquote zaehlt (voll daneben = +MISS_WEIGHT). */
const MISS_WEIGHT = 4;

/** Wie stark die Reaktionszeit zaehlt. Schwaecher als der Fehler: sie ist nur ein Proxy. */
const LATENCY_WEIGHT = 2;

/** Ab hier gilt eine Antwort als sicher (Sekunden nach dem Ton). */
const FAST_SECONDS = 0.6;

/** Ab hier als gesucht. Dazwischen wird linear interpoliert. */
const SLOW_SECONDS = 3;

/**
 * Wie dringend ein Zeichen Uebung braucht. Groesser = wahrscheinlicher.
 *
 * Die Zahl ist eine Gewichtung fuer die Ziehung, kein Koennensmass -- sie taugt
 * nicht als Prozentanzeige in der UI.
 */
export function weightFor(progress: Progress, char: string): number {
  const record = recordFor(progress, char);
  if (record.attempts === 0) return UNSEEN_WEIGHT;

  const missRate = 1 - record.hits / record.attempts;

  const median = medianReaction(record);
  const latency =
    median === null
      ? 0
      : clamp((median - FAST_SECONDS) / (SLOW_SECONDS - FAST_SECONDS), 0, 1);

  return BASE_WEIGHT + MISS_WEIGHT * missRate + LATENCY_WEIGHT * latency;
}

export interface PickOptions {
  /** Zufallszahl in [0,1). Als Parameter, damit Tests nicht wuerfeln muessen. */
  random: () => number;
  /** Zeichen, das gerade dran war -- wird nach Moeglichkeit uebersprungen. */
  avoid?: string | null;
}

/**
 * Zieht das naechste Zeichen aus `pool`, gewichtet nach Schwaeche.
 *
 * Das zuletzt gefragte Zeichen wird ausgelassen: zweimal dasselbe hintereinander
 * misst die Erinnerung an die letzte Sekunde, nicht das Kopfhoeren. Bleibt danach
 * nichts uebrig (Pool der Groesse 1), gewinnt die Abfrage vor der Regel.
 */
export function pickNext(
  pool: readonly string[],
  progress: Progress,
  options: PickOptions,
): string {
  if (pool.length === 0) throw new RangeError('Der Zeichensatz darf nicht leer sein');

  const candidates = pool.length > 1 ? pool.filter((char) => char !== options.avoid) : pool;
  const weights = candidates.map((char) => weightFor(progress, char));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  let ticket = clamp(options.random(), 0, 1) * total;
  for (let i = 0; i < candidates.length; i += 1) {
    ticket -= weights[i];
    // Kleiner Rundungsrest darf nicht dazu fuehren, dass gar nichts gezogen wird.
    if (ticket < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
