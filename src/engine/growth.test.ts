/**
 * Tests fuer die Wachstumsregel.
 *
 * Die Staende werden hier gebaut, nicht durchgespielt: jede Bedingung soll
 * einzeln kippbar sein, ohne dass 30 simulierte Antworten den Testfall
 * vernebeln. Dass der Weg ueber den Loop dieselben Daten erzeugt, prueft die
 * Integration am Ende.
 */

import { describe, expect, it } from 'vitest';

import { MORSE_ALPHABET } from './alphabet';
import {
  GROWTH_LOCKOUT_ANSWERS,
  GROWTH_MIN_ATTEMPTS,
  GROWTH_MIN_CHARACTER_ACCURACY,
  GROWTH_WINDOW_ACCURACY,
  isReadyToGrow,
  maybeGrow,
  nextCandidate,
} from './growth';
import { advance, beginPlayback, createSession, promptFinished, submitAnswer } from './session';
import { CHARACTER_ORDER, STARTING_CHARACTERS } from './settings';
import {
  RECENT_ANSWER_WINDOW,
  emptyProgress,
  recordAttempt,
  type CharacterRecord,
  type Progress,
} from './stats';

/** Ein Datensatz mit gegebener Quote, genug Versuchen und flotten Antworten. */
function record(attempts: number, hits: number): CharacterRecord {
  return { attempts, hits, recentReactions: [0.8] };
}

/**
 * Ein Stand, bei dem die Regel gerade eben greift: volles Fenster mit genau
 * der geforderten Quote, jedes aktive Zeichen knapp ueber beiden Schwellen,
 * Sperre abgelaufen. Tests kippen von hier aus einzelne Bedingungen.
 */
function readyProgress(): Progress {
  const hitsInWindow = Math.ceil(RECENT_ANSWER_WINDOW * GROWTH_WINDOW_ACCURACY);
  const characters: Record<string, CharacterRecord> = {};
  for (const char of STARTING_CHARACTERS) {
    // 4 von 5: genau die 75 %-Schwelle noch nicht unterschritten (0.8 > 0.75).
    characters[char] = record(GROWTH_MIN_ATTEMPTS, GROWTH_MIN_ATTEMPTS - 1);
  }
  return {
    version: 1,
    characters,
    activeCharacters: [...STARTING_CHARACTERS],
    recentAnswers: [
      ...Array(RECENT_ANSWER_WINDOW - hitsInWindow).fill(false),
      ...Array(hitsInWindow).fill(true),
    ],
    answersSinceGrowth: GROWTH_LOCKOUT_ANSWERS,
  };
}

describe('Wachstumsregel', () => {
  it('die Kandidatenreihenfolge beginnt mit dem Start-Zeichensatz und ist kodierbar', () => {
    expect(CHARACTER_ORDER.slice(0, STARTING_CHARACTERS.length)).toEqual([...STARTING_CHARACTERS]);
    expect(new Set(CHARACTER_ORDER).size).toBe(CHARACTER_ORDER.length);
    for (const char of CHARACTER_ORDER) expect(MORSE_ALPHABET[char]).toBeDefined();
    // Alle Buchstaben und Ziffern kommen irgendwann dran.
    expect(CHARACTER_ORDER).toHaveLength(36);
  });

  it('fuehrt das naechste Zeichen der Reihe ein, wenn alles erfuellt ist', () => {
    const progress = readyProgress();
    expect(isReadyToGrow(progress)).toBe(true);

    const { progress: grown, introduced } = maybeGrow(progress);
    expect(introduced).toBe(CHARACTER_ORDER[STARTING_CHARACTERS.length]);
    expect(grown.activeCharacters).toEqual([...STARTING_CHARACTERS, introduced]);
    expect(grown.answersSinceGrowth).toBe(0);
  });

  it('wartet, bis das rollierende Fenster voll ist -- 9 von 10 sind kein Beleg', () => {
    const progress = readyProgress();
    progress.recentAnswers = Array(RECENT_ANSWER_WINDOW - 1).fill(true);
    expect(isReadyToGrow(progress)).toBe(false);
  });

  it('blockiert unter der Fenster-Quote', () => {
    const progress = readyProgress();
    const misses = progress.recentAnswers.filter((a) => !a).length;
    progress.recentAnswers[progress.recentAnswers.length - 1] = false; // eine mehr daneben
    expect(progress.recentAnswers.filter((a) => !a).length).toBe(misses + 1);
    expect(isReadyToGrow(progress)).toBe(false);
  });

  it('blockiert, wenn ein aktives Zeichen zu selten gefragt wurde', () => {
    const progress = readyProgress();
    progress.characters.A = record(GROWTH_MIN_ATTEMPTS - 1, GROWTH_MIN_ATTEMPTS - 1);
    expect(isReadyToGrow(progress)).toBe(false);
  });

  it('blockiert, wenn ein aktives Zeichen unter seiner Quote liegt', () => {
    const progress = readyProgress();
    // 6/8 = 0.75 besteht (>= 75 %), 5/8 nicht.
    progress.characters.U = record(8, 6);
    expect(isReadyToGrow(progress)).toBe(true);
    progress.characters.U = record(8, 5);
    expect(isReadyToGrow(progress)).toBe(false);
    expect(5 / 8).toBeLessThan(GROWTH_MIN_CHARACTER_ACCURACY);
  });

  it('blockiert waehrend der Sperre nach einer Einfuehrung', () => {
    const progress = readyProgress();
    progress.answersSinceGrowth = GROWTH_LOCKOUT_ANSWERS - 1;
    expect(isReadyToGrow(progress)).toBe(false);
    progress.answersSinceGrowth = GROWTH_LOCKOUT_ANSWERS;
    expect(isReadyToGrow(progress)).toBe(true);
  });

  it('hoert auf, wenn alle Zeichen aktiv sind', () => {
    const progress = readyProgress();
    progress.activeCharacters = [...CHARACTER_ORDER];
    for (const char of CHARACTER_ORDER) {
      progress.characters[char] = record(GROWTH_MIN_ATTEMPTS, GROWTH_MIN_ATTEMPTS);
    }
    expect(nextCandidate(progress)).toBeNull();
    const result = maybeGrow(progress);
    expect(result.introduced).toBeNull();
    expect(result.progress).toBe(progress);
  });

  it('gibt ohne Einfuehrung denselben Fortschritt zurueck, nicht eine Kopie', () => {
    const progress = emptyProgress();
    expect(maybeGrow(progress).progress).toBe(progress);
  });
});

