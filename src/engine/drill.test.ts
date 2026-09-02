/**
 * Tests für die ICR-Drills ("Speed round", Notion-Log #66).
 *
 * Zwei Dinge stehen hier im Mittelpunkt: **wann** ein Zeichen als langsam
 * gilt (alle drei Bedingungen einzeln geprüft, jede in beide Richtungen) und
 * **was ein Drill mit dem Wachstumsfenster macht** — nämlich nichts. Das
 * zweite ist die eigentliche Zusage der Runde.
 */

import { describe, expect, it } from 'vitest';

import {
  DRILL_INVITATION_MIN_SLOW,
  DRILL_MIN_HIT_RATE,
  DRILL_MIN_POOL,
  DRILL_MIN_SAMPLES,
  DRILL_ROUNDS,
  attemptMedianOver,
  drillPool,
  slowCharacters,
  storedMedianOver,
} from './drill';
import { isReadyToGrow } from './growth';
import { advance, createSession, submitAnswer, type SessionState } from './session';
import { RECENT_ANSWER_WINDOW, emptyProgress, recordFor, type Progress } from './stats';

/**
 * Ein Zeichen mit erfundenem, aber stimmigem Datensatz.
 *
 * `reactions` sind die gespeicherten Reaktionszeiten; `hits` und `attempts`
 * werden daraus abgeleitet, wenn nichts anderes dasteht.
 */
function withCharacter(
  progress: Progress,
  char: string,
  reactions: number[],
  options: { attempts?: number; hits?: number } = {},
): Progress {
  const attempts = options.attempts ?? reactions.length;
  const hits = options.hits ?? reactions.length;
  return {
    ...progress,
    characters: {
      ...progress.characters,
      [char]: { attempts, hits, recentReactions: reactions },
    },
  };
}

/** Fünf Messungen mit dem gewünschten Median. */
function samples(median: number): number[] {
  return [median - 0.4, median - 0.2, median, median + 0.2, median + 0.4];
}

describe('Langsame Zeichen erkennen', () => {
  it('nennt ein sicheres, aber langsames Zeichen', () => {
    const progress = withCharacter(emptyProgress(), 'R', samples(2.4));
    expect(slowCharacters(progress)).toEqual(['R']);
  });

  it('nennt ein sicheres, schnelles Zeichen nicht', () => {
    const progress = withCharacter(emptyProgress(), 'R', samples(1.1));
    expect(slowCharacters(progress)).toEqual([]);
  });

  it('urteilt nicht nach zu wenigen Messungen', () => {
    const few = samples(2.4).slice(0, DRILL_MIN_SAMPLES - 1);
    expect(slowCharacters(withCharacter(emptyProgress(), 'R', few))).toEqual([]);
  });

  it('lässt ein Verwechslungsproblem in Ruhe -- das ist kein ICR-Fall', () => {
    // Langsam, aber nur zu 60 % richtig: dafuer ist die normale Gewichtung da.
    const progress = withCharacter(emptyProgress(), 'R', samples(2.4), {
      attempts: 10,
      hits: 6,
    });
    expect(slowCharacters(progress)).toEqual([]);
  });

  it('nimmt die Schwelle ernst -- knapp darunter zählt nicht', () => {
    expect(slowCharacters(withCharacter(emptyProgress(), 'R', samples(2)))).toEqual([]);
    expect(slowCharacters(withCharacter(emptyProgress(), 'R', samples(2.05)))).toEqual(['R']);
  });

  it('sortiert das langsamste zuerst', () => {
    let progress = withCharacter(emptyProgress(), 'R', samples(2.2));
    progress = withCharacter(progress, 'U', samples(3.1));
    progress = withCharacter(progress, 'K', samples(2.6));
    expect(slowCharacters(progress)).toEqual(['U', 'K', 'R']);
  });

  it('sieht nur den aktiven Zeichensatz an', () => {
    const progress = withCharacter(emptyProgress(), 'Z', samples(3));
    expect(progress.activeCharacters).not.toContain('Z');
    expect(slowCharacters(progress)).toEqual([]);
  });
});

