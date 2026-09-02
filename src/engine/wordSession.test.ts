/**
 * Tests fuer den Wort-Loop (Ruling #83, Teil A; offen seit Ruling #87).
 *
 * Der wichtigste Block steht unten: **was dieser Modus mit der Statistik macht
 * und was nicht.** Punkt A.8 des Rulings ist eine Entscheidung mit Folgen --
 * Wort-Antworten trainieren die Zeichen mit, lassen aber Wachstumsfenster und
 * Zeichen-Wachstum unberuehrt --, und eine Entscheidung mit Folgen braucht
 * einen Test, der sie festhaelt.
 */

import { describe, expect, it } from 'vitest';

import { GROWTH_LOCKOUT_ANSWERS } from './growth';
import { CHARACTER_ORDER, STARTING_EFFECTIVE_WPM } from './settings';
import {
  RECENT_ANSWER_WINDOW,
  emptyProgress,
  recordFor,
  type CharacterRecord,
  type Progress,
} from './stats';
import { streakStanding } from './streak';
import {
  WORD_ATTEMPTS_KEPT,
  advanceWord,
  beginWordPlayback,
  createWordSession,
  deleteCharacter,
  retuneWordHomeTone,
  submitWord,
  summarizeWords,
  typeCharacter,
  wordPromptFinished,
  wordsHeardToday,
  type WordSessionState,
} from './wordSession';
import { PROMPT_MAX_LENGTH, WORDS_STREAK_MIN_ANSWERS } from './words';

const TODAY = '2026-09-02';

function record(attempts: number, hits: number, reactions: number[] = []): CharacterRecord {
  return { attempts, hits, recentReactions: reactions };
}

/** Ein Stand mit allen Zeichen aktiv und gemessen -- der Normalfall dieses Modus. */
function fullProgress(patch: Partial<Progress> = {}): Progress {
  const characters: Record<string, CharacterRecord> = {};
  for (const char of CHARACTER_ORDER) characters[char] = record(10, 10, [0.5, 0.5, 0.5]);
  return { ...emptyProgress(), activeCharacters: [...CHARACTER_ORDER], characters, ...patch };
}

/** Ein Modus-Zustand mit fester Zufallsquelle -- hier wird nicht gewuerfelt. */
function unit(progress = fullProgress()): WordSessionState {
  return createWordSession({ progress, random: () => 0.5, today: TODAY });
}

/** `n` Aufgaben am Stueck, alle richtig -- der Weg durch den offenen Modus. */
function playRounds(state: WordSessionState, n: number): WordSessionState {
  let current = state;
  for (let round = 0; round < n; round += 1) {
    current = advanceWord(playCorrect(current), () => 0.5);
  }
  return current;
}

/** Bis zur Eingabe durchschalten: abspielen, Ton durch. */
function untilAnswering(state: WordSessionState): WordSessionState {
  return wordPromptFinished(beginWordPlayback(state));
}

/** Eine Antwort eintippen -- Zeichen fuer Zeichen, wie es die UI tut. */
function type(state: WordSessionState, answer: string): WordSessionState {
  return [...answer].reduce((current, char) => typeCharacter(current, char), state);
}

/** Eine ganze Aufgabe: hoeren, `answer` tippen, abschicken. */
function play(state: WordSessionState, answer: string): WordSessionState {
  return submitWord(type(untilAnswering(state), answer));
}

/** Eine ganze Aufgabe richtig beantworten. */
function playCorrect(state: WordSessionState): WordSessionState {
  return play(state, state.prompt);
}

