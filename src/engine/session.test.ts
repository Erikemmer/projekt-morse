/**
 * Tests fuer den Lernloop: Statistik, Auswahl, Zustandsautomat.
 *
 * Der Zufall kommt ueberall als Parameter herein, damit hier nichts gewuerfelt
 * wird -- eine gewichtete Ziehung, die "meistens" stimmt, ist kein Test.
 */

import { describe, expect, it } from 'vitest';

import { pickNext, weightFor } from './selection';
import {
  advance,
  beginPlayback,
  createSession,
  promptFinished,
  submitAnswer,
  summarize,
  type SessionState,
} from './session';
import {
  CHARACTER_ORDER,
  CHARACTER_WPM,
  STARTING_CHARACTERS,
  STARTING_EFFECTIVE_WPM,
  ROUNDS_PER_SESSION,
} from './settings';
import { SPEED_LOCKOUT_ANSWERS, SPEED_STEP_WPM } from './tempo';
import {
  RECENT_ANSWER_WINDOW,
  RECENT_SAMPLES,
  beginSession,
  dayAccuracy,
  dayFor,
  emptyProgress,
  hitRate,
  markIntroSeen,
  medianReaction,
  parseProgress,
  recordAttempt,
  recordFor,
} from './stats';

/** Zufallsquelle mit fester Folge -- wiederholt den letzten Wert, wenn sie leer ist. */
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

/** Leerer Fortschritt mit vorgegebenem aktiven Zeichensatz. */
function progressWith(activeCharacters: string[]) {
  return { ...emptyProgress(), activeCharacters };
}

describe('Statistik pro Zeichen', () => {
  it('zaehlt Versuche und Treffer getrennt', () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, 'K', true, 1, '2026-09-01');
    progress = recordAttempt(progress, 'K', false, 2, '2026-09-01');
    progress = recordAttempt(progress, 'K', true, 1.5, '2026-09-01');

    const record = recordFor(progress, 'K');
    expect(record.attempts).toBe(3);
    expect(record.hits).toBe(2);
    expect(hitRate(record)).toBeCloseTo(2 / 3, 12);
  });

  it('erfasst Reaktionszeiten nur von richtigen Antworten', () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, 'M', true, 0.8, '2026-09-01');
    progress = recordAttempt(progress, 'M', false, 9, '2026-09-01');

    expect(recordFor(progress, 'M').recentReactions).toEqual([0.8]);
    expect(medianReaction(recordFor(progress, 'M'))).toBe(0.8);
  });

  it('behaelt nur die juengsten Zeiten und waechst nicht unbegrenzt', () => {
    let progress = emptyProgress();
    for (let i = 0; i < RECENT_SAMPLES + 5; i += 1) {
      progress = recordAttempt(progress, 'S', true, i, '2026-09-01');
    }

    const { recentReactions } = recordFor(progress, 'S');
    expect(recentReactions).toHaveLength(RECENT_SAMPLES);
    expect(recentReactions[recentReactions.length - 1]).toBe(RECENT_SAMPLES + 4);
  });

  it('nimmt den Median, nicht den Mittelwert -- ein Ausreisser kippt nichts', () => {
    let progress = emptyProgress();
    for (const seconds of [1, 1, 1, 30]) progress = recordAttempt(progress, 'R', true, seconds, '2026-09-01');

    expect(medianReaction(recordFor(progress, 'R'))).toBe(1);
  });

  it('laesst den Eingabe-Fortschritt unveraendert', () => {
    const before = emptyProgress();
    const after = recordAttempt(before, 'U', true, 1, '2026-09-01');

    expect(before.characters).toEqual({});
    expect(after.characters.U.attempts).toBe(1);
  });

  it('hat ohne Versuche keine Quote und keinen Median', () => {
    const record = recordFor(emptyProgress(), 'A');
    expect(hitRate(record)).toBeNull();
    expect(medianReaction(record)).toBeNull();
  });
});