describe('Der Zeichensatz eines Drills', () => {
  it('ist leer, solange nichts langsam ist', () => {
    expect(drillPool(emptyProgress())).toEqual([]);
  });

  it('fuellt bei einem langsamen Zeichen mit den schnellsten auf (Ruling #69)', () => {
    let progress = withCharacter(emptyProgress(), 'R', samples(2.4));
    progress = withCharacter(progress, 'K', samples(0.7));
    progress = withCharacter(progress, 'M', samples(0.9));
    progress = withCharacter(progress, 'S', samples(1.6));

    const pool = drillPool(progress);
    expect(pool).toEqual(['R', 'K', 'M']);
    expect(pool.length).toBe(DRILL_MIN_POOL);
  });

  it('fuellt auch bei zwei langsamen Zeichen auf -- das ist die Aenderung aus #69', () => {
    let progress = withCharacter(emptyProgress(), 'R', samples(2.4));
    progress = withCharacter(progress, 'U', samples(2.9));
    progress = withCharacter(progress, 'K', samples(0.8));
    progress = withCharacter(progress, 'M', samples(1.2));

    // Langsame zuerst (das langsamste vorn), dann das schnellste als Kontrast.
    expect(drillPool(progress)).toEqual(['U', 'R', 'K']);
  });

  it('mischt keinen Kontrast dazu, wenn schon genug langsam ist', () => {
    let progress = withCharacter(emptyProgress(), 'R', samples(2.2));
    progress = withCharacter(progress, 'U', samples(2.9));
    progress = withCharacter(progress, 'K', samples(2.5));
    progress = withCharacter(progress, 'M', samples(0.8));

    const pool = drillPool(progress);
    expect(pool).toEqual(['U', 'K', 'R']);
    expect(pool).not.toContain('M');
  });

  it('nimmt als Kontrast die *sicheren* Zeichen, nicht bloss die schnellen', () => {
    let progress = withCharacter(emptyProgress(), 'R', samples(2.4));
    // K ist das schnellste, aber nur zu 50 % richtig -- ein Verwechslungsfall,
    // der in einem Tempo-Drill nichts zu suchen hat.
    progress = withCharacter(progress, 'K', samples(0.4), { attempts: 10, hits: 5 });
    progress = withCharacter(progress, 'M', samples(0.9));
    progress = withCharacter(progress, 'S', samples(1.1));

    const pool = drillPool(progress);
    expect(pool).toEqual(['R', 'M', 'S']);
    expect(pool).not.toContain('K');
    expect(5 / 10).toBeLessThan(DRILL_MIN_HIT_RATE);
  });

  it('nimmt ein unsicheres Zeichen erst, wenn sonst nichts da ist', () => {
    let progress = { ...emptyProgress(), activeCharacters: ['R', 'K', 'M'] };
    progress = withCharacter(progress, 'R', samples(2.4));
    progress = withCharacter(progress, 'K', samples(0.5), { attempts: 10, hits: 4 });
    progress = withCharacter(progress, 'M', samples(0.9));

    // M ist sicher und kommt vor K -- aber K kommt, weil sonst der Pool zu klein bliebe.
    expect(drillPool(progress)).toEqual(['R', 'M', 'K']);
  });

  it('nimmt lieber einen kurzen Drill als gar keinen', () => {
    const progress = withCharacter(
      { ...emptyProgress(), activeCharacters: ['R', 'K'] },
      'R',
      samples(2.4),
    );
    const pool = drillPool(progress);
    expect(pool).toEqual(['R', 'K']);
    expect(pool.length).toBeLessThan(DRILL_MIN_POOL);
  });

  it('laedt schon ab einem langsamen Zeichen ein (Ruling #69)', () => {
    expect(DRILL_INVITATION_MIN_SLOW).toBe(1);

    const progress = withCharacter(emptyProgress(), 'R', samples(2.4));
    expect(slowCharacters(progress).length).toBeGreaterThanOrEqual(DRILL_INVITATION_MIN_SLOW);
    // Und der Drill, zu dem eingeladen wird, ist dann kein Ein-Zeichen-Drill.
    expect(drillPool(progress).length).toBe(DRILL_MIN_POOL);
  });
});

describe('Der ehrliche Vergleich am Ende', () => {
  it('wirft die Einzelmessungen zusammen, nicht die Mediane', () => {
    let progress = withCharacter(emptyProgress(), 'R', [2, 2, 2, 2, 2]);
    progress = withCharacter(progress, 'U', [3, 3, 3]);
    // Acht Werte: 2,2,2,2,2,3,3,3 -> Median 2.
    expect(storedMedianOver(progress, ['R', 'U'])).toBe(2);
  });

  it('hat ohne Messung nichts zu behaupten', () => {
    expect(storedMedianOver(emptyProgress(), ['R'])).toBeNull();
    expect(attemptMedianOver([], ['R'])).toBeNull();
  });

  it('rechnet die Kontrast-Zeichen aus dem Ergebnis heraus', () => {
    const attempts = [
      { char: 'R', answer: 'R', correct: true, reactionSeconds: 2, replays: 0 },
      { char: 'K', answer: 'K', correct: true, reactionSeconds: 0.4, replays: 0 },
      { char: 'M', answer: 'M', correct: true, reactionSeconds: 0.5, replays: 0 },
    ];
    expect(attemptMedianOver(attempts, ['R'])).toBe(2);
  });

  it('lässt falsche Antworten draussen', () => {
    const attempts = [
      { char: 'R', answer: 'K', correct: false, reactionSeconds: 5, replays: 0 },
      { char: 'R', answer: 'R', correct: true, reactionSeconds: 1.4, replays: 0 },
    ];
    expect(attemptMedianOver(attempts, ['R'])).toBe(1.4);
  });
});

