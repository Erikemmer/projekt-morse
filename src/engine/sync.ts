/**
 * Das Zusammenlegen zweier Lernstaende -- lokal und aus dem Konto.
 *
 * Reine Funktion, kein DOM, kein fetch (CLAUDE.md 4). Wer *wann* synchronisiert,
 * entscheidet die UI; *was* dabei herauskommt, entscheidet hier.
 *
 * **Lokal bleibt die Quelle.** Das Konto ist ein Sync-Ziel, keine Voraussetzung.
 * Deshalb gewinnt bei jedem Gleichstand der lokale Stand -- der Merge darf ein
 * Gerät nie stiller machen, als es war.
 *
 * Die Regeln kommen aus der Produktentscheidung (Notion-Log #49) und sind
 * bewusst je Feld verschieden, weil die Felder Verschiedenes bedeuten:
 *
 * - **Pro Zeichen gewinnt der Datensatz mit mehr `attempts`.** Versuche sind
 *   gelebte Uebung; der Stand mit mehr davon weiss mehr ueber das Zeichen. Der
 *   Datensatz wandert dabei *ganz* (Versuche, Treffer, Reaktionszeiten), nie
 *   feldweise gemischt: `hits` aus einem und `attempts` aus einem anderen Stand
 *   ergaeben eine Trefferquote, die nie jemand erlebt hat (CLAUDE.md 2.6).
 * - **`recentAnswers`, `day`, `answersSinceGrowth` und der aktive Zeichensatz
 *   kommen vom jüngeren Stand** (`updatedAt`). Das sind Momentaufnahmen eines
 *   Verlaufs, keine Summen: das rollierende Fenster der Wachstumsregel darf
 *   nicht aus zwei Geräten zusammengeschnitten werden, sonst behauptet es eine
 *   Serie, die es nicht gab.
 * - **`introducedCharacters` ist die Vereinigung.** Was einmal als Klang
 *   vorgestellt wurde, wurde vorgestellt -- ein Merge darf niemanden zurück in
 *   den Lernmodus schicken.
 *
 * Drei Felder nennt die Vorgabe nicht; sie müssen trotzdem einen Wert haben,
 * weil ein `Progress` vollständig ist. Beide Regeln folgen "Persistenz verliert
 * keine Nutzerdaten" (CLAUDE.md 4) und sind in HANDOVER.md als Setzung
 * ausgewiesen, nicht als Vorgabe:
 *
 * - `sessionsStarted`: das Maximum. Ein monoton wachsender Zähler darf durch
 *   einen Merge nicht sinken; die Summe wäre falsch, weil beide Stände dieselbe
 *   Vorgeschichte enthalten können.
 * - `introSeen` und `variabilityNoticeSeen`: logisches Oder. Wer die Einführung
 *   gesehen hat, hat sie gesehen -- sie ein zweites Mal vorzulegen wäre eine
 *   Rückstufung.
 */

import { emptyProgress, recordFor, type CharacterRecord, type Progress } from './stats';

/**
 * Ein Lernstand mit dem Zeitpunkt seiner letzten Änderung.
 *
 * `updatedAt` sind Millisekunden seit Epoch. `0` heisst "nie geschrieben" und
 * ist damit immer der ältere Stand -- genau richtig für ein frisches Gerät.
 */
export interface Snapshot {
  readonly progress: Progress;
  readonly updatedAt: number;
}

/**
 * Legt lokalen und entfernten Stand zusammen.
 *
 * Reihenfolge der Argumente ist Bedeutung, nicht Geschmack: bei Gleichstand
 * gewinnt `local`.
 */
export function mergeProgress(local: Snapshot, remote: Snapshot): Progress {
  // Bei gleichem Zeitstempel gewinnt der lokale Stand -- "lokal bleibt Quelle".
  const younger =
    effectiveUpdatedAt(remote) > effectiveUpdatedAt(local) ? remote.progress : local.progress;

  return {
    version: 1,
    characters: mergeCharacters(local.progress, remote.progress),
    activeCharacters: [...younger.activeCharacters],
    recentAnswers: [...younger.recentAnswers],
    answersSinceGrowth: younger.answersSinceGrowth,
    day: { ...younger.day, characters: [...younger.day.characters] },
    introducedCharacters: union(
      local.progress.introducedCharacters,
      remote.progress.introducedCharacters,
    ),
    sessionsStarted: Math.max(local.progress.sessionsStarted, remote.progress.sessionsStarted),
    introSeen: local.progress.introSeen || remote.progress.introSeen,
    variabilityNoticeSeen:
      local.progress.variabilityNoticeSeen || remote.progress.variabilityNoticeSeen,
  };
}

