/**
 * Tests für die Sende-Dekodierung (Ruling #90, Präzisierungen #101).
 *
 * Der wichtigste Block ist der letzte: der Fall, den #90 offen liess und den
 * #101a entschieden hat -- "E" und "T" lassen sich relativ nicht
 * unterscheiden, und die Sitzungs-Schätzung muss einspringen, ohne sich als
 * Messung auszugeben.
 */

import { describe, expect, it } from 'vitest';

import {
  SEND_DAH_DIT_CLEAN,
  SEND_GAP_CLEAN,
  SEND_TARGET_DIT_SECONDS,
  appendDitHistory,
  biggestSendDeviation,
  decodeSend,
  estimateDitSeconds,
  type SendInterval,
} from './sending';

/** 20-WPM-Zeitachse aus Element- und Pausendauern -- wie ein Nutzer sie tippen würde. */
function timeline(parts: number[]): SendInterval[] {
  const intervals: SendInterval[] = [];
  let cursor = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const duration = parts[index];
    if (index % 2 === 0) {
      intervals.push({ downAt: cursor, upAt: cursor + duration });
    }
    cursor += duration;
  }
  return intervals;
}

const DIT = 0.06; // Zieldit bei 20 WPM
const DAH = 0.18; // 3 x dit

describe('decodeSend: sauberes Timing', () => {
  it('dekodiert R (dit-dah-dit) mit perfekten Verhaeltnissen', () => {
    // dit, gap 1u, dah, gap 1u, dit
    const decode = decodeSend(timeline([DIT, DIT, DAH, DIT, DIT]), DIT);

    expect(decode.pattern).toBe('.-.');
    expect(decode.character).toBe('R');
    expect(decode.dahDitRatio).toBeCloseTo(3.0, 5);
    expect(decode.gapRatio).toBeCloseTo(1.0, 5);
    expect(decode.wpm).toBeCloseTo(20, 5);
    expect(decode.usedSessionEstimate).toBe(false);
    expect(biggestSendDeviation(decode)).toBeNull();
  });

  it('dekodiert S (dit-dit-dit) ohne einen einzigen dah -- dahDitRatio ist null', () => {
    const decode = decodeSend(timeline([DIT, DIT, DIT, DIT, DIT]), DIT);
    expect(decode.pattern).toBe('...');
    expect(decode.character).toBe('S');
    expect(decode.dahDitRatio).toBeNull();
  });

  it('hat keine Pausen-Quote bei einem einzelnen Element', () => {
    const decode = decodeSend(timeline([DAH]), DIT);
    expect(decode.gapRatio).toBeNull();
  });
});

describe('decodeSend: Abweichungen', () => {
  it('erkennt zu kurze dahs (Verhaeltnis unter dem sauberen Bereich)', () => {
    // dah nur doppelt so lang wie dit -- Kontrast reicht (>= 1.6), aber das
    // Verhaeltnis liegt unter SEND_DAH_DIT_CLEAN.min.
    const shortDah = DIT * 2.1;
    const decode = decodeSend(timeline([DIT, DIT, shortDah]), DIT);
    expect(decode.pattern).toBe('.-');
    expect(decode.dahDitRatio).toBeLessThan(SEND_DAH_DIT_CLEAN.min);
    expect(biggestSendDeviation(decode)).toBe('dah-short');
  });

  it('erkennt zu lange dahs (Verhaeltnis ueber dem sauberen Bereich)', () => {
    const longDah = DIT * 4.5;
    const decode = decodeSend(timeline([DIT, DIT, longDah]), DIT);
    expect(decode.dahDitRatio).toBeGreaterThan(SEND_DAH_DIT_CLEAN.max);
    expect(biggestSendDeviation(decode)).toBe('dah-long');
  });

  it('erkennt eine zu enge Zeichenpause', () => {
    const narrowGap = DIT * 0.3;
    const decode = decodeSend(timeline([DIT, narrowGap, DIT, DIT, DAH]), DIT);
    expect(decode.gapRatio).toBeLessThan(SEND_GAP_CLEAN.min);
    expect(biggestSendDeviation(decode)).toBe('gap-narrow');
  });

  it('erkennt eine zu weite Zeichenpause', () => {
    const wideGap = DIT * 2.2;
    const decode = decodeSend(timeline([DIT, wideGap, DIT, DIT, DAH]), DIT);
    expect(decode.gapRatio).toBeGreaterThan(SEND_GAP_CLEAN.max);
    expect(biggestSendDeviation(decode)).toBe('gap-wide');
  });

  it('waehlt bei zwei Abweichungen die relativ groessere', () => {
    // dahDitRatio 2.0 (33 % relative Abweichung vom Ziel 3.0), gapRatio 0.6
    // (40 % relative Abweichung vom Ziel 1.0) -- gap weicht relativ staerker
    // ab und muss gewinnen, obwohl beide ausserhalb ihres sauberen Bereichs liegen.
    const decode = decodeSend(timeline([DIT, DIT * 0.6, DIT * 2]), DIT);
    expect(decode.dahDitRatio).toBeCloseTo(2.0, 5);
    expect(decode.gapRatio).toBeCloseTo(0.6, 5);
    expect(biggestSendDeviation(decode)).toBe('gap-narrow');
  });
});

