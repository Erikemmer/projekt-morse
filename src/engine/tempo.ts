/**
 * Die Tempo-Progression: wann die Pausen kuerzer werden (Ruling #83, Teil B).
 *
 * Farnsworth heisst, dass die Zeichen von Anfang an ihr endgueltiges Tempo
 * haben und nur die Pausen dazwischen gestreckt sind (CLAUDE.md 2.3). Was hier
 * waechst, ist deshalb **ausschliesslich** das Gesamttempo -- das
 * Zeichentempo bleibt `CHARACTER_WPM`, und wenn beide sich treffen, ist
 * Farnsworth aufgebraucht und die Progression zu Ende. Genau das ist der
 * Deckel unten.
 *
 * **Erst der volle Satz, dann die Pausen.** Die Progression beginnt erst, wenn
 * alle Zeichen aus `CHARACTER_ORDER` aktiv sind. Der Grund ist die Reihenfolge
 * des Lernens: solange noch Zeichen dazukommen, ist die knappe Ressource das
 * Kopfhoeren *neuer* Klaenge, nicht die Geschwindigkeit -- ein Tempo, das
 * nebenher steigt, macht jede Einfuehrung schwerer, als sie sein muesste. Und
 * zwei Wachstumsregeln, die gleichzeitig greifen koennen, waeren nicht
 * auseinanderzuhalten: welche Stufe hat die Trefferquote gedrueckt? Deshalb
 * sind sie **ausschliessend** -- `growth.ts` laeuft, solange es einen
 * Kandidaten gibt, und diese Datei erst, wenn es keinen mehr gibt.
 *
 * **Dieselbe Bedingung, dieselbe Sperre.** Die Stufe faellt, sobald das
 * rollierende 90-%-Fenster der Wachstumsregel erfuellt ist (Bedingung (a) in
 * growth.ts) und seit der letzten Stufe mindestens `SPEED_LOCKOUT_ANSWERS`
 * Antworten liegen. Die Zahlen sind bewusst *dieselben* Konstanten und keine
 * neuen: es ist derselbe Nachweis "das sitzt gerade", nur mit einer anderen
 * Belohnung. Die Bedingungen (b) und (c) der Wachstumsregel -- Mindestzahl
 * Versuche und Mindestquote *je Zeichen* -- gelten hier **nicht**: das Ruling
 * nennt das Fenster, und bei 36 aktiven Zeichen wuerde ein einzelnes zaehes
 * Zeichen das Tempo auf Dauer festhalten, obwohl die Sitzungen laufen.
 *
 * **Nie automatisch abwaerts.** Es gibt keinen Weg, auf dem eine schlechte
 * Serie das Tempo senkt. Ein Rueckschritt, den die App selbst vornimmt, waere
 * ein Urteil ueber einen Tag -- und ein Tempo, das man verlieren kann, ist
 * Druck (CLAUDE.md 2.8). Zuruecksetzen kann nur der Nutzer, ausdruecklich, in
 * den Einstellungen (`resetEffectiveWpm`).
 *
 * Reine Funktionen, kein DOM, kein Zufall.
 */

import { CHARACTER_ORDER, CHARACTER_WPM, STARTING_EFFECTIVE_WPM } from './settings';
import { GROWTH_LOCKOUT_ANSWERS, GROWTH_WINDOW_ACCURACY } from './growth';
import { RECENT_ANSWER_WINDOW, type Progress } from './stats';

/** Um so viel steigt das Gesamttempo je Stufe. */
export const SPEED_STEP_WPM = 1;

/**
 * So viele Antworten liegen mindestens zwischen zwei Stufen.
 *
 * Dieselbe Sperre wie bei der Wachstumsregel, und aus demselben Grund: eine
 * Aenderung soll erst *ankommen*, bevor die naechste kommt. Kein eigener Wert,
 * damit nicht zwei Zahlen dasselbe bedeuten.
 */
