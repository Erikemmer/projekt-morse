/**
 * Das Trennornament: echter Code, `−− ·−··` = „ML" (1.1 §8).
 *
 * Seit Runde P27 auch in der App (Review §B5.1, Owner-Delegation) -- bisher
 * stand es nur auf den Learn-Seiten (`tools/learn/pages.mjs`, `ornament()`).
 * Dieselbe Geometrie wie dort (u = 6 px: Punkt 1u, Strich 3u, Luecke im
 * Zeichen 1u, zwischen den Buchstaben 3u), alles Ink, kein Amber.
 *
 * Dieselbe Regel wie auf den Learn-Seiten: **hoechstens einmal pro Screen**,
 * dort, wo ein Abschnitt endet. Zwischen jedem Abschnitt waere es Dekoration.
 * Die Muster kommen aus dem Alphabet der Engine, nicht aus einem Literal --
 * dekorativer Fake-Code ist verboten, und so kann er auch nicht entstehen.
 *
 * Fuer Screenreader stumm: es traegt keine Information, die nicht schon im
 * Namen der App steht.
 */

import { encodeChar } from '../engine/alphabet';

const LETTERS = ['M', 'L'] as const;

export function Ornament() {
  return (
    <div className="ornament" aria-hidden="true">
      {LETTERS.map((letter) => (
        <span key={letter} className="ornament-letter">
          {[...(encodeChar(letter) ?? '')].map((element, index) => (
            <i key={index} data-kind={element === '-' ? 'dah' : 'dit'} />
          ))}
        </span>
      ))}
    </div>
  );
}
