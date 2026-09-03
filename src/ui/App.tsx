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
import { withToneHz, withVolume, type DeviceSettings } from '../engine/deviceSettings';
import {
  DRILL_INVITATION_MIN_SLOW,
  DRILL_ROUNDS,
  attemptMedianOver,
  drillPool,
  slowCharacters,
  storedMedianOver,
} from '../engine/drill';
import { buildSchedule } from '../engine/schedule';
import {
  advance,
  beginPlayback,
  createSession,
  promptFinished,
  retuneHomeTone,
  submitAnswer,
  summarize,
  type SessionKind,
  type SessionState,
} from '../engine/session';
import { CHARACTER_ORDER, CHARACTER_WPM, ROUNDS_PER_GROUP, ROUNDS_PER_SESSION } from '../engine/settings';
import { resetEffectiveWpm, speedProgressionActive } from '../engine/tempo';
import {
  advanceWord,
  beginWordPlayback,
  createWordSession,
  deleteCharacter,
  retuneWordHomeTone,
  submitWord,
  typeCharacter,
  wordPromptFinished,
  type WordSessionState,
} from '../engine/wordSession';
import { WORDS_MIN_CHARACTERS, wordsUnlocked } from '../engine/words';
import {
  advanceSend,
  appendSendInterval,
  appendTap,
  beginSendPlayback,
  createSendSession,
  deleteTap,
  retuneSendHomeTone,
  sendPlaybackFinished,
  setSendMode as setSendSessionMode,
  submitSend,
  type SendMode,
  type SendSessionState,
} from '../engine/sendSession';
import {
  dayFor,
  markIntroSeen,
  markIntroduced,
  pendingIntroductions,
  type DayStats,
  type Progress,
} from '../engine/stats';
import { streakStanding, type StreakStanding } from '../engine/streak';
import { computeTiming } from '../engine/timing';
import { About } from './About';
import { Account } from './Account';
import { pushProgress } from './account';
import { Intro } from './Intro';
import { KEYPAD_LAYOUT, KEYPAD_ROW_BREAK, usesKeypad } from './keypad';
import { Learn, ReviewPicker } from './Learn';
import { AppHeader, MenuPanel, NavRail, type MenuLocation } from './Menu';
import { MarginColumn } from './MarginColumn';
import { Pattern } from './Pattern';
import { ProgressScreen } from './Progress';
import { Send, useSendKeyboard } from './Send';
import { SessionHeader } from './SessionHeader';
import { Words, useWordKeyboard } from './Words';
import { loadProgress, saveProgressNow, saveProgressWhenIdle } from './progressStorage';
import { loadDeviceSettings, saveDeviceSettings } from './deviceStorage';
import { Settings } from './Settings';
import { dayQuotaLine, streakLine } from './statusLines';
import { todayISO } from './today';

