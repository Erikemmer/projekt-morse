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
import { Pattern } from './Pattern';

export function Learn({
  state,
  playing,
  toneHz,
  onPlay,
  onBeginEcho,
  onNextCard,
  onAnswer,
  onAdvance,
  onSkip,
}: {
  state: LearnState;
  playing: boolean;
  /** Der Sitzungs-Ton in Hz -- Lernkarten und Echo-Check spielen immer ihn. */
  toneHz: number;
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
        <Echo state={state} playing={playing} toneHz={toneHz} buttonRef={focusRef} onPlay={onPlay} onAnswer={onAnswer} onAdvance={onAdvance} />
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
 * Die physische Tastatur des Lernmodus (Ruling Notion-Log #108).
 *
 * Bisher hatte der Lernmodus **keine eigene** Tastatur -- ein Tastendruck lief
 * hinter ihm in den (verdeckten) Trainings-Listener, der seit Ruling #105 in
 * jeder Phase reagiert. Seit P2 loeste das dort sogar einen Phantom-Ton aus,
 * den niemand angefordert hat. Der Fix in `App.tsx` haelt diesen Listener jetzt
 * fern, solange der Lernmodus steht -- dieser Hook hier ist der Ersatz, nicht
 * nur die Reparatur.
 *
 * **Explizit statt auf natuerlichen Fokus verlassen.** Die Karte und der
 * "Weiter"-Knopf tragen zwar eigene `<button>`-Elemente, die nach jedem
 * Phasenwechsel den Fokus bekommen (Learn.tsx, `focusRef`) -- aber Leertaste
 * und Enter auf einem fokussierten Knopf haben *native* Bedeutung, und die
 * deckt sich nicht mit dem, was diese Runde verlangt (auf der Karte spielt
 * die Leertaste immer den Ton ab, nie "weiter"). Genau dieses Auseinanderlaufen
 * von nativer Knopf-Aktivierung und gewuenschter Taste hat schon das
 * Sende-Training in P2 gebissen (siehe `useSendKeyboard`) -- hier wird es
 * von Anfang an explizit entschieden, nicht dem Fokus ueberlassen.
 */
export function useLearnKeyboard({
  active,
  state,
  onPlay,
  onContinue,
  onAnswer,
  onAdvance,
}: {
  active: boolean;
  state: LearnState | null;
  /** Karte (ab)spielen -- gilt fuer 'card' und 'card-heard' gleichermassen. */
  onPlay: () => void;
  /** Von der Karte weiter -- zum Echo-Check oder zur naechsten Karte. */
  onContinue: () => void;
  onAnswer: (choice: string) => void;
  onAdvance: () => void;
}) {
  const handlers = useRef({ state, onPlay, onContinue, onAnswer, onAdvance });
  handlers.current = { state, onPlay, onContinue, onAnswer, onAdvance };

  useEffect(() => {
    if (!active) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const current = handlers.current;
      if (current.state === null) return;
      const isSpace = event.key === ' ' || event.key === 'Spacebar';

      if (current.state.phase === 'card') {
        // Noch nicht gehoert: Leertaste oder Enter spielen die Karte.
        if (isSpace || event.key === 'Enter') {
          event.preventDefault();
          current.onPlay();
        }
        return;
      }

      if (current.state.phase === 'card-heard') {
        // Gehoert: die Leertaste spielt weiter erneut ab, Enter geht weiter
        // (zum Echo-Check oder, beim freien Wiederholen, zur naechsten
        // Karte) -- dieselbe Geste wie der "Try it"/"Done"-Knopf.
        if (event.key === 'Enter') {
          event.preventDefault();
          current.onContinue();
          return;
        }
        if (isSpace) {
          event.preventDefault();
          current.onPlay();
        }
        return;
      }

      if (current.state.phase === 'echo-answering') {
        // Nur ein Zeichen aus den angebotenen Optionen antwortet -- nicht der
        // ganze Zeichensatz (die Optionen sind hier bewusst wenige).
        const key = event.key.toUpperCase();
        if (key.length !== 1) return;
        if (!answerPool(current.state).includes(key)) return;
        event.preventDefault();
        current.onAnswer(key);
        return;
      }

      if (current.state.phase === 'echo-feedback') {
        if (event.key === 'Enter' || isSpace) {
          event.preventDefault();
          current.onAdvance();
        }
        return;
      }

      // 'echo-ready'/'echo-listening': bewusst nichts Eigenes -- der Play-Kreis
      // traegt in diesen beiden Phasen ohnehin schon den Fokus (Learn.tsx,
      // `focusRef`), und die native Leertasten-/Enter-Aktivierung eines
      // fokussierten Knopfs spielt genau das ab, was hier ohnehin passieren
      // soll. Eine Ausweitung auf das *Starten* der Wiedergabe waere hier
      // ohne Wirkung, weil es schon funktioniert.
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);
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
      <div className="stage">
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
  toneHz,
  buttonRef,
  onPlay,
  onAnswer,
  onAdvance,
}: {
  state: LearnState;
  playing: boolean;
  toneHz: number;
  buttonRef: { current: HTMLElement | null };
  onPlay: () => void;
  onAnswer: (choice: string) => void;
  onAdvance: () => void;
}) {
  const pool = answerPool(state);
  const attempt = state.phase === 'echo-feedback' ? state.lastEcho : null;

  return (
    <>
      <div className="stage">
        <p className="eyebrow">{`${playing ? 'Now playing' : 'Your turn'} · ${toneHz} Hz`}</p>

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
 *
 * Heisst seit der Menue-Runde "Learn the sounds" (vorher "Review the
 * sounds"): der Menue-Eintrag ist jetzt der einzige Einstieg, und er soll
 * auch fuer den Erstkontakt nicht nach Wiederholung klingen.
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
      <div className="stage">
        <h2 id="review-heading" className="screen-heading" ref={headingRef} tabIndex={-1}>
          Learn the sounds
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
