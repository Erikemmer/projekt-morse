/**
 * Tests für `MorsePlayer.keyDown()`/`keyUp()` -- die Tastung des
 * Sende-Trainings (Ruling #90, Präzisierungen #101).
 *
 * Node kennt keinen `AudioContext`; darum steht hier eine minimale Attrappe,
 * gerade genug, um die Zeitpunkte zu prüfen, die der Player zurückgibt. Sie
 * simuliert keine echte Uhr -- `currentTime` wird vom Test selbst gesetzt,
 * wie eine kontrollierte Stoppuhr, damit sich die Abweichung zwischen einem
 * angeforderten Gate-Zeitpunkt und dem tatsächlichen Rampenstart exakt
 * nachrechnen lässt (CLAUDE.md 2.1, 7: Ton-Timing < 1 ms).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MorsePlayer } from './player';

class FakeAudioParam {
  value = 0;
  setValueAtTime(value: number) {
    this.value = value;
  }
  linearRampToValueAtTime(value: number) {
    this.value = value;
  }
  cancelScheduledValues() {
    // Attrappe: es wird nie tatsaechlich in der Zukunft geplant, es gibt
    // nichts zurueckzunehmen.
  }
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect() {}
  disconnect() {}
}

class FakeOscillatorNode {
  type = 'sine';
  frequency = { value: 0 };
  onended: (() => void) | null = null;
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  currentTime = 0;
  state: 'running' | 'suspended' = 'suspended';
  destination = {};
  createGain() {
    return new FakeGainNode() as unknown as GainNode;
  }
  createOscillator() {
    return new FakeOscillatorNode() as unknown as OscillatorNode;
  }
  async resume() {
    this.state = 'running';
  }
}

let context: FakeAudioContext;

beforeEach(() => {
  context = new FakeAudioContext();
  // `new AudioContext()` im Player: eine Funktion, die per `new` aufgerufen
  // wird und ein Objekt zurueckgibt, liefert laut Sprachdefinition dieses
  // Objekt statt eines frischen `this` -- so bekommt jeder Player dieselbe,
  // vom Test steuerbare Attrappe.
  vi.stubGlobal(
    'AudioContext',
    function FakeAudioContextConstructor(this: unknown) {
      return context;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function readyPlayer(): Promise<MorsePlayer> {
  const player = new MorsePlayer();
  await player.resume();
  return player;
}

describe('keyDown/keyUp: Zeitpunkte kommen von der Audio-Uhr', () => {
  it('liefert exakt die aktuelle Audio-Uhr zurueck, ohne eigene Vorlaufzeit', async () => {
    const player = await readyPlayer();

    context.currentTime = 10;
    const downAt = player.keyDown(600);
    // Keine SchedulING-Abweichung durch den Player selbst: der Rueckgabewert
    // ist exakt `context.currentTime` zum Zeitpunkt des Aufrufs -- anders als
    // `play()` (START_OFFSET_SECONDS Vorlauf) gibt es hier nichts, dessen
    // Zukunft schon feststuende.
    expect(downAt).toBe(10);

    context.currentTime = 10.06;
    const upAt = player.keyUp();
    expect(upAt).toBe(10.06);
  });

  it('misst ein dit-langes Element auf 1 ms genau nach', async () => {
    const player = await readyPlayer();

    context.currentTime = 0;
    const downAt = player.keyDown();
    context.currentTime = 0.06;
    const upAt = player.keyUp();

    expect(upAt - downAt).toBeCloseTo(0.06, 3);
  });

  it('ist ohne resume() nicht bedienbar', () => {
    const player = new MorsePlayer();
    expect(() => player.keyDown()).toThrow();
  });

  it('ist ohne einen gehaltenen Ton ein unschaedlicher Aufruf', async () => {
    const player = await readyPlayer();
    context.currentTime = 5;
    expect(player.keyUp()).toBe(5);
  });
});

describe('keyDown waehrend gehaltener Taste (#101e: event.repeat)', () => {
  it('baut bei wiederholtem keyDown keinen zweiten Ton -- derselbe Startzeitpunkt', async () => {
    const player = await readyPlayer();

    context.currentTime = 1;
    const first = player.keyDown();
    context.currentTime = 1.5;
    // Ein zweiter keyDown() waehrend die Taste noch gehalten wird (die UI
    // filtert das ueber event.repeat; dies ist Verteidigung in der Tiefe im
    // Player selbst) -- er darf die Dauer des Elements nicht verlaengern.
    const second = player.keyDown();

    expect(second).toBe(first);
  });
});

describe('keyDown/keyUp neben einer laufenden play()-Wiedergabe', () => {
  /**
   * Entscheidung (Ruling #90, Teil B.4): **sauber getrennt, nicht gesperrt.**
   * `keyDown()`/`keyUp()` bauen ihren eigenen Oszillator und ihre eigene
   * Huellkurve und ruehren `play()`s Zustand nicht an -- die UI sorgt dafuer,
   * dass beide Wege nie gleichzeitig bedient werden (die Sende-Taste ist
   * deaktiviert, waehrend die Referenz "Hear it" laeuft), aber der Player
   * selbst braucht dafuer keine Sperre. Siehe Kopfkommentar an `keyDown()`.
   */
  it('laesst sich waehrend einer laufenden Wiedergabe bedienen, ohne sie zu beeinflussen', async () => {
    const player = await readyPlayer();

    context.currentTime = 0;
    const handle = player.play({
      tones: [{ start: 0, duration: 0.06 }],
      characters: [],
      duration: 0.06,
      unsupported: [],
    });

    context.currentTime = 2;
    const downAt = player.keyDown(700);
    expect(downAt).toBe(2);

    context.currentTime = 2.06;
    const upAt = player.keyUp();
    expect(upAt).toBeCloseTo(2.06, 5);

    // Die Wiedergabe lief die ganze Zeit unberuehrt weiter -- sie kennt
    // `keyed` nicht und `stop()` auf ihr wirkt weiterhin normal.
    expect(() => handle.stop()).not.toThrow();
  });
});