describe('Persistenz', () => {
  it('liest einen gespeicherten Stand verlustfrei zurueck', () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, 'K', true, 0.9, '2026-09-01');
    progress = recordAttempt(progress, 'M', false, 4, '2026-09-01');

    expect(parseProgress(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
  });

  it('fuellt fehlende Felder mit Defaults, statt den Stand zu verwerfen', () => {
    // Ein aelterer Stand ohne recentReactions -- additive Felder duerfen nichts kosten.
    const parsed = parseProgress({ version: 1, characters: { K: { attempts: 5, hits: 3 } } });

    expect(parsed.characters.K).toEqual({ attempts: 5, hits: 3, recentReactions: [] });
  });

  it('deckelt Unmoegliches, statt es zu uebernehmen', () => {
    const parsed = parseProgress({
      characters: { K: { attempts: 2, hits: 99, recentReactions: [1, -3, 'x', Number.NaN] } },
    });

    expect(parsed.characters.K.hits).toBe(2);
    expect(parsed.characters.K.recentReactions).toEqual([1]);
  });

  it('ergibt fuer Muell einen leeren, brauchbaren Stand', () => {
    for (const raw of [null, undefined, 42, 'nope', [], {}]) {
      expect(parseProgress(raw)).toEqual(emptyProgress());
    }
  });
});

describe('Auswahl nach Schwaeche', () => {
  it('bevorzugt ein noch nie gehoertes Zeichen', () => {
    let progress = emptyProgress();
    for (let i = 0; i < 5; i += 1) progress = recordAttempt(progress, 'K', true, 0.5, '2026-09-01');

    expect(weightFor(progress, 'M')).toBeGreaterThan(weightFor(progress, 'K'));
  });

  it('gewichtet ein oft verfehltes Zeichen hoeher als ein sicheres', () => {
    let progress = emptyProgress();
    for (let i = 0; i < 4; i += 1) {
      progress = recordAttempt(progress, 'K', true, 0.5, '2026-09-01');
      progress = recordAttempt(progress, 'M', false, 0, '2026-09-01');
    }

    expect(weightFor(progress, 'M')).toBeGreaterThan(weightFor(progress, 'K'));
  });

  it('gewichtet langsames Erkennen hoeher als schnelles -- bei gleicher Quote', () => {
    let progress = emptyProgress();
    for (let i = 0; i < 4; i += 1) {
      progress = recordAttempt(progress, 'K', true, 0.4, '2026-09-01');
      progress = recordAttempt(progress, 'M', true, 4, '2026-09-01');
    }

    expect(hitRate(recordFor(progress, 'K'))).toBe(hitRate(recordFor(progress, 'M')));
    expect(weightFor(progress, 'M')).toBeGreaterThan(weightFor(progress, 'K'));
  });

  it('zieht deterministisch entlang der Gewichte', () => {
    const progress = emptyProgress();
    // Alle ungeuebt, also gleich gewichtet: das Los faellt rein nach Position.
    const pool = ['K', 'M', 'R', 'S'];
    expect(pickNext(pool, progress, { random: () => 0 })).toBe('K');
    expect(pickNext(pool, progress, { random: () => 0.3 })).toBe('M');
    expect(pickNext(pool, progress, { random: () => 0.6 })).toBe('R');
    expect(pickNext(pool, progress, { random: () => 0.99 })).toBe('S');
  });

  it('wiederholt das letzte Zeichen nicht direkt', () => {
    const pool = ['K', 'M'];
    for (const random of [() => 0, () => 0.5, () => 0.999]) {
      expect(pickNext(pool, emptyProgress(), { random, avoid: 'K' })).toBe('M');
    }
  });

  it('fragt lieber doppelt als gar nicht, wenn nur ein Zeichen uebrig ist', () => {
    expect(pickNext(['K'], emptyProgress(), { random: () => 0.5, avoid: 'K' })).toBe('K');
  });

  it('lehnt einen leeren Zeichensatz ab', () => {
    expect(() => pickNext([], emptyProgress(), { random: () => 0 })).toThrow(RangeError);
  });
});