describe('Ein Drill verzerrt das Wachstumsfenster nicht', () => {
  /** Ein Stand, der kurz vor der naechsten Einfuehrung steht. */
  function almostGrowing(): Progress {
    let progress: Progress = {
      ...emptyProgress(),
      // Fenster voll und makellos, Sperre abgelaufen: es fehlt nur noch, dass
      // jedes aktive Zeichen seine Versuche zusammenhat.
      recentAnswers: Array.from({ length: RECENT_ANSWER_WINDOW }, () => true),
      answersSinceGrowth: 40,
    };
    for (const char of progress.activeCharacters) {
      progress = withCharacter(progress, char, samples(2.4), { attempts: 10, hits: 10 });
    }
    return progress;
  }

  function drill(progress: Progress, pool: string[]): SessionState {
    return createSession({
      totalRounds: DRILL_ROUNDS,
      progress,
      random: () => 0.5,
      today: '2026-09-01',
      kind: 'drill',
      pool,
    });
  }

  it('übt nur die mitgegebenen Zeichen', () => {
    const state = drill(emptyProgress(), ['R', 'U']);
    expect(state.pool).toEqual(['R', 'U']);
    expect(state.kind).toBe('drill');
  });

  it('wiederholt kein Zeichen direkt hintereinander (Avoid-Repeat bleibt, #69)', () => {
    // Der Grund, warum DRILL_MIN_POOL bei 3 liegt: mit drei Zeichen bleibt
    // trotz Avoid-Repeat eine echte Wahl, statt strikt zu alternieren.
    const pool = ['R', 'U', 'K'];
    let state = drill(emptyProgress(), pool);
    const seen: string[] = [state.prompt];

    // Eine Zufallsfolge, die reihum jeden Kandidaten trifft.
    const dice = [0, 0.5, 0.99, 0.25, 0.75, 0.1, 0.6, 0.9, 0.4];
    for (const value of dice) {
      state = { ...state, phase: 'answering', promptEndsAt: 0 };
      state = submitAnswer(state, state.prompt, 1);
      state = advance(state, () => value);
      if (state.phase === 'finished') break;
      seen.push(state.prompt);
    }

    expect(seen.length).toBeGreaterThan(3);
    for (let i = 1; i < seen.length; i += 1) expect(seen[i]).not.toBe(seen[i - 1]);
    expect(new Set(seen).size).toBeGreaterThan(1);
    for (const char of seen) expect(pool).toContain(char);
  });

  it('schreibt die Antwort in die Statistik des Zeichens', () => {
    let state = drill(emptyProgress(), ['R', 'U']);
    state = { ...state, phase: 'answering', promptEndsAt: 0 };
    state = submitAnswer(state, state.prompt, 1.2);

    const record = recordFor(state.progress, state.attempts[0].char);
    expect(record.attempts).toBe(1);
    expect(record.hits).toBe(1);
    expect(record.recentReactions).toEqual([1.2]);
  });

  it('rührt recentAnswers und answersSinceGrowth nicht an', () => {
    const before = almostGrowing();
    let state = drill(before, ['K', 'M']);
    state = { ...state, phase: 'answering', promptEndsAt: 0 };
    state = submitAnswer(state, state.prompt, 1);

    expect(state.progress.recentAnswers).toEqual(before.recentAnswers);
    expect(state.progress.answersSinceGrowth).toBe(before.answersSinceGrowth);
  });

  it('lässt den Zeichensatz nicht wachsen -- auch wenn die Regel sonst griffe', () => {
    const before = almostGrowing();
    expect(isReadyToGrow(before)).toBe(true);

    let state = drill(before, ['K', 'M']);
    state = { ...state, phase: 'answering', promptEndsAt: 0 };
    state = submitAnswer(state, state.prompt, 1);

    expect(state.introduced).toBeNull();
    expect(state.progress.activeCharacters).toEqual(before.activeCharacters);
  });

  it('eine normale Sitzung tut beides weiterhin', () => {
    const before = almostGrowing();
    let state = createSession({
      totalRounds: 5,
      progress: before,
      random: () => 0.5,
      today: '2026-09-01',
    });
    state = { ...state, phase: 'answering', promptEndsAt: 0 };
    state = submitAnswer(state, state.prompt, 1);

    expect(state.progress.recentAnswers.length).toBe(RECENT_ANSWER_WINDOW);
    expect(state.introduced).not.toBeNull();
  });

  it('zählt trotzdem als geübter Tag, wenn er durchgezogen wird', () => {
    let state = drill(emptyProgress(), ['R', 'U']);
    for (let round = 0; round < DRILL_ROUNDS; round += 1) {
      state = { ...state, phase: 'answering', promptEndsAt: 0 };
      state = submitAnswer(state, state.prompt, 1);
      state = advance(state, () => 0.5);
    }
    expect(state.phase).toBe('finished');
    expect(state.progress.streak.days).toBe(1);
  });
});
