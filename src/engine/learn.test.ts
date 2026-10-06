/**
 * Tests fuer den Lernmodus.
 *
 * Zwei Dinge tragen hier die Last: der Weg durch eine Karte (Ton, dann Muster,
 * dann Abfrage) und die Zusage, dass dabei **nichts** in die Statistik laeuft.
 * Das zweite ist keine Detailfrage -- flossen Lernantworten mit, verschoeben
 * sie Gewichtung und Wachstumsregel gegen den Nutzer.
 */

import { describe, expect, it } from 'vitest';

import {
  ECHO_ROUNDS,
  advanceEcho,
  answerEcho,
  answerPool,
  beginEcho,
  echoDue,
  beginEchoPlayback,
  cardHeard,
  createLearnRun,
  currentCharacter,
  echoKeyAction,
  echoPromptFinished,
  introducesCharacters,
  nextCard,
  type LearnState,
} from './learn';
import { emptyProgress, markIntroduced, parseProgress, pendingIntroductions } from './stats';
import { STARTING_CHARACTERS } from './settings';

/** Eine Karte samt Echo-Check durchspielen -- immer richtig geantwortet. */
function runCard(state: LearnState, random: () => number = () => 0): LearnState {
  let next = cardHeard(state);
  next = beginEcho(next);
  while (next.phase !== 'card' && next.phase !== 'done') {
    next = beginEchoPlayback(next);
    next = echoPromptFinished(next);
    next = answerEcho(next, next.echoPrompt);
    next = advanceEcho(next, random);
  }
  return next;
}

describe('Lernmodus: die Karte', () => {
  it('beginnt bei der ersten Karte, ohne dass der Ton schon lief', () => {
    const state = createLearnRun({ queue: ['K', 'M'] });
    expect(state.phase).toBe('card');
    expect(currentCharacter(state)).toBe('K');
  });

  it('zeigt das Muster erst, nachdem der Ton gelaufen ist', () => {
    const state = createLearnRun({ queue: ['K'] });
    // 'card' heisst: noch nichts gehoert, also auch nichts zu sehen.
    expect(state.phase).toBe('card');
    expect(cardHeard(state).phase).toBe('card-heard');
  });

  it('ein zweites Anhoeren aendert nichts mehr', () => {
    const heard = cardHeard(createLearnRun({ queue: ['K'] }));
    expect(cardHeard(heard)).toBe(heard);
  });

  it('der Echo-Check beginnt nicht, bevor der Ton lief', () => {
    const state = createLearnRun({ queue: ['K'] });
    expect(beginEcho(state)).toBe(state);
  });

  it('der erste Abruf ist das gerade eingefuehrte Zeichen', () => {
    const state = beginEcho(cardHeard(createLearnRun({ queue: ['M'], known: ['K'] })));
    expect(state.phase).toBe('echo-ready');
    expect(state.echoPrompt).toBe('M');
  });
});

describe('Lernmodus: die Antwortoptionen', () => {
  it('bietet bei der ersten Karte genau ein Zeichen an', () => {
    expect(answerPool(createLearnRun({ queue: [...STARTING_CHARACTERS] }))).toEqual(['K']);
  });

  it('waechst mit jeder Karte um genau eines', () => {
    let state = createLearnRun({ queue: ['K', 'M', 'R'] });
    expect(answerPool(state)).toEqual(['K']);
    state = runCard(state);
    expect(answerPool(state)).toEqual(['K', 'M']);
    state = runCard(state);
    expect(answerPool(state)).toEqual(['K', 'M', 'R']);
  });

  it('nimmt vorher Eingefuehrtes mit -- der Wachstumsfall', () => {
    const state = createLearnRun({ queue: ['P'], known: [...STARTING_CHARACTERS] });
    expect(answerPool(state)).toEqual([...STARTING_CHARACTERS, 'P']);
  });

  it('bietet nie ein Zeichen an, das noch nicht vorgestellt wurde', () => {
    const state = createLearnRun({ queue: ['K', 'M', 'R'] });
    expect(answerPool(state)).not.toContain('M');
    expect(answerPool(state)).not.toContain('R');
  });
});

