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
 *
 *   **Eine Ausnahme, und nur eine:** die Einfuehrungskarte des Lernmodus
 *   spielt ihren Ton beim Oeffnen einmal von selbst ab (Produktentscheidung,
 *   Notion-Log #33). Ausgeloest hat ihn trotzdem eine Geste -- der Klick, der
 *   die Karte geoeffnet hat -- und der Play-Kreis daneben bleibt der
 *   selbstgesteuerte Weg. Kein Timer ist im Spiel, und im Training gilt die
 *   Regel unveraendert.
 * - **Waehrend des Tons ist der Bildschirm leer.** Kein Muster, kein Zaehler.
 *   Wer mitlesen kann, zaehlt Elemente statt zu hoeren (CLAUDE.md 2.2). Nach der
 *   Antwort darf das Muster gezeigt werden -- da ist es Erklaerung, keine Kruecke.
 * - **Zeitstempel kommen von `player.currentTime`**, der Uhr des AudioContext,
 *   nie von `Date.now()`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MorsePlayer } from '../audio/player';
import { encodeChar } from '../engine/alphabet';
import {
  advanceEcho,
  answerEcho,
  beginEcho,
  beginEchoPlayback,
  cardHeard,
  createLearnRun,
  currentCharacter,
  echoPromptFinished,
  nextCard,
  type LearnState,
} from '../engine/learn';
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
import {
  CHARACTER_WPM,
  DEFAULT_TONE_HZ,
  ROUNDS_PER_GROUP,
  ROUNDS_PER_SESSION,
  STARTING_EFFECTIVE_WPM,
} from '../engine/settings';
import {
  dayAccuracy,
  dayFor,
  markIntroSeen,
  markIntroduced,
  pendingIntroductions,
  type DayStats,
} from '../engine/stats';
import { computeTiming } from '../engine/timing';
import { Intro } from './Intro';
import { Learn, ReviewPicker } from './Learn';
import { Pattern } from './Pattern';
import { loadProgress, saveProgressNow, saveProgressWhenIdle } from './progressStorage';
import { todayISO } from './today';

const TIMING = computeTiming({
  characterWpm: CHARACTER_WPM,
  effectiveWpm: STARTING_EFFECTIVE_WPM,
});

