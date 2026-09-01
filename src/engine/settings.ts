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
 * Ein- und Ausblendzeit pro Ton in Sekunden (Guidelines 1.1 §10: "attack/release
 * ~ 8 ms -- no clicks, no hard cut-offs").
 *
 * Die Rampe verlaengert kein Element: der Player deckelt sie auf ein Drittel der
 * Tondauer. Das kuerzeste Element ist ein dit, bei 20 WPM 60 ms -- die Grenze
 * liegt also bei 20 ms und 8 ms passen locker darunter. Am Zeitraster aendert
 * sich damit nichts (CLAUDE.md 2.1, 7).
 *
 * Das CSS-Token --tone-ramp in styles.css spiegelt diesen Wert nur; Audio liest
 * kein CSS. Hier ist die Quelle.
 */
export const TONE_RAMP_SECONDS = 0.008;

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

/**
 * In welcher Reihenfolge neue Zeichen dazukommen, wenn die Wachstumsregel
 * (growth.ts) greift. Beginnt mit dem Start-Zeichensatz und folgt danach der
 * Koch-ueblichen Folge -- die ist laut Recherche mutmasslich ein moderner
 * Zusatz und nicht heilig, aber als feste Liste fuer V1 gut genug. Satzzeichen
 * bleiben vorerst draussen. Sobald Daten da sind, darf eine adaptive Auswahl
 * diese Liste abloesen; sie ist eine Setzung, kein Standard.
 */
export const CHARACTER_ORDER: readonly string[] = Object.freeze([
  ...STARTING_CHARACTERS,
  ...'PTLOWINJEF0YVG5Q9ZH38B427C1D6X',
]);

/** Anzahl der Abfragen pro Sitzung. Kurz genug, um sie zu Ende zu bringen. */
export const ROUNDS_PER_SESSION = 20;

/**
 * Wie viele Runden ein Punkt in der Fusszeile zusammenfasst.
 *
 * Zwanzig einzelne Punkte waeren eine Perlenkette, die man zaehlt statt sie zu
 * lesen -- und Zaehlen ist hier genau das, was nicht passieren soll. Vier
 * Runden je Punkt ergeben fuenf Punkte: ein Blick genuegt.
 */
export const ROUNDS_PER_GROUP = 4;
