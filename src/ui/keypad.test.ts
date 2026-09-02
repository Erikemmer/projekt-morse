import { describe, expect, it } from 'vitest';

import { CHARACTER_ORDER } from '../engine/settings';
import {
  KEYPAD_COLUMNS,
  KEYPAD_LAYOUT,
  KEYPAD_MIN_CHARACTERS,
  KEYPAD_ROW_BREAK,
  usesKeypad,
} from './keypad';

describe('Das feste Tastenfeld', () => {
  it('hat 36 Positionen: 26 Buchstaben, dann 10 Ziffern', () => {
    expect(KEYPAD_LAYOUT).toHaveLength(36);
    expect(KEYPAD_LAYOUT.slice(0, 26).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(KEYPAD_LAYOUT.slice(26).join('')).toBe('0123456789');
  });

  it('jede Position kommt genau einmal vor', () => {
    expect(new Set(KEYPAD_LAYOUT).size).toBe(KEYPAD_LAYOUT.length);
  });

  /*
   * Die Gegenprobe, die zaehlt: das Tastenfeld muss genau die Zeichen fassen,
   * die das Training je einfuehren kann. Kommt in CHARACTER_ORDER eines dazu
   * -- Satzzeichen zum Beispiel --, faellt dieser Test und nicht erst die
   * Antwort eines Nutzers auf eine Taste, die es nicht gibt.
   */
  it('deckt CHARACTER_ORDER vollstaendig und ohne Ueberschuss', () => {
    expect([...KEYPAD_LAYOUT].sort()).toEqual([...CHARACTER_ORDER].sort());
  });

  it('bricht bei der ersten Ziffer um -- und die liegt am Reihenanfang', () => {
    expect(KEYPAD_ROW_BREAK).toBe('0');
    expect(KEYPAD_LAYOUT.indexOf(KEYPAD_ROW_BREAK) % KEYPAD_COLUMNS).not.toBe(0);
  });
});

describe('Die Schwelle zum Tastenfeld', () => {
  it('bis einschliesslich zwoelf Zeichen bleibt das Dreier-Gitter', () => {
    expect(usesKeypad(6)).toBe(false);
    expect(usesKeypad(12)).toBe(false);
  });

  it('ab dreizehn Zeichen gilt das Tastenfeld', () => {
    expect(KEYPAD_MIN_CHARACTERS).toBe(13);
    expect(usesKeypad(13)).toBe(true);
    expect(usesKeypad(15)).toBe(true);
    expect(usesKeypad(36)).toBe(true);
  });

  /*
   * Kein Zurueckspringen: die Entscheidung haengt an den aktiven Zeichen, und
   * die nehmen nie ab. Der Test haelt die Monotonie fest, damit ein spaeterer
   * Aufrufer nicht die Poolgroesse einer Speed round einsetzt.
   */
  it('ist monoton -- was einmal wechselt, wechselt nicht zurueck', () => {
    const switched = Array.from({ length: 37 }, (_, count) => usesKeypad(count));
    expect(switched.indexOf(true)).toBe(KEYPAD_MIN_CHARACTERS);
    expect(switched.slice(KEYPAD_MIN_CHARACTERS).every(Boolean)).toBe(true);
  });
});
