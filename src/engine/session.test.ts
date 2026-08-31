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
import { STARTING_CHARACTERS, ROUNDS_PER_SESSION } from './settings';
import {
  RECENT_SAMPLES,
  emptyProgress,
  hitRate,
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
    progress = recordAttempt(progress, 'K', true, 1);
    progress = recordAttempt(progress, 'K', false, 2);
    progress = recordAttempt(progress, 'K', true, 1.5);

    const record = recordFor(progress, 'K');
    expect(record.attempts).toBe(3);
    expect(record.hits).toBe(2);
    expect(hitRate(record)).toBeCloseTo(2 / 3, 12);
  });

  it('erfasst Reaktionszeiten nur von richtigen Antworten', () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, 'M', true, 0.8);
    progress = recordAttempt(progress, 'M', false, 9);

    expect(recordFor(progress, 'M').recentReactions).toEqual([0.8]);
    expect(medianReaction(recordFor(progress, 'M'))).toBe(0.8);
  });

  it('behaelt nur die juengsten Zeiten und waechst nicht unbegrenzt', () => {
    let progress = emptyProgress();
    for (let i = 0; i < RECENT_SAMPLES + 5; i += 1) {
      progress = recordAttempt(progress, 'S', true, i);
    }

    const { recentReactions } = recordFor(progress, 'S');
    expect(recentReactions).toHaveLength(RECENT_SAMPLES);
    expect(recentReactions[recentReactions.length - 1]).toBe(RECENT_SAMPLES + 4);
  });

  it('nimmt den Median, nicht den Mittelwert -- ein Ausreisser kippt nichts', () => {
    let progress = emptyProgress();
    for (const seconds of [1, 1, 1, 30]) progress = recordAttempt(progress, 'R', true, seconds);

    expect(medianReaction(recordFor(progress, 'R'))).toBe(1);
  });

  it('laesst den Eingabe-Fortschritt unveraendert', () => {
    const before = emptyProgress();
    const after = recordAttempt(before, 'U', true, 1);

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
    progress = recordAttempt(progress, 'K', true, 0.9);
    progress = recordAttempt(progress, 'M', false, 4);

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
    for (let i = 0; i < 5; i += 1) progress = recordAttempt(progress, 'K', true, 0.5);

    expect(weightFor(progress, 'M')).toBeGreaterThan(weightFor(progress, 'K'));
  });

  it('gewichtet ein oft verfehltes Zeichen hoeher als ein sicheres', () => {
    let progress = emptyProgress();
    for (let i = 0; i < 4; i += 1) {
      progress = recordAttempt(progress, 'K', true, 0.5);
      progress = recordAttempt(progress, 'M', false, 0);
    }

    expect(weightFor(progress, 'M')).toBeGreaterThan(weightFor(progress, 'K'));
  });

  it('gewichtet langsames Erkennen hoeher als schnelles -- bei gleicher Quote', () => {
    let progress = emptyProgress();
    for (let i = 0; i < 4; i += 1) {
      progress = recordAttempt(progress, 'K', true, 0.4);
      progress = recordAttempt(progress, 'M', true, 4);
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
      random: sequence([0, 0.9, 0]),
    });

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
    const state = createSession({ totalRounds: 3, progress: emptyProgress(), random: () => 0 });
    expect([...state.pool]).toEqual([...STARTING_CHARACTERS]);
  });

  it('lehnt eine Sitzung ohne Zeichen oder ohne Runden ab', () => {
    expect(() =>
      createSession({ progress: progressWith([]), totalRounds: 5, random: () => 0 }),
    ).toThrow(RangeError);
    expect(() =>
      createSession({ progress: emptyProgress(), totalRounds: 0, random: () => 0 }),
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
