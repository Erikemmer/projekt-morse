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
 * - **`recentAnswers`, `day` und `answersSinceGrowth` kommen vom jüngeren
 *   Stand** (`updatedAt`). Das sind Momentaufnahmen eines Verlaufs, keine
 *   Summen: das rollierende Fenster der Wachstumsregel darf nicht aus zwei
 *   Geräten zusammengeschnitten werden, sonst behauptet es eine Serie, die es
 *   nicht gab.
 * - **`activeCharacters` und `introducedCharacters` sind die Vereinigung.**
 *   Was einmal als Klang vorgestellt wurde, wurde vorgestellt -- ein Merge darf
 *   niemanden zurück in den Lernmodus schicken. Und **Wachstum ist monoton**:
 *   ein Zeichensatz, der einmal gewachsen ist, schrumpft nicht mehr
 *   (Ruling Notion-Log #56).
 *
 *   Der aktive Satz kam bis Review 9 vom jüngeren Stand, so wie der Verlauf.
 *   Das war die Vorgabe aus #49 und hatte einen Fall, der Arbeit kostete: Gerät
 *   A wächst auf zwölf Zeichen und synchronisiert, Gerät B übt danach mit
 *   sechsen weiter und schiebt hoch -- dann gewann B, und das Wachstum von A
 *   war im Konto weg. Die Statistik blieb (die Versuchs-Regel schützt sie),
 *   aber die Wachstumsregel musste den Satz neu aufbauen. Mit der Vereinigung
 *   entfällt der Fall.
 *
 *   Der Preis, bewusst bezahlt: **ein aktiver Satz lässt sich durch einen Merge
 *   nicht mehr verkleinern.** Käme je ein Weg, Zeichen wieder herauszunehmen
 *   (heute gibt es keinen), müsste er ausdrücklich und lokal wirken -- über
 *   diesen Merge geht er nicht.
 *
 *   Die Reihenfolge ist die des lokalen Standes zuerst, dann was nur der
 *   entfernte kennt. Eine über zwei Geräte hinweg "richtige"
 *   Einführungsreihenfolge gibt es nicht; local-first ist hier dieselbe
 *   Entscheidung wie überall in dieser Datei.
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
 *
 * Das **Tempo-Niveau** (`effectiveWpm`, engine/tempo.ts) folgt der Monotonie
 * des Wachstums: es kommt als **Maximum** der beiden Staende. Es ist derselbe
 * Gedanke wie beim aktiven Zeichensatz -- was erreicht ist, ist erreicht, und
 * ein Merge darf ein Geraet nicht langsamer machen, als es war. Der zugehoerige
 * Sperr-Zaehler `answersSinceSpeedUp` kommt dagegen vom juengeren Stand: er
 * beschreibt einen Verlauf, nicht ein Ergebnis, und steht damit bei
 * `answersSinceGrowth`.
 *
 * Der Preis, bewusst bezahlt und in HANDOVER.md ausgewiesen: **ein Reset des
 * Tempos in den Einstellungen wirkt lokal, nicht im Konto.** Wer auf einem
 * Geraet auf 10 WpM zurueckstellt und danach ein Geraet mit hoeherem Stand
 * abgleicht, steht wieder oben. Das ist die Kehrseite der Monotonie und dieselbe
 * offene Kante, die dieser Kopf beim aktiven Zeichensatz schon nennt: ein Weg
 * nach unten muesste ausdruecklich und lokal wirken, und ueber diesen Merge geht
 * er nicht.
 *
 * Der **Streak** folgt derselben Logik, aber mit einer eigenen Uhr: er richtet
 * sich nach dem *zuletzt geübten Tag* der beiden Stände, nicht nach
 * `updatedAt`. Ein Kalendertag ist die Einheit, um die es geht — welcher Blob
 * später geschrieben wurde, sagt darüber nichts. Die Regel steht in
 * `mergeStreak` (engine/streak.ts): der jüngere Tag führt, und
 * zurückgestuft wird nie.
 */

import { emptyProgress, recordFor, type CharacterRecord, type Progress } from './stats';
import { mergeStreak } from './streak';

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
    // Vereinigung, nicht "jüngerer Stand": Wachstum ist monoton (#56, siehe Kopf).
    activeCharacters: union(
      local.progress.activeCharacters,
      remote.progress.activeCharacters,
    ),
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
    // Eigene Regel, eigene Uhr: der zuletzt geübte Kalendertag entscheidet,
    // nicht `updatedAt` (siehe Kopf und engine/streak.ts).
    streak: mergeStreak(local.progress.streak, remote.progress.streak),
    // Maximum, wie der aktive Satz: Tempo ist Wachstum (siehe Kopf).
    effectiveWpm: Math.max(local.progress.effectiveWpm, remote.progress.effectiveWpm),
    // Momentaufnahme eines Verlaufs, wie `answersSinceGrowth`.
    answersSinceSpeedUp: younger.answersSinceSpeedUp,
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
 * "juengere" -- und wuerde seinen alten Uebungsverlauf ueber den eines Kontos
 * legen, an dem woanders gerade gearbeitet wurde. Genau so im Browser-Durchlauf
 * aufgefallen (Pruefung 20 fiel durch, bevor es diese Funktion gab).
 *
 * Seit dem Ruling #56 ist der aktive Zeichensatz davon unabhaengig (er ist die
 * Vereinigung). Der Zeitstempel entscheidet also nur noch ueber die
 * Momentaufnahmen: `recentAnswers`, `day`, `answersSinceGrowth`. Damit ist der
 * Schaden, den ein falsches "juenger" anrichten koennte, kleiner geworden --
 * verschwunden ist er nicht: ein rollierendes Fenster vom falschen Geraet
 * verschiebt die Wachstumsregel.
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
 * geschriebenen Stand -- also den formal jüngeren. Verlauf, Tagesstand und die
 * Wachstums-Sperre kämen dann vom leeren Gerät und legten sich über ein über
 * Monate gewachsenes Konto. Das wäre Datenverlust durch einen Login
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
