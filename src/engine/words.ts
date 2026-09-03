/**
 * Woerter und Gruppen -- der Inhalt des Modus "Words & groups" (Ruling #83,
 * Teil A).
 *
 * Warum es diesen Modus gibt: ein Zeichen einzeln zu erkennen ist die halbe
 * Faehigkeit. Im Funkverkehr kommen die Zeichen aneinander, und dann traegt
 * nicht mehr das Wiedererkennen eines einzelnen Rhythmus, sondern das Halten
 * einer Folge -- inklusive der Zeichenpause, die man mithoeren muss, ohne sie
 * zu zaehlen. Deshalb wird hier ein ganzes Wort als **eine** Zeitachse
 * gespielt (`engine/schedule.ts` kann das seit dem ersten Tag) und danach als
 * Ganzes beantwortet.
 *
 * **Woerter, wo es Woerter gibt; sonst Gruppen.** Ein Wort ist die bessere
 * Uebung -- es hat einen Klang als Ganzes, und wer "the" ein paar Mal gehoert
 * hat, hoert es spaeter als Einheit. Aber ein Wort setzt voraus, dass sein
 * Buchstabensatz schon aktiv ist, und das ist am Anfang fast nie der Fall.
 * Deshalb erst Gruppen, und Woerter ab `WORDS_MIN_BUILDABLE` baubaren
 * Woertern -- eine Handvoll waere keine Uebung, sondern eine Liste zum
 * Auswendiglernen.
 *
 * **Die Auswahl nutzt die bestehende Statistik, sie erfindet keine zweite.**
 * Bevorzugt wird, was ein schwaches oder langsames Zeichen enthaelt; die
 * Schwellen dafuer sind die, die es schon gibt (`GROWTH_MIN_CHARACTER_ACCURACY`
 * fuer "schwach", `slowCharacters` aus engine/drill.ts fuer "langsam"). Und der
 * Zufall kommt als Parameter herein: dieselbe Folge ergibt dieselbe Aufgabe,
 * sonst waere der Modus nicht pruefbar.
 *
 * Reine Funktionen und reine Daten, kein DOM.
 */

import { slowCharacters } from './drill';
import { GROWTH_MIN_CHARACTER_ACCURACY } from './growth';
import { pickNext } from './selection';
import { hitRate, recordFor, type Progress } from './stats';

/**
 * Ab so vielen aktiven Zeichen ist der Modus freigeschaltet.
 *
 * Acht ist dieselbe Zahl, bei der die Klang-Variabilitaet auf Stufe 1 geht
 * (engine/variability.ts) -- und aus verwandtem Grund: davor ist der Satz zu
 * klein, um aus ihm etwas zu bauen, das nach Sprache klingt. Aus sechs
 * Zeichen sind Dreiergruppen fast Wiederholungen voneinander.
 *
 * Gezaehlt werden die **aktiven** Zeichen. "Eingefuehrt" heisst im Ruling wie
 * in `growth.ts` "in den abgefragten Satz aufgenommen" -- und der aktive Satz
 * ist auch der, aus dem dieser Modus baut. Ein Modus auf Zeichen
 * freizuschalten, die er nicht verwenden darf, waere ein leeres Versprechen.
 *
 * **Seit Ruling #90 auch die Schwelle des Sende-Trainings** (Teil A.1) --
 * dieselbe Konstante, keine zweite Zahl. Der Modus ist von hier aus nicht
 * erreichbar (Engine kennt keine UI), aber `ui/App.tsx` fragt genau diese
 * Konstante fuer beide Modi ab.
 */
export const WORDS_MIN_CHARACTERS = 8;