describe('decodeSend: der Fall ohne Kontrast (#101a) -- E gegen T', () => {
  it('braucht die Sitzungs-Schaetzung fuer ein einzelnes kurzes Element (E)', () => {
    const decode = decodeSend(timeline([DIT]), DIT);
    expect(decode.pattern).toBe('.');
    expect(decode.character).toBe('E');
    expect(decode.usedSessionEstimate).toBe(true);
  });

  it('braucht die Sitzungs-Schaetzung fuer ein einzelnes langes Element (T)', () => {
    const decode = decodeSend(timeline([DAH]), DIT);
    expect(decode.pattern).toBe('-');
    expect(decode.character).toBe('T');
    expect(decode.usedSessionEstimate).toBe(true);
  });

  it('folgt einer verschobenen Sitzungs-Schaetzung, nicht dem Zieldit', () => {
    // Wer durchgehend langsamer sendet (typisches dit bei 100 ms), dessen
    // 90-ms-Element ist fuer ihn ein dit -- nicht, weil 90 ms nah an 60 ms
    // liegt, sondern weil die Schaetzung seine eigene Handhaltung kennt.
    const slowSessionDit = 0.1;
    const decode = decodeSend(timeline([0.09]), slowSessionDit);
    expect(decode.pattern).toBe('.');
    expect(decode.usedSessionEstimate).toBe(true);
  });

  it('braucht auch bei mehreren Elementen ohne Kontrast die Schaetzung', () => {
    // Zwei fast gleich lange Elemente (Verhaeltnis < 1.6): kein Kontrast,
    // obwohl mehr als ein Element da ist.
    const decode = decodeSend(timeline([DIT, DIT, DIT * 1.3]), DIT);
    expect(decode.usedSessionEstimate).toBe(true);
  });
});

describe('Sitzungs-Schaetzung des eigenen dits', () => {
  it('faengt beim Zieldit bei 20 WPM an (60 ms)', () => {
    expect(estimateDitSeconds([])).toBeCloseTo(SEND_TARGET_DIT_SECONDS, 5);
  });

  it('schreibt sich aus den als dit erkannten Elementen fort -- als Median', () => {
    const decode = decodeSend(timeline([0.05, DIT, 0.18, DIT, 0.07]), DIT);
    const history = appendDitHistory([], decode);
    expect(history).toEqual([0.05, 0.07]);
    expect(estimateDitSeconds(history)).toBeCloseTo(0.06, 5);
  });

  it('laesst die Historie unveraendert, wenn kein einziges Element als dit gilt', () => {
    const decode = decodeSend(timeline([DAH]), DIT);
    expect(appendDitHistory([0.05, 0.06], decode)).toEqual([0.05, 0.06]);
  });

  it('deckelt die Historie auf SEND_DIT_HISTORY_KEPT', () => {
    let history: readonly number[] = [];
    for (let i = 0; i < 25; i += 1) {
      const decode = decodeSend(timeline([DIT]), estimateDitSeconds(history));
      history = appendDitHistory(history, decode);
    }
    expect(history.length).toBeLessThanOrEqual(20);
  });
});

describe('decodeSend: Randfaelle', () => {
  it('wirft ohne ein einziges Element', () => {
    expect(() => decodeSend([], DIT)).toThrow(RangeError);
  });

  it('behandelt ein Element der Dauer 0 als kontrastlos statt durch null zu teilen', () => {
    const decode = decodeSend([{ downAt: 0, upAt: 0 }], DIT);
    expect(decode.pattern).toBe('.');
    expect(decode.usedSessionEstimate).toBe(true);
  });
});
