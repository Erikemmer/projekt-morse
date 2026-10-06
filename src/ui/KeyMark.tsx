/**
 * Die Bildmarke -- der Taster (1.1 §3) -- als Inline-SVG statt als
 * `<img src="/logo-key.svg">`.
 *
 * Grund: die Datei traegt feste Farben. In den dunklen Themes (Night,
 * Phosphor, Ink; Ruling #111) standen ihre Ink-Balken auf dunklem Grund und
 * verschwanden. Inline erben Balken und Lager `--ink`, der Knopf `--amber`
 * -- 1.1 §3 "Inverse: on ink, bars in paper, knob stays amber" ergibt sich so
 * in jedem Theme von selbst (Review Design/UX C).
 *
 * Geometrie unveraendert aus docs/brand/assets/morse-lab-mark.svg; Farben nur
 * ueber die Klassen in styles.css (CLAUDE.md 2.9: kein Farbliteral).
 * Dekorativ (`aria-hidden`): den Namen sagt immer die Wortmarke daneben.
 */
export function KeyMark({ className, width }: { className: string; width: number }) {
  return (
    <svg
      className={`key-mark ${className}`}
      width={width}
      height={Math.round((width * 98) / 144)}
      viewBox="-12 -12 144 98"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="key-bar" x="0" y="66" width="120" height="8" rx="4" />
      <rect className="key-bar" x="14" y="54" width="92" height="8" rx="4" transform="rotate(13 106 58)" />
      <circle className="key-knob" cx="21" cy="33" r="15" />
      <circle className="key-bearing" cx="111" cy="45" r="3.5" strokeWidth="3" />
    </svg>
  );
}
