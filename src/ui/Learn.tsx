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
  cardHasEcho,
  currentCharacter,
  echoKeyAction,
  type LearnState,
} from '../engine/learn';
import { Pattern } from './Pattern';
import { isBrowserChord } from './keyChord';
import { Mark } from './Mark';
import { KEYPAD_LAYOUT, KEYPAD_ROW_BREAK, usesKeypad } from './keypad';

export function Learn({
  state,
  playing,
  toneHz,
  showHz,
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
  /** Hz erst ab Variabilitaets-Stufe 1 (aus PR #5). */
  showHz: boolean;
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
          continueAs={cardHasEcho(state) ? 'echo' : state.requireEcho ? 'next' : 'done'}
          buttonRef={focusRef}
          onPlay={onPlay}
          onContinue={state.requireEcho ? onBeginEcho : onNextCard}
        />
      ) : (
        <Echo state={state} playing={playing} toneHz={toneHz} showHz={showHz} buttonRef={focusRef} onPlay={onPlay} onAnswer={onAnswer} onAdvance={onAdvance} />
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

  /*
   * Ein Anschlag, der waehrend des Echo-Tons kam (`echoKeyAction` → 'buffer').
   * Er gilt, sobald der Ton durch ist -- dieselbe Mechanik wie
   * `bufferedKeyRef` im Trainings-Loop (Ruling #103a).
   */
  const bufferedEchoRef = useRef<string | null>(null);
  const phase = state?.phase ?? null;

  useEffect(() => {
    const buffered = bufferedEchoRef.current;
    if (buffered === null) return;
    // Nur in 'echo-answering' einloesen. Jede andere Phase (abgebrochen,
    // weitergeschaltet, Lernmodus verlassen) wirft ihn weg: eine Antwort auf
    // einen Abruf, der nicht mehr laeuft, waere eine Zahl ueber nichts.
    bufferedEchoRef.current = null;
    if (phase !== 'echo-answering') return;
    handlers.current.onAnswer(buffered);
  }, [phase]);

  useEffect(() => {
    if (!active) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isBrowserChord(event)) return;
      // Auto-Repeat einer gehaltenen Taste ist kein zweiter Anschlag -- wie
      // im Trainings-, Wort- und Sende-Modus (Runde P5, Befund C). Ohne das
      // rauschte eine gehaltene Leertaste/Enter durch mehrere Echo-Runden.
      if (event.repeat) return;
      const current = handlers.current;
      if (current.state === null) return;
      const isSpace = event.key === ' ' || event.key === 'Spacebar';

      /*
       * Zeichen-Anschlaege zuerst: in 'echo-ready' und 'echo-listening' tat
       * die Tastatur hier bisher nichts, obwohl der Bildschirm genau danach
       * fragt. Was gilt, entscheidet die Engine (`echoKeyAction`), nicht
       * diese Komponente (CLAUDE.md 4).
       */
      const action = echoKeyAction(current.state, event.key.toUpperCase());
      if (action !== null) {
        event.preventDefault();
        if (action === 'play') current.onPlay();
        else if (action === 'buffer') bufferedEchoRef.current = event.key.toUpperCase();
        else current.onAnswer(event.key.toUpperCase());
        return;
      }

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

      if (current.state.phase === 'echo-feedback') {
        if (event.key === 'Enter' || isSpace) {
          event.preventDefault();
          current.onAdvance();
        }
        return;
      }

      // 'echo-ready'/'echo-listening' brauchen fuer Leertaste/Enter nichts
      // Eigenes: der Play-Kreis traegt in beiden Phasen den Fokus (Learn.tsx,
      // `focusRef`), und seine native Aktivierung spielt genau das ab, was
      // hier passieren soll. Die *Zeichen*-Anschlaege dieser Phasen sind oben
      // abgehandelt -- sie gingen bis hierher verloren.
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
  continueAs,
  buttonRef,
  onPlay,
  onContinue,
}: {
  char: string;
  heard: boolean;
  playing: boolean;
  /**
   * Was nach der Karte kommt: der Echo-Check, direkt die naechste Karte (erste
   * Karte eines Erstlaufs, `cardHasEcho`) oder -- beim freien Wiederholen --
   * nichts weiter.
   */
  continueAs: 'echo' | 'next' | 'done';
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

        {/*
          Solange "Try it"/"Next sound" noch nicht da ist, traegt der Play-Kreis
          den Fokus (aus PR #5, Runde P29): sonst fiel er nach dem Kartenwechsel
          auf <body>.
        */}
        <button
          ref={!heard ? (buttonRef as React.RefObject<HTMLButtonElement>) : undefined}
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
          {continueAs === 'next'
            ? `This is ${char}. Listen a few times, then go on.`
            : `This is ${char}. Listen a few times, then try it.`}
        </p>
        {/* Wortlaut-Entwurf, Fable-Abnahme offen (Review Design/UX, D1c): der
            Check schreibt keine Statistik (engine/learn.ts) -- das darf man
            wissen, bevor er beginnt. */}
        {continueAs === 'echo' && (
          <p className="learn-note">The next three are practice — nothing here counts.</p>
        )}
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
            {continueAs === 'echo' ? 'Try it' : continueAs === 'next' ? 'Next sound' : 'Done'}
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
  showHz,
  buttonRef,
  onPlay,
  onAnswer,
  onAdvance,
}: {
  state: LearnState;
  playing: boolean;
  toneHz: number;
  showHz: boolean;
  buttonRef: { current: HTMLElement | null };
  onPlay: () => void;
  onAnswer: (choice: string) => void;
  onAdvance: () => void;
}) {
  const pool = answerPool(state);
  const attempt = state.phase === 'echo-feedback' ? state.lastEcho : null;
  // Ab 13 Optionen das ortsfeste Tastenfeld wie im Training (B3, D3 a):
  // "aktiv" ist hier, was der Check anbietet (`answerPool`), der Rest ist
  // gedimmt. Der Pool waechst nur, einmal Tastenfeld bleibt Tastenfeld.
  const keypad = usesKeypad(pool.length);
  const offered = new Set(pool);
  const positions = keypad ? KEYPAD_LAYOUT : pool;

  return (
    <>
      <div className="stage">
        <p className="eyebrow">{`${playing ? 'Now playing' : 'Your turn'}${showHz ? ` · ${toneHz} Hz` : ''}`}</p>

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
                <Mark kind={attempt.correct ? 'hit' : 'miss'} />
              </span>
              <span>{attempt.correct ? 'Correct.' : `Not quite — that was ${attempt.char}.`}</span>
            </span>
          )}
        </p>
      </div>

      <div className={keypad ? 'keypad' : 'answers'}>
        {positions.map((option) => {
          const active = !keypad || offered.has(option);
          const mark =
            attempt === null || !active
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
              data-active={keypad ? String(active) : undefined}
              data-row-start={keypad && option === KEYPAD_ROW_BREAK ? 'true' : undefined}
              disabled={state.phase !== 'echo-answering' || !active}
              onClick={() => onAnswer(option)}
            >
              <span aria-hidden="true">{option}</span>
              {mark !== undefined && (
                <span className="answer-mark" aria-hidden="true">
                  <Mark kind={mark === 'correct' ? 'hit' : 'miss'} />
                </span>
              )}
              <span className="visually-hidden">
                {option}
                {mark === 'correct' && ' — this was the character'}
                {mark === 'wrong' && ' — your answer, not the character'}
                {!active && ' — not in this round'}
              </span>
            </button>
          );
        })}
      </div>
      {/* Ab 900 px (styles.css, `.keypad-hint`), wie im Training und in Words:
          die physische Tastatur beantwortet den Echo-Check ebenfalls
          (echoKeyAction). FINDINGS #14, Owner-Delegation P23. */}
      {keypad && <p className="keypad-hint">or just type — the keyboard answers too</p>}

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
 * Das freie Wiederholen: alle 36 Zeichen aus `CHARACTER_ORDER`, im Stil des
 * Tastenfelds. Ein Tipp oeffnet die Karte -- ohne Pflicht-Echo-Check.
 *
 * **Ein Nachschlagewerk, keine Pruefung** (Ruling Notion-Log #110). Bisher
 * stand hier nur `introducedCharacters` -- wer neugierig auf einen Klang war,
 * den das Training noch nicht abfragt, hatte keinen Weg, ihn zu hoeren. Jetzt
 * stehen alle 36 da; noch nicht eingefuehrte Zeichen sind **sichtbar
 * unterschieden** (dasselbe gedimmte Muster wie eine gesperrte Taste im
 * Tastenfeld, `.keypad .answer[data-active='false']`), aber genauso
 * anklickbar wie jedes andere -- gesperrt ist hier nichts, nur ruhiger
 * gesetzt. **Entscheidend: Zuhoeren fuehrt nicht ein.** `App.tsx` prueft das
 * ueber `introducesCharacters` (engine/learn.ts) -- diese Komponente
 * rechnet nicht, sie zeigt nur, was schon eingefuehrt ist.
 *
 * Heisst seit der Menue-Runde "Learn the sounds" (vorher "Review the
 * sounds"): der Menue-Eintrag ist jetzt der einzige Einstieg, und er soll
 * auch fuer den Erstkontakt nicht nach Wiederholung klingen.
 *
 * **Das Tastenfeld-Raster statt des Dreier-Gitters, aus Platzgruenden.** 36
 * Zeichen im Dreier-Gitter (64 px je Taste) sprengten den Bildschirm bei
 * 390 x 844 deutlich (FINDINGS #6, 1223 px gemessen); das sechsspaltige
 * Tastenfeld (46 px) haelt das Budget. Die Reihenfolge bleibt trotzdem die aus
 * `CHARACTER_ORDER` (Einfuehrungsreihenfolge), nicht die alphabetische aus
 * `KEYPAD_LAYOUT`: eingefuehrte Zeichen stehen dadurch vorn zusammen, und wer
 * durchblaettert, sieht zuerst Bekanntes.
 */
export function ReviewPicker({
  characters,
  introduced,
  onPick,
  onClose,
  headingRef,
}: {
  /** Alle 36 Zeichen aus `CHARACTER_ORDER`, in dessen Reihenfolge. */
  characters: readonly string[];
  /** Was schon eingefuehrt ist -- entscheidet nur die Optik, nie die Bedienbarkeit. */
  introduced: readonly string[];
  onPick: (char: string) => void;
  onClose: () => void;
  headingRef: (element: HTMLElement | null) => void;
}) {
  const known = new Set(introduced);

  // Ein Zeichen aus der Liste oeffnet dessen Karte -- dieselbe Geste wie der
  // Klick, fuer alle 36 Positionen gleich (auch die noch nicht eingefuehrten,
  // siehe Kopf: gesperrt ist hier nichts).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isBrowserChord(event)) return;
      const key = event.key.toUpperCase();
      if (!characters.includes(key)) return;
      event.preventDefault();
      onPick(key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [characters, onPick]);

  return (
    <section className="learn" aria-labelledby="review-heading">
      <div className="stage">
        <h2 id="review-heading" className="screen-heading" ref={headingRef} tabIndex={-1}>
          Learn the sounds
        </h2>
        {/* Die Reihenfolge als Landkarte (aus PR #5, Runde P31). */}
        <p className="learn-copy">
          Pick a character to hear it again. They stand in the order they arrive.
        </p>
      </div>

      <div className="keypad">
        {characters.map((char) => {
          const active = known.has(char);
          return (
            <button
              key={char}
              type="button"
              className="answer"
              data-active={String(active)}
              onClick={() => onPick(char)}
            >
              <span aria-hidden="true">{char}</span>
              <span className="visually-hidden">
                {active ? `Review ${char}` : `Listen to ${char}`}
                {!active && ' — not in your practice yet'}
              </span>
            </button>
          );
        })}
      </div>
      {/* Eine leise Zeile statt eines Symbols je Taste (CLAUDE.md 6: nie Farbe
          allein) -- das gedimmte Grau traegt schon die Form, diese Zeile sagt
          fuer alle 30 gedimmten Tasten zugleich, was das bedeutet. */}
      <p className="note">Greyed-out sounds are not in your practice yet.</p>

      <div className="actions">
        <button type="button" className="button-go" onClick={onClose}>
          Back to practice
        </button>
      </div>
    </section>
  );
}
