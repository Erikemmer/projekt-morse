/**
 * Haken und Kreuz als Linien-Icons (Guidelines 1.1 §8: 1,5 px Strich, runde
 * Enden, 24er Raster, nur Linie, nichts gefuellt).
 *
 * Warum kein Schriftzeichen: `✓` und `✗` stehen in keiner Markenschrift, und
 * `✗` auch upstream in keiner (FINDINGS #8). Aus dem Fallback-Stack kaemen
 * Haken und Kreuz je System in anderer Hand und Strichstaerke. Ein SVG zeichnet
 * ueberall gleich; beide Zeichen kommen aus derselben Hand.
 * Entscheidung: docs/PLAN-FINDINGS.md, "D1 -- Entscheidung".
 *
 * Die Groesse ist `1em`: die umgebende Regel (`font-size`) bestimmt sie wie vor
 * dem Umbau beim Zeichen. `non-scaling-stroke` haelt den Strich bei jeder
 * Groesse auf 1,5 px, statt mit dem Raster zu schrumpfen. Farbe nur ueber
 * `currentColor` -- die Marke erbt, was der Ort ihr gibt.
 *
 * `aria-hidden`: die Marke ist nie die einzige Auskunft, der Satz daneben (oder
 * der verborgene Text am Knopf) sagt dasselbe. Haken und Kreuz unterscheiden
 * sich in der Form, nicht in der Farbe (CLAUDE.md §6).
 */
export function Mark({ kind }: { kind: 'hit' | 'miss' }) {
  return (
    <svg
      className="mark"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={kind === 'hit' ? 'M5 12.5l4.5 4.5L19 7' : 'M6 6l12 12M18 6L6 18'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