describe('Wort-Modus: der Anfang', () => {
  it('steht bereit, mit leerer Eingabe und ohne Rundenzaehler', () => {
    const state = unit();
    expect(state.phase).toBe('ready');
    expect(state.typed).toBe('');
    expect(state.prompt.length).toBeGreaterThan(0);
    // Kein `round`, kein `totalRounds` mehr (Ruling #87). Der Zustand traegt
    // nur, was der offene Modus braucht.
    expect(Object.keys(state)).not.toContain('round');
    expect(Object.keys(state)).not.toContain('totalRounds');
  });

  it('meldet fuer heute noch nichts gehoert', () => {
    expect(wordsHeardToday(unit())).toBe(0);
  });

  it('uebt den aktiven Zeichensatz', () => {
    expect(unit().pool).toEqual([...CHARACTER_ORDER]);
  });

  it('zaehlt die Sitzung **nicht** hoch -- die laufende Sitzung heisst weiter gleich', () => {
    const progress = fullProgress({ sessionsStarted: 12 });
    expect(unit(progress).progress.sessionsStarted).toBe(12);
  });

  it('zieht den Tages-Eimer auf heute nach', () => {
    const progress = fullProgress({
      day: { date: '2026-08-30', attempts: 40, hits: 39, characters: ['K'], words: 7 },
    });
    expect(unit(progress).progress.day).toEqual({
      date: TODAY,
      attempts: 0,
      hits: 0,
      characters: [],
      words: 0,
    });
  });

  it('nimmt das Tempo-Niveau aus dem Fortschritt', () => {
    // Stufe 0 (sechs aktive Zeichen) wuerfelt nicht: das Niveau steht unverfaelscht.
    const progress = {
      ...emptyProgress(),
      activeCharacters: [...'KMRSUA'],
      effectiveWpm: STARTING_EFFECTIVE_WPM,
    };
    expect(unit(progress).sound.effectiveWpm).toBe(STARTING_EFFECTIVE_WPM);
  });

  it('verweigert einen Modus ohne Zeichen', () => {
    expect(() => unit({ ...fullProgress(), activeCharacters: [] })).toThrow(RangeError);
  });
});

describe('Wort-Einheit: hoeren', () => {
  it('erlaubt keine Eingabe, solange der Ton laeuft', () => {
    const listening = beginWordPlayback(unit());
    expect(listening.phase).toBe('listening');
    expect(typeCharacter(listening, 'K').typed).toBe('');
  });

  it('zaehlt eine Wiederholung vor dem Abschicken', () => {
    let state = untilAnswering(unit());
    expect(state.replays).toBe(0);
    state = wordPromptFinished(beginWordPlayback(state));
    expect(state.replays).toBe(1);
    expect(submitWord(type(state, 'K')).lastAttempt?.replays).toBe(1);
  });

  it('zaehlt Nachhoeren im Feedback nicht mehr mit', () => {
    const feedback = playCorrect(unit());
    expect(beginWordPlayback(feedback)).toBe(feedback);
  });
});

describe('Wort-Einheit: tippen', () => {
  it('nimmt nur Zeichen des geuebten Satzes', () => {
    const state = untilAnswering(unit(fullProgress({ activeCharacters: [...'KMRSUAPT'] })));
    expect(typeCharacter(state, 'K').typed).toBe('K');
    expect(typeCharacter(state, 'Z')).toBe(state);
  });

  it('nimmt Kleinbuchstaben an und schreibt gross', () => {
    expect(typeCharacter(untilAnswering(unit()), 'k').typed).toBe('K');
  });

  it('haelt bei der laengsten moeglichen Aufgabe an', () => {
    const state = type(untilAnswering(unit()), 'KMRSUA');
    expect(state.typed.length).toBe(PROMPT_MAX_LENGTH);
    expect(state.typed).toBe('KMRSU');
  });

  it('loescht das letzte Zeichen -- und bei leerer Eingabe nichts', () => {
    const state = type(untilAnswering(unit()), 'KMR');
    expect(deleteCharacter(state).typed).toBe('KM');
    const empty = untilAnswering(unit());
    expect(deleteCharacter(empty)).toBe(empty);
  });

  it('nimmt im Feedback nichts mehr an', () => {
    const feedback = playCorrect(unit());
    expect(typeCharacter(feedback, 'K')).toBe(feedback);
    expect(deleteCharacter(feedback)).toBe(feedback);
  });

  it('schickt eine leere Antwort nicht ab -- das waere ein Ueberspringen', () => {
    const state = untilAnswering(unit());
    expect(submitWord(state)).toBe(state);
  });
});

