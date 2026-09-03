/**
 * Tests fuer den Sende-Loop (Ruling #90, Praezisierungen #101).
 *
 * Der wichtigste Block steht bei "Sitzungs-Schaetzung ueber mehrere
 * Versuche": der Fall, den #90 offen liess (#101a) -- ohne die
 * Sitzungs-Schaetzung waere ein einzelnes "E" nie von einem einzelnen "T" zu
 * unterscheiden.
 */

import { describe, expect, it } from 'vitest';

import { CHARACTER_ORDER } from './settings';
import { emptyProgress, type CharacterRecord, type Progress } from './stats';
import {
  SEND_ATTEMPTS_KEPT,
  SEND_MAX_TAP_LENGTH,
  advanceSend,
  appendSendInterval,
  appendTap,
  beginSendPlayback,
  createSendSession,
  deleteTap,
  retuneSendHomeTone,
  sendPlaybackFinished,
  sentToday,
  setSendMode,
  submitSend,
  type SendSessionState,
} from './sendSession';

const TODAY = '2026-09-03';
const DIT = 0.06; // Zieldit bei 20 WPM
const DAH = 0.18; // 3 x dit

function characterRecord(attempts: number, hits: number): CharacterRecord {
  return { attempts, hits, recentReactions: [0.5] };
}

/** Ein Stand mit allen Zeichen aktiv -- der Normalfall dieses Modus. */
function fullProgress(patch: Partial<Progress> = {}): Progress {
  const characters: Record<string, CharacterRecord> = {};
  for (const char of CHARACTER_ORDER) characters[char] = characterRecord(10, 10);
  return { ...emptyProgress(), activeCharacters: [...CHARACTER_ORDER], characters, ...patch };
}

function unit(progress = fullProgress()): SendSessionState {
  return createSendSession({ progress, random: () => 0.5, today: TODAY });
}

/** Ein Zeichen zu Rand fixieren, damit ein Test genau weiss, was es sendet. */
function unitFor(char: string, progress = fullProgress()): SendSessionState {
  const state = unit(progress);
  return { ...state, prompt: char };
}

/** Ein sauber getastetes R (dit-dah-dit) bei 20 WPM, Element fuer Element. */
function keyPerfectR(state: SendSessionState): SendSessionState {
  let current = appendSendInterval(state, { downAt: 0, upAt: DIT });
  current = appendSendInterval(current, { downAt: DIT * 2, upAt: DIT * 2 + DAH });
  current = appendSendInterval(current, { downAt: DIT * 2 + DAH + DIT, upAt: DIT * 2 + DAH + DIT * 2 });
  return current;
}

describe('Sende-Modus: der Anfang', () => {
  it('steht bereit, ohne Eingabe, im Tastungsweg', () => {
    const state = unit();
    expect(state.phase).toBe('ready');
    expect(state.mode).toBe('keyed');
    expect(state.intervals).toEqual([]);
    expect(state.taps).toEqual([]);
    expect(state.attempts).toEqual([]);
  });

  it('uebt den aktiven Zeichensatz', () => {
    expect(unit().pool).toEqual([...CHARACTER_ORDER]);
    expect(unit().pool).toContain(unit().prompt);
  });

  it('meldet fuer heute noch nichts gesendet', () => {
    expect(sentToday(unit())).toBe(0);
  });

  it('zaehlt die Sitzung nicht hoch', () => {
    const progress = fullProgress({ sessionsStarted: 4 });
    expect(unit(progress).progress.sessionsStarted).toBe(4);
  });

  it('zieht den Tages-Eimer auf heute nach', () => {
    const progress = fullProgress({
      day: { date: '2026-09-01', attempts: 5, hits: 5, characters: ['K'], words: 0, sent: 6 },
    });
    expect(unit(progress).progress.day).toEqual({
      date: TODAY,
      attempts: 0,
      hits: 0,
      characters: [],
      words: 0,
      sent: 0,
    });
  });

  it('startet die Sitzungs-Schaetzung des dits leer', () => {
    expect(unit().ditHistory).toEqual([]);
  });
});

describe('"Hear it": nur aus dem Ausgangszustand', () => {
  it('spielt die Referenz und kehrt danach in den Ausgangszustand zurueck', () => {
    let state = beginSendPlayback(unit());
    expect(state.phase).toBe('listening');
    state = sendPlaybackFinished(state);
    expect(state.phase).toBe('ready');
  });

  it('ist waehrend einer laufenden Eingabe gesperrt', () => {
    const state = keyPerfectR(unit());
    expect(beginSendPlayback(state).phase).toBe('sending');
  });
});

