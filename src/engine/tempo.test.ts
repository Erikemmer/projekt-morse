/**
 * Tests fuer die Tempo-Progression (Ruling #83, Teil B).
 *
 * Gebaut statt durchgespielt, wie bei der Wachstumsregel: jede der vier
 * Bedingungen (voller Zeichensatz, volles 90-%-Fenster, Sperre, Deckel) soll
 * einzeln kippbar sein. Und die Grenzfaelle stehen als eigene Faelle da --
 * "genau an der Schwelle" ist der Fall, an dem eine Regel schief wird.
 */

import { describe, expect, it } from 'vitest';

import { GROWTH_LOCKOUT_ANSWERS, GROWTH_WINDOW_ACCURACY } from './growth';
import { CHARACTER_ORDER, CHARACTER_WPM, STARTING_EFFECTIVE_WPM } from './settings';
import { RECENT_ANSWER_WINDOW, emptyProgress, type Progress } from './stats';
import {
  MAX_EFFECTIVE_WPM,
  SPEED_LOCKOUT_ANSWERS,
  SPEED_STEP_WPM,
  isReadyToSpeedUp,
  maybeSpeedUp,
  resetEffectiveWpm,
  speedProgressionActive,
} from './tempo';

/** Ein Fenster aus `hits` richtigen und dem Rest falschen Antworten. */
function window(hits: number, size = RECENT_ANSWER_WINDOW): boolean[] {
  return Array.from({ length: size }, (_, index) => index < hits);
}

/** Ein Stand, der die Stufe gerade eben ausloest -- Feld fuer Feld verstellbar. */
function ready(patch: Partial<Progress> = {}): Progress {
  return {
    ...emptyProgress(),
    activeCharacters: [...CHARACTER_ORDER],
    recentAnswers: window(RECENT_ANSWER_WINDOW),
    answersSinceSpeedUp: SPEED_LOCKOUT_ANSWERS,
    ...patch,
  };
}

describe('Tempo-Progression: wann sie ueberhaupt laeuft', () => {
  it('laeuft nicht, solange noch Zeichen fehlen', () => {
    expect(speedProgressionActive(emptyProgress())).toBe(false);
    expect(
      speedProgressionActive({
        ...emptyProgress(),
        activeCharacters: [...CHARACTER_ORDER].slice(0, CHARACTER_ORDER.length - 1),
      }),
    ).toBe(false);
  });

  it('laeuft, sobald alle Zeichen der Reihe aktiv sind', () => {
    expect(speedProgressionActive(ready())).toBe(true);
  });

  it('haengt an CHARACTER_ORDER, nicht an einer Zahl -- die Reihenfolge egal', () => {
    const shuffled = [...CHARACTER_ORDER].reverse();
    expect(speedProgressionActive({ ...emptyProgress(), activeCharacters: shuffled })).toBe(true);
  });

  it('zaehlt nicht Laenge, sondern Deckung -- ein Duplikat ersetzt kein Zeichen', () => {
    const withDuplicate = [...CHARACTER_ORDER].slice(0, -1).concat('K');
    expect(withDuplicate.length).toBe(CHARACTER_ORDER.length);
    expect(
      speedProgressionActive({ ...emptyProgress(), activeCharacters: withDuplicate }),
    ).toBe(false);
  });
});

