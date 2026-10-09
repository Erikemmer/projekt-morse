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

import {
  GROWTH_LOCKOUT_ANSWERS,
  GROWTH_MIN_ATTEMPTS,
  GROWTH_MIN_CHARACTER_ACCURACY,
  GROWTH_WINDOW_ACCURACY,
  isSettling,
  nextCandidate,
} from '../engine/growth';
import { CHARACTER_ORDER } from '../engine/settings';
import {
  dayAccuracy,
  dayFor,
  hitRate,
  RECENT_ANSWER_WINDOW,
  medianReaction,
  recordFor,
  type Progress,
} from '../engine/stats';
import { Ornament } from './Ornament';

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

  return (
    <section className="screen progress-screen" aria-labelledby="progress-heading">
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
          <dt>Next up</dt>
          <dd>{next ?? '— all characters are in'}</dd>
        </div>
        {/*
          Die Zeile "Sessions" ist seit Runde P27 weg (Review §E2,
          Owner-Delegation): sie zaehlte *begonnene* Sitzungen, auch einen
          Reload -- eine Zahl, die steigt, ohne dass etwas gekonnt wurde
          (CLAUDE.md 2.4). Die Sitzungszeile im Training traegt die Nummer weiter.
        */}
      </dl>

      {/*
        Die Wachstumsregel in Saetzen (Review §D2.1, Owner-Delegation Runde P24):
        kein Zaehler, kein "noch 4", die Fensterquote als Naeherung benannt
        (26 von 30 sind 86,7 %). Die Zahlen kommen aus engine/growth.ts.
      */}
      {next !== null && (
        <p className="account-note">
          {`${next} joins when about ${Math.round(GROWTH_WINDOW_ACCURACY * 100)} percent of your last ${RECENT_ANSWER_WINDOW} answers are right and every active character has had at least ${GROWTH_MIN_ATTEMPTS} tries, ${Math.round(GROWTH_MIN_CHARACTER_ACCURACY * 100)} percent of them right — never sooner than ${GROWTH_LOCKOUT_ANSWERS} answers after the last one joined.`}
        </p>
      )}

      {/* Das eine Ornament dieses Screens (Runde P27, Review §B5.1). */}
      <Ornament />

      {practised ? (
        <>
          {/*
            Die beiden Vorbehalte stehen seit Runde P27 *ueber* der Tabelle
            (Review §F2.6, Owner-Delegation): bei 36 Zeilen lasen sie sich
            sonst erst nach der Zahl, die sie einschraenken (CLAUDE.md 2.6).
            Wortlaut unveraendert.
          */}
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
                      {/*
                        Ein Wort, nie Farbe allein (CLAUDE.md §6; Review §D2.2,
                        Owner-Delegation P31): dieses Zeichen haelt das
                        Wachstum gerade auf. Die Zahl daneben bleibt.
                      */}
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
