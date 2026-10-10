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

import { isSettling, nextCandidate } from '../engine/growth';
import { CHARACTER_ORDER } from '../engine/settings';
import { Ornament } from './Ornament';
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

  const next = nextCandidate(progress);
  const active = progress.activeCharacters.length;

  return (
    <section className="screen progress-screen" aria-labelledby="progress-heading">
      {/*
        Seitenmuster aus dem Review (B1): Eyebrow als Ueberschrift, darunter
        eine Aussage in Newsreader, dann Haarlinien. Die Ueberschrift bleibt
        "Progress" (Fokusziel, Screenreader); die Aussage ist der Stand.
      */}
      <h2 id="progress-heading" className="screen-eyebrow" ref={headingRef} tabIndex={-1}>
        Progress
      </h2>
      <p className="screen-statement">
        {active} of {CHARACTER_ORDER.length} characters.
        {/* Vorgezogene Zeichen beim Namen nennen (aus PR #5), sonst bedeutet
            die Zahl nicht dasselbe wie bei jemandem, der sie eruebt hat. */}
        {progress.addedEarly > 0 && (
          <span className="screen-statement-aside">{` · ${progress.addedEarly} added early`}</span>
        )}
      </p>

      {/*
        Was als Naechstes kommt und warum (Review D1b). Die Schwellen sind
        Naeherungen und werden so genannt -- "roughly" -- statt als Zaehler
        (CLAUDE.md 2.2, 2.6). Wortlaut-Entwurf, Fable-Abnahme offen.
      */}
      <p className="screen-note">
        {next === null
          ? 'All characters are in your practice.'
          : `Next up: ${next}. It joins once your recent answers are steady — roughly 85 % right, with no character far behind. `}
        {/* Der Kreis zur Begruendung (aus PR #5): der Learn-Artikel erklaert
            die 85-%-Regel. Ein echter Link aus der App heraus, wie in About. */}
        {next !== null && (
          <a className="text-link" href="/learn/beyond-the-koch-method/">
            Why 85 percent
          </a>
        )}
      </p>

      {/* Das eine Ornament dieses Screens (aus PR #5). */}
      <Ornament />

      <dl className="stat-lines">
        <div className="stat-line">
          <dt>Today</dt>
          <dd>
            {rate === null
              ? '— no answers yet'
              : `${day.attempts} answer${day.attempts === 1 ? '' : 's'} · ${Math.round(rate * 100)}%`}
          </dd>
        </div>
        {/*
          "Sessions" stand hier und zaehlte jedes Oeffnen der App mit
          (`beginSession`) -- eine Zahl, die steigt, ohne dass das Koennen
          steigt (CLAUDE.md 2.4, Review D2). Ersatzlos weg.
        */}
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
                      {/* Ein Wort, nie Farbe allein (CLAUDE.md §6; aus PR #5): dieses
                          Zeichen haelt das Wachstum gerade auf. */}
                      {isSettling(record) && <span className="row-note">settling</span>}
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
          {/*
            Ruling #103c: das Tastenfeld (ab dreizehn aktiven Zeichen) verbucht
            seit dieser Runde keine Reaktionszeit mehr -- die Zahl war dort
            ueberwiegend Suchzeit, keine Kopfhoer-Sicherheit. Der Median-Strich
            fuer ein Zeichen ohne Messung erklaert sich sonst nicht von selbst;
            Wortlaut aus der Aufgabenstellung, nicht umformulieren.
          */}
          <p className="footnote">
            Median from typed answers only — tapping a key includes the time to find it.
          </p>
          {/* Review D3: "Accuracy" zaehlt alle Antworten, das Wachstum nur die
              juengsten. Wortlaut-Entwurf, Fable-Abnahme offen. */}
          <p className="footnote">
            Accuracy counts every answer so far; the set grows on your recent answers.
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