/**
 * So viele abgeschickte Aufgaben machen den Tag zu einem geuebten Tag
 * (Ruling #87).
 *
 * Der Modus hat kein Ende mehr, an dem der Streak-Tag fallen koennte -- also
 * braucht er eine Schwelle. Fuenf, weil eine einzelne Antwort kein geuebter Tag
 * ist: wer den Modus oeffnet, einmal tippt und weggeht, hat nicht geuebt, und
 * der Streak misst Kontinuitaet, nicht Anwesenheit (CLAUDE.md 2.8). Nach oben
 * ist die Zahl bewusst klein gehalten: eine Schwelle, die man nur mit
 * Ausdauer erreicht, waere genau die Erpressung, die dieses Produkt nicht
 * betreibt.
 *
 * **Seit Ruling #90 auch die Schwelle des Sende-Trainings** -- dieselbe Zahl,
 * angewandt auf `day.sent` statt `day.words` (engine/sendSession.ts).
 */
export const WORDS_STREAK_MIN_ANSWERS = 5;

/** Kuerzestes und laengstes Wort der Liste (Ruling: 2-5 Buchstaben). */
export const WORD_MIN_LENGTH = 2;
export const WORD_MAX_LENGTH = 5;

/** Kuerzeste und laengste Zufallsgruppe (Ruling: 3-5 Zeichen). */
export const GROUP_MIN_LENGTH = 3;
export const GROUP_MAX_LENGTH = 5;

/**
 * Die laengste Aufgabe ueberhaupt -- und damit die Grenze der Eingabe.
 *
 * Die UI laesst nicht mehr Zeichen eintippen als das laengste moegliche
 * Ergebnis: eine Antwort, die laenger ist als jede Aufgabe, kann nur ein
 * Vertipper sein, und ein Eingabefeld ohne Ende waere eine Einladung dazu.
 */
export const PROMPT_MAX_LENGTH = Math.max(WORD_MAX_LENGTH, GROUP_MAX_LENGTH);

/**
 * Ab so vielen baubaren Woertern kommen Woerter ins Spiel. Darunter besteht
 * eine Einheit nur aus Gruppen.
 */
export const WORDS_MIN_BUILDABLE = 20;

/** Anteil der Woerter an der Mischung, sobald sie greift (70 % / 30 %). */
export const WORD_SHARE = 0.7;

/**
 * Die Wortliste: gebraeuchliche englische Woerter mit 2-5 Buchstaben.
 *
 * **Eine Konstante im Repo, kein Abruf zur Laufzeit** (CLAUDE.md 2.5, 3): die
 * App holt nichts nachtraeglich, und eine Abhaengigkeit fuer eine Liste
 * Zeichenketten waere keine. Kosten sind messbar klein -- rund 1,5 kB Text vor
 * der Kompression.
 *
 * Die Kriterien (Ruling #83): nur A-Z, keine Eigennamen, keine Abkuerzungen,
 * keine Dubletten. Ziffern kommen hier absichtlich nicht vor -- geuebt werden
 * sie in den Gruppen, wo sie erlaubt sind. Ein Test prueft jede Zeile gegen
 * diese Kriterien, damit eine spaetere Ergaenzung nicht still daneben liegt.
 *
 * Sortiert nach Laenge und darin alphabetisch: so ist beim Lesen sofort zu
 * sehen, ob ein Wort in seine Gruppe passt, und eine Dublette faellt auf.
 * Die Reihenfolge hat **keine** Bedeutung fuer die Auswahl.
 */