describe('Lernmodus: der Echo-Check', () => {
  it('laeuft ueber ECHO_ROUNDS Abrufe und geht dann zur naechsten Karte', () => {
    let state = beginEcho(cardHeard(createLearnRun({ queue: ['M', 'R'], known: ['K'] })));

    for (let i = 0; i < ECHO_ROUNDS; i++) {
      expect(state.phase).toBe('echo-ready');
      state = echoPromptFinished(beginEchoPlayback(state));
      expect(state.phase).toBe('echo-answering');
      state = answerEcho(state, state.echoPrompt);
      expect(state.phase).toBe('echo-feedback');
      state = advanceEcho(state, () => 0);
    }

    expect(state.phase).toBe('card');
    expect(currentCharacter(state)).toBe('R');
    expect(state.echoDone).toBe(0);
  });

  it('kommt erst ab zwei Optionen -- die erste Karte eines neuen Nutzers geht direkt weiter', () => {
    const first = cardHeard(createLearnRun({ queue: ['K', 'M'] }));
    expect(echoDue(first)).toBe(false);
    const next = beginEcho(first);
    expect(next.phase).toBe('card');
    expect(currentCharacter(next)).toBe('M');

    const second = cardHeard(next);
    expect(echoDue(second)).toBe(true);
    expect(beginEcho(second).phase).toBe('echo-ready');
  });

  it('ein Lauf aus einer einzigen ersten Karte endet ohne Check und fuehrt sie ein', () => {
    const state = beginEcho(cardHeard(createLearnRun({ queue: ['K'] })));
    expect(state.phase).toBe('done');
    expect(introducesCharacters(state)).toBe(true);
  });

  it('beim freien Wiederholen nie, auch nicht mit vielen Optionen', () => {
    const state = cardHeard(createLearnRun({ queue: ['P'], known: ['K', 'M'], requireEcho: false }));
    expect(echoDue(state)).toBe(false);
  });

  it('merkt sich, was geantwortet wurde -- richtig wie falsch', () => {
    let state = beginEcho(cardHeard(createLearnRun({ queue: ['M'], known: ['K'] })));
    state = echoPromptFinished(beginEchoPlayback(state));

    const hit = answerEcho(state, 'M');
    expect(hit.lastEcho).toEqual({ char: 'M', answer: 'M', correct: true });

    const miss = answerEcho(state, 'K');
    expect(miss.lastEcho).toEqual({ char: 'M', answer: 'K', correct: false });
  });

  it('eine falsche Antwort haelt den Lauf nicht auf', () => {
    let state = beginEcho(cardHeard(createLearnRun({ queue: ['M'], known: ['K'] })));
    state = echoPromptFinished(beginEchoPlayback(state));
    state = answerEcho(state, 'K');
    expect(advanceEcho(state, () => 0).phase).toBe('echo-ready');
  });

  it('zieht die weiteren Abrufe nur aus Eingefuehrtem', () => {
    const queue = ['K', 'M', 'R'];
    let state = runCard(runCard(createLearnRun({ queue })));
    state = beginEcho(cardHeard(state));

    // Alle erreichbaren Ziehungen durchgehen, nicht eine zufaellige.
    for (let i = 0; i <= 20; i++) {
      const drawn = advanceEcho(
        answerEcho(echoPromptFinished(beginEchoPlayback(state)), state.echoPrompt),
        () => i / 21,
      );
      if (drawn.phase === 'echo-ready') expect(answerPool(state)).toContain(drawn.echoPrompt);
    }
  });

  it('ignoriert Antworten ausserhalb der Antwortphase', () => {
    const ready = beginEcho(cardHeard(createLearnRun({ queue: ['K'] })));
    expect(answerEcho(ready, 'K')).toBe(ready);
  });
});

