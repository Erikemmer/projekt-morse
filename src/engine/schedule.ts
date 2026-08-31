/**
 * Uebersetzt Text in eine Zeitachse aus Toenen.
 *
 * Das Ergebnis ist eine reine Datenstruktur mit Sekunden-Offsets ab 0. Wer sie
 * abspielt (Web Audio) oder anzeigt (UI), ist hier bewusst nicht bekannt: dieses
 * Modul laeuft in Node, im Test, im Worker.
 */

import { encodeChar } from './alphabet';
import type { Timing } from './timing';

export interface ToneEvent {
  /** Startzeit in Sekunden, relativ zum Beginn der Zeitachse. */
  start: number;
  /** Dauer in Sekunden (dit oder dah). */
  duration: number;
}

export interface ScheduledCharacter {
  char: string;
  pattern: string;
  /** Beginn des ersten Elements. */
  start: number;
  /** Ende des letzten Elements -- ohne die folgende Pause. */
  end: number;
  tones: ToneEvent[];
}

export interface Schedule {
  /** Alle Toene, aufsteigend nach Startzeit. Pausen sind die Luecken dazwischen. */
  tones: ToneEvent[];
  /** Zeichenweise Gliederung, fuer Fortschrittsanzeige und Auswertung. */
  characters: ScheduledCharacter[];
  /** Gesamtdauer bis zum Ende des letzten Tons, in Sekunden. */
  duration: number;
  /** Zeichen aus der Eingabe, fuer die es kein Morse-Aequivalent gibt. */
  unsupported: string[];
}

const WHITESPACE = /\s/;

/**
 * Baut die Zeitachse fuer `text` mit dem gegebenen Timing.
 *
 * Mehrere Leerzeichen in Folge ergeben eine einzige Wortpause. Nicht kodierbare
 * Zeichen werden uebersprungen und in `unsupported` gemeldet, statt die Ausgabe
 * still zu verfaelschen.
 */
export function buildSchedule(text: string, timing: Timing): Schedule {
  const tones: ToneEvent[] = [];
  const characters: ScheduledCharacter[] = [];
  const unsupported: string[] = [];

  let cursor = 0;
  // Welche Pause vor dem naechsten Zeichen faellig ist. Vor dem ersten: keine.
  let pendingGap = 0;
  let hasEmitted = false;

  for (const rawChar of text) {
    if (WHITESPACE.test(rawChar)) {
      // Wortpause ersetzt die Zeichenpause, sie addiert sich nicht dazu.
      if (hasEmitted) pendingGap = timing.wordGap;
      continue;
    }

    const pattern = encodeChar(rawChar);
    if (pattern === null) {
      unsupported.push(rawChar);
      continue;
    }

    cursor += pendingGap;
    const charStart = cursor;
    const charTones: ToneEvent[] = [];

    for (let i = 0; i < pattern.length; i += 1) {
      if (i > 0) cursor += timing.intraCharacterGap;
      const duration = pattern[i] === '-' ? timing.dah : timing.dit;
      const tone: ToneEvent = { start: cursor, duration };
      charTones.push(tone);
      tones.push(tone);
      cursor += duration;
    }

    characters.push({
      char: rawChar.toUpperCase(),
      pattern,
      start: charStart,
      end: cursor,
      tones: charTones,
    });

    pendingGap = timing.interCharacterGap;
    hasEmitted = true;
  }

  return { tones, characters, duration: cursor, unsupported };
}
