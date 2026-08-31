/**
 * Der Kern-Lernloop: hoeren -> tippen -> Feedback.
 *
 * Diese Komponente rechnet nichts. Sie spielt ab, nimmt Ereignisse entgegen und
 * rendert, was der Zustandsautomat in `engine/session.ts` daraus macht. Wer eine
 * Regel des Loops sucht (wann zaehlt eine Wiederholung, wie lang war die
 * Reaktion), findet sie dort -- nicht hier.
 *
 * Drei Dinge, die im Code sonst wie Zufall aussehen:
 *
 * - **Nichts laeuft von allein.** Kein Timer startet einen Ton, nichts springt
 *   weiter. Jede Wiedergabe ist eine Nutzergeste. Damit ist die zeitgesteuerte
 *   Darbietung von vornherein auch die selbstgesteuerte (CLAUDE.md 6) -- und
 *   nebenbei die Bedingung dafuer, dass Browser ueberhaupt Ton erlauben.
 * - **Waehrend des Tons ist der Bildschirm leer.** Kein Muster, kein Zaehler.
 *   Wer mitlesen kann, zaehlt Elemente statt zu hoeren (CLAUDE.md 2.2). Nach der
 *   Antwort darf das Muster gezeigt werden -- da ist es Erklaerung, keine Kruecke.
 * - **Zeitstempel kommen von `player.currentTime`**, der Uhr des AudioContext,
 *   nie von `Date.now()`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MorsePlayer } from '../audio/player';
import { buildSchedule } from '../engine/schedule';
import {
  advance,
  beginPlayback,
  createSession,
  promptFinished,
  submitAnswer,
  summarize,
  type SessionState,
} from '../engine/session';
import { CHARACTER_WPM, ROUNDS_PER_SESSION, STARTING_EFFECTIVE_WPM } from '../engine/settings';
import { computeTiming } from '../engine/timing';
import { loadProgress, saveProgressWhenIdle } from './progressStorage';
import { todayISO } from './today';

const TIMING = computeTiming({
  characterWpm: CHARACTER_WPM,
  effectiveWpm: STARTING_EFFECTIVE_WPM,
});

/** Vorlesbare Form eines Musters, fuer Screenreader statt '.-' als Satzzeichen. */
function spellPattern(pattern: string): string {
  return [...pattern].map((element) => (element === '-' ? 'dah' : 'dit')).join(' ');
}