describe('Lernmodus: freies Wiederholen', () => {
  it('kommt ohne Echo-Check aus', () => {
    const state = createLearnRun({ queue: ['K'], known: [...STARTING_CHARACTERS], requireEcho: false });
    expect(state.requireEcho).toBe(false);
    expect(nextCard(cardHeard(state)).phase).toBe('done');
  });

  it('geht bei mehreren Zeichen der Reihe nach weiter', () => {
    const state = createLearnRun({ queue: ['K', 'M'], requireEcho: false });
    const second = nextCard(cardHeard(state));
    expect(second.phase).toBe('card');
    expect(currentCharacter(second)).toBe('M');
  });

  /**
   * Ruling Notion-Log #110: "Learn the sounds" zeigt jetzt auch Zeichen, die
   * noch nicht im Training sind -- ein Klick auf eines davon darf es nicht
   * einfuehren. `introducesCharacters` ist die Stelle, an der die UI das
   * entscheidet; hier steht der Beleg dafuer ohne DOM.
   */
  it('fuehrt am Ende nichts ein -- reines Zuhoeren', () => {
    let state = createLearnRun({ queue: ['P'], known: [...STARTING_CHARACTERS], requireEcho: false });
    expect(introducesCharacters(state)).toBe(false);
    state = nextCard(cardHeard(state));
    expect(state.phase).toBe('done');
    expect(introducesCharacters(state)).toBe(false);
  });

  it('ein Lauf mit Echo-Check fuehrt am Ende ein', () => {
    let state = createLearnRun({ queue: ['P'], known: [...STARTING_CHARACTERS] });
    state = runCard(state);
    expect(state.phase).toBe('done');
    expect(introducesCharacters(state)).toBe(true);
  });

  it('vor "done" fuehrt kein Zustand etwas ein', () => {
    const state = beginEcho(cardHeard(createLearnRun({ queue: ['M'], known: ['K'] })));
    expect(introducesCharacters(state)).toBe(false);
  });
});

describe('Lernmodus: ein ganzer Lauf', () => {
  it('fuehrt den Start-Zeichensatz vollstaendig ein', () => {
    let state = createLearnRun({ queue: [...STARTING_CHARACTERS] });
    for (let i = 0; i < STARTING_CHARACTERS.length; i++) state = runCard(state);

    expect(state.phase).toBe('done');
    expect(state.index).toBe(STARTING_CHARACTERS.length);
  });

  it('braucht mindestens ein Zeichen', () => {
    expect(() => createLearnRun({ queue: [] })).toThrow(RangeError);
  });
});

/**
 * Die Zusage aus dem Modulkopf, hier als Regressionsnetz: der Lernmodus
 * beruehrt die Statistik nicht.
 */
describe('Lernmodus: die Statistik bleibt unberuehrt', () => {
  it('kein Modulpfad des Lernmodus schreibt Versuche', () => {
    const before = emptyProgress();
    let state = createLearnRun({ queue: [...STARTING_CHARACTERS] });
    for (let i = 0; i < STARTING_CHARACTERS.length; i++) state = runCard(state, () => 0.5);

    // Der Lauf ist durch; der Fortschritt daneben ist derselbe geblieben.
    expect(before).toEqual(emptyProgress());
    expect(before.characters).toEqual({});
    expect(before.recentAnswers).toEqual([]);
    expect(before.answersSinceGrowth).toBe(0);
    expect(before.day.attempts).toBe(0);
  });

  it('markIntroduced schreibt genau ein Feld', () => {
    const before = emptyProgress();
    const after = markIntroduced(before, ['K', 'M']);

    expect(after.introducedCharacters).toEqual(['K', 'M']);
    expect({ ...after, introducedCharacters: [] }).toEqual({ ...before, introducedCharacters: [] });
  });

  it('markIntroduced ist additiv und ohne Dubletten', () => {
    const once = markIntroduced(emptyProgress(), ['K']);
    const twice = markIntroduced(once, ['K', 'M']);
    expect(twice.introducedCharacters).toEqual(['K', 'M']);
    // Nichts Neues heisst: derselbe Stand, keine neue Kopie.
    expect(markIntroduced(twice, ['K'])).toBe(twice);
  });
});