describe('Wort-Einheit: die Aufloesung Position fuer Position', () => {
  it('markiert jede Position der Aufgabe', () => {
    const state = unit();
    const prompt = state.prompt;
    // Eine Antwort, die an der ersten Position daneben liegt.
    const wrongFirst = (prompt[0] === 'K' ? 'M' : 'K') + prompt.slice(1);
    const attempt = play(state, wrongFirst).lastAttempt;

    expect(attempt?.marks.length).toBe(prompt.length);
    expect(attempt?.marks[0]).toBe(false);
    expect(attempt?.marks.slice(1).every(Boolean)).toBe(true);
    expect(attempt?.correct).toBe(false);
  });

  it('nennt eine ganz richtige Antwort richtig', () => {
    const attempt = playCorrect(unit()).lastAttempt;
    expect(attempt?.correct).toBe(true);
    expect(attempt?.marks.every(Boolean)).toBe(true);
    expect(attempt?.extra).toBe('');
  });

  it('zaehlt eine zu kurze Antwort an den fehlenden Positionen als falsch', () => {
    const state = unit();
    const attempt = play(state, state.prompt.slice(0, 1)).lastAttempt;
    expect(attempt?.marks.length).toBe(state.prompt.length);
    expect(attempt?.marks[0]).toBe(true);
    expect(attempt?.marks.slice(1).some(Boolean)).toBe(false);
    expect(attempt?.correct).toBe(false);
  });

  it('meldet ueberzaehlige Zeichen getrennt, statt sie zu verschlucken', () => {
    const state = unit(fullProgress());
    // Die feste Zufallsquelle liefert eine vierstellige Aufgabe -- unter der
    // Eingabegrenze, sonst waere ein ueberzaehliges Zeichen nicht tippbar.
    expect(state.prompt.length).toBeLessThan(PROMPT_MAX_LENGTH);

    const extra = state.prompt[0] === 'K' ? 'M' : 'K';
    const attempt = play(state, state.prompt + extra).lastAttempt;
    expect(attempt?.marks.every(Boolean)).toBe(true);
    expect(attempt?.extra).toBe(extra);
    expect(attempt?.correct).toBe(false);
  });

  it('nimmt eine zweite Abgabe nicht an', () => {
    const feedback = playCorrect(unit());
    expect(submitWord(feedback)).toBe(feedback);
    expect(feedback.attempts.length).toBe(1);
  });
});

describe('Wort-Einheit: was sie mit der Statistik macht', () => {
  it('verbucht jede Position beim Zeichen -- Versuche und Treffer', () => {
    const state = unit();
    const prompt = state.prompt;
    const wrongFirst = (prompt[0] === 'K' ? 'M' : 'K') + prompt.slice(1);
    const after = play(state, wrongFirst).progress;

    // Jede Position der Aufgabe verbucht einen Versuch auf ihrem Zeichen --
    // ein Zeichen, das zweimal vorkommt, also zwei.
    for (const char of new Set(prompt)) {
      const occurrences = [...prompt].filter((c) => c === char).length;
      const correct = [...prompt].filter(
        (c, index) => c === char && wrongFirst[index] === c,
      ).length;
      expect(recordFor(after, char).attempts).toBe(10 + occurrences);
      expect(recordFor(after, char).hits).toBe(10 + correct);
    }
    // Und die verfehlte Position hat wirklich keinen Treffer bekommen.
    expect(recordFor(after, prompt[0]).hits).toBe(10);
  });

  it('schreibt **keine** Reaktionszeit -- eine Wortzeit gehoert keiner Position', () => {
    const state = unit();
    const before = state.prompt.split('').map((char) => recordFor(state.progress, char));
    const after = playCorrect(state).progress;

    state.prompt.split('').forEach((char, index) => {
      expect(recordFor(after, char).recentReactions).toEqual(before[index].recentReactions);
    });
  });

  it('laesst das 30-Antwort-Wachstumsfenster unberuehrt (Ruling A.8)', () => {
    const progress = fullProgress({
      recentAnswers: [true, false, true],
      answersSinceGrowth: 7,
      answersSinceSpeedUp: 5,
    });
    const after = playCorrect(unit(progress)).progress;

    expect(after.recentAnswers).toEqual([true, false, true]);
    expect(after.answersSinceGrowth).toBe(7);
    expect(after.answersSinceSpeedUp).toBe(5);
  });

  it('loest kein Zeichen-Wachstum aus, auch wenn die Regel sonst greifen wuerde', () => {
    // Ein Stand, der bei einer normalen Antwort sofort wachsen wuerde: Fenster
    // voll und richtig, Sperre abgelaufen, jedes aktive Zeichen sitzt.
    const growable: Progress = {
      ...emptyProgress(),
      activeCharacters: [...'KMRSUAPT'],
      characters: Object.fromEntries(
        [...'KMRSUAPT'].map((char) => [char, record(10, 10, [0.5])]),
      ),
      recentAnswers: Array.from({ length: RECENT_ANSWER_WINDOW }, () => true),
      answersSinceGrowth: GROWTH_LOCKOUT_ANSWERS,
    };

    let state = unit(growable);
    for (let round = 0; round < 3; round += 1) {
      state = playCorrect(state);
      state = advanceWord(state, () => 0.5);
    }

    expect(state.progress.activeCharacters).toEqual([...'KMRSUAPT']);
  });

  it('zaehlt zum Tagesstand -- die Antworten sind echt', () => {
    const state = unit();
    const after = playCorrect(state).progress;
    expect(after.day.date).toBe(TODAY);
    expect(after.day.attempts).toBe(state.prompt.length);
    expect(after.day.hits).toBe(state.prompt.length);
  });
});