describe('Tempo-Progression: die Regel', () => {
  it('greift, wenn Satz, Fenster und Sperre stimmen', () => {
    expect(isReadyToSpeedUp(ready())).toBe(true);
  });

  it('greift nicht, solange der Zeichensatz nicht vollstaendig ist', () => {
    expect(isReadyToSpeedUp(ready({ activeCharacters: [...'KMRSUAPT'] }))).toBe(false);
  });

  it('braucht ein volles Fenster -- 29 von 29 genuegen nicht', () => {
    const short = window(RECENT_ANSWER_WINDOW - 1, RECENT_ANSWER_WINDOW - 1);
    expect(isReadyToSpeedUp(ready({ recentAnswers: short }))).toBe(false);
  });

  it('liegt genau an der Schwelle richtig (90 % von 30 sind 27)', () => {
    const exactly = Math.ceil(GROWTH_WINDOW_ACCURACY * RECENT_ANSWER_WINDOW);
    expect(exactly).toBe(27);
    expect(isReadyToSpeedUp(ready({ recentAnswers: window(exactly) }))).toBe(true);
    expect(isReadyToSpeedUp(ready({ recentAnswers: window(exactly - 1) }))).toBe(false);
  });

  it('haelt die Sperre ein -- eine Antwort zu wenig, und es passiert nichts', () => {
    expect(isReadyToSpeedUp(ready({ answersSinceSpeedUp: SPEED_LOCKOUT_ANSWERS - 1 }))).toBe(false);
    expect(isReadyToSpeedUp(ready({ answersSinceSpeedUp: SPEED_LOCKOUT_ANSWERS }))).toBe(true);
  });

  it('nutzt dieselbe Sperre wie die Wachstumsregel -- keine zweite Zahl', () => {
    expect(SPEED_LOCKOUT_ANSWERS).toBe(GROWTH_LOCKOUT_ANSWERS);
    expect(SPEED_LOCKOUT_ANSWERS).toBe(20);
  });

  it('endet am Zeichentempo -- der Deckel ist CHARACTER_WPM', () => {
    expect(MAX_EFFECTIVE_WPM).toBe(CHARACTER_WPM);
    expect(isReadyToSpeedUp(ready({ effectiveWpm: MAX_EFFECTIVE_WPM }))).toBe(false);
    expect(isReadyToSpeedUp(ready({ effectiveWpm: MAX_EFFECTIVE_WPM - 1 }))).toBe(true);
  });
});

describe('Tempo-Progression: die Stufe', () => {
  it('hebt um genau eine Stufe und setzt die Sperre zurueck', () => {
    const result = maybeSpeedUp(ready());
    expect(result.from).toBe(STARTING_EFFECTIVE_WPM);
    expect(result.to).toBe(STARTING_EFFECTIVE_WPM + SPEED_STEP_WPM);
    expect(result.progress.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM + SPEED_STEP_WPM);
    expect(result.progress.answersSinceSpeedUp).toBe(0);
  });

  it('laesst das Fenster in Ruhe -- es ist die Bedingung, nicht der Preis', () => {
    const before = ready();
    const result = maybeSpeedUp(before);
    expect(result.progress.recentAnswers).toEqual(before.recentAnswers);
    expect(result.progress.answersSinceGrowth).toBe(before.answersSinceGrowth);
  });

  it('gibt den Stand identisch zurueck, wenn die Regel nicht greift', () => {
    const before = ready({ answersSinceSpeedUp: 0 });
    const result = maybeSpeedUp(before);
    expect(result.progress).toBe(before);
    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
  });

  it('ueberschreitet den Deckel nicht, auch nicht von einem Schritt darunter', () => {
    const result = maybeSpeedUp(ready({ effectiveWpm: MAX_EFFECTIVE_WPM - 1 }));
    expect(result.to).toBe(MAX_EFFECTIVE_WPM);
    // Und danach ist Schluss: der Deckel ist erreicht.
    expect(isReadyToSpeedUp(result.progress)).toBe(false);
  });

  it('geht nie von selbst abwaerts -- auch nicht nach einem schlechten Fenster', () => {
    const bad = ready({ effectiveWpm: 15, recentAnswers: window(3) });
    expect(maybeSpeedUp(bad).progress.effectiveWpm).toBe(15);
  });

  it('steigt Stufe fuer Stufe bis zum Deckel, nie in einem Sprung', () => {
    let progress = ready();
    const seen: number[] = [];
    for (let round = 0; round < 20; round += 1) {
      const result = maybeSpeedUp({ ...progress, answersSinceSpeedUp: SPEED_LOCKOUT_ANSWERS });
      if (result.to === null) break;
      seen.push(result.to);
      progress = result.progress;
    }
    expect(seen).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });
});

describe('Tempo zuruecksetzen (Settings)', () => {
  it('setzt Tempo und Sperre auf den Anfang', () => {
    const reset = resetEffectiveWpm(ready({ effectiveWpm: 16, answersSinceSpeedUp: 12 }));
    expect(reset.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM);
    expect(reset.answersSinceSpeedUp).toBe(0);
  });

  it('schreibt nichts, wenn es nichts zu setzen gibt', () => {
    const untouched = emptyProgress();
    expect(resetEffectiveWpm(untouched)).toBe(untouched);
  });

  it('fasst die Statistik nicht an', () => {
    const before = ready({ effectiveWpm: 14 });
    const reset = resetEffectiveWpm(before);
    expect(reset.characters).toBe(before.characters);
    expect(reset.recentAnswers).toBe(before.recentAnswers);
    expect(reset.activeCharacters).toBe(before.activeCharacters);
  });
});
