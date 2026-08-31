/**
 * Die Einfuehrung: zwei Bildschirme, dann los.
 *
 * Sie laeuft einmal. Der Merker dafuer steht additiv im Fortschritt
 * (`introSeen`, engine/stats.ts) und wird beim Abschluss gesetzt -- egal ob
 * jemand durchgelesen oder uebersprungen hat. Wer sie nicht will, kommt mit
 * "Skip intro" von jedem Bildschirm aus sofort ins Training.
 *
 * Zwei Dinge, die hier bewusst *nicht* stehen:
 *
 * - **Kein Karussell.** Zwei Bildschirme sind ein Index und eine Bedingung,
 *   keine Bibliothek (CLAUDE.md 3: moeglichst null neue Abhaengigkeiten).
 * - **Keine Bewegung ausser einem Einblenden.** Das laeuft ueber eine
 *   CSS-Animation, die der globale `prefers-reduced-motion`-Block in
 *   styles.css ohnehin stilllegt (CLAUDE.md 6).
 *
 * Die Texte sind wortgleich vorgegeben (Produktentscheidung, Notion-Log) --
 * hier wird nichts umformuliert.
 */

import { useEffect, useRef, useState } from 'react';

interface Screen {
  headline: string;
  body: string;
}

const SCREENS: readonly Screen[] = Object.freeze([
  {
    headline: 'Learn Morse by ear.',
    body:
      "No tables, no counting dots and dashes. You'll learn each character as a sound — at " +
      "full speed from day one, the way it's meant to be heard.",
  },
  {
    headline: 'A few minutes a day.',
    body:
      'You hear a character, you answer, you see the result. Start with six characters; the ' +
      'set grows as you get surer. Short sessions beat long ones — come back tomorrow.',
  },
]);

export function Intro({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const screen = SCREENS[index];
  const last = index === SCREENS.length - 1;

  // Bei jedem Wechsel wandert der Fokus auf die neue Ueberschrift: so wird sie
  // vorgelesen, und die Tastatur steht wieder am Anfang des Bildschirms statt
  // irgendwo im vorigen (CLAUDE.md 6: Fokus bei Moduswechsel korrekt setzen).
  useEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  return (
    <section className="intro" aria-labelledby="intro-heading">
      {/*
        key am Block: React baut ihn beim Wechsel neu auf, damit das Einblenden
        wieder von vorn laeuft. Ohne das bliebe der zweite Bildschirm statisch.
      */}
      <div className="intro-body" key={index}>
        <h2 id="intro-heading" className="intro-headline" ref={headingRef} tabIndex={-1}>
          {screen.headline}
        </h2>
        <p className="intro-text">{screen.body}</p>
      </div>

      <div className="intro-foot">
        <button type="button" className="skip" onClick={onDone}>
          Skip intro
        </button>

        <span className="dots" aria-hidden="true">
          {SCREENS.map((_, dot) => (
            <span key={dot} className="dot" data-state={dot === index ? 'done' : 'open'} />
          ))}
        </span>
      </div>

      <div className="actions">
        {last ? (
          <button type="button" className="button-begin" onClick={onDone}>
            Begin
          </button>
        ) : (
          <button type="button" className="intro-next" onClick={() => setIndex(index + 1)}>
            Next
          </button>
        )}
      </div>
    </section>
  );
}