describe('Wachstum im Fortschritt', () => {
  it('recordAttempt fuellt das Antwortfenster und zaehlt die Sperre hoch', () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, 'K', true, 1);
    progress = recordAttempt(progress, 'M', false, 1);

    expect(progress.recentAnswers).toEqual([true, false]);
    expect(progress.answersSinceGrowth).toBe(2);
  });

  it('das Antwortfenster waechst nicht ueber seine Groesse hinaus', () => {
    let progress = emptyProgress();
    for (let i = 0; i < RECENT_ANSWER_WINDOW + 10; i += 1) {
      progress = recordAttempt(progress, 'K', true, 1);
    }
    expect(progress.recentAnswers).toHaveLength(RECENT_ANSWER_WINDOW);
  });
});

describe('Wachstum im Lernloop', () => {
  it('fuehrt mit der entscheidenden Antwort ein Zeichen ein und uebt es sofort mit', () => {
    // Ein Stand, dem genau eine richtige Antwort fehlt: Fenster eine Antwort
    // kurz, alles andere erfuellt.
    const progress = readyProgress();
    progress.recentAnswers = progress.recentAnswers.filter(Boolean).slice(1);
    while (progress.recentAnswers.length < RECENT_ANSWER_WINDOW - 1) {
      progress.recentAnswers.push(true);
    }

    let state = createSession({ totalRounds: 3, progress, random: () => 0 });
    expect(state.pool).toHaveLength(STARTING_CHARACTERS.length);

    state = promptFinished(beginPlayback(state, 10));
    state = submitAnswer(state, state.prompt, 10.5);

    const seventh = CHARACTER_ORDER[STARTING_CHARACTERS.length];
    expect(state.introduced).toBe(seventh);
    expect([...state.pool]).toEqual([...STARTING_CHARACTERS, seventh]);
    expect(state.progress.answersSinceGrowth).toBe(0);

    // Die Ankuendigung gilt fuer dieses Feedback; danach ist sie weg.
    state = advance(state, () => 0);
    expect(state.introduced).toBeNull();
    // Das neue Zeichen ist ab jetzt ziehbar (ungehoert = hoechstes Gewicht).
    expect(state.pool).toContain(seventh);
  });

  it('fuehrt bei einer falschen entscheidenden Antwort nichts ein', () => {
    const progress = readyProgress();
    progress.recentAnswers = progress.recentAnswers.filter(Boolean).slice(1);
    while (progress.recentAnswers.length < RECENT_ANSWER_WINDOW - 1) {
      progress.recentAnswers.push(true);
    }

    let state = createSession({ totalRounds: 3, progress, random: () => 0 });
    state = promptFinished(beginPlayback(state, 10));
    const wrong = state.pool.find((c) => c !== state.prompt) ?? 'X';
    state = submitAnswer(state, wrong, 10.5);

    expect(state.introduced).toBeNull();
    expect(state.pool).toHaveLength(STARTING_CHARACTERS.length);
  });
});

describe('Persistenz der Wachstumsfelder', () => {
  it('ein Stand von vor der Regel bekommt Defaults, keine Verwerfung', async () => {
    const { parseProgress } = await import('./stats');
    const old = { version: 1, characters: { K: { attempts: 5, hits: 4, recentReactions: [1] } } };
    const parsed = parseProgress(old);

    expect(parsed.activeCharacters).toEqual([...STARTING_CHARACTERS]);
    expect(parsed.recentAnswers).toEqual([]);
    expect(parsed.answersSinceGrowth).toBe(0);
    expect(parsed.characters.K.hits).toBe(4);
  });

  it('ein gewachsener Stand ueberlebt die Reise durch JSON', async () => {
    const { parseProgress } = await import('./stats');
    const { progress: grown } = maybeGrow(readyProgress());
    expect(parseProgress(JSON.parse(JSON.stringify(grown)))).toEqual(grown);
  });

  it('ein kaputter aktiver Satz faellt auf den Start-Zeichensatz zurueck', async () => {
    const { parseProgress } = await import('./stats');
    for (const broken of [['K'], ['K', 'K', 'K', 'K', 'K', 'K'], 'KMRSUA', [1, 2, 3]]) {
      const parsed = parseProgress({ version: 1, characters: {}, activeCharacters: broken });
      expect(parsed.activeCharacters).toEqual([...STARTING_CHARACTERS]);
    }
  });
});
