/**
 * Der Wort-Screen: hoeren -> eintippen -> abschicken -> Feedback -> weiter
 * (Ruling #83, Teil A; offen seit Ruling #87).
 *
 * **Er hat kein Ende.** Kein Rundenzaehler, kein Fortschrittsbalken, kein
 * Abschluss. Was oben rechts steht, ist eine Auskunft und keine Forderung:
 * wie viele Aufgaben heute gelaufen sind. Verlassen wird ueber das Menue --
 * deshalb steht die App-Kopfzeile hier, anders als im Einzelzeichen-Loop.
 *
 * Rechnet nichts. Was auf welchen Zustand folgt, steht in
 * `engine/wordSession.ts`; was gespielt wird, entscheidet `engine/words.ts`.
 * Hier wird gerendert und gemeldet (CLAUDE.md 4).
 *
 * Vier Dinge, die sonst wie Zufall aussehen:
 *
 * - **Waehrend des Tons ist der Bildschirm leer.** Kein mitlaufender Text, kein
 *   Zeichen, das auftaucht, waehrend es klingt (CLAUDE.md 2.2, und Addendum (a)
 *   von Fable: kein Live-Sync im Hoertraining). Erst nach dem Abschicken kommt
 *   die Aufloesung.
 * - **Die Antwortflaeche ist dieselbe wie im Training** -- festes Tastenfeld ab
 *   `KEYPAD_MIN_CHARACTERS` aktiven Zeichen, darunter das Dreier-Gitter
 *   (Ruling #75, `ui/keypad.ts`). Eine zweite Tastenordnung waere eine zweite
 *   Motorik zum Lernen; ortsfest heisst ortsfest, auch zwischen den Modi.
 *   **Nur flacher:** 46 px statt 52, weil das Feld hier eine Eingabetastatur
 *   ist und kein Antwortfeld (Ruling #94, begruendet in styles.css).
 * - **Loeschen und Abschicken erscheinen erst, wenn es etwas zu loeschen und
 *   abzuschicken gibt** (1.1 §7: "hide what can't be used"). Das ist hier
 *   nicht nur Stil: waehrend der Ton laeuft, ist der Play-Kreis gefuellt und
 *   traegt das eine Amber der View -- ein gleichzeitig sichtbarer
 *   Amber-Knopf waere das zweite (1.1 §4).
 * - **Die Aufloesung markiert Position fuer Position, in ink.** Die
 *   ✓/✗-Semantik ist die bestehende; Amber traegt sie **nicht**. Im
 *   Einzelzeichen-Feedback ist Amber die *eine* richtige Antwort; bei fuenf
 *   Positionen waeren es bis zu fuenf Flaechen, und das Budget erlaubt eine
 *   (1.1 §4). Form und Symbol tragen die Unterscheidung ohnehin allein
 *   (CLAUDE.md 6).
 */

import { useEffect, useRef } from 'react';

import {
  wordsHeardToday,
  type WordAttempt,
  type WordPhase,
  type WordSessionState,
} from '../engine/wordSession';
import { KEYPAD_LAYOUT, KEYPAD_ROW_BREAK, usesKeypad } from './keypad';