export const WORD_LIST: readonly string[] = Object.freeze([
  // 2
  'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in',
  'is', 'it', 'me', 'my', 'no', 'of', 'on', 'or', 'to', 'up',
  'us', 'we',

  // 3
  'act', 'add', 'air', 'and', 'any', 'ask', 'bad', 'bag', 'box', 'boy',
  'bus', 'buy', 'can', 'car', 'cup', 'cut', 'day', 'dry', 'ear', 'eat',
  'end', 'eye', 'far', 'fit', 'fix', 'fly', 'fun', 'get', 'hat', 'hit',
  'hot', 'how', 'jam', 'jar', 'job', 'key', 'kid', 'law', 'let', 'lie',
  'lot', 'man', 'map', 'may', 'mix', 'net', 'new', 'now', 'oil', 'old',
  'our', 'out', 'own', 'pen', 'pet', 'pig', 'pot', 'put', 'red', 'run',
  'saw', 'say', 'see', 'set', 'she', 'six', 'sky', 'son', 'tax', 'tea',
  'ten', 'tie', 'tip', 'toe', 'toy', 'try', 'two', 'van', 'vet', 'war',
  'way', 'web', 'wet', 'why', 'win', 'yes', 'you', 'zip',

  // 4
  'also', 'back', 'bell', 'boat', 'both', 'card', 'come', 'dark', 'desk', 'draw',
  'exit', 'fall', 'feel', 'fish', 'four', 'full', 'girl', 'good', 'hand', 'head',
  'here', 'home', 'idea', 'item', 'jump', 'kind', 'last', 'life', 'list', 'look',
  'main', 'mark', 'mind', 'most', 'name', 'news', 'note', 'open', 'park', 'path',
  'play', 'rain', 'rich', 'rise', 'rock', 'room', 'sail', 'save', 'ship', 'side',
  'slow', 'some', 'star', 'stop', 'talk', 'tell', 'that', 'they', 'tiny', 'town',
  'true', 'unit', 'vote', 'wall', 'wash', 'well', 'wide', 'wind', 'wise', 'wood',
  'year', 'zone',

  // 5
  'about', 'alone', 'black', 'brain', 'build', 'chair', 'close', 'count', 'daily', 'drive',
  'eight', 'field', 'floor', 'front', 'grass', 'group', 'heavy', 'human', 'known', 'leave',
  'local', 'match', 'month', 'night', 'ocean', 'paper', 'place', 'power', 'quiet', 'range',
  'river', 'shape', 'shore', 'sleep', 'solid', 'speak', 'stand', 'store', 'table', 'thick',
  'third', 'total', 'train', 'under', 'voice', 'where', 'world', 'young',
]);

/** Ob der Modus freigeschaltet ist. Nimmt die Zahl der aktiven Zeichen. */
export function wordsUnlocked(activeCharacterCount: number): boolean {
  return activeCharacterCount >= WORDS_MIN_CHARACTERS;
}

/**
 * Die Woerter, die sich aus diesem Zeichensatz bauen lassen -- in
 * Grossbuchstaben, weil das Alphabet und die Statistik so schreiben.
 *
 * Verglichen wird buchstabenweise gegen den aktiven Satz. Kein Vorrechnen und
 * kein Cache: die Liste hat ein paar hundert Eintraege, und die Frage steht
 * einmal je Aufgabe an -- nicht auf dem Eingabepfad (CLAUDE.md 7).
 */
export function buildableWords(active: readonly string[]): string[] {
  const set = new Set(active);
  return WORD_LIST.map((word) => word.toUpperCase()).filter((word) =>
    [...word].every((char) => set.has(char)),
  );
}

/**
 * Die Zeichen, an denen es gerade hakt: **schwach oder langsam**.
 *
 * "Schwach" heisst gemessen und unter `GROWTH_MIN_CHARACTER_ACCURACY` -- genau
 * die Schwelle, an der die Wachstumsregel ein Zeichen als noch nicht sitzend
 * ansieht (Bedingung (c) in growth.ts). "Langsam" ist, was `engine/drill.ts`
 * so nennt: genug Messungen, Quote in Ordnung, Median ueber zwei Sekunden.
 *
 * Beide Begriffe sind bewusst geliehen und nicht neu erfunden: es gibt in
 * diesem Projekt schon zwei Schwellen fuer "das sitzt noch nicht", und eine
 * dritte waere eine dritte Wahrheit (CLAUDE.md 2.6).
 *
 * Ein noch nie abgefragtes Zeichen zaehlt **nicht** dazu. Es ist unbekannt,
 * nicht schwach -- und die Gewichtung nach Schwaeche (selection.ts) holt es
 * ohnehin bevorzugt in den Einzelzeichen-Loop.
 */
export function weakOrSlowCharacters(progress: Progress): string[] {
  const slow = new Set(slowCharacters(progress));

  return progress.activeCharacters.filter((char) => {
    if (slow.has(char)) return true;
    const rate = hitRate(recordFor(progress, char));
    return rate !== null && rate < GROWTH_MIN_CHARACTER_ACCURACY;
  });
}