describe('Tastung (mode: keyed)', () => {
  it('hebt die Aufgabe beim ersten Element von ready nach sending', () => {
    const state = appendSendInterval(unit(), { downAt: 0, upAt: DIT });
    expect(state.phase).toBe('sending');
    expect(state.intervals).toHaveLength(1);
  });

  it('ignoriert Intervalle im getippten Modus', () => {
    const state = setSendMode(unit(), 'tapped');
    const after = appendSendInterval(state, { downAt: 0, upAt: DIT });
    expect(after).toBe(state);
  });

  it('dekodiert einen sauberen Versuch und schickt ihn ab', () => {
    const state = submitSend(keyPerfectR(unitFor('R')));
    expect(state.phase).toBe('feedback');
    expect(state.lastAttempt).not.toBeNull();
    expect(state.lastAttempt?.decodedCharacter).toBe('R');
    expect(state.lastAttempt?.correct).toBe(true);
    expect(state.lastAttempt?.mode).toBe('keyed');
    expect(state.lastAttempt?.dahDitRatio).toBeCloseTo(3.0, 5);
    expect(state.lastAttempt?.deviation).toBeNull();
  });

  it('tut ohne ein einziges Element nichts -- kein Versuch, kein Uebersprung', () => {
    const state = submitSend(unit());
    expect(state.phase).toBe('ready');
    expect(state.lastAttempt).toBeNull();
  });

  it('erkennt eine falsche Antwort und meldet, was stattdessen dekodiert wurde', () => {
    // Sauberes "T" (ein einzelnes dah) statt des verlangten "R".
    const state = submitSend(appendSendInterval(unitFor('R'), { downAt: 0, upAt: DAH }));
    expect(state.lastAttempt?.correct).toBe(false);
    expect(state.lastAttempt?.decodedCharacter).toBe('T');
  });
});

describe('"Tap it in" (mode: tapped, Teil E.16)', () => {
  it('wechselt nur aus dem Ausgangszustand', () => {
    const mid = keyPerfectR(unit());
    expect(setSendMode(mid, 'tapped')).toBe(mid);
  });

  it('bewertet nur die Richtigkeit, kein Timing', () => {
    let state = setSendMode(unitFor('R'), 'tapped');
    state = appendTap(state, '.');
    state = appendTap(state, '-');
    state = appendTap(state, '.');
    state = submitSend(state);

    expect(state.lastAttempt?.mode).toBe('tapped');
    expect(state.lastAttempt?.correct).toBe(true);
    expect(state.lastAttempt?.dahDitRatio).toBeNull();
    expect(state.lastAttempt?.gapRatio).toBeNull();
    expect(state.lastAttempt?.wpm).toBeNull();
    expect(state.lastAttempt?.deviation).toBeNull();
  });

  it('loescht das letzte getippte Element', () => {
    let state = setSendMode(unit(), 'tapped');
    state = appendTap(state, '.');
    state = appendTap(state, '-');
    state = deleteTap(state);
    expect(state.taps).toEqual(['.']);
    expect(state.phase).toBe('sending');

    state = deleteTap(state);
    expect(state.taps).toEqual([]);
    expect(state.phase).toBe('ready');
  });

  it('deckelt die Eingabe auf SEND_MAX_TAP_LENGTH', () => {
    let state = setSendMode(unit(), 'tapped');
    for (let i = 0; i < 10; i += 1) state = appendTap(state, '.');
    expect(state.taps).toHaveLength(SEND_MAX_TAP_LENGTH);
  });
});

describe('Statistik: getrennt vom Hoertraining (Teil F.17)', () => {
  it('schreibt Versuche und Treffer in eine eigene Sende-Statistik', () => {
    const state = submitSend(keyPerfectR(unitFor('R')));
    expect(state.progress.sendCharacters.R).toEqual({
      attempts: 1,
      correct: 1,
      lastDahDitRatio: expect.closeTo(3.0, 5),
      lastGapRatio: expect.closeTo(1.0, 5),
    });
  });

  it('ruehrt die Hoer-Statistik desselben Zeichens nicht an', () => {
    const before = fullProgress().characters.R;
    const state = submitSend(keyPerfectR(unitFor('R')));
    expect(state.progress.characters.R).toEqual(before);
  });

  it('laesst recentAnswers, answersSinceGrowth und answersSinceSpeedUp unberuehrt', () => {
    const progress = fullProgress({
      recentAnswers: [true, false],
      answersSinceGrowth: 7,
      answersSinceSpeedUp: 3,
    });
    const state = submitSend(keyPerfectR(unitFor('R', progress)));
    expect(state.progress.recentAnswers).toEqual([true, false]);
    expect(state.progress.answersSinceGrowth).toBe(7);
    expect(state.progress.answersSinceSpeedUp).toBe(3);
  });

  it('behaelt die zuletzt getasteten Verhaeltnisse, wenn ein getippter Versuch folgt', () => {
    let state = submitSend(keyPerfectR(unitFor('R')));
    state = advanceSend(state, () => 0.5);
    state = { ...state, prompt: 'R' };
    state = setSendMode(state, 'tapped');
    state = appendTap(state, '.');
    state = appendTap(state, '-');
    state = appendTap(state, '.');
    state = submitSend(state);

    expect(state.progress.sendCharacters.R.attempts).toBe(2);
    // Kein Timing im getippten Versuch -- die vorigen Verhaeltnisse bleiben stehen,
    // statt durch eine erfundene Null ersetzt zu werden (CLAUDE.md 2.6).
    expect(state.progress.sendCharacters.R.lastDahDitRatio).toBeCloseTo(3.0, 5);
  });

  it('zaehlt einen abgeschickten Versuch im Tages-Eimer', () => {
    const state = submitSend(keyPerfectR(unitFor('R')));
    expect(sentToday(state)).toBe(1);
  });
});