export const SPEED_LOCKOUT_ANSWERS = GROWTH_LOCKOUT_ANSWERS;

/**
 * Der Deckel: das Zeichentempo.
 *
 * Darueber gibt es kein Gesamttempo -- Pausen koennen nicht kuerzer als null
 * werden (`computeTiming` deckelt es ohnehin). Ab hier *ist* das Timing der
 * ITU-Standard, und Farnsworth ist ein No-op.
 */
export const MAX_EFFECTIVE_WPM = CHARACTER_WPM;

/**
 * Ob die Progression ueberhaupt laeuft: alle Zeichen der Reihe sind aktiv.
 *
 * Verglichen wird gegen `CHARACTER_ORDER` und nicht gegen die Zahl 36, damit
 * eine spaeter erweiterte Reihe (Satzzeichen) diese Regel automatisch
 * mitnimmt statt sie zu ueberholen.
 */
export function speedProgressionActive(progress: Progress): boolean {
  const active = new Set(progress.activeCharacters);
  return CHARACTER_ORDER.every((char) => active.has(char));
}

/** Prueft die Regel, ohne etwas zu veraendern. Exportiert fuer Tests und Anzeige. */
export function isReadyToSpeedUp(progress: Progress): boolean {
  if (!speedProgressionActive(progress)) return false;
  if (progress.effectiveWpm >= MAX_EFFECTIVE_WPM) return false;
  if (progress.answersSinceSpeedUp < SPEED_LOCKOUT_ANSWERS) return false;

  // Bedingung (a) der Wachstumsregel, wortgleich: das Fenster muss voll sein.
  // 27 von 30 sind belastbar, 9 von 10 nicht.
  const window = progress.recentAnswers;
  if (window.length < RECENT_ANSWER_WINDOW) return false;
  return window.filter(Boolean).length / window.length >= GROWTH_WINDOW_ACCURACY;
}

export interface SpeedUpResult {
  progress: Progress;
  /**
   * Das Tempo vor und nach der Stufe -- oder `null`, wenn die Regel nicht
   * griff. Beide Zahlen, weil die UI die Bewegung zeigt (`10 → 11 wpm`) und
   * nicht nur das Ergebnis.
   */
  from: number | null;
  to: number | null;
}

/**
 * Hebt das Gesamttempo um eine Stufe, wenn die Regel greift.
 *
 * Gibt sonst den Fortschritt unveraendert (identisch, ===) zurueck -- damit
 * Aufrufer und React-Zustand billig erkennen, dass nichts passiert ist. Genau
 * wie `maybeGrow`.
 */
export function maybeSpeedUp(progress: Progress): SpeedUpResult {
  if (!isReadyToSpeedUp(progress)) return { progress, from: null, to: null };

  const from = progress.effectiveWpm;
  const to = Math.min(MAX_EFFECTIVE_WPM, from + SPEED_STEP_WPM);

  return {
    progress: { ...progress, effectiveWpm: to, answersSinceSpeedUp: 0 },
    from,
    to,
  };
}

/**
 * Zurueck auf den Startwert -- der eine Weg abwaerts, und er gehoert dem
 * Nutzer (Settings).
 *
 * Die Sperre wird dabei zurueckgesetzt: wer bewusst langsamer anfaengt, soll
 * nicht in zehn Antworten wieder bei der alten Stufe stehen. Steht das Tempo
 * schon am Startwert, kommt der Stand identisch zurueck -- ein Reset, der
 * nichts aendert, soll auch nichts schreiben.
 */
export function resetEffectiveWpm(progress: Progress): Progress {
  if (progress.effectiveWpm === STARTING_EFFECTIVE_WPM && progress.answersSinceSpeedUp === 0) {
    return progress;
  }
  return { ...progress, effectiveWpm: STARTING_EFFECTIVE_WPM, answersSinceSpeedUp: 0 };
}