export function App() {
  const [session, setSession] = useState<SessionState>(() =>
    createSession({
      totalRounds: ROUNDS_PER_SESSION,
      progress: loadProgress(),
      random: Math.random,
      today: todayISO(),
    }),
  );

  const playerRef = useRef<MorsePlayer | null>(null);
  /** Das Element, das in der aktuellen Phase den Fokus tragen soll. */
  const focusRef = useRef<HTMLElement | null>(null);
  /**
   * Als Callback-Ref, weil das Ziel je nach Phase eine Taste oder eine
   * Ueberschrift ist -- ein typisiertes RefObject passte immer nur auf eines.
   */
  const focusTarget = useCallback((element: HTMLElement | null) => {
    focusRef.current = element;
  }, []);

  const schedule = useMemo(() => buildSchedule(session.prompt, TIMING), [session.prompt]);

  // Beim Verlassen der Seite nicht weiterpiepen.
  useEffect(() => () => playerRef.current?.stop(), []);

  // Fortschritt sichern, sobald er sich geaendert hat -- ausserhalb des Eingabepfads.
  useEffect(() => saveProgressWhenIdle(session.progress), [session.progress]);

  // Bei jedem Phasenwechsel wandert der Fokus auf das, was jetzt dran ist.
  //
  // Nicht nur Komfort: waehrend des Tons ist die Taste deaktiviert, und ein
  // deaktiviertes Element verliert den Fokus an <body>. Ohne dieses Nachziehen
  // muesste sich jemand, der mit der Tastatur arbeitet, nach jedem Ton neu
  // hineintabben. Ein deaktiviertes Ziel nimmt den Fokus nicht an -- der
  // naechste Wechsel holt ihn dann zurueck.
  useEffect(() => {
    focusRef.current?.focus();
  }, [session.phase, session.round]);

  const play = useCallback(async () => {
    playerRef.current ??= new MorsePlayer();
    const player = playerRef.current;
    // Muss in der Klick-Geste passieren, sonst bleibt Audio stumm.
    await player.resume();

    const handle = player.play(schedule, (elapsed) => {
      // Der Ton ist durch, sobald die Audio-Uhr das Ende der Zeitachse erreicht.
      // Das kommt aus dem rAF-Takt, ist also auf ~16 ms genau -- und unabhaengig
      // davon, wann der Planer das Ende bemerkt.
      if (elapsed >= schedule.duration) setSession(promptFinished);
    });
    setSession((current) => beginPlayback(current, handle.endTime));

    // Rueckfall, falls es keinen rAF-Takt gab (Tab im Hintergrund).
    await handle.finished;
    setSession(promptFinished);
  }, [schedule]);

  const answer = useCallback((choice: string) => {
    const at = playerRef.current?.currentTime ?? 0;
    setSession((current) => submitAnswer(current, choice, at));
  }, []);

  const next = useCallback(() => setSession((current) => advance(current, Math.random)), []);

  const restart = useCallback(() => {
    setSession((current) =>
      createSession({
        totalRounds: current.totalRounds,
        progress: current.progress,
        random: Math.random,
        today: todayISO(),
      }),
    );
  }, []);

  // Tippen statt Zielen: die Buchstaben des Zeichensatzes beantworten direkt.
  useEffect(() => {
    if (session.phase !== 'answering') return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toUpperCase();
      if (!session.pool.includes(key)) return;
      event.preventDefault();
      answer(key);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session.phase, session.pool, answer]);

  const attempt = session.lastAttempt;
  const summary = summarize(session);

  return (
    <main className="shell">
      <header className="masthead">
        <h1>Projekt Morse</h1>
        <p className="lede">
          An audio drill. You hear one character, then choose what you heard. Nothing is shown
          while the tone plays — recognising the sound is the whole exercise.
        </p>
      </header>

      {session.phase === 'finished' ? (
        <Summary summary={summary} onRestart={restart} headingRef={focusTarget} />
      ) : (
        <>
          <ProgressLine done={session.attempts.length} total={session.totalRounds} />

          <section className="stage">
            <p className="status" role="status">
              {session.phase === 'ready' && 'Ready when you are.'}
              {session.phase === 'listening' && 'Listening…'}
              {session.phase === 'answering' && 'Which character was that?'}
              {session.phase === 'feedback' && attempt !== null && (
                <Verdict correct={attempt.correct} char={attempt.char} />
              )}
            </p>

            {session.phase === 'feedback' && attempt !== null ? (
              <>
                <Reveal char={attempt.char} pattern={schedule.characters[0]?.pattern ?? ''} />
                {session.introduced !== null && (
                  <p className="unlock" role="status">
                    The set grows: <strong>{session.introduced}</strong> joins from the next
                    round.
                  </p>
                )}
              </>
            ) : (
              <p className="prompt prompt-blank" aria-hidden="true">
                ·
              </p>
            )}

            <div className="actions">
              {session.phase === 'feedback' ? (
                <button ref={focusTarget} type="button" className="button-primary" onClick={next}>
                  {session.round >= session.totalRounds ? 'Finish' : 'Next character'}
                </button>
              ) : (
                <button
                  ref={focusTarget}
                  type="button"
                  className="button-primary"
                  onClick={play}
                  disabled={session.phase === 'listening'}
                >
                  {session.phase === 'answering' ? 'Play again' : 'Play'}
                </button>
              )}
            </div>
          </section>

          <Answers
            pool={session.pool}
            enabled={session.phase === 'answering'}
            attempt={session.phase === 'feedback' ? attempt : null}
            onAnswer={answer}
          />

          <p className="note">
            Play as often as you like — nothing here is on a clock, and replays are recorded but
            never penalised. {CHARACTER_WPM} WPM characters, {STARTING_EFFECTIVE_WPM} WPM overall.
            Works offline once loaded.
          </p>
        </>
      )}
    </main>
  );
}

