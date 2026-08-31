/**
 * Feste Kenngroessen des Trainings.
 *
 * Sie stehen hier als benannte Konstanten und nicht als Literale in der UI, weil
 * sie spaeter *bewusst* variiert werden sollen: Tonhoehe und Tempo zu streuen ist
 * der Kern des HVPT-Prinzips (high variability phonetic training) -- man lernt das
 * Zeichen, nicht eine bestimmte Aufnahme davon. Bis dahin ist hier der eine Ort,
 * an dem sich ein Wert aendert.
 */

/** Tempo der Zeichen selbst. Bleibt konstant, auch wenn das Gesamttempo steigt. */
export const CHARACTER_WPM = 20;

/** Gesamttempo zu Beginn (Farnsworth: gestreckte Pausen bei vollem Zeichentempo). */
export const STARTING_EFFECTIVE_WPM = 10;

/** Tonhoehe in Hz. 600-700 Hz gilt als angenehm ueber laengere Sitzungen. */
export const DEFAULT_TONE_HZ = 620;

/**
 * Start-Zeichensatz: kontrastreich gewaehlt, damit die ersten Verwechslungen
 * nicht am Klang zweier fast gleicher Muster liegen.
 *
 * Die klassische Koch-Reihenfolge ist laut Recherche mutmasslich ein moderner
 * Zusatz und ausdruecklich nicht heilig. Ein fester Einstieg ist fuer V1 in
 * Ordnung; sobald Daten da sind, uebernimmt die Gewichtung nach Fehlerrate und
 * Reaktionszeit (siehe selection.ts).
 */
export const STARTING_CHARACTERS: readonly string[] = Object.freeze([
  'K',
  'M',
  'R',
  'S',
  'U',
  'A',
]);

/** Anzahl der Abfragen pro Sitzung. Kurz genug, um sie zu Ende zu bringen. */
export const ROUNDS_PER_SESSION = 20;