describe('Lernloop', () => {
  const start = (): SessionState =>
    createSession({
      totalRounds: 3,
      progress: progressWith(['K', 'M']),
      random: sequence([0, 0.9, 0]), today: '2026-09-01' });

  it('beginnt bereit, nicht spielend', () => {
    const state = start();
    expect(state.phase).toBe('ready');
    expect(state.round).toBe(1);
    expect(state.promptEndsAt).toBeNull();
  });

  it('laeuft hoeren -> antworten -> Feedback durch', () => {
    let state = start();
    state = beginPlayback(state, 10);
    expect(state.phase).toBe('listening');

    state = promptFinished(state);
    expect(state.phase).toBe('answering');

    state = submitAnswer(state, state.prompt, 10.8);
    expect(state.phase).toBe('feedback');
    expect(state.lastAttempt?.correct).toBe(true);
    expect(state.lastAttempt?.reactionSeconds).toBeCloseTo(0.8, 12);
  });

  it('misst die Reaktion ab dem Ende des Tons, nicht ab seinem Anfang', () => {
    let state = start();
    // Ton endet bei 12.5 auf der Audio-Uhr, Antwort bei 13.1.
    state = promptFinished(beginPlayback(state, 12.5));
    state = submitAnswer(state, state.prompt, 13.1);

    expect(state.lastAttempt?.reactionSeconds).toBeCloseTo(0.6, 12);
  });

  it('nimmt waehrend des Hoerens keine Antwort an', () => {
    let state = beginPlayback(start(), 10);
    const unchanged = submitAnswer(state, state.prompt, 10.2);

    expect(unchanged).toBe(state);
    expect(unchanged.attempts).toHaveLength(0);
  });

  it('verbucht einen zweiten Klick nicht als zweiten Versuch', () => {
    let state = promptFinished(beginPlayback(start(), 10));
    state = submitAnswer(state, state.prompt, 10.5);
    const again = submitAnswer(state, state.prompt, 10.7);

    expect(again).toBe(state);
    expect(again.attempts).toHaveLength(1);
  });

  it('zaehlt Wiederholungen vor der Antwort, Nachhoeren danach nicht', () => {
    let state = promptFinished(beginPlayback(start(), 10));
    state = promptFinished(beginPlayback(state, 12));
    state = submitAnswer(state, state.prompt, 12.4);
    expect(state.lastAttempt?.replays).toBe(1);

    // Nach der Aufloesung nochmal hoeren aendert weder Phase noch Datensatz.
    const afterReview = beginPlayback(state, 14);
    expect(afterReview.phase).toBe('feedback');
    expect(afterReview.replays).toBe(state.replays);
  });

  it('schreibt jede Antwort in die Statistik des gesendeten Zeichens', () => {
    let state = promptFinished(beginPlayback(start(), 10));
    const sent = state.prompt;
    state = submitAnswer(state, sent === 'K' ? 'M' : 'K', 11);

    expect(recordFor(state.progress, sent).attempts).toBe(1);
    expect(recordFor(state.progress, sent).hits).toBe(0);
  });

  it('geht erst nach dem Feedback weiter und wiederholt das Zeichen nicht', () => {
    let state = promptFinished(beginPlayback(start(), 10));
    const first = state.prompt;

    expect(advance(state, () => 0)).toBe(state); // noch keine Antwort
    state = submitAnswer(state, first, 10.5);
    state = advance(state, () => 0);

    expect(state.round).toBe(2);
    expect(state.phase).toBe('ready');
    expect(state.prompt).not.toBe(first);
    expect(state.replays).toBe(0);
    expect(state.promptEndsAt).toBeNull();
  });

  it('endet nach der letzten Runde', () => {
    let state = start();
    for (let round = 0; round < 3; round += 1) {
      state = promptFinished(beginPlayback(state, round * 5));
      state = submitAnswer(state, state.prompt, round * 5 + 1);
      state = advance(state, () => 0);
    }

    expect(state.phase).toBe('finished');
    expect(state.attempts).toHaveLength(3);
  });

  it('fasst die Sitzung nur ueber richtige Antworten zusammen', () => {
    let state = start();
    const answers = [true, false, true];
    for (const correct of answers) {
      state = promptFinished(beginPlayback(state, 0));
      state = submitAnswer(state, correct ? state.prompt : `${state.prompt}?`, 1);
      state = advance(state, () => 0);
    }

    const summary = summarize(state);
    expect(summary.rounds).toBe(3);
    expect(summary.hits).toBe(2);
    expect(summary.accuracy).toBeCloseTo(2 / 3, 12);
    expect(summary.medianReactionSeconds).toBeCloseTo(1, 12);
  });

  it('hat vor der ersten Antwort keine Quote zu behaupten', () => {
    const summary = summarize(start());
    expect(summary.accuracy).toBeNull();
    expect(summary.medianReactionSeconds).toBeNull();
  });

  it('uebt den aktiven Zeichensatz aus dem Fortschritt', () => {
    const state = createSession({ totalRounds: 3, progress: emptyProgress(), random: () => 0, today: '2026-09-01' });
    expect([...state.pool]).toEqual([...STARTING_CHARACTERS]);
  });

  it('lehnt eine Sitzung ohne Zeichen oder ohne Runden ab', () => {
    expect(() =>
      createSession({ progress: progressWith([]), totalRounds: 5, random: () => 0, today: '2026-09-01' }),
    ).toThrow(RangeError);
    expect(() =>
      createSession({ progress: emptyProgress(), totalRounds: 0, random: () => 0, today: '2026-09-01' }),
    ).toThrow(RangeError);
  });
});

