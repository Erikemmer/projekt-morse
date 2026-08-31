import { describe, expect, it } from 'vitest';

import { MORSE_ALPHABET, decodePattern, encodeChar } from './alphabet';
import { buildSchedule } from './schedule';
import { computeTiming } from './timing';

describe('Alphabet', () => {
  it('kodiert Buchstaben, Ziffern und Satzzeichen', () => {
    expect(encodeChar('a')).toBe('.-');
    expect(encodeChar('A')).toBe('.-');
    expect(encodeChar('Q')).toBe('--.-');
    expect(encodeChar('7')).toBe('--...');
    expect(encodeChar('?')).toBe('..--..');
  });

  it('meldet unbekannte Zeichen mit null statt still zu schlucken', () => {
    expect(encodeChar('ß')).toBeNull();
    expect(encodeChar(' ')).toBeNull();
    expect(decodePattern('.......')).toBeNull();
  });

  it('ist eindeutig -- kein Muster ist zwei Zeichen zugeordnet', () => {
    const patterns = Object.values(MORSE_ALPHABET);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it('dekodiert jedes kodierte Zeichen zurueck', () => {
    for (const [char, pattern] of Object.entries(MORSE_ALPHABET)) {
      expect(decodePattern(pattern)).toBe(char);
    }
  });
});

describe('Timing', () => {
  it('ergibt Standard-Timing, wenn kein Farnsworth im Spiel ist', () => {
    const timing = computeTiming({ characterWpm: 20, effectiveWpm: 20 });
    const unit = 1.2 / 20;
    expect(timing.unit).toBeCloseTo(unit, 12);
    expect(timing.dah).toBeCloseTo(3 * unit, 12);
    expect(timing.intraCharacterGap).toBeCloseTo(unit, 12);
    expect(timing.interCharacterGap).toBeCloseTo(3 * unit, 12);
    expect(timing.wordGap).toBeCloseTo(7 * unit, 12);
  });

  it('streckt nur die Pausen, nicht die Zeichen (Farnsworth 18/5)', () => {
    const timing = computeTiming({ characterWpm: 18, effectiveWpm: 5 });
    // Die Elemente behalten das Tempo von 18 WpM.
    expect(timing.unit).toBeCloseTo(1.2 / 18, 12);
    expect(timing.dah).toBeCloseTo(3.6 / 18, 12);
    expect(timing.intraCharacterGap).toBeCloseTo(1.2 / 18, 12);
    // Die Pausen dagegen sind deutlich laenger als 3 bzw. 7 Einheiten.
    expect(timing.interCharacterGap).toBeGreaterThan(3 * timing.unit);
    expect(timing.wordGap).toBeGreaterThan(7 * timing.unit);
    expect(timing.wordGap / timing.interCharacterGap).toBeCloseTo(7 / 3, 12);
  });

  it('deckelt ein Gesamttempo oberhalb der Zeichengeschwindigkeit', () => {
    const clamped = computeTiming({ characterWpm: 15, effectiveWpm: 30 });
    const standard = computeTiming({ characterWpm: 15, effectiveWpm: 15 });
    expect(clamped).toEqual(standard);
  });

  it('lehnt unsinnige Geschwindigkeiten ab', () => {
    expect(() => computeTiming({ characterWpm: 0, effectiveWpm: 5 })).toThrow(RangeError);
    expect(() => computeTiming({ characterWpm: 20, effectiveWpm: -1 })).toThrow(RangeError);
    expect(() => computeTiming({ characterWpm: Number.NaN, effectiveWpm: 5 })).toThrow(RangeError);
  });
});

describe('Zeitachse', () => {
  it('reproduziert die ARRL-Referenz: PARIS dauert bei 5 WpM genau 12 Sekunden', () => {
    // Das Referenzwort PARIS plus Wortpause ist per Definition ein "Wort".
    // Bei 5 WpM muessen 5 davon in 60 s passen -- also 12 s pro Stueck.
    const timing = computeTiming({ characterWpm: 18, effectiveWpm: 5 });
    const schedule = buildSchedule('PARIS', timing);
    expect(schedule.duration + timing.wordGap).toBeCloseTo(12, 9);
  });

  it('haelt die 31 Zeichen-Einheiten von PARIS bei der Zeichengeschwindigkeit', () => {
    const timing = computeTiming({ characterWpm: 18, effectiveWpm: 5 });
    const schedule = buildSchedule('PARIS', timing);
    const toneAndIntraGapTime = schedule.characters.reduce((sum, c) => sum + (c.end - c.start), 0);
    expect(toneAndIntraGapTime).toBeCloseTo(31 * timing.unit, 9);
  });

  it('setzt dit, dah und die Pause im Zeichen korrekt (Buchstabe A)', () => {
    const timing = computeTiming({ characterWpm: 12, effectiveWpm: 12 });
    const { tones, duration } = buildSchedule('A', timing);
    expect(tones).toHaveLength(2);
    expect(tones[0]).toEqual({ start: 0, duration: timing.dit });
    expect(tones[1].start).toBeCloseTo(timing.dit + timing.intraCharacterGap, 12);
    expect(tones[1].duration).toBeCloseTo(timing.dah, 12);
    expect(duration).toBeCloseTo(5 * timing.unit, 12);
  });

  it('beginnt ohne Vorlauf und endet ohne Nachlauf', () => {
    const timing = computeTiming({ characterWpm: 20, effectiveWpm: 8 });
    const schedule = buildSchedule('  SOS  ', timing);
    expect(schedule.tones[0].start).toBe(0);
    const last = schedule.tones[schedule.tones.length - 1];
    expect(schedule.duration).toBeCloseTo(last.start + last.duration, 12);
  });

  it('nimmt fuer die Wortpause nicht auch noch die Zeichenpause', () => {
    const timing = computeTiming({ characterWpm: 20, effectiveWpm: 8 });
    const schedule = buildSchedule('E E', timing);
    const [first, second] = schedule.tones;
    const gap = second.start - (first.start + first.duration);
    expect(gap).toBeCloseTo(timing.wordGap, 12);
    expect(gap).not.toBeCloseTo(timing.wordGap + timing.interCharacterGap, 6);
  });

  it('fasst mehrere Leerzeichen zu einer Wortpause zusammen', () => {
    const timing = computeTiming({ characterWpm: 20, effectiveWpm: 8 });
    const one = buildSchedule('E E', timing);
    const many = buildSchedule('E \n\t  E', timing);
    expect(many.duration).toBeCloseTo(one.duration, 12);
  });

  it('meldet nicht kodierbare Zeichen statt sie stillschweigend zu verschlucken', () => {
    const timing = computeTiming({ characterWpm: 20, effectiveWpm: 20 });
    const schedule = buildSchedule('Grüße', timing);
    expect(schedule.unsupported).toEqual(['ü', 'ß']);
    expect(schedule.characters.map((c) => c.char).join('')).toBe('GRE');
  });

  it('liefert fuer leere Eingaben eine leere Zeitachse', () => {
    const timing = computeTiming({ characterWpm: 20, effectiveWpm: 20 });
    const schedule = buildSchedule('   ', timing);
    expect(schedule.tones).toEqual([]);
    expect(schedule.characters).toEqual([]);
    expect(schedule.duration).toBe(0);
  });
});