/**
 * Pro Zeichen der Datensatz mit mehr Versuchen -- als Ganzes. Bei Gleichstand
 * (auch bei zwei leeren Datensätzen) der lokale.
 */
function mergeCharacters(
  local: Progress,
  remote: Progress,
): Record<string, CharacterRecord> {
  const merged: Record<string, CharacterRecord> = {};

  for (const char of union(Object.keys(local.characters), Object.keys(remote.characters))) {
    const mine = recordFor(local, char);
    const theirs = recordFor(remote, char);
    const winner = theirs.attempts > mine.attempts ? theirs : mine;
    merged[char] = { ...winner, recentReactions: [...winner.recentReactions] };
  }

  return merged;
}

/**
 * Ein Kennzeichen dafuer, *wieviel gelernt* ist -- und nur dafuer.
 *
 * Es aendert sich, wenn jemand geantwortet hat (Versuche), wenn der
 * Zeichensatz gewachsen ist oder wenn ein Zeichen eingefuehrt wurde. Es
 * aendert sich **nicht**, wenn nur der Sitzungszaehler hochgeht, der
 * Tages-Eimer auf ein neues Datum springt oder ein Einmal-Merker umklappt.
 *
 * Wozu: der Zeitstempel eines Standes (`Snapshot.updatedAt`) soll sagen, wann
 * dieses Geraet zuletzt *etwas gelernt* hat -- nicht, wann zuletzt etwas
 * geschrieben wurde. Der Unterschied ist der ganze Punkt, denn schon das
 * Oeffnen der App schreibt (die Sitzung wird gezaehlt). Ohne diese
 * Unterscheidung waere jedes gerade geoeffnete Geraet automatisch das
 * "juengere" und wuerde mit seinem alten Zeichensatz ein Konto ueberschreiben,
 * an dem woanders gerade gearbeitet wurde. Genau so im Browser-Durchlauf
 * aufgefallen (Pruefung 20 fiel durch, bevor es diese Funktion gab).
 *
 * Ein String und keine Zahl: es wird nur auf Gleichheit geprueft, nie
 * gerechnet, und so bleibt lesbar, was drinsteht.
 */
export function learningRevision(progress: Progress): string {
  let attempts = 0;
  for (const record of Object.values(progress.characters)) attempts += record.attempts;

  return [
    attempts,
    progress.activeCharacters.length,
    progress.introducedCharacters.length,
  ].join('/');
}

/**
 * Ob dieser Stand ueberhaupt schon geuebt hat.
 *
 * Dieselbe Unterscheidung, die `parseProgress` beim Auffuellen von
 * `introducedCharacters` trifft (stats.ts): irgendein Versuch > 0 heisst "hier
 * ist gelebte Uebung", alles andere ist ein Anfang.
 */
export function hasPractised(progress: Progress): boolean {
  return Object.values(progress.characters).some((record) => record.attempts > 0);
}

/**
 * Der Zeitstempel, mit dem verglichen wird -- **ein Stand ohne einen einzigen
 * Versuch ist nie der jüngere.**
 *
 * Diese eine Zeile entscheidet die erste Kante der Vorgabe (frisches Gerät +
 * volles Konto), und ohne sie ginge sie schief: wer die App neu installiert,
 * die Einführung durchklickt und *dann* einlogged, hat einen lokal gerade
 * geschriebenen Stand -- also den formal jüngeren. Der aktive Zeichensatz käme
 * dann vom leeren Gerät und würde ein über Monate gewachsenes Konto auf die
 * sechs Startzeichen zurückwerfen. Das wäre Datenverlust durch einen Login
 * (CLAUDE.md 4), und zwar im wahrscheinlichsten Fall überhaupt.
 *
 * "Jünger" heisst deshalb: *hat später etwas gelernt* -- nicht "wurde später
 * gespeichert". Ein Merker, der umgeklappt ist, ist kein Lernfortschritt.
 */
function effectiveUpdatedAt(snapshot: Snapshot): number {
  return hasPractised(snapshot.progress) ? snapshot.updatedAt : 0;
}

/** Vereinigung zweier Listen, Reihenfolge der ersten zuerst, ohne Dubletten. */
function union(first: readonly string[], second: readonly string[]): string[] {
  const result = [...new Set(first)];
  for (const item of second) if (!result.includes(item)) result.push(item);
  return result;
}

/**
 * Der Stand eines frischen Geräts: leer und älter als alles andere.
 *
 * Steht hier und nicht in der UI, damit der Fall "erstes Login auf einem neuen
 * Gerät" in den Tests dieselbe Eingabe hat wie im Betrieb.
 */
export function emptySnapshot(): Snapshot {
  return { progress: emptyProgress(), updatedAt: 0 };
}
