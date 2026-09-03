/**
 * Das Theme auf den `<html>`-Wurzelknoten anwenden (Ruling Notion-Log #111).
 *
 * Reine DOM-Arbeit, kein Zustand: `device.theme` in React ist die Wahrheit
 * (`engine/deviceSettings.ts`), dieses Modul zieht nur den DOM und
 * `<meta name="theme-color">` nach. Kein zweiter Ort kennt die sechs
 * Paletten -- die Hex-Werte selbst stehen ausschliesslich in
 * `src/styles.css` (CLAUDE.md 4: eine Wahrheit).
 */

import type { Theme } from '../engine/deviceSettings';

/**
 * `'system'` heisst: kein `data-theme`-Attribut, die Medienabfrage in
 * styles.css entscheidet allein zwischen Paper und Night. Jede ausdrueckliche
 * Wahl setzt das Attribut -- auch 'paper' und 'night', obwohl sie an den
 * System-Werten liegen koennten: ohne das Attribut wuerde eine Wahl von
 * "Paper" auf einem dunkel eingestellten Geraet von der Medienabfrage
 * uebersteuert.
 */
function applyDataTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/**
 * `<meta name="theme-color">` auf das `--paper` des gerade wirksamen Themes
 * ziehen (Punkt 6) -- gelesen aus dem berechneten CSS, nicht aus einer
 * zweiten Farbtabelle in JS. Das funktioniert unveraendert im Modus
 * 'system': `getComputedStyle` liest, was die Medienabfrage gerade
 * entschieden hat, ganz ohne dass dieses Modul weiss, welches der beiden das
 * ist.
 */
export function syncThemeColorMeta(): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta === null) return;

  const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
  if (paper !== '') meta.setAttribute('content', paper);
}

/**
 * Wendet ein Theme an -- ohne animierten Uebergang (Punkt 5).
 *
 * `.theme-switching` (styles.css) setzt `transition: none !important` auf
 * die ganze Seite; der erzwungene Reflow dazwischen sorgt dafuer, dass der
 * Browser die Klasse wirklich anwendet, bevor `data-theme` wechselt, statt
 * beides in einem Rutsch zu batchen. `requestAnimationFrame` nimmt die
 * Klasse danach wieder weg, sobald der naechste Frame gemalt ist -- Hover-
 * und Fokus-Uebergaenge bleiben unberuehrt, sobald sie weg ist.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  root.classList.add('theme-switching');
  // Reflow erzwingen: ohne diesen Lesezugriff koennte der Browser das
  // Hinzufuegen und Entfernen der Klasse mit dem Setzen von data-theme
  // zusammenlegen, und genau der eine Frame ohne Uebergang waere weg.
  void root.offsetHeight;

  applyDataTheme(theme);
  syncThemeColorMeta();

  requestAnimationFrame(() => root.classList.remove('theme-switching'));
}