function ProgressLine({ done, total }: { done: number; total: number }) {
  const steps = Array.from({ length: total }, (_, index) => index);

  return (
    <div className="progress">
      <div className="progress-track" aria-hidden="true">
        {steps.map((index) => (
          <span
            key={index}
            className="progress-step"
            data-state={index < done ? 'done' : index === done ? 'current' : 'todo'}
          />
        ))}
      </div>
      <p className="progress-label">
        Round {Math.min(done + 1, total)} of {total}
      </p>
    </div>
  );
}

/**
 * Richtig oder daneben -- an Zeichen und Wort erkennbar, nicht an der Farbe
 * (CLAUDE.md 6). Die Symbole sind fuer Screenreader ausgeblendet, weil der
 * Satz daneben dasselbe sagt.
 */
function Verdict({ correct, char }: { correct: boolean; char: string }) {
  return (
    <span className="verdict" data-kind={correct ? 'hit' : 'miss'}>
      <span className="verdict-mark" aria-hidden="true">
        {correct ? '✓' : '✗'}
      </span>
      <span>{correct ? 'Correct.' : `Not quite — that was ${char}.`}</span>
    </span>
  );
}

/** Die Aufloesung: Zeichen und Muster. Erst *nach* der Antwort sichtbar. */
function Reveal({ char, pattern }: { char: string; pattern: string }) {
  return (
    <div className="reveal">
      <p className="prompt">{char}</p>
      <p className="prompt-code">
        <span aria-hidden="true">{pattern}</span>
        <span className="visually-hidden">{spellPattern(pattern)}</span>
      </p>
    </div>
  );
}

function Answers({
  pool,
  enabled,
  attempt,
  onAnswer,
}: {
  pool: readonly string[];
  enabled: boolean;
  attempt: { char: string; answer: string } | null;
  onAnswer: (choice: string) => void;
}) {
  return (
    <div className="answers">
      {pool.map((char) => {
        const mark =
          attempt === null
            ? undefined
            : char === attempt.char
              ? 'correct'
              : char === attempt.answer
                ? 'wrong'
                : undefined;

        return (
          <button
            key={char}
            type="button"
            className="answer"
            data-mark={mark}
            disabled={!enabled}
            onClick={() => onAnswer(char)}
          >
            <span aria-hidden="true">{char}</span>
            <span className="visually-hidden">
              {char}
              {mark === 'correct' && ' — this was the character'}
              {mark === 'wrong' && ' — your answer, not the character'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Summary({
  summary,
  onRestart,
  headingRef,
}: {
  summary: ReturnType<typeof summarize>;
  onRestart: () => void;
  headingRef: (element: HTMLElement | null) => void;
}) {
  return (
    <section className="stage" aria-labelledby="summary-heading">
      {/*
        Der Fokus landet am Ende auf der Ueberschrift, nicht auf der Taste: so
        hoert man erst, dass die Sitzung vorbei ist, und dann das Ergebnis --
        statt unvermittelt auf "Practise again" zu stehen.
      */}
      <h2
        id="summary-heading"
        className="summary-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        Session done
      </h2>

      <dl className="facts">
        <div>
          <dt>Correct</dt>
          <dd>
            {summary.hits} of {summary.rounds}
          </dd>
        </div>
        <div>
          <dt>Median response</dt>
          <dd>
            {summary.medianReactionSeconds === null
              ? '—'
              : `${summary.medianReactionSeconds.toFixed(1)} s`}
          </dd>
        </div>
      </dl>

      <p className="note">
        Response time is measured from the end of the tone, over correct answers only. Read it as a
        rough indicator of confidence, not a measurement of it — it also contains how fast you
        found the button.
      </p>

      <div className="actions">
        <button type="button" className="button-primary" onClick={onRestart}>
          Practise again
        </button>
      </div>
    </section>
  );
}