export interface PromptOptions {
  /** Zufallszahl in [0,1). Als Parameter, damit Tests nicht wuerfeln muessen. */
  random: () => number;
  /** Die Aufgabe davor -- wird nach Moeglichkeit nicht wiederholt. */
  avoid?: string | null;
}

/**
 * Die naechste Aufgabe: ein Wort oder eine Gruppe.
 *
 * Die Mischung steht in `WORD_SHARE`, greift aber erst ab
 * `WORDS_MIN_BUILDABLE` baubaren Woertern -- vorher gibt es nur Gruppen.
 * Reihenfolge der Zufallszahlen: erst die Muenze Wort/Gruppe, dann die
 * Auswahl. Wer die Folge kennt, kennt das Ergebnis.
 */
export function nextPrompt(progress: Progress, options: PromptOptions): string {
  const words = buildableWords(progress.activeCharacters);
  const wordsPossible = words.length >= WORDS_MIN_BUILDABLE;

  // Die Muenze wird auch dann geworfen, wenn es keine Woerter gibt: sonst
  // haenge die Folge der Gruppen davon ab, wie gross der Satz gerade ist, und
  // ein Test waere nicht mehr von der Zeichenzahl unabhaengig.
  const wantWord = options.random() < WORD_SHARE;

  return wordsPossible && wantWord
    ? drawWord(words, progress, options)
    : drawGroup(progress, options);
}

/**
 * Ein Wort, bevorzugt eines mit einem schwachen oder langsamen Zeichen.
 *
 * Erst wird die Vorzugsliste gebildet; ist sie leer -- alles sitzt --, wird
 * gleichverteilt aus allen baubaren Woertern gezogen. "Sonst zufaellig" heisst
 * genau das: kein Ersatzkriterium, das sich niemand ausgedacht hat.
 */
function drawWord(
  words: readonly string[],
  progress: Progress,
  options: PromptOptions,
): string {
  const candidates = words.length > 1 ? words.filter((word) => word !== options.avoid) : words;
  const weak = new Set(weakOrSlowCharacters(progress));
  const preferred = candidates.filter((word) => [...word].some((char) => weak.has(char)));
  const pool = preferred.length > 0 ? preferred : candidates;

  return pool[Math.min(pool.length - 1, Math.floor(options.random() * pool.length))];
}

/**
 * Eine Zufallsgruppe aus dem aktiven Satz -- Ziffern erlaubt, weil sie im
 * aktiven Satz stehen.
 *
 * Der Vorzug fuer schwache und langsame Zeichen liegt hier **in der Ziehung**
 * und nicht in einem Filter: eine Gruppe wird gebaut, ein Wort ausgewaehlt.
 * Gezogen wird deshalb Position fuer Position mit `pickNext` -- derselben
 * Gewichtung nach Schwaeche, die den Einzelzeichen-Loop steuert
 * (engine/selection.ts). Ein Zeichen, das haengt, kommt damit in der Gruppe
 * mehrfach so oft vor wie eines, das sitzt, und die Gruppe *als Ganze* ist
 * fast immer eine mit einer wackligen Stelle darin.
 *
 * `avoid` je Position ist das vorige Zeichen: "SSS" ist keine Uebung im
 * Trennen, sondern eine im Zaehlen (CLAUDE.md 2.2). Ueber die Gruppen hinweg
 * wird dagegen nichts vermieden -- dieselbe Gruppe zweimal ist bei einem
 * Satz dieser Groesse praktisch ausgeschlossen.
 */
function drawGroup(progress: Progress, options: PromptOptions): string {
  const span = GROUP_MAX_LENGTH - GROUP_MIN_LENGTH + 1;
  const length =
    GROUP_MIN_LENGTH + Math.min(span - 1, Math.floor(options.random() * span));

  let group = '';
  for (let index = 0; index < length; index += 1) {
    group += pickNext(progress.activeCharacters, progress, {
      random: options.random,
      avoid: group.length === 0 ? null : group[group.length - 1],
    });
  }
  return group;
}
