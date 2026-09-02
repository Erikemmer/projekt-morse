/**
 * Die Kopfzeile eines laufenden Uebungs-Screens: links der Lauf, rechts die
 * Runde, darunter die Fortschrittslinie.
 *
 * Rechts stehen Runden und keine Restzeit: eine mitlaufende Uhr baut Druck auf,
 * und genau den soll dieses Produkt nicht erzeugen (CLAUDE.md 2.8).
 *
 * Sie stand bis Runde F2 in `App.tsx`. Mit dem Wort-Training (Ruling #83) gibt
 * es einen zweiten Uebungs-Screen, der dieselbe Zeile braucht -- **das ist der
 * zweite Bedarf, bei dem verallgemeinert wird** (CLAUDE.md 4). Zwei Kopien
 * derselben `role="progressbar"`-Auszeichnung waeren die schlechtere Wahl: an
 * ihr haengt Barrierefreiheit, und sie soll nicht an zwei Stellen auseinander
 * laufen.
 */

export function SessionHeader({
  label,
  round,
  totalRounds,
  done,
  progressLabel = 'Rounds answered',
}: {
  /** Was links steht: "Session 12", "Speed round", "Words & groups". */
  label: string;
  round: number;
  totalRounds: number;
  /** Wie viele Runden beantwortet sind -- der Stand der Linie. */
  done: number;
  /** Beschriftung der Fortschrittslinie fuer Screenreader. */
  progressLabel?: string;
}) {
  return (
    <header className="masthead">
      <div className="masthead-row">
        <span>{label}</span>
        <span>
          Round {Math.min(round, totalRounds)} / {totalRounds}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalRounds}
        aria-valuenow={done}
        aria-label={progressLabel}
      >
        <div className="progress-fill" style={{ width: `${(done / totalRounds) * 100}%` }} />
      </div>
    </header>
  );
}
