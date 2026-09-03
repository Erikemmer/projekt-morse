/**
 * Der Sende-Screen: Zeichen zeigen -> optional "Hear it" -> senden ->
 * Aufloesung -> weiter (Ruling Notion-Log #90, Praezisierungen #101).
 *
 * Rechnet nichts. Was auf welchen Zustand folgt, steht in
 * `engine/sendSession.ts`; wie eine Eingabe dekodiert wird, in
 * `engine/sending.ts`. Hier wird gerendert und gemeldet (CLAUDE.md 4).
 *
 * **Seit Ruling Notion-Log #109 ist die Reihenfolge der beiden Eingabewege
 * umgekehrt.** Die zwei Tasten fuer · und − ("Use the two keys", am Laptop
 * `.` und `-`) sind jetzt der Standard einer neuen Einheit; die echte,
 * zeitgetastete Morsetaste ("Use real keying") ist die Ausbaustufe. Der
 * Owner hatte den Weg mit den zwei Tasten hinter einem leisen Textlink nicht
 * gefunden -- didaktisch ist die neue Reihenfolge ohnehin richtiger: erst
 * das Muster sicher treffen, dann den Rhythmus.
 *
 * Vier Dinge, die sonst wie Zufall aussehen:
 *
 * - **Die Aufgabe zeigt das Zeichen, nicht sein Muster.** Anders als das
 *   Hoertraining ist hier bekannt, *was* gesendet werden soll -- geuebt wird
 *   die Produktion. "Hear it" spielt die Referenz auf Zuruf; das Muster aus
 *   Punkten und Strichen wird vor dem Versuch nie gezeigt (CLAUDE.md 2.2).
 * - **Waehrend des Sendens (mode: keyed) erscheint kein Live-Muster.** Wer
 *   mitzaehlen koennte, waehrend er tastet, hoert nicht mehr auf den eigenen
 *   Rhythmus. Die Taste selbst ist das einzige Signal -- sie fuellt Amber,
 *   solange sie gedrueckt ist (das eine Amber dieser View), sonst nichts.
 * - **Die zwei Tasten (mode: tapped) zeigen ihr Muster sehr wohl live.**
 *   Ohne Zeitdruck gibt es kein Mitzaehl-Problem, und ohne eine Anzeige
 *   dessen, was schon steht, waere der Weg nicht bedienbar.
 * - **Die Aufloesung zeichnet Punkte und Striche als Formen, nie als
 *   Schriftzeichen** (Teil D.13, FINDINGS #8): ein Modus, der komplett aus ·
 *   und − besteht, darf nicht von der Fallback-Schrift eines Zeichensatzes
 *   abhaengen, der ✓/✗ irgendwo doch anders rendert.
 */

import { useEffect, useRef } from 'react';

import type { SendAttempt, SendDeviationKind, SendSessionState } from '../engine/sendSession';
import { sentToday } from '../engine/sendSession';
import { Pattern, spellPattern } from './Pattern';