describe('Streak: nach WORDS_STREAK_MIN_ANSWERS Versuchen (dieselbe Konstante wie #87)', () => {
  it('faellt der Tag nach fuenf Versuchen', () => {
    let state = unitFor('R');
    for (let i = 0; i < 4; i += 1) {
      state = submitSend(keyPerfectR(state));
      state = advanceSend(state, () => 0.5);
      state = { ...state, prompt: 'R' };
    }
    expect(state.progress.streak.lastPracticedDay).toBe('');

    state = submitSend(keyPerfectR(state));
    expect(state.progress.streak.lastPracticedDay).toBe(TODAY);
  });
});

describe('Sitzungs-Schaetzung ueber mehrere Versuche (#101a: E gegen T)', () => {
  it('lernt aus einem Kontrast-Versuch und entscheidet damit den naechsten ohne Kontrast', () => {
    // Erster Versuch: klarer Kontrast (R, dit-dah-dit) -- daraus lernt die
    // Sitzung ihr eigenes dit (60 ms).
    let state = submitSend(keyPerfectR(unitFor('R')));
    expect(state.ditHistory.length).toBeGreaterThan(0);

    state = advanceSend(state, () => 0.5);
    state = { ...state, prompt: 'E' };

    // Ein einzelnes kurzes Element -- ohne Kontrast in sich selbst. Die
    // Sitzungs-Schaetzung (jetzt: echtes dit aus dem R-Versuch) entscheidet.
    state = appendSendInterval(state, { downAt: 0, upAt: DIT });
    state = submitSend(state);

    expect(state.lastAttempt?.decodedCharacter).toBe('E');
    expect(state.lastAttempt?.usedSessionEstimate).toBe(true);
  });

  it('unterscheidet E und T allein ueber die Sitzungs-Schaetzung, ohne jeden Kontrast', () => {
    const state = unitFor('E');
    const asE = submitSend(appendSendInterval(state, { downAt: 0, upAt: DIT }));
    const asT = submitSend(appendSendInterval({ ...state, prompt: 'T' }, { downAt: 0, upAt: DAH }));

    expect(asE.lastAttempt?.decodedCharacter).toBe('E');
    expect(asT.lastAttempt?.decodedCharacter).toBe('T');
    expect(asE.lastAttempt?.usedSessionEstimate).toBe(true);
    expect(asT.lastAttempt?.usedSessionEstimate).toBe(true);
  });
});

describe('advanceSend', () => {
  it('geht nur aus feedback weiter', () => {
    const state = unit();
    expect(advanceSend(state, () => 0.5)).toBe(state);
  });

  it('setzt Eingabe und Phase zurueck, behaelt aber den gewaehlten Eingabeweg', () => {
    let state = setSendMode(unit(), 'tapped');
    state = appendTap(state, '.');
    state = submitSend(state);
    state = advanceSend(state, () => 0.5);

    expect(state.phase).toBe('ready');
    expect(state.taps).toEqual([]);
    expect(state.intervals).toEqual([]);
    expect(state.mode).toBe('tapped');
  });

  it('vermeidet nach Moeglichkeit dieselbe Aufgabe zweimal hintereinander', () => {
    const progress = fullProgress({ activeCharacters: ['K', 'M'] });
    let state = { ...unit(progress), prompt: 'K' };
    state = setSendMode(state, 'tapped');
    state = appendTap(state, '-');
    state = submitSend(state);
    state = advanceSend(state, () => 0);
    expect(state.prompt).toBe('M');
  });
});

describe('retuneSendHomeTone', () => {
  it('stellt den Ton nur auf Variabilitaets-Stufe 0 nach', () => {
    const state = unit(fullProgress({ activeCharacters: ['K', 'M', 'R', 'S', 'U', 'A'] }));
    expect(state.sound.stage).toBe(0);
    const retuned = retuneSendHomeTone(state, 700);
    expect(retuned.promptToneHz).toBe(700);
    expect(retuned.sound.sessionToneHz).toBe(700);
  });

  it('ist ohne Aenderung identisch (===)', () => {
    const state = unit(fullProgress({ activeCharacters: ['K', 'M', 'R', 'S', 'U', 'A'] }));
    expect(retuneSendHomeTone(state, state.sound.sessionToneHz)).toBe(state);
  });
});

describe('Deckel: SEND_ATTEMPTS_KEPT', () => {
  it('haelt hoechstens SEND_ATTEMPTS_KEPT Versuche', () => {
    let state = unitFor('R');
    for (let i = 0; i < SEND_ATTEMPTS_KEPT + 5; i += 1) {
      state = submitSend(keyPerfectR(state));
      state = advanceSend(state, () => 0.5);
      state = { ...state, prompt: 'R' };
    }
    expect(state.attempts.length).toBeLessThanOrEqual(SEND_ATTEMPTS_KEPT);
  });
});
