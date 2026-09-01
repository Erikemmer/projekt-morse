/**
 * Das Muster eines Zeichens als Form: Punkte sind Kreise, Striche sind Pillen.
 *
 * Stand bis eben in App.tsx. Der Lernmodus braucht dieselbe Darstellung -- das
 * ist der zweite Bedarf, und erst der rechtfertigt das Herausziehen
 * (CLAUDE.md 4). Zwei Kopien, die auseinanderlaufen, waeren hier schlimmer als
 * eine Datei mehr.
 *
 * **Wann das Muster gezeigt werden darf, entscheidet der Aufrufer, nicht diese
 * Komponente.** Im Training erst nach der Antwort, auf einer Einfuehrungskarte
 * erst nach dem ersten Anhoeren. Beides steht an der jeweiligen Stelle.
 */

/** Vorlesbare Form eines Musters, fuer Screenreader statt '.-' als Satzzeichen. */
export function spellPattern(pattern: string): string {
  return [...pattern].map((element) => (element === '-' ? 'dah' : 'dit')).join(' ');
}

export function Pattern({ pattern }: { pattern: string }) {
  return (
    <p className="pattern">
      <span className="pattern-row" aria-hidden="true">
        {[...pattern].map((element, index) => (
          <span key={index} className="pattern-element" data-kind={element === '-' ? 'dah' : 'dit'} />
        ))}
      </span>
      <span className="visually-hidden">{spellPattern(pattern)}</span>
    </p>
  );
}