describe('Wort-Modus: weiter, ohne Ende (Ruling #87)', () => {
  it('geht nur aus dem Feedback weiter', () => {
    const ready = unit();
    expect(advanceWord(ready, () => 0.5)).toBe(ready);
  });

  it('setzt Eingabe, Wiederholungen und Phase fuer die naechste Aufgabe zurueck', () => {
    const next = advanceWord(playCorrect(unit()), () => 0.5);
    expect(next.phase).toBe('ready');
    expect(next.typed).toBe('');
    expect(next.replays).toBe(0);
  });

  it('wiederholt die Aufgabe nicht unmittelbar', () => {
    const feedback = playCorrect(unit());
    const next = advanceWord(feedback, () => 0.5);
    expect(next.prompt).not.toBe(feedback.prompt);
  });

  /*
   * Der Kern des Rulings: es gibt keine Einheit mehr. Wo frueher nach zehn
   * Aufgaben 'finished' stand, kommt jetzt wieder 'ready' -- beliebig oft.
   * Fuenfundzwanzig Durchlaeufe sind mehr als das Doppelte der alten Einheit;
   * wer hier eine Grenze eingebaut haette, faellt auf.
   */
  it('kommt nach 25 Aufgaben in Folge wieder auf "ready"', () => {
    const state = playRounds(unit(), 25);
    expect(state.phase).toBe('ready');
    expect(state.typed).toBe('');
    expect(state.replays).toBe(0);
    expect(state.prompt.length).toBeGreaterThan(0);
    expect(state.lastAttempt).not.toBeNull();
  });

  it('kennt keine Phase "finished" mehr', () => {
    let state = unit();
    for (let round = 0; round < 25; round += 1) {
      state = playCorrect(state);
      expect(state.phase).toBe('feedback');
      state = advanceWord(state, () => 0.5);
      expect(state.phase).toBe('ready');
    }
  });

  /*
   * CLAUDE.md 7: kein unbegrenztes Speicherwachstum ueber eine lange Sitzung.
   * Der Modus endet nicht mehr, also muss die Liste enden -- verbucht ist
   * ohnehin alles in der Statistik je Zeichen, nicht in dieser Liste.
   */
  it('haelt die Versuchsliste gedeckelt, egal wie lange geuebt wird', () => {
    const state = playRounds(unit(), WORD_ATTEMPTS_KEPT + 20);
    expect(state.attempts.length).toBe(WORD_ATTEMPTS_KEPT);
    // Gedeckelt wird am Anfang, nicht am Ende: der letzte Versuch bleibt.
    expect(state.attempts[state.attempts.length - 1]).toEqual(state.lastAttempt);
  });

  it('verbucht jede Aufgabe im Tagesstand, auch jenseits des Deckels', () => {
    const state = playRounds(unit(), WORD_ATTEMPTS_KEPT + 20);
    expect(wordsHeardToday(state)).toBe(WORD_ATTEMPTS_KEPT + 20);
  });
});