export function App() {
  const [session, setSession] = useState<SessionState>(() =>
    createSession({
      totalRounds: ROUNDS_PER_SESSION,
      progress: loadProgress(),
      random: Math.random,
      today: todayISO(),
    }),
  );

  /**
   * Der Lernmodus laeuft neben der Sitzung her, nicht in ihr: die Sitzung steht
   * derweil unberuehrt auf Runde 1. `null` heisst, es laeuft gerade keiner.
   */
  const [learn, setLearn] = useState<LearnState | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [tonePlaying, setTonePlaying] = useState(false);

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
  // `introSeen` haengt mit drin, weil der Uebergang von der Einfuehrung in den
  // Loop kein Phasenwechsel ist: die Sitzung stand die ganze Zeit auf 'ready'.
  // Ohne das bliebe der Fokus nach "Begin" auf dem verschwundenen Knopf, also
  // bei <body> -- und man muesste sich neu hineintabben.
  useEffect(() => {
    focusRef.current?.focus();
  }, [session.phase, session.round, session.progress.introSeen]);

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

  /**
   * Ein einzelnes Zeichen abspielen und warten, bis es durch ist.
   *
   * Der Lernmodus misst keine Reaktionszeit -- er braucht das Ende des Tons
   * nur, um weiterzuschalten. Deshalb genuegt hier das Versprechen des
   * Players; die rAF-genaue Uhr aus dem Training ist dafuer nicht noetig.
   */
  const playCharacter = useCallback(async (char: string) => {
    playerRef.current ??= new MorsePlayer();
    const player = playerRef.current;
    await player.resume();
    setTonePlaying(true);
    try {
      await player.play(buildSchedule(char, TIMING), () => {}).finished;
    } finally {
      setTonePlaying(false);
    }
  }, []);

  const answer = useCallback((choice: string) => {
    const at = playerRef.current?.currentTime ?? 0;
    setSession((current) => submitAnswer(current, choice, at));
  }, []);

  const next = useCallback(() => setSession((current) => advance(current, Math.random)), []);

  const finishIntro = useCallback(() => {
    // Sofort schreiben, nicht im Leerlauf: wer direkt nach "Begin" neu laedt,
    // soll die Einfuehrung nicht ein zweites Mal sehen.
    const seen = markIntroSeen(session.progress);
    saveProgressNow(seen);
    setSession((current) => ({ ...current, progress: seen }));
  }, [session.progress]);

  // --- Lernmodus ---------------------------------------------------------

  /**
   * Faellig wird ein Lauf, sobald ein aktives Zeichen noch nie vorgestellt
   * wurde -- beim Erstlauf sind das die sechs Startzeichen, nach der
   * Wachstumsregel das eine neue. Ein Ort, beide Einstiegspunkte.
   *
   * Die Bedingung "Runde 1 und noch nichts gespielt" ist der Grund, warum ein
   * mitten in der Sitzung dazugewachsenes Zeichen die laufende Sitzung nicht
   * unterbricht: seine Karte kommt vor der *naechsten*, so wie vorgesehen.
   */
  const pending = pendingIntroductions(session.progress);
  const learnDue =
    session.progress.introSeen &&
    !reviewing &&
    learn === null &&
    pending.length > 0 &&
    session.phase === 'ready' &&
    session.round === 1;

  useEffect(() => {
    if (!learnDue) return;
    setLearn(
      createLearnRun({
        queue: pending,
        known: session.progress.introducedCharacters,
      }),
    );
  }, [learnDue, pending, session.progress.introducedCharacters]);

  // Ein fertiger Lauf schreibt genau ein Feld: was jetzt vorgestellt ist.
  useEffect(() => {
    if (learn?.phase !== 'done') return;
    const introduced = learn.queue;
    setSession((current) => ({ ...current, progress: markIntroduced(current.progress, introduced) }));
    setLearn(null);
  }, [learn]);

  /** Der Ton einer Karte laeuft beim Oeffnen einmal von selbst. */
  const learnChar = learn === null ? null : currentCharacter(learn);
  const learnOnCard = learn?.phase === 'card';

  useEffect(() => {
    if (!learnOnCard || learnChar === null) return;
    let cancelled = false;
    // Die Karte wurde per Klick erreicht, die Geste fuer den AudioContext ist
    // also gegeben. Schlaegt es trotzdem fehl, bleibt der Play-Kreis -- gehoert
    // wird dann eben auf Zuruf (CLAUDE.md 6: selbstgesteuerte Alternative).
    void playCharacter(learnChar)
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setLearn((current) => (current === null ? null : cardHeard(current)));
      });
    return () => {
      cancelled = true;
    };
  }, [learnOnCard, learnChar, playCharacter]);

  const replayCard = useCallback(() => {
    if (learnChar === null) return;
    void playCharacter(learnChar)
      .catch(() => undefined)
      .then(() => setLearn((current) => (current === null ? null : cardHeard(current))));
  }, [learnChar, playCharacter]);

  const playEcho = useCallback(() => {
    setLearn((current) => (current === null ? null : beginEchoPlayback(current)));
    const prompt = learn?.echoPrompt;
    if (prompt === undefined) return;
    void playCharacter(prompt)
      .catch(() => undefined)
      .then(() => setLearn((current) => (current === null ? null : echoPromptFinished(current))));
  }, [learn?.echoPrompt, playCharacter]);

  const skipLearn = useCallback(() => {
    // "Skip for now" laesst den Durchgang aus, ohne ihn bei jedem Start erneut
    // vorzulegen -- die Zeichen bleiben ueber "Review the sounds" erreichbar.
    const queue = learn?.queue ?? pending;
    setSession((current) => ({ ...current, progress: markIntroduced(current.progress, queue) }));
    setLearn(null);
  }, [learn?.queue, pending]);

  const openReview = useCallback((char: string) => {
    setLearn(
      createLearnRun({
        queue: [char],
        known: session.progress.introducedCharacters,
        requireEcho: false,
      }),
    );
  }, [session.progress.introducedCharacters]);

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
      {/*
        Der Name der App steht fuer Screenreader weiter oben in der Struktur,
        auch wenn der Trainings-Screen ihn nicht mehr zeigt (Ruhe-Mockup: die
        Kopfzeile traegt Sitzung und Runde). Ohne diese Ueberschrift haette die
        Seite gar keine -- und der Einstieg per Ueberschriften-Navigation waere weg.
      */}
      <h1 className="visually-hidden">Morse Lab</h1>
      <p className="visually-hidden">
        An audio drill. You hear one character, then choose what you heard. Nothing is shown
        while the tone plays — recognising the sound is the whole exercise.
      </p>

      {!session.progress.introSeen ? (
        <Intro onDone={finishIntro} />
      ) : learn !== null ? (
        <Learn
          state={learn}
          playing={tonePlaying}
          onPlay={learn.phase === 'card' || learn.phase === 'card-heard' ? replayCard : playEcho}
          onBeginEcho={() => setLearn((c) => (c === null ? null : beginEcho(c)))}
          onNextCard={() => setLearn((c) => (c === null ? null : nextCard(c)))}
          onAnswer={(choice) => setLearn((c) => (c === null ? null : answerEcho(c, choice)))}
          onAdvance={() => setLearn((c) => (c === null ? null : advanceEcho(c, Math.random)))}
          onSkip={reviewing ? undefined : skipLearn}
        />
      ) : reviewing ? (
        <ReviewPicker
          characters={session.pool}
          onPick={openReview}
          onClose={() => setReviewing(false)}
          headingRef={focusTarget}
        />
      ) : session.phase === 'finished' ? (
        <Summary summary={summary} onRestart={restart} headingRef={focusTarget} />
      ) : (
        <>
          <SessionHeader
            sessionNumber={session.progress.sessionsStarted}
            round={session.round}
            totalRounds={session.totalRounds}
            done={session.attempts.length}
          />

          <section className="stage">
            <p className="eyebrow">{eyebrowFor(session.phase)}</p>

            {session.phase === 'feedback' && attempt !== null ? (
              <Reveal char={attempt.char} />
            ) : (
              <PlayCircle
                buttonRef={focusTarget}
                sounding={session.phase === 'listening'}
                replay={session.phase === 'answering'}
                onPlay={play}
              />
            )}

            <p className="question" role="status">
              {session.phase === 'ready' && 'Ready when you are.'}
              {session.phase === 'listening' && 'Listening…'}
              {session.phase === 'answering' && 'Which character did you hear?'}
              {session.phase === 'feedback' && attempt !== null && (
                <Verdict correct={attempt.correct} char={attempt.char} />
              )}
            </p>

            {session.phase === 'feedback' && attempt !== null && (
              <>
                <Pattern pattern={patternOf(attempt.char)} />
                {session.introduced !== null && (
                  <p className="unlock" role="status">
                    The set grows: <strong>{session.introduced}</strong> joins from the next
                    round.
                  </p>
                )}
              </>
            )}
          </section>

          <Answers
            pool={session.pool}
            enabled={session.phase === 'answering'}
            attempt={session.phase === 'feedback' ? attempt : null}
            onAnswer={answer}
          />

          {session.phase === 'feedback' && (
            <div className="actions">
              <button ref={focusTarget} type="button" className="button-next" onClick={next}>
                {session.round >= session.totalRounds ? 'Finish' : 'Next character'}
              </button>
            </div>
          )}

          {/*
            Der leise Weg zurueck zu den Klaengen -- nur auf dem Start-Screen,
            also vor der ersten Runde. Mitten in der Sitzung waere er eine
            Ablenkung, und nach jeder Runde eine Wiederholung.
          */}
          {session.round === 1 && session.phase === 'ready' && (
            <div className="learn-skip">
              <button type="button" className="skip" onClick={() => setReviewing(true)}>
                Review the sounds
              </button>
            </div>
          )}

          <Footer day={dayFor(session.progress, session.today)} done={session.attempts.length} />
        </>
      )}
    </main>
  );
}

