/**
 * Der Lernmodus auf dem Bildschirm: Einfuehrungskarte und Echo-Check.
 *
 * Rechnet nichts. Was auf welchen Zustand folgt, steht in `engine/learn.ts`;
 * hier wird gerendert, abgespielt und gemeldet (CLAUDE.md 4).
 */

import { useEffect, useRef } from 'react';

import { encodeChar } from '../engine/alphabet';
import {
  ECHO_ROUNDS,
  answerPool,
  currentCharacter,
  type LearnState,
} from '../engine/learn';
import { DEFAULT_TONE_HZ } from '../engine/settings';
import { Pattern } from './Pattern';

export function Learn({
  state,
  playing,
  onPlay,
  onBeginEcho,
  onNextCard,
  onAnswer,
  onAdvance,
  onSkip,
}: {
  state: LearnState;
  playing: boolean;
  onPlay: () => void;
  onBeginEcho: () => void;
  onNextCard: () => void;
  onAnswer: (choice: string) => void;
  onAdvance: () => void;
  /** Nur auf dem Erstlauf-Durchgang gesetzt; beim Wiederholen gibt es nichts zu ueberspringen. */
  onSkip?: () => void;
}) {
  const char = currentCharacter(state);
  const onCard = state.phase === 'card' || state.phase === 'card-heard';
  const focusRef = useRef<HTMLElement | null>(null);

  // Bei jedem Karten- und Phasenwechsel wandert der Fokus auf das, was jetzt
  // dran ist (CLAUDE.md 6). Waehrend der Ton laeuft, ist die Taste deaktiviert
  // und nimmt ihn nicht an -- der naechste Wechsel holt ihn zurueck.
  useEffect(() => {
    focusRef.current?.focus();
  }, [state.index, state.phase]);

  return (
    <section className="learn" aria-labelledby="learn-heading">
      {/*
        Der Kartenwechsel wird angesagt, nicht nur gezeigt: wer nicht auf den
        Bildschirm sieht, erfaehrt sonst nicht, dass ein neues Zeichen dran ist.
      */}
      <p className="eyebrow" aria-live="polite">
        {onCard
          ? `New sound · ${state.index + 1} of ${state.queue.length}`
          : `Check · ${Math.min(state.echoDone + 1, ECHO_ROUNDS)} of ${ECHO_ROUNDS}`}
      </p>

      {onCard ? (
        <Card
          char={char}
          heard={state.phase === 'card-heard'}
          playing={playing}
          requireEcho={state.requireEcho}
          buttonRef={focusRef}
          onPlay={onPlay}
          onContinue={state.requireEcho ? onBeginEcho : onNextCard}
        />
      ) : (
        <Echo state={state} playing={playing} buttonRef={focusRef} onPlay={onPlay} onAnswer={onAnswer} onAdvance={onAdvance} />
      )}

      {onSkip !== undefined && (
        <div className="learn-skip">
          <button type="button" className="skip" onClick={onSkip}>
            Skip
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Die Einfuehrungskarte: Buchstabe, Ton, danach das Muster.
 *
 * **Hier steht die eine bewusste Ausnahme von CLAUDE.md 2.2.** Die Regel sagt:
 * keine Visualisierung von Punkten und Strichen waehrend des Hoerens, weil sie
 * zum Mitzaehlen einlaedt statt zum Hoeren. Auf dieser Karte -- und nur hier --
 * ist das Muster nach dem ersten Anhoeren sichtbar und bleibt es auch beim
 * Wiederholen: der Erstkontakt braucht die Zuordnung von Klang zu Zeichen,
 * sonst raet ein Anfaenger die ersten Runden. Produktentscheidung,
 * Notion-Log #33.
 *
 * Die Grenze der Ausnahme ist scharf: im Training bleibt der Bildschirm
 * waehrend des Tons leer, und der Echo-Check unten haelt sich daran.
 */
function Card({
  char,
  heard,
  playing,
  requireEcho,
  buttonRef,
  onPlay,
  onContinue,
}: {
  char: string;
  heard: boolean;
  playing: boolean;
  requireEcho: boolean;
  buttonRef: { current: HTMLElement | null };
  onPlay: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div className="stage learn-stage">
        <h2 id="learn-heading" className="learn-char">
          {char}
        </h2>

        <button
          type="button"
          className="play"
          data-sounding={playing}
          onClick={onPlay}
          aria-label={`Play ${char} again`}
        >
          <span className="play-mark" aria-hidden="true" />
        </button>

        {heard ? (
          <Pattern pattern={encodeChar(char) ?? ''} />
        ) : (
          <p className="pattern pattern-blank" aria-hidden="true" />
        )}

        <p className="learn-copy">
          This is {char}. Listen a few times, then try it.
        </p>
      </div>

      {/*
        Erst nach dem Ton -- und dann sichtbar statt deaktiviert: 1.1 §7 sagt
        "hide what can't be used", und solange der Ton der Karte laeuft, ist
        der Play-Kreis amber. Ein gefuellter Amber-Primary daneben waere das
        zweite Amber der View (1.1 §4).
      */}
      {heard && (
        <div className="actions">
          <button
            ref={buttonRef as React.RefObject<HTMLButtonElement>}
            type="button"
            className="button-go"
            onClick={onContinue}
          >
            {requireEcho ? 'Try it' : 'Done'}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Der Echo-Check: hoeren, tippen, Feedback -- nach den normalen Uebungsregeln.
 * Waehrend des Tons ist nichts zu sehen (CLAUDE.md 2.2); das Muster kommt erst
 * mit der Aufloesung.
 */
function Echo({
  state,
  playing,
  buttonRef,
  onPlay,
  onAnswer,
  onAdvance,
}: {
  state: LearnState;
  playing: boolean;
  buttonRef: { current: HTMLElement | null };
  onPlay: () => void;
  onAnswer: (choice: string) => void;
  onAdvance: () => void;
}) {
  const pool = answerPool(state);
  const attempt = state.phase === 'echo-feedback' ? state.lastEcho : null;

  return (
    <>
      <div className="stage learn-stage">
        <p className="eyebrow">{`${playing ? 'Now playing' : 'Your turn'} · ${DEFAULT_TONE_HZ} Hz`}</p>

        {attempt !== null ? (
          <>
            <p className="reveal">{attempt.char}</p>
            <Pattern pattern={encodeChar(attempt.char) ?? ''} />
          </>
        ) : (
          <button
            ref={state.phase !== 'echo-feedback' ? (buttonRef as React.RefObject<HTMLButtonElement>) : undefined}
            type="button"
            className="play"
            data-sounding={playing}
            onClick={onPlay}
            aria-label="Play the character"
          >
            <span className="play-mark" aria-hidden="true" />
          </button>
        )}

        <p className="question" role="status">
          {state.phase === 'echo-ready' && 'Ready when you are.'}
          {state.phase === 'echo-listening' && 'Listening…'}
          {state.phase === 'echo-answering' && 'Which character did you hear?'}
          {attempt !== null && (
            <span className="verdict" data-kind={attempt.correct ? 'hit' : 'miss'}>
              <span className="verdict-mark" aria-hidden="true">
                {attempt.correct ? '✓' : '✗'}
              </span>
              <span>{attempt.correct ? 'Correct.' : `Not quite — that was ${attempt.char}.`}</span>
            </span>
          )}
        </p>
      </div>

      <div className="answers">
        {pool.map((option) => {
          const mark =
            attempt === null
              ? undefined
              : option === attempt.char
                ? 'correct'
                : option === attempt.answer
                  ? 'wrong'
                  : undefined;

          return (
            <button
              key={option}
              type="button"
              className="answer"
              data-mark={mark}
              data-tone={mark === 'correct' && attempt !== null && !attempt.correct ? 'amber' : undefined}
              disabled={state.phase !== 'echo-answering'}
              onClick={() => onAnswer(option)}
            >
              <span aria-hidden="true">{option}</span>
              {mark !== undefined && (
                <span className="answer-mark" aria-hidden="true">
                  {mark === 'correct' ? '✓' : '✗'}
                </span>
              )}
              <span className="visually-hidden">
                {option}
                {mark === 'correct' && ' — this was the character'}
                {mark === 'wrong' && ' — your answer, not the character'}
              </span>
            </button>
          );
        })}
      </div>

      {attempt !== null && (
        <div className="actions">
          <button
            ref={buttonRef as React.RefObject<HTMLButtonElement>}
            type="button"
            className="button-next"
            onClick={onAdvance}
          >
            {state.echoDone >= ECHO_ROUNDS ? 'Next sound' : 'Next'}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Das freie Wiederholen: ein Gitter der aktiven Zeichen im Stil der
 * Antwort-Tasten. Ein Tipp oeffnet die Karte -- ohne Pflicht-Echo-Check.
 */
export function ReviewPicker({
  characters,
  onPick,
  onClose,
  headingRef,
}: {
  characters: readonly string[];
  onPick: (char: string) => void;
  onClose: () => void;
  headingRef: (element: HTMLElement | null) => void;
}) {
  return (
    <section className="learn" aria-labelledby="review-heading">
      <div className="stage learn-stage">
        <h2 id="review-heading" className="review-heading" ref={headingRef} tabIndex={-1}>
          Review the sounds
        </h2>
        <p className="learn-copy">Pick a character to hear it again.</p>
      </div>

      <div className="answers">
        {characters.map((char) => (
          <button key={char} type="button" className="answer" onClick={() => onPick(char)}>
            <span aria-hidden="true">{char}</span>
            <span className="visually-hidden">{`Review ${char}`}</span>
          </button>
        ))}
      </div>

      <div className="actions">
        <button type="button" className="button-go" onClick={onClose}>
          Back to practice
        </button>
      </div>
    </section>
  );
}