describe('Wort-Modus: der Streak-Tag faellt nach fuenf Aufgaben', () => {
  it('zaehlt vier Aufgaben noch nicht als geuebten Tag', () => {
    const state = playRounds(unit(), WORDS_STREAK_MIN_ANSWERS - 1);
    expect(wordsHeardToday(state)).toBe(WORDS_STREAK_MIN_ANSWERS - 1);
    expect(streakStanding(state.progress.streak, TODAY).days).toBe(0);
  });

  it('zaehlt die fuenfte -- und zwar schon beim Abschicken, nicht erst danach', () => {
    // Vier durchgezogen, die fuenfte nur abgeschickt: der Tag steht.
    const four = playRounds(unit(), WORDS_STREAK_MIN_ANSWERS - 1);
    const fifth = playCorrect(four);
    expect(fifth.phase).toBe('feedback');
    expect(streakStanding(fifth.progress.streak, TODAY).days).toBe(1);
  });

  it('schreibt am selben Tag nichts doppelt', () => {
    const five = playRounds(unit(), WORDS_STREAK_MIN_ANSWERS);
    const streakAfterFive = five.progress.streak;
    expect(streakStanding(streakAfterFive, TODAY).days).toBe(1);

    // Noch fuenf Aufgaben am selben Tag: der Stand bleibt derselbe -- und zwar
    // identisch (===), `recordPracticeDay` ist idempotent.
    const ten = playRounds(five, WORDS_STREAK_MIN_ANSWERS);
    expect(ten.progress.streak).toBe(streakAfterFive);
    expect(streakStanding(ten.progress.streak, TODAY).days).toBe(1);
  });
});

describe('Wort-Einheit: die Zusammenfassung', () => {
  it('zaehlt ganze Aufgaben und einzelne Positionen getrennt', () => {
    const state = unit(fullProgress());
    const first = advanceWord(playCorrect(state), () => 0.5);
    // Die zweite Aufgabe an der ersten Position daneben.
    const wrong = (first.prompt[0] === 'K' ? 'M' : 'K') + first.prompt.slice(1);
    const done = play(first, wrong);

    const summary = summarizeWords(done);
    expect(summary.rounds).toBe(2);
    expect(summary.hits).toBe(1);
    expect(summary.positions).toBe(state.prompt.length + first.prompt.length);
    expect(summary.positionHits).toBe(summary.positions - 1);
  });

  it('behauptet ohne Antworten nichts', () => {
    expect(summarizeWords(unit())).toEqual({
      rounds: 0,
      hits: 0,
      positions: 0,
      positionHits: 0,
    });
  });
});

describe('Wort-Einheit: Heimton nachstellen', () => {
  it('zieht auf Stufe 0 nach', () => {
    const state = unit({ ...emptyProgress(), activeCharacters: [...'KMRSUA'] });
    const retuned = retuneWordHomeTone(state, 700);
    expect(retuned.sound.sessionToneHz).toBe(700);
    expect(retuned.promptToneHz).toBe(700);
  });

  it('laesst einen gezogenen Ton ab Stufe 1 in Ruhe', () => {
    const state = unit();
    expect(state.sound.stage).toBeGreaterThan(0);
    expect(retuneWordHomeTone(state, 700)).toBe(state);
  });

  it('gibt bei gleichem Ton den Zustand identisch zurueck', () => {
    const state = unit({ ...emptyProgress(), activeCharacters: [...'KMRSUA'] });
    expect(retuneWordHomeTone(state, state.sound.sessionToneHz)).toBe(state);
  });
});
