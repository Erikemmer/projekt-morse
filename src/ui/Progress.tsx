/**
 * Der Progress-Screen: was heute zusammenkam, der Gesamtstand, darunter eine
 * ruhige Tabelle pro aktivem Zeichen.
 *
 * Rendert nur — jede Zahl kommt aus `engine/stats.ts` (CLAUDE.md 4: die UI
 * rechnet nicht). Zwei Regeln aus CLAUDE.md 2.6 tragen die Darstellung:
 *
 * - **Kein Wert wird erfunden.** Wo es nichts zu berichten gibt (keine Quote
 *   ohne Versuche, kein Median ohne richtige Antwort), steht ein Strich —
 *   dieselbe Konvention wie in der Fußzeile des Trainings.
 * - **Die Reaktionszeit ist ein Näherungswert** und wird als solcher benannt:
 *   die Fußnotenzeile unter der Tabelle ist Teil der Spezifikation dieser
 *   Runde, keine Deko.
 *
 * Keine Balken, keine Gauges, keine Medaillen (1.1 §7: "plain tabular numbers
 * with labels, separated by hairlines"). Diese View kommt ohne Amber aus.
 */

import { CHARACTER_ORDER } from '../engine/settings';
import {
  dayAccuracy,
  dayFor,
  hitRate,
  medianReaction,
  recordFor,
  type Progress,
} from '../engine/stats';

export function ProgressScreen({
  progress,
  today,
  headingRef,
}: {
  progress: Progress;
  today: string;
  headingRef: (element: HTMLElement | null) => void;
}) {
  const day = dayFor(progress, today);
  const rate = dayAccuracy(day);
  // Der leere Zustand meint die Tabelle: wer noch nie geantwortet hat, sieht
  // statt lauter Strichen eine Zeile, die sagt, was hier erscheinen wird.
  const practised = progress.activeCharacters.some((char) => recordFor(progress, char).attempts > 0);

  return (
    <section className="screen" aria-labelledby="progress-heading">
      <h2 id="progress-heading" className="screen-heading" ref={headingRef} tabIndex={-1}>
        Progress
      </h2>

      <dl className="stat-lines">
        <div className="stat-line">
          <dt>Today</dt>
          <dd>
            {rate === null
              ? '— no answers yet'
              : `${day.attempts} answer${day.attempts === 1 ? '' : 's'} · ${Math.round(rate * 100)}%`}
          </dd>
        </div>
        <div className="stat-line">
          <dt>Characters</dt>
          <dd>
            {progress.activeCharacters.length} of {CHARACTER_ORDER.length} active
          </dd>
        </div>
        <div className="stat-line">
          <dt>Sessions</dt>
          <dd>{progress.sessionsStarted}</dd>
        </div>
      </dl>

      {practised ? (
        <>
          <table className="char-table">
            <thead>
              <tr>
                <th scope="col">Character</th>
                <th scope="col">Attempts</th>
                <th scope="col">Accuracy</th>
                <th scope="col">Median</th>
              </tr>
            </thead>
            <tbody>
              {progress.activeCharacters.map((char) => {
                const record = recordFor(progress, char);
                const accuracy = hitRate(record);
                const median = medianReaction(record);
                return (
                  <tr key={char}>
                    <th scope="row" className="char-cell">
                      {char}
                    </th>
                    <td>{record.attempts}</td>
                    <td>{accuracy === null ? '—' : `${Math.round(accuracy * 100)}%`}</td>
                    <td>{median === null ? '—' : `${median.toFixed(1)} s`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Wortlaut aus der Aufgabenstellung dieser Runde — nicht umformulieren. */}
          <p className="footnote">
            Reaction time is an approximation of confidence — it includes finding the key.
          </p>
        </>
      ) : (
        <p className="empty-note">
          Practise a few rounds and every active character will appear here, with attempts,
          accuracy and reaction time.
        </p>
      )}
    </section>
  );
}
