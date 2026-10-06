/**
 * Die Kopfzeile eines laufenden Uebungs-Screens: links der Lauf, rechts die
 * Runde, darunter die Fortschrittslinie.
 *
 * Rechts stehen Runden und keine Restzeit: eine mitlaufende Uhr baut Druck auf,
 * und genau den soll dieses Produkt nicht erzeugen (CLAUDE.md 2.8).
 *
 * Sie stand bis Runde F2 in `App.tsx` und zog mit dem Wort-Training als
 * zweitem Uebungs-Screen hier heraus. **Seit Ruling #87 ist sie wieder bei
 * einem Nutzer**: der Wort-Modus hat keine Runden mehr und traegt seine eigene,
 * kuerzere Kopfzeile (`ui/Words.tsx`). Sie bleibt trotzdem eine eigene Datei --
 * Training und Speed round teilen sie sich, und an der
 * `role="progressbar"`-Auszeichnung haengt Barrierefreiheit, die nicht an zwei
 * Stellen auseinanderlaufen soll. Die Beschriftung der Linie ist mit dem
 * zweiten Nutzer wieder fest geworden: eine Einstellmoeglichkeit ohne
 * Einsteller waere nur Oberflaeche.
 */

export function SessionHeader({
  label,
  round,
  totalRounds,
  done,
  onEnd,
}: {
  /** Was links steht: "Practice" oder "Speed round". */
  label: string;
  round: number;
  totalRounds: number;
  /** Wie viele Runden beantwortet sind -- der Stand der Linie. */
  done: number;
  /**
   * Die Sitzung beenden, oder undefined, solange es nichts zu beenden gibt.
   * Mobil verschwindet das Menue waehrend einer Runde; ohne diesen Weg kam
   * man nur nach 20 Runden wieder heraus (Review A3). Kein Druck, kein
   * Verlust: jede Antwort ist schon verbucht, nur der Streak-Tag faellt erst
   * mit einer beendeten Sitzung.
   */
  onEnd?: () => void;
}) {
  return (
    <header className="masthead">
      <div className="masthead-row">
        {onEnd === undefined ? (
          <span>{label}</span>
        ) : (
          <button type="button" className="masthead-end" onClick={onEnd}>
            End session
          </button>
        )}
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
        aria-label="Rounds answered"
      >
        <div className="progress-fill" style={{ width: `${(done / totalRounds) * 100}%` }} />
      </div>
    </header>
  );
}