export function App() {
  /**
   * Die Einstellungen dieses Geraets (Tonhoehe, Lautstaerke). Sie stehen vor
   * der Sitzung, weil die Sitzung ihren Heimton beim Anlegen braucht -- und
   * sie gehen nie zum Konto (ui/deviceStorage.ts).
   */
  const [device, setDevice] = useState<DeviceSettings>(loadDeviceSettings);

  const [session, setSession] = useState<SessionState>(() =>
    createSession({
      totalRounds: ROUNDS_PER_SESSION,
      progress: loadProgress(),
      random: Math.random,
      today: todayISO(),
      homeToneHz: device.toneHz,
    }),
  );

  /**
   * Der Lernmodus laeuft neben der Sitzung her, nicht in ihr: die Sitzung steht
   * derweil unberuehrt auf Runde 1. `null` heisst, es laeuft gerade keiner.
   */
  const [learn, setLearn] = useState<LearnState | null>(null);
  /**
   * Womit der Drill angetreten ist: **welche** Zeichen langsam waren und wie
   * ihr Median vorher stand.
   *
   * Beides wird beim Start festgehalten, nicht am Ende neu berechnet -- und
   * das ist keine Optimierung, sondern die Bedingung dafuer, dass die
   * Ergebniszeile ueberhaupt stimmt. Ein Drill *veraendert* die Messreihe, aus
   * der "langsam" abgeleitet wird: hinterher neu zu fragen, welche Zeichen
   * langsam sind, liefert im besten Fall -- der Drill hat geholfen -- eine
   * leere Liste. Genau dann verschwaende die Zeile, die den Erfolg berichten
   * soll. Im Browser-Durchlauf genau so passiert.
   *
   * `null` heisst: es lief kein Drill.
   */
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  /**
   * Die laufende Wort-Einheit (Ruling #83, Teil A) -- oder `null`.
   *
   * Sie laeuft **neben** der Sitzung her, wie der Lernmodus: die Sitzung steht
   * derweil unberuehrt da und behaelt ihre Nummer. Angelegt wird sie beim
   * Betreten des Modus und *nur*, wenn es noch keine gibt -- ein Blick ins
   * Menue oder auf Progress soll eine halbe Einheit nicht wegwerfen. Weg ist
   * sie, wenn der Abschluss-Screen verlassen wird.
   */
  const [words, setWords] = useState<WordSessionState | null>(null);
  /**
   * Die laufende Sende-Einheit (Ruling Notion-Log #90) -- oder `null`. Laeuft
   * wie die Wort-Einheit neben der Sitzung her, angelegt beim Betreten des
   * Modus und nur, wenn es noch keine gibt.
   */
  const [send, setSend] = useState<SendSessionState | null>(null);
  /**
   * Ob die Sende-Taste gerade physisch gedrueckt ist -- reine Anzeige
   * (welche Flaeche Amber fuellt), unabhaengig von `send.phase`: zwischen
   * zwei Elementen desselben Zeichens ist die Taste ebenfalls kurz
   * losgelassen, waehrend die Aufgabe weiter `'sending'` ist (Teil B.7).
   */
  const [sendKeyPressed, setSendKeyPressed] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [tonePlaying, setTonePlaying] = useState(false);

  /**
   * Das Gehäuse um den Loop: welcher Ort gerade gezeigt wird und ob das Menü
   * offen ist. Bewusst ein useState statt Router oder URL — vier Orte, kein
   * Verlauf, keine neue Abhängigkeit (CLAUDE.md 3). Die Sitzung läuft dabei
   * unberührt weiter; Progress und About lesen nur.
   */
  const [view, setView] = useState<
    'practice' | 'words' | 'send' | 'progress' | 'account' | 'settings' | 'about'
  >('practice');
  const [menuOpen, setMenuOpen] = useState(false);
  /** Der Menü-Trigger — Fokusziel nach dem Schließen ohne Ortswechsel. */
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  /**
   * Nach X oder Esc gehört der Fokus zurück auf den Trigger (CLAUDE.md 6),
   * nicht auf das, was der Screen sonst fokussieren würde. Ein Ref statt
   * State: der Merker soll den Fokus-Effekt lenken, nicht ihn auslösen.
   */
  const focusMenuTrigger = useRef(false);

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

  /**
   * Das Timing der Sitzung. Das Zeichentempo ist immer CHARACTER_WPM -- was
   * ab Variabilitaets-Stufe 2 atmet, sind nur die Farnsworth-Pausen
   * (engine/variability.ts).
   */
  const timing = useMemo(
    () => computeTiming({ characterWpm: CHARACTER_WPM, effectiveWpm: session.sound.effectiveWpm }),
    [session.sound.effectiveWpm],
  );
  const schedule = useMemo(() => buildSchedule(session.prompt, timing), [session.prompt, timing]);

  // Beim Verlassen der Seite nicht weiterpiepen.
  useEffect(() => () => playerRef.current?.stop(), []);

  // Fortschritt sichern, sobald er sich geaendert hat -- ausserhalb des Eingabepfads.
  useEffect(() => saveProgressWhenIdle(session.progress), [session.progress]);

  // Das Einmal-Flag der Variabilitaets-Zeile sofort schreiben, wie introSeen:
  // wer direkt nach dem Sitzungsstart neu laedt, soll die Zeile kein zweites
  // Mal sehen. Der Leerlauf-Schreiber oben kaeme dafuer zu spaet -- genau so
  // im Browser-Durchlauf passiert. Absichtlich nur vom Flag abhaengig: ein
  // synchroner Schreiber pro Sitzungsstart, keiner auf dem Eingabepfad.
  useEffect(() => {
    if (session.showVariabilityNotice) saveProgressNow(session.progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.showVariabilityNotice]);

  /*
   * Am Ende einer Sitzung einmal zum Konto hochschieben -- **best effort**.
   *
   * Kein `await`, kein Ergebnis in der UI, kein Modal: ein Abgleich, der nicht
   * durchkommt, ist kein Ereignis fuer den Nutzer (ui/account.ts). Ohne Konto
   * tut `pushProgress` gar nichts und loest keinen einzigen Aufruf aus.
   *
   * Der synchrone Schreibvorgang davor ist Absicht: `pushProgress` schickt den
   * Zeitstempel des letzten *Schreibens* mit, und der Leerlauf-Schreiber waere
   * hier vielleicht noch nicht gelaufen -- dann traege der Blob eine Uhr, die
   * aelter ist als er selbst, und ein anderes Geraet koennte darueber gewinnen.
   * Auf dem Eingabepfad einer Uebung liegt das nicht: die Sitzung ist vorbei.
   */
  const sessionFinished = session.phase === 'finished';
  useEffect(() => {
    if (!sessionFinished) return;
    saveProgressNow(session.progress);
    void pushProgress(session.progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionFinished]);

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
  // `session.kind` haengt mit drin, seit es Drills gibt: der Start einer Speed
  // round wechselt weder Phase noch Runde (beide bleiben "Runde 1, bereit"),
  // aber die Einladung, auf der der Fokus gerade stand, verschwindet dabei --
  // ohne dieses Nachziehen fiele er auf <body>.
  // `view`, `reviewing` und `menuOpen` haengen mit drin, seit es das Gehaeuse
  // gibt: auch ein Ortswechsel ist ein Moduswechsel (CLAUDE.md 6). Solange das
  // Menue offen ist, setzt das Panel seinen Fokus selbst; nach X oder Esc
  // gewinnt der Trigger (focusMenuTrigger), sonst das Ziel des neuen Screens.
  useEffect(() => {
    if (menuOpen) return;
    if (focusMenuTrigger.current) {
      focusMenuTrigger.current = false;
      menuTriggerRef.current?.focus();
      return;
    }
    focusRef.current?.focus();
    // `words.phase` und `words.prompt` haengen mit drin, seit es das
    // Wort-Training gibt: dort wechselt die Flaeche genauso zwischen
    // Play-Kreis, Aufloesung und Weiter-Taste, und ohne dieses Nachziehen
    // fiele der Fokus nach jedem Ton auf <body>. Die Aufgabe steht dabei fuer
    // die Runde, die es seit Ruling #87 nicht mehr gibt: sie wechselt genau
    // dann, wenn die naechste Aufgabe beginnt. `send.phase`/`send.prompt`
    // aus demselben Grund fuer das Sende-Training (Ruling #90).
  }, [
    session.phase,
    session.round,
    session.kind,
    session.progress.introSeen,
    words?.phase,
    words?.prompt,
    send?.phase,
    send?.prompt,
    view,
    reviewing,
    menuOpen,
  ]);

  /**
   * Der Player dieser Seite -- einer, sein Leben lang.
   *
   * An ihm haengt der AudioContext und damit die Uhr, auf der alle
   * Reaktionszeiten liegen; ihn fuer eine neue Lautstaerke neu zu bauen, hiesse
   * die Uhr zu wechseln (CLAUDE.md 2.1). Die Lautstaerke wird deshalb vor
   * jedem Abspielen gesetzt, nicht im Konstruktor.
   */
  const ensurePlayer = useCallback(() => {
    playerRef.current ??= new MorsePlayer();
    playerRef.current.volume = device.volume;
    return playerRef.current;
  }, [device.volume]);

  const play = useCallback(async () => {
    const player = ensurePlayer();
    // Muss in der Klick-Geste passieren, sonst bleibt Audio stumm.
    await player.resume();

    const handle = player.play(
      schedule,
      (elapsed) => {
        // Der Ton ist durch, sobald die Audio-Uhr das Ende der Zeitachse erreicht.
        // Das kommt aus dem rAF-Takt, ist also auf ~16 ms genau -- und unabhaengig
        // davon, wann der Planer das Ende bemerkt.
        if (elapsed >= schedule.duration) setSession(promptFinished);
      },
      session.promptToneHz,
    );
    setSession((current) => beginPlayback(current, handle.endTime));

    // Rueckfall, falls es keinen rAF-Takt gab (Tab im Hintergrund).
    await handle.finished;
    setSession(promptFinished);
  }, [schedule, session.promptToneHz, ensurePlayer]);

  /**
   * Ein einzelnes Zeichen abspielen und warten, bis es durch ist.
   *
   * Der Lernmodus misst keine Reaktionszeit -- er braucht das Ende des Tons
   * nur, um weiterzuschalten. Deshalb genuegt hier das Versprechen des
   * Players; die rAF-genaue Uhr aus dem Training ist dafuer nicht noetig.
   *
   * Gespielt wird immer der *Sitzungs*-Ton, nie ein Prompt-Jitter: der
   * Erstkontakt mit einem Zeichen braucht einen festen Anker
   * (engine/variability.ts, SessionSound.sessionToneHz).
   */
  const learnToneHz = session.sound.sessionToneHz;
  const playCharacter = useCallback(
    async (char: string) => {
      const player = ensurePlayer();
      await player.resume();
      setTonePlaying(true);
      try {
        await player.play(buildSchedule(char, timing), () => {}, learnToneHz).finished;
      } finally {
        setTonePlaying(false);
      }
    },
    [timing, learnToneHz, ensurePlayer],
  );

  const answer = useCallback((choice: string) => {
    const at = playerRef.current?.currentTime ?? 0;
    setSession((current) => submitAnswer(current, choice, at));
  }, []);

  // --- Wort-Training ------------------------------------------------------

  /*
   * Das Timing der Wort-Einheit -- eigener Klang, eigenes Tempo, dieselbe
   * Rechnung. Das Zeichentempo ist auch hier CHARACTER_WPM: ein Wort wird als
   * *eine* Zeitachse geplant, mit den Farnsworth-Abstaenden des aktuellen
   * Effektivtempos (engine/schedule.ts). Nichts davon rechnet der Player.
   */
  const wordsEffectiveWpm = words?.sound.effectiveWpm ?? null;
  const wordsTiming = useMemo(
    () =>
      wordsEffectiveWpm === null
        ? null
        : computeTiming({ characterWpm: CHARACTER_WPM, effectiveWpm: wordsEffectiveWpm }),
    [wordsEffectiveWpm],
  );
  const wordsSchedule = useMemo(
    () =>
      words === null || wordsTiming === null ? null : buildSchedule(words.prompt, wordsTiming),
    [words?.prompt, wordsTiming],
  );

  /*
   * Der Fortschritt der Einheit wandert in die Sitzung zurueck -- dort haengt
   * das Speichern (der Leerlauf-Schreiber oben) und dort liest die App ihn.
   * Ein zweiter Speicher-Pfad waere ein zweiter Ort, an dem man ihn vergessen
   * kann.
   */
  const wordsProgress = words?.progress;
  useEffect(() => {
    if (wordsProgress === undefined) return;
    setSession((current) =>
      current.progress === wordsProgress ? current : { ...current, progress: wordsProgress },
    );
  }, [wordsProgress]);

  const playWord = useCallback(async () => {
    if (wordsSchedule === null || words === null) return;
    const player = ensurePlayer();
    // Muss in der Klick-Geste passieren, sonst bleibt Audio stumm.
    await player.resume();

    const handle = player.play(wordsSchedule, () => {}, words.promptToneHz);
    setWords((current) => (current === null ? null : beginWordPlayback(current)));

    // Kein rAF-Takt und keine Audio-Uhr: dieser Modus misst keine
    // Reaktionszeit, er braucht nur das Ende des Tons (engine/wordSession.ts).
    await handle.finished;
    setWords((current) => (current === null ? null : wordPromptFinished(current)));
  }, [wordsSchedule, words?.promptToneHz, ensurePlayer]);

  const typeWord = useCallback((char: string) => {
    setWords((current) => (current === null ? null : typeCharacter(current, char)));
  }, []);

  const deleteWordCharacter = useCallback(() => {
    setWords((current) => (current === null ? null : deleteCharacter(current)));
  }, []);

  const submitWordAnswer = useCallback(() => {
    setWords((current) => (current === null ? null : submitWord(current)));
  }, []);

  const nextWord = useCallback(() => {
    setWords((current) => (current === null ? null : advanceWord(current, Math.random)));
  }, []);

  // Die physische Tastatur am Schreibtisch (ui/Words.tsx). Sie haengt nur in
  // der Eingabephase am Fenster -- und nur, solange dieser Modus vorne ist.
  useWordKeyboard({
    enabled: view === 'words' && !menuOpen && words?.phase === 'answering',
    pool: words?.pool ?? [],
    onType: typeWord,
    onDelete: deleteWordCharacter,
    onSubmit: submitWordAnswer,
  });

  // --- Sende-Training (Ruling Notion-Log #90) -----------------------------

  /*
   * Das Timing der Sende-Einheit -- eigener Klang, dieselbe Rechnung wie
   * ueberall. Gespielt wird hier immer nur *ein* Zeichen ("Hear it"): die
   * Farnsworth-Luecken kommen trotzdem aus derselben Funktion, es gibt nur
   * keine Zeichenpause, die sie strecken koennten.
   */
  const sendEffectiveWpm = send?.sound.effectiveWpm ?? null;
  const sendTiming = useMemo(
    () =>
      sendEffectiveWpm === null
        ? null
        : computeTiming({ characterWpm: CHARACTER_WPM, effectiveWpm: sendEffectiveWpm }),
    [sendEffectiveWpm],
  );
  const sendSchedule = useMemo(
    () => (send === null || sendTiming === null ? null : buildSchedule(send.prompt, sendTiming)),
    [send?.prompt, sendTiming],
  );

  /* Der Fortschritt der Einheit wandert in die Sitzung zurueck, wie beim Wort-Training. */
  const sendProgress = send?.progress;
  useEffect(() => {
    if (sendProgress === undefined) return;
    setSession((current) =>
      current.progress === sendProgress ? current : { ...current, progress: sendProgress },
    );
  }, [sendProgress]);

  /** "Hear it": spielt die Referenz einmal, wie im Training. */
  const playSendReference = useCallback(async () => {
    if (sendSchedule === null || send === null) return;
    const player = ensurePlayer();
    await player.resume();

    const handle = player.play(sendSchedule, () => {}, send.promptToneHz);
    setSend((current) => (current === null ? null : beginSendPlayback(current)));

    await handle.finished;
    setSend((current) => (current === null ? null : sendPlaybackFinished(current)));
  }, [sendSchedule, send?.promptToneHz, ensurePlayer]);

  /**
   * Ob die Sende-Taste gerade bedient werden darf: nur im Tastungsweg, nur
   * auf diesem Screen, nur solange keine Referenz spielt oder die Aufloesung
   * schon steht. Dieselbe Bedingung traegt Maus/Touch (Send.tsx, `disabled`)
   * und die globale Leertaste (`useSendKeyboard`) -- eine Wahrheit, kein
   * zweites Mal geprueft.
   */
  const canKeySend =
    view === 'send' &&
    !menuOpen &&
    send !== null &&
    send.mode === 'keyed' &&
    (send.phase === 'ready' || send.phase === 'sending');

  /**
   * Ob die Taste gerade wirklich gehalten wird -- als Ref, nicht als
   * Zustand: er entscheidet, ob `keyDown()` noch ankommen darf, nachdem
   * `resume()` durch ist (siehe `pressSendKey`), und braucht dafuer den
   * *aktuellen* Wert, nicht den aus der Runde, in der der Callback gebaut
   * wurde.
   */
  const sendKeyHeldRef = useRef(false);
  /** Der Startzeitpunkt des laufenden Elements auf der Audio-Uhr, oder null. */
  const sendKeyDownAtRef = useRef<number | null>(null);

  /**
   * Die Taste wird gedrueckt. `keyDown()` selbst braucht den AudioContext in
   * derselben Geste (Browser-Autoplay-Regel) -- deshalb `resume()` hier und
   * nicht vorher; ist die Taste beim Ankommen der Antwort schon wieder los
   * (sehr kurzer Antipp), bleibt der Ton stumm, statt verspaetet doch noch zu
   * klingen (`sendKeyHeldRef`).
   */
  const pressSendKey = useCallback(() => {
    if (!canKeySend || sendKeyHeldRef.current) return;
    sendKeyHeldRef.current = true;
    setSendKeyPressed(true);

    const player = ensurePlayer();
    void player.resume().then(() => {
      if (!sendKeyHeldRef.current) return;
      sendKeyDownAtRef.current = player.keyDown(send?.promptToneHz);
    });
  }, [canKeySend, send?.promptToneHz, ensurePlayer]);

  /** Die Taste wird losgelassen -- beendet den Ton und verbucht das Element. */
  const releaseSendKey = useCallback(() => {
    if (!sendKeyHeldRef.current) return;
    sendKeyHeldRef.current = false;
    setSendKeyPressed(false);

    const downAt = sendKeyDownAtRef.current;
    sendKeyDownAtRef.current = null;
    // resume() war noch nicht durch -- es kam nie ein Ton an, also auch kein Element.
    if (downAt === null) return;

    const upAt = ensurePlayer().keyUp();
    setSend((current) => (current === null ? null : appendSendInterval(current, { downAt, upAt })));
  }, [ensurePlayer]);

  // Die Leertaste als Sende-Taste, global -- wie useWordKeyboard, und aus
  // demselben Grund (ui/Send.tsx: event.repeat, preventDefault, blur).
  useSendKeyboard({ enabled: canKeySend, onPress: pressSendKey, onRelease: releaseSendKey });

  /**
   * Abschluss einer Eingabe nach 1,5 s Stille (Teil B.8) -- zusaetzlich zu
   * "Done" (weiter unten). "Stille" heisst: seit dem letzten *Loslassen*,
   * nicht seit dem letzten Tastendruck -- solange die Taste noch gehalten
   * wird (`sendKeyPressed`), laeuft kein Timer, sonst schnitte ein langer
   * dah mitten im Halten ab.
   */
  useEffect(() => {
    if (view !== 'send' || menuOpen || sendKeyPressed) return undefined;
    if (send === null || send.mode !== 'keyed' || send.phase !== 'sending') return undefined;

    const timer = window.setTimeout(() => {
      setSend((current) => (current === null ? null : submitSend(current)));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [view, menuOpen, sendKeyPressed, send?.mode, send?.phase, send?.intervals.length]);

  const switchSendMode = useCallback((mode: SendMode) => {
    setSend((current) => (current === null ? null : setSendSessionMode(current, mode)));
  }, []);

  const tapSendDit = useCallback(() => {
    setSend((current) => (current === null ? null : appendTap(current, '.')));
  }, []);

  const tapSendDah = useCallback(() => {
    setSend((current) => (current === null ? null : appendTap(current, '-')));
  }, []);

  const deleteSendTap = useCallback(() => {
    setSend((current) => (current === null ? null : deleteTap(current)));
  }, []);

  const submitSendAttempt = useCallback(() => {
    setSend((current) => (current === null ? null : submitSend(current)));
  }, []);

  const nextSend = useCallback(() => {
    setSend((current) => (current === null ? null : advanceSend(current, Math.random)));
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
  // `view` und `menuOpen` gehoeren in die Bedingung, seit es das Gehaeuse
  // gibt: ein Lauf, der startet, waehrend jemand auf Progress oder im Menue
  // steht, spielte seinen Karten-Ton in einen fremden Screen hinein.
  const learnDue =
    session.progress.introSeen &&
    // Nicht in einen Drill hinein: der uebt gezielt ein paar Zeichen, und eine
    // Lernkarte mitten darin waere ein zweiter Modus im ersten.
    session.kind === 'practice' &&
    view === 'practice' &&
    !menuOpen &&
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
    setDrillTarget(null);
    setSession((current) =>
      createSession({
        totalRounds: current.totalRounds,
        progress: current.progress,
        random: Math.random,
        today: todayISO(),
        homeToneHz: device.toneHz,
      }),
    );
  }, [device.toneHz]);

  /**
   * Die "Speed round": ein kurzer Lauf nur aus den langsamen Zeichen
   * (engine/drill.ts). Dieselben Uebungsregeln wie sonst -- nichts laeuft von
   * allein, waehrend des Tons steht nichts auf dem Schirm, die Reaktionszeit
   * liegt auf der Audio-Uhr.
   */
  const startDrill = useCallback(() => {
    const pool = drillPool(session.progress);
    if (pool.length === 0) return;

    // Der Vergleichswert gilt den *langsamen* Zeichen, nicht den Kontrasten:
    // verglichen wird, was vergleichbar ist (CLAUDE.md 2.6).
    const characters = slowCharacters(session.progress);
    setDrillTarget({ characters, before: storedMedianOver(session.progress, characters) });
    setSession((current) =>
      createSession({
        totalRounds: DRILL_ROUNDS,
        progress: current.progress,
        random: Math.random,
        today: todayISO(),
        homeToneHz: device.toneHz,
        kind: 'drill',
        pool,
      }),
    );
  }, [session.progress, device.toneHz]);

  /**
   * Ein Abgleich mit dem Konto hat einen neuen Stand ergeben.
   *
   * Übernommen wird `progress` — **nicht** der Zeichensatz der laufenden
   * Sitzung. Das ist dieselbe Regel wie beim Wachstum: eine laufende Sitzung
   * behält ihren Pool, ein neuer Satz gilt ab der nächsten. Sonst wüchse oder
   * schrumpfte das Antwort-Gitter mitten in einer Übung, und die Ziehung zöge
   * plötzlich aus anderen Zeichen als die, die man gerade übt.
   *
   * Geschrieben ist der Stand zu diesem Zeitpunkt schon (`ui/account.ts`); hier
   * zieht nur der React-Zustand nach.
   */
  const adoptProgress = useCallback((progress: Progress) => {
    setSession((current) => ({ ...current, progress }));
  }, []);

  // --- Einstellungen -------------------------------------------------------

  /*
   * Eine Aenderung wird sofort geschrieben und sofort wirksam. "Sofort
   * wirksam" heisst bei der Lautstaerke: beim naechsten Ton (ensurePlayer),
   * und bei der Tonhoehe: fuer die laufende Sitzung, sofern sie auf
   * Variabilitaets-Stufe 0 laeuft -- sonst behauptete das Eyebrow im Training
   * eine Zahl, die gar nicht gespielt wird (CLAUDE.md 2.6). Ab Stufe 1 laesst
   * `retuneHomeTone` die gezogene Tonhoehe in Ruhe.
   */
  const applySettings = useCallback((next: DeviceSettings) => {
    setDevice(next);
    saveDeviceSettings(next);
  }, []);

  useEffect(() => {
    setSession((current) => retuneHomeTone(current, device.toneHz));
    setWords((current) => (current === null ? null : retuneWordHomeTone(current, device.toneHz)));
    setSend((current) => (current === null ? null : retuneSendHomeTone(current, device.toneHz)));
  }, [device.toneHz]);

  /*
   * Das Tempo zuruecksetzen (Ruling #83, B.9) -- der eine Weg abwaerts, und er
   * gehoert dem Nutzer.
   *
   * Sofort geschrieben und nicht im Leerlauf: es ist eine ausdrueckliche
   * Entscheidung auf einem Screen ohne Ton, wie das Merken der Einfuehrung.
   * Die *laufende* Sitzung behaelt ihren Klang -- ein Tempo mitten in einer
   * Sitzung zu senken hiesse, die Uebung unter der Messung zu wechseln; das
   * neue Niveau gilt ab der naechsten (dieselbe Regel wie beim Wachstum).
   */
  const resetSpeed = useCallback(() => {
    setSession((current) => {
      const reset = resetEffectiveWpm(current.progress);
      if (reset === current.progress) return current;
      saveProgressNow(reset);
      return { ...current, progress: reset };
    });
  }, []);

  /**
   * Der Probeton: **nur auf eine Geste**, nie beim Schieben des Reglers.
   *
   * Gespielt wird die eingestellte Tonhoehe selbst, nicht der Sitzungs-Ton --
   * sonst hoerte man auf hoeheren Variabilitaets-Stufen etwas anderes, als der
   * Regler zeigt. Ein kurzes Zeichen mit dit *und* dah, damit beide
   * Elementlaengen zu hoeren sind.
   */
  const playPreview = useCallback(() => {
    void (async () => {
      const player = ensurePlayer();
      await player.resume();
      setTonePlaying(true);
      try {
        await player.play(buildSchedule(PREVIEW_CHARACTER, timing), () => {}, device.toneHz)
          .finished;
      } catch {
        // Verweigert der Browser den Ton, bleibt der Knopf stehen -- ein
        // zweiter Versuch ist ein Klick, und mehr ist hier nicht zu melden.
      } finally {
        setTonePlaying(false);
      }
    })();
  }, [ensurePlayer, timing, device.toneHz]);

  // --- Gehäuse: Menü und Orte ---------------------------------------------

  /** Der Ort fürs Menü: die Klang-Auswahl zählt als eigener ('learn'). */
  const menuLocation: MenuLocation = reviewing ? 'learn' : view;

  /*
   * Was im Menü gesperrt ist -- und ab wann es aufgeht (Ruling #83, A.1).
   *
   * Die Zahl steht in `engine/words.ts`, der Satz hier: `MenuPanel` rechnet
   * nicht, es rendert (CLAUDE.md 4). Entschieden wird an den **aktiven**
   * Zeichen -- dem Satz, aus dem der Modus baut.
   */
  const wordsOpen = wordsUnlocked(session.progress.activeCharacters.length);
  const menuLocked = wordsOpen
    ? undefined
    : {
        words: `from ${WORDS_MIN_CHARACTERS} characters`,
        // Dieselbe Schwelle wie „Words & groups" (Teil A.1) -- keine zweite Zahl.
        send: `from ${WORDS_MIN_CHARACTERS} characters`,
      };

  const dismissMenu = useCallback(() => {
    focusMenuTrigger.current = true;
    setMenuOpen(false);
  }, []);

  const navigateTo = useCallback(
    (target: MenuLocation) => {
      setMenuOpen(false);
      if (target === menuLocation) {
        // Kein Ortswechsel, also auch kein neues Fokusziel: zurück zum Trigger.
        focusMenuTrigger.current = true;
        return;
      }
      setReviewing(target === 'learn');
      setView(target === 'learn' ? 'practice' : target);

      /*
       * Eine Wort-Einheit wird beim Betreten angelegt -- aber nur, wenn keine
       * offen ist: wer zwischendurch ins Menü sieht, kommt in seine Einheit
       * zurück und nicht in eine neue. Der Zeichensatz kommt aus dem
       * Fortschritt der Sitzung, also aus demselben Stand wie überall.
       */
      if (target === 'words') {
        setWords((current) =>
          current ??
          createWordSession({
            progress: session.progress,
            random: Math.random,
            today: todayISO(),
            homeToneHz: device.toneHz,
          }),
        );
      }

      /* Dieselbe Ruecksicht wie bei der Wort-Einheit: nur anlegen, wenn keine offen ist. */
      if (target === 'send') {
        setSend((current) =>
          current ??
          createSendSession({
            progress: session.progress,
            random: Math.random,
            today: todayISO(),
            homeToneHz: device.toneHz,
          }),
        );
      }
    },
    [menuLocation, session.progress, device.toneHz],
  );

  // Tippen statt Zielen: die Buchstaben des Zeichensatzes beantworten direkt.
  //
  // Nur, solange der Trainings-Screen wirklich vorne ist. Erreichbar ist das
  // Menue heute ohnehin nur auf dem Start-Screen (headerShown), eine Sitzung
  // kann also nicht im Hintergrund in 'answering' stehen -- aber ein Listener
  // am *Fenster* soll das nicht voraussetzen, sondern sagen.
  useEffect(() => {
    if (view !== 'practice' || menuOpen) return undefined;
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
  }, [session.phase, session.pool, answer, view, menuOpen]);

  const attempt = session.lastAttempt;
  const summary = summarize(session);

  /*
   * Der Streak, wie er *heute* dasteht -- nicht, wie er beim letzten Ueben
   * dastand. Die Umrechnung macht die Engine (engine/streak.ts); hier wird
   * nur gerendert.
   */
  const streak = streakStanding(session.progress.streak, session.today);

  /**
   * Der Start-Screen: Runde 1, noch nichts gespielt. Nur hier (und auf den
   * Screens des Gehäuses) steht die Kopfzeile mit dem Menü — mitten in einer
   * Sitzung wäre sie eine Ablenkung, im Lernmodus und in der Einführung auch.
   */
  const onStartScreen =
    session.progress.introSeen &&
    learn === null &&
    // Ein Drill sieht in Runde 1 aus wie ein Start-Screen, ist aber keiner:
    // dort gehoert weder das Menue hin noch eine Einladung zum Drill.
    session.kind === 'practice' &&
    session.phase === 'ready' &&
    session.round === 1;

  /*
   * Die langsamen Zeichen fuer die Einladung -- nur auf dem Start-Screen
   * berechnet. Waehrend einer Uebung hat diese Rechnung nichts zu suchen
   * (CLAUDE.md 7), und dort wuerde sie auch nichts anzeigen.
   */
  const invitation = onStartScreen ? slowCharacters(session.progress) : [];

  /**
   * Ob die Kopfzeile mit dem Menue dasteht.
   *
   * Sie fehlt **mitten in einer Uebung** -- im Training, im Drill und seit
   * Ruling #83. Der Grund ist derselbe wie in Runde A: dort waere sie eine
   * Ablenkung, und der Play-Kreis soll der einzige naechste Schritt sein. Der
   * Weg heraus aus einer angefangenen Runde ist, sie zu Ende zu bringen.
   *
   * **Im Wort-Modus gilt das seit Ruling #87 nicht mehr.** Er endet nicht von
   * selbst, also gaebe es ohne Kopfzeile keinen Weg hinaus -- verlassen wird
   * ueber das Menue, und dafuer muss der Knopf dafuer da sein. Der Platz, den
   * das kostet, ist gemessen und in der Uebergabe (§4) genannt.
   */
  const headerShown =
    !menuOpen &&
    session.progress.introSeen &&
    learn === null &&
    (view !== 'practice' || reviewing || onStartScreen);

  /*
   * Die Randspalte ab 1280 px (Teil A.3) -- dieselben drei Zahlen wie die
   * Fusszeile, nur als Randnotiz statt als Zeile unter der Uebung. Sie haengt
   * an `session.progress` und `session.today`, aendert sich also genau dann,
   * wenn auch die Fusszeile es taete: beim Aufloesen, nie waehrend eine
   * Antwort offen ist. Ausserhalb der Einfuehrung berechnet, weil sie vorher
   * nichts zu zeigen haette.
   */
  const marginDay = dayFor(session.progress, session.today);
  const marginTempoLine =
    `${session.progress.activeCharacters.length} of ${CHARACTER_ORDER.length} active` +
    (speedProgressionActive(session.progress) ? ` · ${session.progress.effectiveWpm} wpm` : '');

  return (
    <div className="app-layout">
      <NavRail location={menuLocation} locked={menuLocked} onNavigate={navigateTo} />
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

      {headerShown && (
        <AppHeader triggerRef={menuTriggerRef} onOpenMenu={() => setMenuOpen(true)} />
      )}

      {menuOpen ? (
        <MenuPanel
          location={menuLocation}
          locked={menuLocked}
          onNavigate={navigateTo}
          onDismiss={dismissMenu}
        />
      ) : !session.progress.introSeen ? (
        <Intro onDone={finishIntro} />
      ) : learn !== null ? (
        <Learn
          state={learn}
          playing={tonePlaying}
          toneHz={learnToneHz}
          onPlay={learn.phase === 'card' || learn.phase === 'card-heard' ? replayCard : playEcho}
          onBeginEcho={() => setLearn((c) => (c === null ? null : beginEcho(c)))}
          onNextCard={() => setLearn((c) => (c === null ? null : nextCard(c)))}
          onAnswer={(choice) => setLearn((c) => (c === null ? null : answerEcho(c, choice)))}
          onAdvance={() => setLearn((c) => (c === null ? null : advanceEcho(c, Math.random)))}
          onSkip={reviewing ? undefined : skipLearn}
        />
      ) : view === 'words' && words !== null ? (
        <Words
          state={words}
          /* Die Zahl der *aktiven* Zeichen entscheidet Tastenfeld gegen
             Dreier-Gitter -- dieselbe Schwelle wie im Training (ui/keypad.ts). */
          activeCharacterCount={session.progress.activeCharacters.length}
          onPlay={() => void playWord()}
          onType={typeWord}
          onDelete={deleteWordCharacter}
          onSubmit={submitWordAnswer}
          onNext={nextWord}
          headingRef={focusTarget}
        />
      ) : view === 'send' && send !== null ? (
        <Send
          state={send}
          keyPressed={sendKeyPressed}
          onHearIt={() => void playSendReference()}
          onKeyPress={pressSendKey}
          onKeyRelease={releaseSendKey}
          onSwitchToTapped={() => switchSendMode('tapped')}
          onSwitchToKeyed={() => switchSendMode('keyed')}
          onTapDit={tapSendDit}
          onTapDah={tapSendDah}
          onDeleteTap={deleteSendTap}
          onDone={submitSendAttempt}
          onNext={nextSend}
          headingRef={focusTarget}
        />
      ) : view === 'progress' ? (
        <ProgressScreen progress={session.progress} today={session.today} headingRef={focusTarget} />
      ) : view === 'account' ? (
        <Account headingRef={focusTarget} onProgress={adoptProgress} />
      ) : view === 'settings' ? (
        <Settings
          settings={device}
          playing={tonePlaying}
          effectiveWpm={session.progress.effectiveWpm}
          onToneHz={(hz) => applySettings(withToneHz(device, hz))}
          onVolume={(volume) => applySettings(withVolume(device, volume))}
          onPreview={playPreview}
          onResetSpeed={resetSpeed}
          headingRef={focusTarget}
        />
      ) : view === 'about' ? (
        <About headingRef={focusTarget} />
      ) : reviewing ? (
        <ReviewPicker
          characters={session.pool}
          onPick={openReview}
          onClose={() => setReviewing(false)}
          headingRef={focusTarget}
        />
      ) : session.phase === 'finished' ? (
        <Summary
          kind={session.kind}
          summary={summary}
          streak={streak}
          drillResult={drillResult(session, drillTarget)}
          onRestart={restart}
          headingRef={focusTarget}
        />
      ) : (
        <>
          <SessionHeader
            label={
              session.kind === 'drill' ? 'Speed round' : `Session ${session.progress.sessionsStarted}`
            }
            round={session.round}
            totalRounds={session.totalRounds}
            done={session.attempts.length}
          />

          <section className="stage">
            <p className="eyebrow">{eyebrowFor(session.phase, session.promptToneHz)}</p>

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
            /* Die Zahl der *aktiven* Zeichen entscheidet, nicht die des Pools:
               eine Speed round zieht aus wenigen und darf das Tastenfeld
               trotzdem nicht abschalten (ui/keypad.ts). */
            keypad={usesKeypad(session.progress.activeCharacters.length)}
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
            Genau **eine** leise Zeile auf dem Start-Screen, nie zwei
            untereinander (1.1 §4, CLAUDE.md 2.8: Ruhe geht vor
            Vollstaendigkeit).

            Vorrang hat die Variabilitaets-Zeile: sie erscheint einmal im
            Leben eines Standes, beim ersten Aktivwerden von Stufe 1, und
            danach nie wieder (progress.variabilityNoticeSeen). Der Streak
            steht in genau dieser einen Sitzung nur auf dem Abschluss-Screen
            -- verloren geht er dadurch nicht.
          */}
          {onStartScreen &&
            (session.showVariabilityNotice ? (
              <p className="variability-note">
                From here on, the pitch varies between sessions — real signals do.
              </p>
            ) : (
              <p className="streak-note">{streakLine(streak)}</p>
            ))}

          {/*
            Die Einladung zum Drill -- eine Feststellung und eine Frage, kein
            Ausrufezeichen und kein Amber (CLAUDE.md 2.8). Sie erscheint schon
            ab *einem* langsamen Zeichen (Ruling #69): laenger zu warten hiesse,
            eine Hilfe vorzuenthalten, die schon greifen koennte. Dass ein
            Ein-Zeichen-Drill nicht zur Tipp-Uebung wird, regelt DRILL_MIN_POOL
            in der Engine, nicht diese Stelle.
          */}
          {invitation.length >= DRILL_INVITATION_MIN_SLOW && (
            <div className="drill-invite">
              <p className="streak-note">{slowSentence(invitation)}</p>
              <button type="button" className="quiet-action" onClick={startDrill}>
                Try a speed round?
              </button>
            </div>
          )}

          {/*
            Die Fusszeile traegt seit Ruling #83 auch das Tempo -- und nur,
            solange die Tempo-Progression ueberhaupt laeuft (alle Zeichen
            aktiv). Vorher waere es eine Zahl ohne Bewegung und damit eine
            Zeile ohne Aussage (1.1 §7, CLAUDE.md 2.8).
          */}
          <Footer
            day={dayFor(session.progress, session.today)}
            done={session.attempts.length}
            wpm={speedProgressionActive(session.progress) ? session.progress.effectiveWpm : null}
            speedUp={session.speedUp}
          />
        </>
      )}
      </main>
      <MarginColumn dayLine={dayQuotaLine(marginDay)} streak={streak} tempoLine={marginTempoLine} />
    </div>
  );
}

/**
 * Die Zeile ueber dem Ton. Sie sagt, was gerade laeuft -- und bleibt dabei
 * ehrlich: "Now playing" steht nur da, solange wirklich etwas spielt
 * (CLAUDE.md 2.6). Die Tonhoehe steht immer daneben; sie ist zugleich der
 * sichtbare Hinweis darauf, dass dieser Modus ueber die Ohren geht.
 */
function eyebrowFor(phase: SessionState['phase'], toneHz: number): string {
  // Immer die *echte* Tonhoehe der laufenden Abfrage (CLAUDE.md 2.6) -- ab
  // Variabilitaets-Stufe 1 ist sie nicht mehr die Konstante von frueher.
  const hz = `${toneHz} Hz`;
  if (phase === 'listening') return `Now playing · ${hz}`;
  if (phase === 'answering') return `Your turn · ${hz}`;
  if (phase === 'feedback') return `Answer · ${hz}`;
  return `Ready · ${hz}`;
}

/** Womit ein Drill angetreten ist -- siehe `drillTarget` in App(). */
interface DrillTarget {
  /** Die langsamen Zeichen, so wie sie beim Start hiessen. */
  readonly characters: readonly string[];
  /** Ihr gemeinsamer Median vor dem Drill, oder null. */
  readonly before: number | null;
}

/**
 * Die Einladung zum Drill, als Satz.
 *
 * Hoechstens drei Zeichen werden genannt; der Rest wird gezaehlt. Eine Zeile
 * mit acht Buchstaben waere keine Einladung mehr, sondern eine Maengelliste
 * -- und der Ton dieser Zeile ist die halbe Entscheidung (CLAUDE.md 2.8).
 *
 * Seit Ruling #69 laedt schon ein einzelnes langsames Zeichen ein, also muss
 * der Satz auch im Singular stimmen ("R is still slow to land.").
 */
function slowSentence(characters: readonly string[]): string {
  const named: string[] = [...characters.slice(0, 3)];
  const rest = characters.length - named.length;
  if (rest > 0) named.push(`${rest} more`);

  if (named.length === 1) return `${named[0]} is still slow to land.`;

  const list = `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`;
  return `${list} are still slow to land.`;
}

/**
 * Die Ergebniszeile eines Drills -- und **nur, was stimmt** (CLAUDE.md 2.6).
 *
 * Verglichen wird der Median der geuebten langsamen Zeichen mit dem Median
 * derselben Zeichen von vor dem Drill. Der Zusatz "down from" steht nur da,
 * wenn es wirklich schneller wurde; ein Rueckschritt bekommt keine Zeile
 * (kein Schuldton, CLAUDE.md 2.8), und ohne eine einzige richtige Antwort
 * gibt es nichts zu berichten.
 *
 * Zehn Abfragen sind ausserdem eine kleine Stichprobe -- der Satz behauptet
 * deshalb ein Ergebnis dieses Laufs, kein neues Koennen.
 */
function drillResult(session: SessionState, target: DrillTarget | null): string | null {
  if (session.kind !== 'drill' || target === null) return null;

  const now = attemptMedianOver(session.attempts, target.characters);
  if (now === null) return null;

  const line = `Median ${now.toFixed(1)} s`;
  return target.before !== null && now < target.before
    ? `${line} — down from ${target.before.toFixed(1)} s.`
    : `${line}.`;
}

/**
 * Das Zeichen des Probetons in den Einstellungen: R (dit-dah-dit).
 *
 * Kurz genug, um nicht zu nerven, und es enthaelt beide Elementlaengen -- bei
 * einem reinen dah hoerte man die Tonhoehe, aber nicht, wie sich ein dit
 * anfuehlt.
 */
const PREVIEW_CHARACTER = 'R';


/** Das Muster eines Zeichens -- nur fuers Feedback, nie waehrend des Tons. */
function patternOf(char: string): string {
  return encodeChar(char) ?? '';
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
 *
 * **Das Tempo steht in derselben Zeile** (Ruling #83, B.11): eine stille Zahl
 * hinter demselben Trennpunkt, kein eigener Platz und keine Auszeichnung. Im
 * Moment einer Stufe zeigt sie die Bewegung ("10 → 11 wpm"), danach nur den
 * Wert. Kein Jubel, kein Konfetti -- die Zeile stellt fest und geht wieder
 * (CLAUDE.md 2.8).
 *
 * Gezeigt wird das **Niveau**, nicht der gezogene Wert der laufenden Sitzung:
 * ab Variabilitaets-Stufe 2 streut das Tempo um +/-10 %, und diese Streuung
 * ist eine Eigenschaft der Sitzung, keine des Fortschritts. Dass es so ist,
 * sagt der Settings-Screen in einem Satz statt es zu verschweigen
 * (CLAUDE.md 2.6).
 */
function Footer({
  day,
  done,
  wpm,
  speedUp,
}: {
  day: DayStats;
  done: number;
  /** Das Tempo-Niveau -- oder null, solange die Progression nicht laeuft. */
  wpm: number | null;
  /** Die gerade gefallene Stufe, oder null. */
  speedUp: { readonly from: number; readonly to: number } | null;
}) {
  return (
    <footer className="footer">
      <p className="footer-stats">
        {dayQuotaLine(day)}
        {speedUp !== null
          ? ` · ${speedUp.from} → ${speedUp.to} wpm`
          : wpm !== null
            ? ` · ${wpm} wpm`
            : ''}
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

/**
 * Die Antwortflaeche -- Dreier-Gitter oder festes Tastenfeld.
 *
 * Sie ist in jeder Phase sichtbar und ausserhalb von 'answering' deaktiviert
 * -- eine **dokumentierte Ausnahme von Guidelines 1.1 §7** ("hide what can't
 * be used"): die Tasten sind der Kontext der Frage. Wer den Ton hoert, soll
 * schon sehen, *woraus* er gleich waehlt; eine Flaeche, die erst nach dem Ton
 * einblendet, laesst den Blick jedes Mal neu suchen und verschiebt die
 * gemessene Reaktionszeit um genau diese Suche. Review-6-Ruling,
 * Notion-Log #43.
 *
 * **Zwei Formen, eine Schwelle.** Bis zwoelf aktive Zeichen das gewachsene
 * Dreier-Gitter, ab dreizehn das feste Tastenfeld ueber alle 36 Positionen
 * (Ruling Fable, Notion-Log #75). Die Schwelle und die Positionen stehen in
 * `ui/keypad.ts`; hier wird nur gerendert.
 *
 * Im Tastenfeld tragen die Tasten, die gerade **nicht** abgefragt werden,
 * `data-active="false"`: gedimmt, nicht bedienbar, aber ortsfest da -- noch
 * nicht eingefuehrte Zeichen, und in einer Speed round auch die, die diesmal
 * nicht dran sind.
 *
 * Genau darum dimmt das Tastenfeld -- anders als das Dreier-Gitter -- **nicht
 * zusaetzlich nach Phase** (styles.css, `.keypad`): der eine Dimm-Zustand
 * gehoert der Zugehoerigkeit zum Satz, sonst waeren zwei Bedeutungen auf
 * derselben Eigenschaft. Dass gerade nicht getippt werden kann,
 * sagen Augenbraue, Frage und der amberne Play-Kreis.
 */
function Answers({
  pool,
  keypad,
  enabled,
  attempt,
  onAnswer,
}: {
  pool: readonly string[];
  /** Festes Tastenfeld statt Dreier-Gitter -- entschieden in `usesKeypad`. */
  keypad: boolean;
  enabled: boolean;
  attempt: { char: string; answer: string; correct: boolean } | null;
  onAnswer: (choice: string) => void;
}) {
  const asked = new Set(pool);
  const positions = keypad ? KEYPAD_LAYOUT : pool;

  return (
    <>
    <div className={keypad ? 'keypad' : 'answers'}>
      {positions.map((char) => {
        // Ausserhalb des Tastenfelds steht ohnehin nur der Pool da.
        const active = !keypad || asked.has(char);
        const mark =
          attempt === null || !active
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
            data-active={keypad ? String(active) : undefined}
            /* Die erste Ziffer beginnt eine neue Reihe (styles.css). */
            data-row-start={keypad && char === KEYPAD_ROW_BREAK ? 'true' : undefined}
            disabled={!enabled || !active}
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
              {!active && ' — not in this round'}
            </span>
          </button>
        );
      })}
    </div>
    {/*
      Ab 900 px, nur beim Tastenfeld (styles.css, `.keypad-hint`): die
      physische Tastatur beantwortet schon seit Runde U1 direkt (der
      keydown-Listener oben) -- am Laptop steht jetzt dabei, dass es sie
      gibt (Ruling Notion-Log #96, Teil B.6).
    */}
    {keypad && <p className="keypad-hint">or just type — the keyboard answers too</p>}
    </>
  );
}

function Summary({
  kind,
  summary,
  streak,
  drillResult,
  onRestart,
  headingRef,
}: {
  kind: SessionKind;
  summary: ReturnType<typeof summarize>;
  streak: StreakStanding;
  /** Die Ergebniszeile eines Drills, oder null (auch bei normalen Sitzungen). */
  drillResult: string | null;
  onRestart: () => void;
  headingRef: (element: HTMLElement | null) => void;
}) {
  const drill = kind === 'drill';
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
        {drill ? 'Speed round done' : 'Session done'}
      </h2>

      <dl className="facts">
        <div>
          <dt>Correct</dt>
          <dd>
            {summary.hits} of {summary.rounds}
          </dd>
        </div>
        {/*
          Im Drill steht der Median in der Zeile darunter, und zwar nur ueber
          die geuebten langsamen Zeichen. Beides zugleich zu zeigen hiesse,
          zwei verschiedene Zahlen "Median" zu nennen (CLAUDE.md 2.6).
        */}
        {!drill && (
          <div>
            <dt>Median response</dt>
            <dd>
              {summary.medianReactionSeconds === null
                ? '—'
                : `${summary.medianReactionSeconds.toFixed(1)} s`}
            </dd>
          </div>
        )}
      </dl>

      {drillResult !== null && <p className="note">{drillResult}</p>}

      {/*
        Die Streak-Zeile steht *unter* den Zahlen, nicht ueber ihnen: geuebt
        wird fuer das Koennen, nicht fuer die Reihe (CLAUDE.md 2.4). An dieser
        Stelle traegt sie den frisch verbuchten Tag -- der faellt in advance(),
        wenn die Sitzung beendet ist.
      */}
      <p className="streak-note">{streakLine(streak)}</p>

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
          {drill ? 'Back to practice' : 'Practise again'}
        </button>
      </div>
    </section>
  );
}
