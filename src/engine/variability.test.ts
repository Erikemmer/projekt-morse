/**
 * Tests fuer die Klang-Variabilitaet.
 *
 * Der Zufall kommt als Parameter herein; hier wird nichts gewuerfelt. Die
 * Bandgrenzen werden mit random()->0 und random()->fast-1 direkt angefahren,
 * nicht statistisch "meistens" getroffen.
 */

import { describe, expect, it } from 'vitest';

import {
  advance,
  beginPlayback,
  createSession,
  promptFinished,
  submitAnswer,
  type SessionState,
} from './session';
import { CHARACTER_ORDER, DEFAULT_TONE_HZ, STARTING_EFFECTIVE_WPM } from './settings';
import { emptyProgress, parseProgress, type Progress } from './stats';
import {
  EFFECTIVE_WPM_JITTER,
  PROMPT_TONE_HZ,
  SESSION_TONE_HZ,
  STAGE_1_MIN_ACTIVE_CHARACTERS,
  STAGE_2_MIN_ACTIVE_CHARACTERS,
  drawPromptTone,
  drawSessionSound,
  variabilityStage,
} from './variability';

/** random()-Wert knapp unter 1 -- trifft die obere Bandgrenze. */
const ALMOST_ONE = 1 - Number.EPSILON;

/** Leerer Fortschritt mit n aktiven Zeichen (aus der Kandidatenreihe). */
function progressWithActive(n: number): Progress {
  return { ...emptyProgress(), activeCharacters: [...CHARACTER_ORDER.slice(0, n)] };
}

/** Zufallsquelle mit fester Folge -- wiederholt den letzten Wert. */
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function startSession(progress: Progress, random: () => number): SessionState {
  return createSession({ totalRounds: 5, progress, random, today: '2026-09-01' });
}

describe('Variabilitaets-Stufen', () => {
  it('leitet die Stufe allein aus der Groesse des aktiven Satzes ab', () => {
    expect(variabilityStage(progressWithActive(6))).toBe(0);
    expect(variabilityStage(progressWithActive(STAGE_1_MIN_ACTIVE_CHARACTERS - 1))).toBe(0);
    expect(variabilityStage(progressWithActive(STAGE_1_MIN_ACTIVE_CHARACTERS))).toBe(1);
    expect(variabilityStage(progressWithActive(STAGE_2_MIN_ACTIVE_CHARACTERS - 1))).toBe(1);
    expect(variabilityStage(progressWithActive(STAGE_2_MIN_ACTIVE_CHARACTERS))).toBe(2);
    expect(variabilityStage(progressWithActive(CHARACTER_ORDER.length))).toBe(2);
  });

  it('Stufe 0 wuerfelt nicht: fest 620 Hz und das Soll-Gesamttempo', () => {
    for (const random of [() => 0, () => 0.5, () => ALMOST_ONE]) {
      const sound = drawSessionSound(progressWithActive(6), random);
      expect(sound).toEqual({
        stage: 0,
        sessionToneHz: DEFAULT_TONE_HZ,
        effectiveWpm: STARTING_EFFECTIVE_WPM,
      });
      expect(drawPromptTone(sound, random)).toBe(DEFAULT_TONE_HZ);
    }
  });

  it('Stufe 1 zieht den Sitzungs-Ton ganzzahlig aus dem Band 560-680', () => {
    const progress = progressWithActive(STAGE_1_MIN_ACTIVE_CHARACTERS);
    expect(drawSessionSound(progress, () => 0).sessionToneHz).toBe(SESSION_TONE_HZ.min);
    expect(drawSessionSound(progress, () => ALMOST_ONE).sessionToneHz).toBe(SESSION_TONE_HZ.max);

    const mid = drawSessionSound(progress, () => 0.5);
    expect(Number.isInteger(mid.sessionToneHz)).toBe(true);
    expect(mid.sessionToneHz).toBeGreaterThanOrEqual(SESSION_TONE_HZ.min);
    expect(mid.sessionToneHz).toBeLessThanOrEqual(SESSION_TONE_HZ.max);
    // Das Tempo variiert auf Stufe 1 noch nicht.
    expect(mid.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM);
  });

  it('Stufe 1: der Ton steht die Sitzung ueber fest, jede Abfrage spielt ihn', () => {
    const sound = drawSessionSound(progressWithActive(8), () => 0.37);
    for (const random of [() => 0, () => 0.9, () => 0.42]) {
      expect(drawPromptTone(sound, random)).toBe(sound.sessionToneHz);
    }
  });

  it('Stufe 2 zieht pro Abfrage aus dem breiteren Band 520-720', () => {
    const sound = drawSessionSound(progressWithActive(12), () => 0.5);
    expect(drawPromptTone(sound, () => 0)).toBe(PROMPT_TONE_HZ.min);
    expect(drawPromptTone(sound, () => ALMOST_ONE)).toBe(PROMPT_TONE_HZ.max);
    expect(drawPromptTone(sound, () => 0.5)).not.toBe(drawPromptTone(sound, () => 0.1));
  });

  it('Stufe 2 streut das Gesamttempo um hoechstens +/-10 % -- das Zeichentempo nie', () => {
    const progress = progressWithActive(12);
    // random-Folge: [Ton, Tempo]. 0 -> -10 %, fast 1 -> +10 %.
    const slow = drawSessionSound(progress, sequence([0.5, 0]));
    const fast = drawSessionSound(progress, sequence([0.5, ALMOST_ONE]));

    expect(slow.effectiveWpm).toBeCloseTo(STARTING_EFFECTIVE_WPM * (1 - EFFECTIVE_WPM_JITTER), 9);
    expect(fast.effectiveWpm).toBeCloseTo(STARTING_EFFECTIVE_WPM * (1 + EFFECTIVE_WPM_JITTER), 6);

    // Das Zeichentempo ist keine Stellgroesse dieser Mechanik: SessionSound
    // fuehrt es gar nicht erst -- was es nicht gibt, kann niemand variieren.
    expect('characterWpm' in slow).toBe(false);
  });
});