describe('Voreinstellungen', () => {
  it('startet mit einem kontrastreichen Zeichensatz', () => {
    expect([...STARTING_CHARACTERS]).toEqual(['K', 'M', 'R', 'S', 'U', 'A']);
    expect(new Set(STARTING_CHARACTERS).size).toBe(STARTING_CHARACTERS.length);
  });

  it('haelt eine Sitzung kurz genug, um sie zu Ende zu bringen', () => {
    expect(ROUNDS_PER_SESSION).toBeGreaterThan(0);
  });
});

/**
 * Der Tages-Eimer, der Sitzungszaehler und der Intro-Merker.
 *
 * Alle drei sind additiv dazugekommen (CLAUDE.md 4). Geprueft wird deshalb vor
 * allem zweierlei: dass ein *alter* Stand ohne diese Felder weiter laedt, und
 * dass "heute" wirklich heute meint -- eine Quote von gestern unter "Today" zu
 * zeigen waere eine falsche Behauptung (CLAUDE.md 2.6).
 */
describe('Tagesstatistik, Sitzungszaehler, Intro-Merker', () => {
  const MON = '2026-09-01';
  const TUE = '2026-09-02';

  it('zaehlt Versuche und Treffer des laufenden Tages', () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, 'K', true, 1, MON);
    progress = recordAttempt(progress, 'M', false, 1, MON);
    progress = recordAttempt(progress, 'K', true, 1, MON);

    expect(progress.day.date).toBe(MON);
    expect(progress.day.attempts).toBe(3);
    expect(progress.day.hits).toBe(2);
    // K zweimal, M einmal -- gezaehlt werden verschiedene Zeichen, nicht Versuche.
    expect(progress.day.characters).toEqual(['K', 'M']);
    expect(dayAccuracy(progress.day)).toBeCloseTo(2 / 3);
  });

  it('faengt an einem neuen Tag bei null an, statt gestern weiterzuzaehlen', () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, 'K', true, 1, MON);
    progress = recordAttempt(progress, 'M', true, 1, MON);
    expect(progress.day.attempts).toBe(2);

    progress = recordAttempt(progress, 'R', false, 1, TUE);
    expect(progress.day.date).toBe(TUE);
    expect(progress.day.attempts).toBe(1);
    expect(progress.day.hits).toBe(0);
    expect(progress.day.characters).toEqual(['R']);
  });

  it('liest den Eimer von gestern gar nicht erst als heutigen', () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, 'K', true, 1, MON);

    expect(dayFor(progress, MON).attempts).toBe(1);
    expect(dayFor(progress, TUE).attempts).toBe(0);
    expect(dayAccuracy(dayFor(progress, TUE))).toBeNull();
  });

  it('ohne Antworten gibt es keine Tagesquote', () => {
    expect(dayAccuracy(emptyProgress().day)).toBeNull();
  });

  it('zaehlt begonnene Sitzungen und zieht den Tag dabei nach', () => {
    let progress = emptyProgress();
    expect(progress.sessionsStarted).toBe(0);

    progress = beginSession(progress, MON);
    expect(progress.sessionsStarted).toBe(1);
    progress = recordAttempt(progress, 'K', true, 1, MON);

    progress = beginSession(progress, TUE);
    expect(progress.sessionsStarted).toBe(2);
    // Der neue Tag beginnt leer, noch bevor eine Antwort faellt.
    expect(progress.day.date).toBe(TUE);
    expect(progress.day.attempts).toBe(0);
  });

  it('createSession zaehlt die Sitzung mit', () => {
    const state = createSession({
      totalRounds: 3,
      progress: emptyProgress(),
      random: () => 0,
      today: MON,
    });
    expect(state.progress.sessionsStarted).toBe(1);
    expect(state.today).toBe(MON);
  });

  it('merkt die gesehene Einfuehrung -- und laesst sie danach in Ruhe', () => {
    const fresh = emptyProgress();
    expect(fresh.introSeen).toBe(false);

    const seen = markIntroSeen(fresh);
    expect(seen.introSeen).toBe(true);
    // Zweiter Aufruf gibt denselben Stand zurueck, nicht eine neue Kopie.
    expect(markIntroSeen(seen)).toBe(seen);
  });

  it('ein Stand von vor diesen Feldern laedt weiter -- mit Defaults', () => {
    const old = {
      version: 1,
      characters: { K: { attempts: 4, hits: 3, recentReactions: [1] } },
      activeCharacters: [...STARTING_CHARACTERS],
      recentAnswers: [true, false],
      answersSinceGrowth: 5,
    };

    const parsed = parseProgress(old);
    expect(parsed.characters.K.attempts).toBe(4);
    expect(parsed.sessionsStarted).toBe(0);
    expect(parsed.introSeen).toBe(false);
    expect(parsed.day).toEqual({ date: '', attempts: 0, hits: 0, characters: [] });
  });

  it('ein Tages-Eimer ohne brauchbares Datum wird verworfen, nicht falsch beschriftet', () => {
    const parsed = parseProgress({
      characters: {},
      day: { date: '', attempts: 9, hits: 9, characters: ['K'] },
    });
    expect(parsed.day.attempts).toBe(0);
  });

  it('deckelt mehr Treffer als Versuche im Tages-Eimer', () => {
    const parsed = parseProgress({
      characters: {},
      day: { date: MON, attempts: 2, hits: 7, characters: ['K', 'K'] },
    });
    expect(parsed.day.hits).toBe(2);
    // Doppelte Zeichen sind kein gueltiger Eimer -- einmal zaehlt einmal.
    expect(parsed.day.characters).toEqual(['K']);
  });
});