/**
 * Die Zeile ueber dem Ton. Sie sagt, was gerade laeuft -- und bleibt dabei
 * ehrlich: "Now playing" steht nur da, solange wirklich etwas spielt
 * (CLAUDE.md 2.6). Die Tonhoehe steht immer daneben; sie ist zugleich der
 * sichtbare Hinweis darauf, dass dieser Modus ueber die Ohren geht.
 */
function eyebrowFor(phase: SessionState['phase']): string {
  const hz = `${DEFAULT_TONE_HZ} Hz`;
  if (phase === 'listening') return `Now playing · ${hz}`;
  if (phase === 'answering') return `Your turn · ${hz}`;
  if (phase === 'feedback') return `Answer · ${hz}`;
  return `Ready · ${hz}`;
}

/** Das Muster eines Zeichens -- nur fuers Feedback, nie waehrend des Tons. */
function patternOf(char: string): string {
  return encodeChar(char) ?? '';
}

/**
 * Kopfzeile: links die laufende Sitzung, rechts die Runde, darunter die
 * Fortschrittslinie.
 *
 * Rechts stehen Runden und keine Restzeit: eine mitlaufende Uhr baut Druck auf,
 * und genau den soll dieses Produkt nicht erzeugen (CLAUDE.md 2.8).
 */
