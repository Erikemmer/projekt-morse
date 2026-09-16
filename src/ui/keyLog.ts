/**
 * Ein Ringpuffer der letzten Tastenanschlaege -- zum Messen, nicht zum Zeigen.
 *
 * **Warum es das gibt.** Der Ausfall "Anschlaege werden teilweise nicht
 * erkannt" hat sechs Runden ueberlebt, weil er sich hier nie reproduzieren
 * liess: jede Runde fand einen echten Fehler, und der Nutzer meldete den
 * Ausfall danach erneut. Was fehlte, war nie eine Idee, sondern eine
 * **Messung am Geraet, an dem es passiert**. Dieser Puffer ist sie.
 *
 * Aufgezeichnet wird ausschliesslich, was der Browser an `keydown` liefert --
 * Taste, Modifikator-Flaggen, `repeat` -- plus der Bildschirm, der gerade
 * vorne steht. Das genuegt fuer die Frage, die offen ist: kam der Anschlag
 * ueberhaupt an, und mit welchen Flaggen?
 *
 * **Was hier nicht passiert:** nichts wird gesendet, nichts gespeichert,
 * nichts ueberlebt einen Reload. Der Puffer liegt im Arbeitsspeicher, fasst
 * `CAPACITY` Eintraege und wird danach ueberschrieben -- kein unbegrenztes
 * Wachstum ueber eine lange Sitzung (CLAUDE.md 7). Er ist kein Feature,
 * sondern ein Messgeraet, und er darf jederzeit wieder verschwinden.
 */

export interface KeyLogEntry {
  /** Millisekunden seit Sitzungsbeginn -- eine Dauer, keine Uhrzeit. */
  readonly at: number;
  readonly key: string;
  /** Die physische Taste. Verraet die Belegung, wenn `key` ueberrascht. */
  readonly code: string;
  readonly repeat: boolean;
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  /** Welcher Bildschirm vorne stand. */
  readonly where: string;
}

const CAPACITY = 60;

const entries: KeyLogEntry[] = [];
const started = Date.now();

export function recordKey(event: KeyboardEvent, where: string): void {
  entries.push({
    at: Date.now() - started,
    key: event.key,
    code: event.code,
    repeat: event.repeat,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
    shift: event.shiftKey,
    where,
  });
  if (entries.length > CAPACITY) entries.splice(0, entries.length - CAPACITY);
}

export function keyLog(): readonly KeyLogEntry[] {
  return entries;
}

/**
 * Der Puffer als Text, zum Weitergeben.
 *
 * Eine Zeile je Anschlag, Modifikatoren nur wenn gesetzt -- so faellt genau
 * das auf, wonach gesucht wird. Ein leerer Puffer sagt das ausdruecklich,
 * statt leeren Text zu liefern: "nichts aufgezeichnet" ist ein Befund.
 */
export function formatKeyLog(): string {
  if (entries.length === 0) return 'Input log: nothing recorded yet.';

  const lines = entries.map((entry) => {
    const flags = [
      entry.repeat ? 'REPEAT' : null,
      entry.ctrl ? 'ctrl' : null,
      entry.meta ? 'meta' : null,
      entry.alt ? 'ALT' : null,
      entry.shift ? 'shift' : null,
    ].filter((flag) => flag !== null);

    return `${String(entry.at).padStart(7)}ms  ${entry.where.padEnd(10)} ${entry.key} (${entry.code})${
      flags.length > 0 ? `  [${flags.join(' ')}]` : ''
    }`;
  });

  return [`Input log — last ${entries.length} keystrokes`, ...lines].join('\n');
}