export function Send({
  state,
  keyPressed,
  onHearIt,
  onKeyPress,
  onKeyRelease,
  onSwitchToTapped,
  onSwitchToKeyed,
  onTapDit,
  onTapDah,
  onDeleteTap,
  onDone,
  onNext,
  headingRef,
}: {
  state: SendSessionState;
  /** Ob die Sende-Taste gerade physisch gedrueckt ist (Pointer oder Leertaste). */
  keyPressed: boolean;
  onHearIt: () => void;
  onKeyPress: () => void;
  onKeyRelease: () => void;
  onSwitchToTapped: () => void;
  onSwitchToKeyed: () => void;
  onTapDit: () => void;
  onTapDah: () => void;
  onDeleteTap: () => void;
  onDone: () => void;
  onNext: () => void;
  headingRef: (element: HTMLElement | null) => void;
}) {
  const attempt = state.phase === 'feedback' ? state.lastAttempt : null;
  const canAct = state.phase === 'ready' || state.phase === 'sending';
  const hasInput = state.mode === 'keyed' ? state.intervals.length > 0 : state.taps.length > 0;

  return (
    <>
      <SendHeader sent={sentToday(state)} />

      <section className="stage">
        <p className="eyebrow">{eyebrowFor(state, keyPressed)}</p>

        {attempt !== null ? (
          <SendSolution attempt={attempt} />
        ) : (
          <>
            <p className="reveal">{state.prompt}</p>
            <PlayCircle
              buttonRef={headingRef}
              sounding={state.phase === 'listening'}
              disabled={!canAct}
              onPlay={onHearIt}
            />
          </>
        )}

        <p className="question" role="status">
          {questionFor(state, keyPressed)}
        </p>
      </section>

      {attempt === null && state.mode === 'keyed' && (
        <SendKey pressed={keyPressed} enabled={canAct} onPress={onKeyPress} onRelease={onKeyRelease} />
      )}

      {attempt === null && state.mode === 'tapped' && (
        <TapPad
          taps={state.taps}
          enabled={canAct}
          onTapDit={onTapDit}
          onTapDah={onTapDah}
          onDeleteTap={onDeleteTap}
        />
      )}

      {attempt === null && (
        <div className="actions">
          {hasInput && (
            <button type="button" className="quiet-action" onClick={onDone}>
              Done
            </button>
          )}
        </div>
      )}

      {attempt === null && state.phase === 'ready' && (
        <p className="send-switch">
          {state.mode === 'keyed' ? (
            <button type="button" className="quiet-action" onClick={onSwitchToTapped}>
              Use the two keys
            </button>
          ) : (
            <button type="button" className="quiet-action" onClick={onSwitchToKeyed}>
              Use real keying
            </button>
          )}
        </p>
      )}

      {attempt !== null && (
        <div className="actions">
          <button ref={headingRef} type="button" className="button-next" onClick={onNext}>
            Next
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Die Kopfzeile: links, wo man ist -- rechts, wie viele Versuche heute liefen.
 * Dieselbe Rolle wie `WordsHeader` (ui/Words.tsx) und aus demselben Grund
 * eine eigene, kleine Komponente statt der runden-basierten `SessionHeader`:
 * eine Auskunft ist keine Forderung (Ruling #87, hier von Anfang an so
 * uebernommen).
 */
function SendHeader({ sent }: { sent: number }) {
  return (
    <header className="masthead">
      <div className="masthead-row">
        <span>Send</span>
        <span>{sent} sent today</span>
      </div>
    </header>
  );
}

/** `keyPressed` aus demselben Grund wie bei `questionFor`. */
function eyebrowFor(state: SendSessionState, keyPressed: boolean): string {
  const hz = `${state.promptToneHz} Hz`;
  if (keyPressed || state.phase === 'sending') return `Your turn · ${hz}`;
  if (state.phase === 'listening') return `Now playing · ${hz}`;
  if (state.phase === 'feedback') return `Answer · ${hz}`;
  return `Ready · ${hz}`;
}

/**
 * `keyPressed` kommt zusaetzlich zur Phase herein: die Taste kann gehalten
 * sein, bevor die Engine ueberhaupt ein Element verbucht hat (das passiert
 * erst beim Loslassen, `appendSendInterval`) -- ohne diesen Zusatz stuende
 * hier noch "Ready when you are.", waehrend die Taste schon Amber fuellt.
 */
function questionFor(state: SendSessionState, keyPressed: boolean): string {
  if (keyPressed) return 'Sending…';
  if (state.phase === 'listening') return 'Listening…';
  if (state.phase === 'sending') {
    return state.mode === 'keyed'
      ? 'Press and hold to send — release between dits and dahs.'
      : 'Tap the pattern, then Done.';
  }
  if (state.phase === 'ready') return 'Ready when you are.';
  return ''; // 'feedback': der Verdict in SendSolution traegt die Ansage.
}

/**
 * "Hear it": derselbe Play-Kreis wie im Training und im Wort-Training, nur
 * mit einer anderen Beschriftung. Waehrend der Wiedergabe gefuellt (das eine
 * Amber dieser View in diesem Zustand) -- und waehrend gesendet wird
 * deaktiviert: zwei gleichzeitig klingende Toene soll es nicht geben
 * (siehe `MorsePlayer.keyDown`, audio/player.ts).
 */
function PlayCircle({
  buttonRef,
  sounding,
  disabled,
  onPlay,
}: {
  buttonRef?: (element: HTMLElement | null) => void;
  sounding: boolean;
  disabled: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="play send-hear-it"
      data-sounding={sounding}
      disabled={disabled}
      onClick={onPlay}
      aria-label="Hear it"
    >
      <span className="play-mark" aria-hidden="true" />
    </button>
  );
}

/**
 * Die Sende-Taste: eine Flaeche, gedrueckt gehalten waehrend ein Element
 * laeuft. Fuellt Amber genau dann, wenn `pressed` -- unabhaengig von der
 * Phase, denn zwischen zwei Elementen desselben Zeichens ist die Taste
 * ebenfalls kurz losgelassen (Teil B.7).
 *
 * Maus/Touch ueber `pointerdown`/`pointerup`/`pointercancel`, die Leertaste
 * global (siehe `useSendKeyboard`) -- beide rufen dieselben zwei Callbacks.
 * `onBlur` ist die Ruecksicherung: verliert die Taste waehrend des Drueckens
 * den Fokus (z. B. Fenster-Wechsel per Maus mitten im Halten), bleibt kein
 * Ton haengen (Teil B.6).
 */
function SendKey({
  pressed,
  enabled,
  onPress,
  onRelease,
}: {
  pressed: boolean;
  enabled: boolean;
  onPress: () => void;
  onRelease: () => void;
}) {
  return (
    <button
      type="button"
      className="send-key"
      data-pressed={pressed}
      disabled={!enabled}
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onBlur={onRelease}
      aria-label="Press and hold to send"
    >
      <span className="visually-hidden">Press and hold, or use the space bar.</span>
    </button>
  );
}

/**
 * "Use the two keys" (Teil E.16, seit Ruling #109 der Standardweg): zwei
 * Tasten fuer · und −, ohne Zeitdruck. Anders als beim Senden per Taste zeigt
 * dieser Weg das bisher Getippte live -- ohne Zeitdruck gibt es kein
 * Mitzaehl-Problem, und ohne die Anzeige waere der Weg nicht bedienbar
 * (siehe Kopf). Am Laptop bedienen `.` und `-` dieselben zwei Tasten
 * (`useSendKeyboard`).
 */
function TapPad({
  taps,
  enabled,
  onTapDit,
  onTapDah,
  onDeleteTap,
}: {
  taps: readonly ('.' | '-')[];
  enabled: boolean;
  onTapDit: () => void;
  onTapDah: () => void;
  onDeleteTap: () => void;
}) {
  const pattern = taps.join('');

  return (
    <div className="tap-pad">
      <p className="tap-typed" aria-live="polite">
        {pattern === '' ? (
          <span className="answer-typed-empty" aria-hidden="true">
            —
          </span>
        ) : (
          <Pattern pattern={pattern} />
        )}
      </p>

      <div className="tap-buttons">
        <button
          type="button"
          className="tap-button"
          disabled={!enabled}
          onClick={onTapDit}
          aria-label="Add a dit"
        >
          <span className="pattern-element" data-kind="dit" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="tap-button"
          disabled={!enabled}
          onClick={onTapDah}
          aria-label="Add a dah"
        >
          <span className="pattern-element" data-kind="dah" aria-hidden="true" />
        </button>

        {taps.length > 0 && (
          <button
            type="button"
            className="icon-button tap-delete"
            aria-label="Delete the last element"
            onClick={onDeleteTap}
          >
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
        )}
      </div>
    </div>
  );
}

/**
 * Die Aufloesung: Zielmuster und gesendetes Muster in zwei ausgerichteten
 * Zeilen (Teil D.13) -- nachher ist erlaubt, Senden ist Produktion, nicht
 * Hoeren. Dazu die Verhaeltnisse und, falls noetig, die groesste Abweichung
 * als fester Satz (Teil D.14) und der ehrliche Hinweis, wenn die
 * Sitzungs-Schaetzung einspringen musste (#101a).
 */
function SendSolution({ attempt }: { attempt: SendAttempt }) {
  return (
    <div className="solution send-solution">
      <p className="verdict" data-kind={attempt.correct ? 'hit' : 'miss'}>
        <span className="verdict-mark" aria-hidden="true">
          {attempt.correct ? '✓' : '✗'}
        </span>
        <span>
          {attempt.correct
            ? 'Correct.'
            : `Not quite — you sent ${attempt.decodedCharacter ?? 'an unrecognized pattern'}.`}
        </span>
      </p>

      <div className="send-solution-row">
        <span className="send-solution-label">Target</span>
        <Pattern pattern={attempt.targetPattern} />
      </div>
      <div className="send-solution-row">
        <span className="send-solution-label">You sent</span>
        {attempt.decodedPattern === '' ? (
          <span className="answer-typed-empty" aria-hidden="true">
            —
          </span>
        ) : (
          <Pattern pattern={attempt.decodedPattern} />
        )}
      </div>

      {attempt.mode === 'keyed' ? (
        <>
          {attempt.deviation !== null && <p className="note">{deviationSentence(attempt.deviation)}</p>}
          {attempt.usedSessionEstimate && (
            <p className="note">Judged against your usual dit — this one had no contrast of its own.</p>
          )}
          {attempt.wpm !== null && <p className="note">≈ {Math.round(attempt.wpm)} wpm</p>}
        </>
      ) : (
        // Teil E.16: "dann wird nur die Richtigkeit bewertet, kein Timing --
        // und die Aufloesung sagt auch das." Ohne diese Zeile waere das
        // Fehlen der Verhaeltnisse nur eine stille Abwesenheit, keine Auskunft.
        <p className="note">Timing wasn't judged — this one was tapped in.</p>
      )}

      <span className="visually-hidden">
        {`Target: ${spellPattern(attempt.targetPattern)}. You sent: ${
          attempt.decodedPattern === '' ? 'nothing' : spellPattern(attempt.decodedPattern)
        }.`}
      </span>
    </div>
  );
}

/** Die vier festen Formulierungen zur groessten Abweichung (Teil D.14). */
function deviationSentence(kind: SendDeviationKind): string {
  switch (kind) {
    case 'dah-short':
      return 'Your dahs are short — aim for three times your dit.';
    case 'dah-long':
      return 'Your dahs are long — aim for three times your dit.';
    case 'gap-narrow':
      return 'Your gaps inside the character are narrow — leave about one dit of space.';
    case 'gap-wide':
      return 'Your gaps inside the character are wide — leave about one dit of space.';
  }
}

/**
 * Die Leertaste als Sende-Taste, global -- wie `useWordKeyboard`
 * (ui/Words.tsx), und aus demselben Grund: wer am Schreibtisch sitzt, zielt
 * nicht erst auf einen Knopf.
 *
 * **`event.repeat` ist der ganze Witz dieses Hooks** (#101e, ausdruecklicher
 * Testfall): haelt man die Leertaste gedrueckt, feuert der Browser
 * wiederholte `keydown`-Ereignisse nach, obwohl die Taste physisch nur
 * einmal heruntergeht. Ohne den Schutz wuerde aus einem gehaltenen Strich
 * eine Kette handlungsgleicher "neuer" Tastendruecke; `MorsePlayer.keyDown()`
 * ist zwar selbst schon idempotent (Verteidigung in der Tiefe), aber ohne
 * den Schutz hier bliebe die Anzeige (`pressed`) unbeteiligt daran, dass
 * gar nichts Neues passiert ist.
 *
 * `preventDefault` verhindert das Scrollen der Seite und, waere ein Knopf
 * gerade fokussiert, dessen eigene Aktivierung durch dieselbe Leertaste.
 *
 * **In 'feedback' schaltet nur Enter weiter** (Ruling #105), unabhaengig von
 * `enabled`: die Leertaste bleibt dort, was sie ueberall sonst in diesem
 * Modus ist -- die Morsetaste selbst, kein zweites "weiter". `advanceEnabled`
 * ist deshalb ein eigener Schalter statt an `enabled` gekoppelt, das nur den
 * Tastungsweg betrifft (`canKeySend`, ui/App.tsx: `mode === 'keyed'`) --
 * "Next" muss in *beiden* Eingabewegen erreichbar sein.
 *
 * **In 'ready' und 'listening' tut Enter nichts** -- bewusst, aus demselben
 * Grund wie bei `useWordKeyboard`: das Ruling nennt nur die Aufloesung, eine
 * Ausweitung auf das Starten von "Hear it" per Tastatur waere ueber die
 * Aufgabe hinaus (CLAUDE.md 5).
 *
 * **`.` und `-` bedienen seit Ruling Notion-Log #109 die zwei Tasten am
 * Laptop** -- der jetzt bevorzugte Eingabeweg braucht eine eigene Tastatur,
 * so wie die Morsetaste schon die Leertaste hat. `tapEnabled` ist ein
 * eigener Schalter, unabhaengig von `enabled` (das nur den Tastungsweg
 * betrifft): beide Wege gelten nie gleichzeitig (`SendSessionState.mode`),
 * aber beide brauchen ihre eigene Bedingung, aus demselben Grund wie
 * `advanceEnabled`. `event.repeat` wird verworfen, damit ein gehaltener
 * Finger auf der Taste nicht ein Vielfaches derselben Eingabe antippt --
 * anders als bei der Morsetaste ist eine gehaltene Taste hier keine gueltige
 * Geste, jeder Tastendruck ist genau ein Element.
 */
export function useSendKeyboard({
  enabled,
  onPress,
  onRelease,
  advanceEnabled,
  onAdvance,
  tapEnabled,
  onTapDit,
  onTapDah,
}: {
  enabled: boolean;
  onPress: () => void;
  onRelease: () => void;
  advanceEnabled: boolean;
  onAdvance: () => void;
  /** Ob `.`/`-` gerade ein Element antippen duerfen (mode: tapped, ready/sending). */
  tapEnabled: boolean;
  onTapDit: () => void;
  onTapDah: () => void;
}) {
  const handlers = useRef({ onPress, onRelease, onAdvance, onTapDit, onTapDah });
  handlers.current = { onPress, onRelease, onAdvance, onTapDit, onTapDah };

  useEffect(() => {
    if (!enabled && !advanceEnabled && !tapEnabled) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Enter') {
        if (!advanceEnabled) return;
        event.preventDefault();
        handlers.current.onAdvance();
        return;
      }
      if (event.key === '.' || event.key === '-') {
        if (!tapEnabled) return;
        event.preventDefault();
        if (event.repeat) return;
        if (event.key === '.') handlers.current.onTapDit();
        else handlers.current.onTapDah();
        return;
      }
      if (event.key !== ' ' && event.key !== 'Spacebar') return;
      /*
       * Immer preventDefault, auch wenn `!enabled`: der Fokus wandert beim
       * Phasenwechsel auf den "Next"-Knopf (App.tsx, headingRef), und ohne
       * dieses preventDefault wuerde die *native* Knopf-Aktivierung durch die
       * Leertaste in 'feedback' doch zum Weiterschalten fuehren -- genau das
       * verbietet Ruling #105 ausdruecklich ("die Leertaste bleibt die
       * Morsetaste"). Ohne Kontrolle des Loops meldete sich der Bug erst im
       * eigens dafuer geschriebenen Tastatur-Test, nicht am Auge.
       */
      event.preventDefault();
      if (!enabled) return;
      if (event.repeat) return;
      handlers.current.onPress();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Spacebar') return;
      event.preventDefault();
      if (!enabled) return;
      handlers.current.onRelease();
    };
    // Verliert das Fenster den Fokus waehrend die Leertaste unten ist (Alt-Tab,
    // ein anderer Tab), bleibt sonst ein Ton haengen (Teil B.6).
    const onBlur = () => {
      if (enabled) handlers.current.onRelease();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled, advanceEnabled, tapEnabled]);
}