describe('Variabilitaet in der Sitzung', () => {
  it('unter Stufe 2 behaelt jede Abfrage den Sitzungs-Ton, auch ueber advance', () => {
    let state = startSession(progressWithActive(8), sequence([0.7, 0.1, 0.9, 0.3]));
    const tone = state.sound.sessionToneHz;
    expect(state.promptToneHz).toBe(tone);

    state = promptFinished(beginPlayback(state, 10));
    state = submitAnswer(state, state.prompt, 10.5);
    state = advance(state, () => 0.9);
    expect(state.promptToneHz).toBe(tone);
  });

  it('auf Stufe 2 zieht jede Abfrage neu -- eine Wiederholung derselben aber nicht', () => {
    let state = startSession(progressWithActive(12), sequence([0.5, 0.5, 0.1]));
    const first = state.promptToneHz;

    // Wiederholen (nochmal abspielen) aendert den Ton der Abfrage nicht.
    state = promptFinished(beginPlayback(state, 10));
    state = beginPlayback(state, 12);
    expect(state.promptToneHz).toBe(first);

    state = promptFinished(state);
    state = submitAnswer(state, state.prompt, 12.5);
    state = advance(state, () => 0.95);
    expect(state.promptToneHz).not.toBe(first);
    expect(state.promptToneHz).toBeGreaterThanOrEqual(PROMPT_TONE_HZ.min);
    expect(state.promptToneHz).toBeLessThanOrEqual(PROMPT_TONE_HZ.max);
  });

  it('laesst Statistik und Wachstumsregel von der Tonhoehe unberuehrt', () => {
    // Zwei Sitzungen, gleiche Antworten, verschiedene Klaenge: der Fortschritt
    // danach ist byte-gleich. Toene stehen nirgends in den Daten.
    const play = (state: SessionState): Progress => {
      let s = promptFinished(beginPlayback(state, 10));
      s = submitAnswer(s, s.prompt, 10.5);
      return s.progress;
    };

    const base = progressWithActive(12);
    const a = play(startSession(base, sequence([0.1, 0.2, 0.99])));
    const b = play(startSession(base, sequence([0.9, 0.7, 0.99])));
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toContain('Hz');
  });

  it('Stufe 0 verhaelt sich exakt wie vor der Mechanik', () => {
    const state = startSession(emptyProgress(), () => 0.99);
    expect(state.sound.stage).toBe(0);
    expect(state.promptToneHz).toBe(DEFAULT_TONE_HZ);
    expect(state.sound.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM);
    expect(state.showVariabilityNotice).toBe(false);
  });
});

describe('Die einmalige Zeile', () => {
  it('erscheint genau einmal: beim ersten Start mit Stufe >= 1', () => {
    const first = startSession(progressWithActive(8), () => 0.5);
    expect(first.showVariabilityNotice).toBe(true);
    expect(first.progress.variabilityNoticeSeen).toBe(true);

    const second = startSession(first.progress, () => 0.5);
    expect(second.showVariabilityNotice).toBe(false);
  });

  it('erscheint nicht, solange Stufe 0 gilt -- und das Flag bleibt frei', () => {
    const state = startSession(progressWithActive(7), () => 0.5);
    expect(state.showVariabilityNotice).toBe(false);
    expect(state.progress.variabilityNoticeSeen).toBe(false);
  });

  it('ueberlebt die Reise durch JSON und alte Staende bekommen den Default', () => {
    const seen = { ...emptyProgress(), variabilityNoticeSeen: true };
    expect(parseProgress(JSON.parse(JSON.stringify(seen))).variabilityNoticeSeen).toBe(true);
    expect(parseProgress({ version: 1, characters: {} }).variabilityNoticeSeen).toBe(false);
  });
});