function SessionHeader({
  sessionNumber,
  round,
  totalRounds,
  done,
}: {
  sessionNumber: number;
  round: number;
  totalRounds: number;
  done: number;
}) {
  return (
    <header className="masthead">
      <div className="masthead-row">
        <span>Session {sessionNumber}</span>
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

/**
 * Der Play-Kreis. Ein Umriss, kein gefuellter Knopf -- das Mockup will hier
 * Ruhe, und die Flaeche von 88 px traegt die Zielgroesse locker (WCAG 2.5.5).
 */
function PlayCircle({
  buttonRef,
  sounding,
  replay,
  onPlay,
}: {
  buttonRef: (element: HTMLElement | null) => void;
  sounding: boolean;
  replay: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="play"
      data-sounding={sounding}
      onClick={onPlay}
      aria-label={replay ? 'Play the character again' : 'Play the character'}
    >
      <span className="play-mark" aria-hidden="true" />
    </button>
  );
}

/**
 * Fusszeile: links, was heute zusammenkam, rechts die Sitzung als Punkte.
 *
 * "Today" meint wirklich heute -- der Eimer dahinter faengt bei Datumswechsel
 * neu an (engine/stats.ts). Ohne Antworten steht hier ein Strich statt einer
 * erfundenen Null (CLAUDE.md 2.6).
 */
function Footer({ day, done }: { day: DayStats; done: number }) {
  const accuracy = dayAccuracy(day);
  const characters = day.characters.length;

  return (
    <footer className="footer">
      <p className="footer-stats">
        {accuracy === null
          ? 'Today — no answers yet'
          : `Today ${Math.round(accuracy * 100)}% · ${characters} character${characters === 1 ? '' : 's'}`}
      </p>
      <GroupDots done={done} />
    </footer>
  );
}

/**
 * Die Sitzung in Gruppen statt in einzelnen Runden: zwanzig Punkte waeren eine
 * Perlenkette, fuenf sind ein Blick. Ein Punkt steht fuer ROUNDS_PER_GROUP
 * Runden und faerbt sich, wenn die Gruppe durch ist.
 */
function GroupDots({ done }: { done: number }) {
  const groups = Math.ceil(ROUNDS_PER_SESSION / ROUNDS_PER_GROUP);

  return (
    <span className="dots" aria-hidden="true">
      {Array.from({ length: groups }, (_, index) => (
        <span
          key={index}
          className="dot"
          data-state={done >= (index + 1) * ROUNDS_PER_GROUP ? 'done' : 'open'}
        />
      ))}
    </span>
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

/** Die Aufloesung: das Zeichen, gross. Erst *nach* der Antwort sichtbar. */
function Reveal({ char }: { char: string }) {
  return <p className="reveal">{char}</p>;
}

function Answers({
  pool,
  enabled,
  attempt,
  onAnswer,
}: {
  pool: readonly string[];
  enabled: boolean;
  attempt: { char: string; answer: string; correct: boolean } | null;
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
            /* Amber nur auf der richtigen Antwort, und nur wenn danebengegriffen
               wurde -- sonst bleibt es beim ruhigen ink-Haekchen (1.1 §4). */
            data-tone={mark === 'correct' && attempt !== null && !attempt.correct ? 'amber' : undefined}
            disabled={!enabled}
            onClick={() => onAnswer(char)}
          >
            <span aria-hidden="true">{char}</span>
            {mark !== undefined && (
              <span className="answer-mark" aria-hidden="true">
                {mark === 'correct' ? '✓' : '✗'}
              </span>
            )}
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

      {/*
        Der Hinweis auf den Offline-Betrieb stand bisher in der Fusszeile des
        Trainings-Screens. Das Ruhe-Mockup belegt diese Zeile mit dem Tagesstand,
        und geloescht werden sollte der Hinweis nicht (er ist in 435f926
        ausdruecklich als bleibend beschlossen) -- also steht er jetzt hier, wo
        ihn am Ende jeder Sitzung ohnehin jeder liest.
      */}
      <p className="note">
        Response time is measured from the end of the tone, over correct answers only. Read it as a
        rough indicator of confidence, not a measurement of it — it also contains how fast you
        found the button. Works offline once loaded.
      </p>

      <div className="actions">
        <button type="button" className="button-primary" onClick={onRestart}>
          Practise again
        </button>
      </div>
    </section>
  );
}