describe('Wer steht zur Einfuehrung an', () => {
  it('bei einem frischen Stand der ganze Start-Zeichensatz', () => {
    expect(pendingIntroductions(emptyProgress())).toEqual([...STARTING_CHARACTERS]);
  });

  it('nach dem Durchlauf niemand mehr', () => {
    const done = markIntroduced(emptyProgress(), [...STARTING_CHARACTERS]);
    expect(pendingIntroductions(done)).toEqual([]);
  });

  it('ein neu dazugewachsenes Zeichen steht an -- der Wachstumsfall', () => {
    const done = markIntroduced(emptyProgress(), [...STARTING_CHARACTERS]);
    const grown = { ...done, activeCharacters: [...done.activeCharacters, 'P'] };
    expect(pendingIntroductions(grown)).toEqual(['P']);
  });

  it('ein Stand mit Statistik gilt als eingefuehrt -- kein Zwangsdurchlauf', () => {
    const parsed = parseProgress({
      version: 1,
      characters: { K: { attempts: 12, hits: 9, recentReactions: [1.1] } },
      activeCharacters: [...STARTING_CHARACTERS],
      recentAnswers: [true],
      answersSinceGrowth: 4,
    });

    expect(parsed.introducedCharacters).toEqual([...STARTING_CHARACTERS]);
    expect(pendingIntroductions(parsed)).toEqual([]);
  });

  it('ein Stand ohne einen einzigen Versuch faengt vorn an', () => {
    const parsed = parseProgress({
      version: 1,
      characters: { K: { attempts: 0, hits: 0, recentReactions: [] } },
      activeCharacters: [...STARTING_CHARACTERS],
      recentAnswers: [],
      answersSinceGrowth: 0,
    });

    expect(parsed.introducedCharacters).toEqual([]);
    expect(pendingIntroductions(parsed)).toEqual([...STARTING_CHARACTERS]);
  });

  it('eine gespeicherte Liste wird uebernommen, ohne Dubletten', () => {
    const parsed = parseProgress({
      characters: {},
      activeCharacters: [...STARTING_CHARACTERS],
      introducedCharacters: ['K', 'K', 'M', 42, 'RR'],
    });
    expect(parsed.introducedCharacters).toEqual(['K', 'M']);
  });
});

/**
 * Der Echo-Check hatte drei Phasen, in denen ein Zeichen-Anschlag ins Leere
 * ging -- dieselben, die der Trainings-Loop laengst abdeckt. Das ist der Kern
 * der Owner-Meldung "Tastenanschlaege werden teilweise nicht erkannt".
 */
describe('echoKeyAction', () => {
  /** Ein Lauf, der im Echo-Check steht. */
  function echoRun(): LearnState {
    return beginEcho(cardHeard(createLearnRun({ queue: ['M'], known: ['K', 'R', 'S'] })));
  }

  it('startet die Wiedergabe, wenn in "echo-ready" ein Zeichen getippt wird', () => {
    const state = echoRun();
    expect(state.phase).toBe('echo-ready');
    expect(echoKeyAction(state, answerPool(state)[0])).toBe('play');
  });

  it('merkt sich einen Anschlag waehrend des Tons, statt ihn zu verschlucken', () => {
    const state = beginEchoPlayback(echoRun());
    expect(state.phase).toBe('echo-listening');
    expect(echoKeyAction(state, answerPool(state)[0])).toBe('buffer');
  });

  it('antwortet, sobald der Ton durch ist', () => {
    const state = echoPromptFinished(beginEchoPlayback(echoRun()));
    expect(state.phase).toBe('echo-answering');
    expect(echoKeyAction(state, answerPool(state)[0])).toBe('answer');
  });

  it('laesst das enge Antwortfeld des Echo-Checks unangetastet (Ruling #108)', () => {
    const state = echoPromptFinished(beginEchoPlayback(echoRun()));
    const outside = 'QWERTYUIOPZXCVBN0123456789'
      .split('')
      .find((char) => !answerPool(state).includes(char));
    expect(outside).toBeDefined();
    expect(echoKeyAction(state, outside as string)).toBeNull();
  });

  it('tut in der Aufloesung und auf der Karte nichts', () => {
    const answering = echoPromptFinished(beginEchoPlayback(echoRun()));
    const feedback = answerEcho(answering, answering.echoPrompt);
    expect(feedback.phase).toBe('echo-feedback');
    expect(echoKeyAction(feedback, answering.echoPrompt)).toBeNull();

    const card = createLearnRun({ queue: ['M'], known: ['K', 'R', 'S'] });
    expect(card.phase).toBe('card');
    expect(echoKeyAction(card, 'M')).toBeNull();
  });

  it('ignoriert Tasten, die kein einzelnes Zeichen sind', () => {
    const state = echoPromptFinished(beginEchoPlayback(echoRun()));
    expect(echoKeyAction(state, 'ENTER')).toBeNull();
    expect(echoKeyAction(state, '')).toBeNull();
  });
});