export function Words({
  state,
  activeCharacterCount,
  onPlay,
  onType,
  onDelete,
  onSubmit,
  onNext,
  headingRef,
}: {
  state: WordSessionState;
  /** Entscheidet Tastenfeld gegen Dreier-Gitter -- wie im Training. */
  activeCharacterCount: number;
  onPlay: () => void;
  onType: (char: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  onNext: () => void;
  headingRef: (element: HTMLElement | null) => void;
}) {
  const attempt = state.phase === 'feedback' ? state.lastAttempt : null;
  const answering = state.phase === 'answering';

  return (
    <>
      <WordsHeader heard={wordsHeardToday(state)} />

      <section className="stage">
        <p className="eyebrow">{eyebrowFor(state)}</p>

        {attempt !== null ? (
          <Solution attempt={attempt} />
        ) : (
          <PlayCircle
            buttonRef={headingRef}
            sounding={state.phase === 'listening'}
            replay={answering}
            onPlay={onPlay}
          />
        )}

        <p className="question" role="status">
          {state.phase === 'ready' && 'Ready when you are.'}
          {state.phase === 'listening' && 'Listening…'}
          {answering && 'Type what you heard.'}
          {attempt !== null && (
            <span className="verdict" data-kind={attempt.correct ? 'hit' : 'miss'}>
              <span className="verdict-mark" aria-hidden="true">
                {attempt.correct ? '✓' : '✗'}
              </span>
              <span>
                {attempt.correct ? 'Correct.' : `Not quite — that was ${attempt.prompt}.`}
              </span>
            </span>
          )}
        </p>
      </section>

      {attempt === null && (
        <AnswerLine
          typed={state.typed}
          enabled={answering}
          onDelete={onDelete}
          onSubmit={onSubmit}
        />
      )}

      <Keys
        pool={state.pool}
        keypad={usesKeypad(activeCharacterCount)}
        enabled={answering}
        onType={onType}
      />

      {attempt !== null && (
        <div className="actions">
          <button ref={headingRef} type="button" className="button-next" onClick={onNext}>
            Next word
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Die Kopfzeile dieses Modus: links, wo man ist -- rechts, was heute lief.
 *
 * Sie sieht aus wie die `SessionHeader` der runden-basierten Screens, ist aber
 * bewusst **nicht** dieselbe Komponente: dort steht eine Forderung
 * ("Round 3 / 10") samt Fortschrittslinie, hier eine Auskunft. Beides in eine
 * Komponente mit Schaltern zu legen hiesse, den Unterschied zu verstecken, um
 * den es geht (Ruling #87). Zwei kurze Zeilen Markup sind billiger als eine
 * Abstraktion, die beide traegt (CLAUDE.md 4).
 *
 * **Keine Prozentzahl daneben.** Die Positionsquote steht schon in der
 * Aufloesung, und zwar an der Aufgabe, um die es gerade geht -- eine zweite,
 * aggregierte Quote in der Kopfzeile waere dieselbe Auskunft in ungenauer.
 *
 * Kein `aria-live`: die Zahl aendert sich genau dann, wenn die Aufloesung
 * ohnehin schon angesagt wird (`role="status"` an der Frage). Zwei Meldungen
 * fuer ein Ereignis waeren Laerm, keine Barrierefreiheit.
 */
function WordsHeader({ heard }: { heard: number }) {
  return (
    <header className="masthead">
      <div className="masthead-row">
        <span>Words &amp; groups</span>
        <span>{heard} heard today</span>
      </div>
    </header>
  );
}

/**
 * Die Zeile ueber dem Ton -- wie im Training, und genauso ehrlich: "Now
 * playing" steht nur da, solange wirklich etwas spielt (CLAUDE.md 2.6). Die
 * Tonhoehe daneben ist zugleich der Hinweis, dass dieser Modus ueber die Ohren
 * geht.
 */
function eyebrowFor(state: WordSessionState): string {
  const hz = `${state.promptToneHz} Hz`;
  if (state.phase === 'listening') return `Now playing · ${hz}`;
  if (state.phase === 'answering') return `Your turn · ${hz}`;
  if (state.phase === 'feedback') return `Answer · ${hz}`;
  return `Ready · ${hz}`;
}

/**
 * Der Play-Kreis. Eigene Kopie und nicht die aus `App.tsx`: die Beschriftung
 * ist eine andere ("the word", nicht "the character"), und dieselbe Kopie
 * traegt schon der Lernmodus (ui/Learn.tsx). Waehrend der Wiedergabe bleibt er
 * bedienbar -- Addendum (c) von Fable, Notion-Log #41.
 */
function PlayCircle({
  buttonRef,
  sounding,
  replay,
  onPlay,
}: {
  buttonRef?: (element: HTMLElement | null) => void;
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
      aria-label={replay ? 'Play the word again' : 'Play the word'}
    >
      <span className="play-mark" aria-hidden="true" />
    </button>
  );
}

/**
 * Die Antwortzeile: was bisher getippt ist, dazu Loeschen und Abschicken.
 *
 * **Keine Kaestchen fuer die Positionen.** Ein Raster aus Feldern verriete die
 * Laenge der Aufgabe, und die Laenge zu hoeren ist Teil der Uebung -- eine
 * Wortpause erkennt man daran, dass sie nicht mehr kommt. Also nur die
 * getippten Zeichen und darunter ein Strich, der die Zeile traegt.
 *
 * Der Text steht in einem `aria-live="polite"`-Bereich: wer nicht auf den
 * Bildschirm sieht, muss trotzdem wissen, was in der Zeile steht (CLAUDE.md 6).
 */
function AnswerLine({
  typed,
  enabled,
  onDelete,
  onSubmit,
}: {
  typed: string;
  enabled: boolean;
  onDelete: () => void;
  onSubmit: () => void;
}) {
  const empty = typed === '';

  return (
    <div className="answer-line">
      <p className="answer-typed" aria-live="polite">
        {/*
          Leer ist ein Strich -- und der ist Optik: vorgelesen waere er Laerm,
          und die Zeile hat dann auch nichts anzukuendigen.
        */}
        {empty ? (
          <span className="answer-typed-empty" aria-hidden="true">
            —
          </span>
        ) : (
          <>
            <span aria-hidden="true">{[...typed].join(' ')}</span>
            <span className="visually-hidden">{`Your answer so far: ${[...typed].join(' ')}`}</span>
          </>
        )}
      </p>

      {/*
        Erst wenn es etwas zu tun gibt (1.1 §7) -- und das haelt zugleich das
        Amber-Budget: waehrend des Tons ist der Play-Kreis das eine Amber.
      */}
      {!empty && enabled && (
        <>
          <button
            type="button"
            className="icon-button answer-delete"
            aria-label="Delete the last character"
            onClick={onDelete}
          >
            {/* Pfeil nach links, 24er-Raster, 1.5px Strich, runde Kappen (1.1 §8). */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M19 12H7m0 0 4-4m-4 4 4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className="button-check" onClick={onSubmit}>
            Check
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Die Aufloesung: die gesendete Folge, Position fuer Position markiert.
 *
 * Bei einer verfehlten Position steht darunter, was getippt wurde -- oder ein
 * Strich, wenn dort nichts stand. Das ist der Unterschied zwischen "falsch
 * gehoert" und "zu kurz gehoert", und beides zu verschweigen hiesse, dem
 * Nutzer die Auskunft zu nehmen, die er zum Ueben braucht.
 */
function Solution({ attempt }: { attempt: WordAttempt }) {
  return (
    <div className="solution">
      <p className="solution-row">
        {[...attempt.prompt].map((char, index) => (
          <span
            key={index}
            className="solution-cell"
            data-mark={attempt.marks[index] ? 'correct' : 'wrong'}
          >
            <span className="solution-char" aria-hidden="true">
              {char}
            </span>
            <span className="solution-mark" aria-hidden="true">
              {attempt.marks[index] ? '✓' : '✗'}
            </span>
            {!attempt.marks[index] && (
              <span className="solution-typed" aria-hidden="true">
                {attempt.answer[index] ?? '–'}
              </span>
            )}
          </span>
        ))}
        {attempt.extra !== '' && (
          <span className="solution-cell" data-mark="extra">
            <span className="solution-char" aria-hidden="true">
              {[...attempt.extra].join(' ')}
            </span>
            <span className="solution-mark" aria-hidden="true">
              ✗
            </span>
          </span>
        )}
      </p>

      {/*
        Fuer Screenreader in einem Satz statt in Zellen: eine Tabelle aus
        Symbolen vorgelesen ist keine Auskunft.
      */}
      <span className="visually-hidden">{spellSolution(attempt)}</span>
    </div>
  );
}

/** Die Aufloesung als Satz -- fuer Screenreader (CLAUDE.md 6). */
function spellSolution(attempt: WordAttempt): string {
  const sent = `Sent: ${[...attempt.prompt].join(' ')}.`;
  if (attempt.correct) return `${sent} Every position correct.`;

  const missed = [...attempt.prompt]
    .map((char, index) =>
      attempt.marks[index]
        ? null
        : `position ${index + 1}: ${char}, you typed ${attempt.answer[index] ?? 'nothing'}`,
    )
    .filter((line): line is string => line !== null);

  const extra = attempt.extra === '' ? '' : ` Extra characters: ${[...attempt.extra].join(' ')}.`;
  return `${sent} ${missed.join('; ')}.${extra}`;
}

/**
 * Die Tasten: Tastenfeld oder Dreier-Gitter, wie im Training.
 *
 * Ein Tipp fuegt an, er antwortet nicht -- deshalb tragen die Tasten hier
 * **keine** ✓/✗-Markierung. Die gehoert der Aufloesung oben, an der Folge, um
 * die es geht.
 */
function Keys({
  pool,
  keypad,
  enabled,
  onType,
}: {
  pool: readonly string[];
  keypad: boolean;
  enabled: boolean;
  onType: (char: string) => void;
}) {
  const asked = new Set(pool);
  const positions = keypad ? KEYPAD_LAYOUT : pool;

  return (
    <>
    <div className={keypad ? 'keypad' : 'answers'}>
      {positions.map((char) => {
        const active = !keypad || asked.has(char);

        return (
          <button
            key={char}
            type="button"
            className="answer"
            data-active={keypad ? String(active) : undefined}
            data-row-start={keypad && char === KEYPAD_ROW_BREAK ? 'true' : undefined}
            disabled={!enabled || !active}
            onClick={() => onType(char)}
          >
            <span aria-hidden="true">{char}</span>
            <span className="visually-hidden">
              {char}
              {!active && ' — not in this round'}
            </span>
          </button>
        );
      })}
    </div>
    {/* Ab 900 px (styles.css, `.keypad-hint`): die physische Tastatur
        beantwortet schon (useWordKeyboard) -- am Laptop steht es dabei. */}
    {keypad && <p className="keypad-hint">or just type — the keyboard answers too</p>}
    </>
  );
}

/**
 * Die physische Tastatur am Schreibtisch: Buchstaben und Ziffern tippen,
 * Backspace loescht, Enter schickt ab.
 *
 * Als Hook und nicht im Markup, weil es am Fenster haengt und nicht an einem
 * Element -- wer am Desktop tippt, zielt nicht erst auf ein Feld. `active`
 * haengt nur am Bildschirm und am Menue, nicht mehr an der Phase: der
 * Listener bleibt jetzt auch in 'feedback' am Fenster (Ruling #105).
 *
 * **In 'feedback' schalten Enter und die Leertaste weiter** (dasselbe wie
 * "Next word") -- ausdruecklich *kein* Buchstabe: ein Buchstabe ist dort die
 * erste Eingabe des naechsten Wortes und darf nicht als "weiter" verpuffen.
 * Anders als beim Einzelzeichen-Training (Ruling #103a) wird hier nichts
 * gepuffert, weil "weiter" hier keine Antwort ist, sondern nur der Uebergang
 * in die naechste Aufgabe -- die erste echte Eingabe dorthinein bleibt Sache
 * von 'answering'.
 *
 * **In 'ready' und 'listening' tut kein Tastendruck etwas** -- bewusst: das
 * Ruling nennt fuer diese beiden Modi ausdruecklich nur die Aufloesung
 * ("dort aber mit anderen Tasten"), nicht das Starten der Wiedergabe per
 * Tastatur. Eine Ausweitung darauf waere ueber die Aufgabe hinaus (CLAUDE.md 5).
 */
export function useWordKeyboard({
  active,
  phase,
  pool,
  onType,
  onDelete,
  onSubmit,
  onAdvance,
}: {
  active: boolean;
  phase: WordPhase;
  pool: readonly string[];
  onType: (char: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  onAdvance: () => void;
}) {
  // Die Rueckrufe wandern durch ein Ref, damit der Listener nicht bei jedem
  // Tastendruck oder Phasenwechsel neu haengt.
  const handlers = useRef({ phase, pool, onType, onDelete, onSubmit, onAdvance });
  handlers.current = { phase, pool, onType, onDelete, onSubmit, onAdvance };

  useEffect(() => {
    if (!active) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const current = handlers.current;

      if (current.phase === 'feedback') {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault();
          current.onAdvance();
        }
        // Jede andere Taste, auch ein Buchstabe: bewusst nichts (siehe Kopf).
        return;
      }

      if (current.phase !== 'answering') return; // 'ready'/'listening': bewusst nichts (siehe Kopf).

      if (event.key === 'Backspace') {
        event.preventDefault();
        current.onDelete();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        current.onSubmit();
        return;
      }

      const key = event.key.toUpperCase();
      if (key.length !== 1 || !current.pool.includes(key)) return;
      event.preventDefault();
      current.onType(key);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);
}