/*
 * Die Tempo-Progression an der Kante zum Loop (Ruling #83, Teil B).
 *
 * Die Regel selbst steht in tempo.test.ts. Hier geht es nur um die drei
 * Fragen, die der Zustandsautomat entscheidet: greift sie in der normalen
 * Uebung, bleibt sie im Drill draussen, und wirkt sie ab der naechsten Aufgabe
 * statt rueckwirkend auf die laufende.
 */
describe('Tempo-Progression im Loop', () => {
  const DAY = '2026-09-01';

  /** Ein Stand, dem genau eine richtige Antwort zur naechsten Stufe fehlt. */
  function almostFaster() {
    return {
      ...emptyProgress(),
      activeCharacters: [...CHARACTER_ORDER],
      characters: Object.fromEntries(
        CHARACTER_ORDER.map((char) => [char, { attempts: 10, hits: 10, recentReactions: [0.5] }]),
      ),
      recentAnswers: Array.from({ length: RECENT_ANSWER_WINDOW - 1 }, () => true),
      answersSinceGrowth: 40,
      answersSinceSpeedUp: SPEED_LOCKOUT_ANSWERS,
    };
  }

  /** Eine Sitzung, die den Klang unverfaelscht laesst: 0.5 hebt den Jitter auf. */
  function session(progress = almostFaster(), kind: 'practice' | 'drill' = 'practice') {
    return createSession({
      totalRounds: 3,
      progress,
      random: () => 0.5,
      today: DAY,
      kind,
      pool: kind === 'drill' ? ['K', 'M', 'R'] : undefined,
    });
  }

  /** Eine Runde spielen und richtig antworten. */
  function answerCorrectly(state: SessionState) {
    return submitAnswer(promptFinished(beginPlayback(state, 1)), state.prompt, 1.5);
  }

  it('hebt das Tempo in der normalen Uebung und meldet die Bewegung', () => {
    const state = answerCorrectly(session());
    expect(state.progress.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM + SPEED_STEP_WPM);
    expect(state.speedUp).toEqual({
      from: STARTING_EFFECTIVE_WPM,
      to: STARTING_EFFECTIVE_WPM + SPEED_STEP_WPM,
    });
  });

  it('wirkt auf den Klang der laufenden Sitzung -- ab der naechsten Aufgabe', () => {
    const before = session();
    // 0.5 hebt den Stufe-2-Jitter genau auf: der Klang traegt das Niveau.
    expect(before.sound.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM);
    const after = answerCorrectly(before);
    expect(after.sound.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM + SPEED_STEP_WPM);
    // Das Zeichentempo bleibt unangetastet -- variiert werden nur die Pausen.
    expect(CHARACTER_WPM).toBe(20);
  });

  it('addiert die Stufe auf den gezogenen Wert, statt neu zu ziehen', () => {
    // Ein Jitter ungleich null: 0.9 zieht das Tempo nach oben.
    const drawn = createSession({
      totalRounds: 3,
      progress: almostFaster(),
      random: () => 0.9,
      today: DAY,
    });
    const jitter = drawn.sound.effectiveWpm;
    expect(jitter).not.toBe(STARTING_EFFECTIVE_WPM);
    expect(answerCorrectly(drawn).sound.effectiveWpm).toBeCloseTo(jitter + SPEED_STEP_WPM, 12);
  });

  it('nimmt die Meldung mit der naechsten Aufgabe zurueck', () => {
    const stepped = answerCorrectly(session());
    expect(advance(stepped, () => 0.5).speedUp).toBeNull();
  });

  it('greift im Drill nicht -- aus seinem Verlauf folgt keine Stufe', () => {
    const state = answerCorrectly(session(almostFaster(), 'drill'));
    expect(state.progress.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM);
    expect(state.speedUp).toBeNull();
  });

  it('meldet nichts, solange die Regel nicht greift', () => {
    const notYet = { ...almostFaster(), answersSinceSpeedUp: 0 };
    const state = answerCorrectly(session(notYet));
    expect(state.speedUp).toBeNull();
    expect(state.progress.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM);
  });

  it('zaehlt die Sperre nur mit Antworten aus der normalen Uebung', () => {
    const fresh = { ...almostFaster(), answersSinceSpeedUp: 0 };
    expect(answerCorrectly(session(fresh)).progress.answersSinceSpeedUp).toBe(1);
    expect(answerCorrectly(session(fresh, 'drill')).progress.answersSinceSpeedUp).toBe(0);
  });

  it('laedt ein Tempo-Niveau aus dem Speicher und deckelt es am Zeichentempo', () => {
    expect(parseProgress({ characters: {} }).effectiveWpm).toBe(STARTING_EFFECTIVE_WPM);
    expect(parseProgress({ characters: {}, effectiveWpm: 14 }).effectiveWpm).toBe(14);
    expect(parseProgress({ characters: {}, effectiveWpm: 99 }).effectiveWpm).toBe(CHARACTER_WPM);
    expect(parseProgress({ characters: {}, effectiveWpm: 2 }).effectiveWpm).toBe(
      STARTING_EFFECTIVE_WPM,
    );
    expect(parseProgress({ characters: {}, effectiveWpm: 'schnell' }).effectiveWpm).toBe(
      STARTING_EFFECTIVE_WPM,
    );
  });
});
