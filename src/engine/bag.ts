/**
 * Der Beutel fuer den Einzelzeichen-Loop (Ruling Notion-Log #103b).
 *
 * `weightFor`/`pickNext` (selection.ts) liessen ein schwaches Zeichen bis zu
 * siebenmal so oft kommen wie ein sitzendes -- bei achtzehn aktiven Zeichen
 * deutlich spuerbar (CLAUDE.md 2.6: eine ungleiche Verteilung, die niemand so
 * benannt hat). Ersetzt wird die Lotterie fuer genau diesen einen Loop durch
 * einen Beutel: jedes aktive Zeichen kommt in einem Zyklus genau einmal vor,
 * ein schwaches oder langsames Zeichen hoechstens ein zweites Mal.
 *
 * **Der Wort-Modus bleibt unberuehrt.** `drawGroup` (words.ts) zieht Positionen
 * innerhalb eines Wortes mit der bestehenden Gewichtung aus selection.ts --
 * das ist eine andere Aufgabe (eine Gruppe zusammensetzen, nicht den naechsten
 * Loop-Durchgang bestimmen) und nicht Teil dieses Rulings.
 *
 * Rein und ohne Modulzustand: der Beutel ist nur eine Liste von Zeichen, die
 * der Aufrufer haelt (SessionState.bag) und bei jedem Zug herein- und wieder
 * herausreicht -- kein verstecktes `let`, keine Modulvariable (CLAUDE.md 4).
 */

import { slowCharacters } from './drill';
import { GROWTH_MIN_CHARACTER_ACCURACY } from './growth';
import { hitRate, recordFor, type Progress } from './stats';

/** Die verbleibenden Lose des laufenden Zyklus. */
export type Bag = readonly string[];

export interface DrawOptions {
  /** Zufallszahl in [0,1). Als Parameter, damit Tests nicht wuerfeln muessen. */
  random: () => number;
  /** Zeichen, das gerade dran war -- wird nach Moeglichkeit ausgelassen. */
  avoid?: string | null;
}

export interface Draw {
  readonly char: string;
  /** Der Beutel nach diesem Zug -- leer heisst: der naechste Zug fuellt neu. */
  readonly bag: Bag;
}

/** Ob ein Zeichen ein zweites Los bekommt -- schwach oder langsam, nicht mehr. */
function hasExtraTicket(progress: Progress, char: string, slow: ReadonlySet<string>): boolean {
  if (slow.has(char)) return true;
  const rate = hitRate(recordFor(progress, char));
  return rate !== null && rate < GROWTH_MIN_CHARACTER_ACCURACY;
}

/** Fisher-Yates. Reine Funktion -- mischt eine Kopie, laesst `items` unberuehrt. */
function shuffle(items: readonly string[], random: () => number): string[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Vertauscht `arr[0]` mit einem anderen Eintrag, falls es `forbidden` waere.
 *
 * `arr` traegt in diesem Modul immer lauter verschiedene Zeichen (ein Zug pro
 * Zeichen je Haelfte, siehe `buildBag`), also reicht es, den ersten
 * abweichenden Eintrag zu suchen -- ein zweiter Treffer koennte keine neue
 * Nachbarschaft verletzen, die es nicht ohnehin schon gaebe.
 */
function avoidLeadingRepeat(arr: string[], forbidden: string | null): void {
  if (forbidden === null || arr.length <= 1 || arr[0] !== forbidden) return;
  const swapIndex = arr.findIndex((char, index) => index > 0 && char !== forbidden);
  if (swapIndex === -1) return; // unvermeidbar -- z. B. ein Pool der Groesse 1
  [arr[0], arr[swapIndex]] = [arr[swapIndex], arr[0]];
}

/**
 * Baut einen neuen Zyklus.
 *
 * Zwei Haelften: **einmal jedes aktive Zeichen**, gemischt, dann **die
 * Zusatzlose** (nur schwache oder langsame Zeichen, je hoechstens eines),
 * ebenfalls gemischt. Innerhalb jeder Haelfte kommt kein Zeichen zweimal vor
 * -- sie enthaelt ja nur verschiedene Zeichen --, es gibt also nur zwei
 * moegliche Nahtstellen fuer eine Wiederholung: vor dem Zyklus (`avoid`, das
 * zuletzt gefragte Zeichen) und zwischen den beiden Haelften. Beide werden
 * gezielt geprueft und noetigenfalls repariert (`avoidLeadingRepeat`).
 */
function buildBag(
  pool: readonly string[],
  progress: Progress,
  random: () => number,
  avoid: string | null,
): Bag {
  const slow = new Set(slowCharacters(progress));
  const doubled = pool.filter((char) => hasExtraTicket(progress, char, slow));

  const firstHalf = shuffle(pool, random);
  avoidLeadingRepeat(firstHalf, avoid);

  const secondHalf = shuffle(doubled, random);
  avoidLeadingRepeat(secondHalf, firstHalf[firstHalf.length - 1]);

  return [...firstHalf, ...secondHalf];
}

/**
 * Zieht das naechste Zeichen -- aus dem Beutel, oder aus einem frisch
 * gefuellten, wenn er leer ist.
 *
 * Wie `pickNext` (selection.ts): das zuletzt gefragte Zeichen wird nach
 * Moeglichkeit ausgelassen, auch ueber die Zyklusgrenze hinweg. Bleibt
 * nichts anderes uebrig (Pool der Groesse 1), gewinnt die Abfrage vor der
 * Regel.
 */
export function drawFromBag(
  pool: readonly string[],
  bag: Bag,
  progress: Progress,
  options: DrawOptions,
): Draw {
  if (pool.length === 0) throw new RangeError('Der Zeichensatz darf nicht leer sein');

  const current = bag.length > 0 ? bag : buildBag(pool, progress, options.random, options.avoid ?? null);
  const [char, ...rest] = current;
  return { char, bag: rest };
}
