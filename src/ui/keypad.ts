/**
 * Die Antwortflaeche, wenn der Zeichensatz gross wird: das feste Tastenfeld.
 *
 * Hier stehen nur die **Setzungen** dieses Layouts -- die Schwelle und die 36
 * Positionen. Gerendert wird in `App.tsx` (Answers), gestaltet in
 * `styles.css` (`.keypad`). Kein DOM, kein React: damit die beiden Zahlen, an
 * denen die ganze Regel haengt, ohne Browser pruefbar sind.
 *
 * **Warum es dieses Layout gibt.** Bis zwoelf Zeichen traegt das Dreier-Gitter
 * (`.answers`): jede Taste ist gross, und die Liste bleibt ueberschaubar. Ab
 * dreizehn kippt das -- die Tasten wandern bei jedem neuen Zeichen an eine
 * andere Stelle, und mit ihnen die Suchzeit, die in der gemessenen
 * Reaktionszeit steckt (stats.ts, Punkt 2). Eriks Eigen-Test mit 15 Zeichen
 * hat genau das gezeigt. Ruling Fable, Notion-Log #75.
 *
 * **Ortsfestigkeit ist der Zweck, nicht ein Nebeneffekt.** Deshalb sind ab der
 * Schwelle *alle* 36 Positionen sichtbar -- auch die Zeichen, die noch nicht
 * dran sind. Sie sind gedimmt und nicht bedienbar. Das ist eine dokumentierte
 * Erweiterung derselben Ausnahme von Guidelines 1.1 §7 ("hide what can't be
 * used"), die das Dreier-Gitter schon hat (Notion-Log #43): wer immer an
 * dieselbe Stelle greift, baut Motorik auf, und die Latenz-Messung bleibt
 * sauber, weil sie nicht bei jedem Wachstumsschritt eine neue Suche mitmisst.
 */

/**
 * Ab wie vielen **aktiven** Zeichen die Antwortflaeche das feste Tastenfeld
 * ist. Zwoelf ist die letzte Zahl, die das Dreier-Gitter in vier ruhigen
 * Reihen fasst; ab dreizehn beginnt die fuenfte, unvollstaendige.
 */
export const KEYPAD_MIN_CHARACTERS = 13;

/** Spalten des Tastenfelds. Spiegelt `grid-template-columns` in styles.css. */
export const KEYPAD_COLUMNS = 6;

/**
 * Die 36 ortsfesten Positionen: Buchstaben alphabetisch, danach die Ziffern.
 *
 * Alphabetisch und **nicht** in Einfuehrungsreihenfolge (CHARACTER_ORDER): das
 * Alphabet weiss jeder auswendig, die Koch-Folge niemand. Wer eine Taste
 * sucht, soll sie ableiten koennen, statt sie zu lernen.
 */
export const KEYPAD_LAYOUT: readonly string[] = Object.freeze([
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'0123456789',
]);

/**
 * Die erste Ziffer beginnt eine neue Reihe -- die Ziffern stehen *unter* den
 * Buchstaben, nicht hinter Z. Das Umbrechen macht CSS (`grid-column: 1`);
 * hier steht nur, an welcher Position es passiert.
 */
export const KEYPAD_ROW_BREAK = '0';

/**
 * Ob das Tastenfeld gilt. Nimmt die Zahl der aktiven Zeichen, nicht die des
 * gerade abgefragten Satzes: eine Speed round zieht aus wenigen Zeichen, und
 * das Feld darf dabei **nicht** aufs Dreier-Gitter zurueckfallen. Einmal
 * gewechselt, bleibt gewechselt -- die Positionen sind das Versprechen. Weil
 * der aktive Satz nur waechst (growth.ts haengt an, nimmt nie weg), genuegt
 * dafuer diese eine Zahl; ein eigenes Feld im Lernstand braucht es nicht.
 */
export function usesKeypad(activeCharacterCount: number): boolean {
  return activeCharacterCount >= KEYPAD_MIN_CHARACTERS;
}
