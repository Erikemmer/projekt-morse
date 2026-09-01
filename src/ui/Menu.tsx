/**
 * Kopfzeile und Menü: das clientseitige Gehäuse um den Lernloop.
 *
 * Bewusst kein Router und keine URL-Zustände: vier Orte, ein useState in
 * App.tsx — eine Abhängigkeit oder eine History-Maschinerie wäre Vorbau ohne
 * zweiten Bedarf (CLAUDE.md 3, 4). Hier wird nur gerendert und gemeldet.
 *
 * **Das Panel ersetzt den Screen, es überlagert ihn nicht.** Solange es offen
 * ist, rendert App.tsx nichts anderes — damit gibt es hinter dem Dialog nichts
 * Fokussierbares, und eine Fokus-Falle ist überflüssig statt nachgebaut
 * (CLAUDE.md 6). Fokusführung: beim Öffnen auf den ersten Eintrag, Esc und X
 * schließen, App.tsx holt den Fokus danach auf den Trigger zurück.
 *
 * Der aktuelle Ort trägt einen kleinen Amber-Punkt — das eine Amber dieser
 * View (1.1 §4). Der Punkt ist an- oder abwesend (Form, nicht nur Farbe),
 * und `aria-current` sagt dasselbe für Screenreader (CLAUDE.md 6).
 */

import { useEffect, useRef } from 'react';

/** Wo man gerade ist — 'learn' ist die Klang-Auswahl (ReviewPicker). */
export type MenuLocation = 'practice' | 'learn' | 'progress' | 'account' | 'settings' | 'about';

/*
 * „Account" stand in Runde A bewusst nicht hier (1.1 §7: nichts zeigen, was
 * nicht funktioniert) — es gab kein Backend. Jetzt gibt es eins, also steht
 * der Eintrag da. Er steht *unter* Progress und über About: er ist ein Ort für
 * eigene Daten, kein Teil des Übens, und niemand soll ihn für den Einstieg
 * halten. Die App bleibt ohne ihn vollständig.
 *
 * „Settings" steht aus demselben Grund dahinter: Tonhöhe und Lautstärke
 * gehören dem Gerät, nicht dem Üben und nicht dem Konto
 * (engine/deviceSettings.ts).
 */
const ENTRIES: readonly { location: MenuLocation; label: string }[] = Object.freeze([
  { location: 'practice', label: 'Practice' },
  { location: 'learn', label: 'Learn the sounds' },
  { location: 'progress', label: 'Progress' },
  { location: 'account', label: 'Account' },
  { location: 'settings', label: 'Settings' },
  { location: 'about', label: 'About' },
]);

/**
 * Die Kopfzeile des Start-Screens (und der Screens dahinter): Wortmarke links,
 * Menü-Trigger rechts. Mitten in einer Sitzung erscheint sie nicht — dort
 * wäre sie eine Ablenkung, wie vorher schon der Wiederholen-Link.
 */
export function AppHeader({
  triggerRef,
  onOpenMenu,
}: {
  triggerRef: React.RefObject<HTMLButtonElement>;
  onOpenMenu: () => void;
}) {
  return (
    <header className="app-header">
      {/*
        Die Wortmarke: Newsreader Regular, sentence case, nie gesperrt, nie
        Versalien (1.1 §2). Für Screenreader dekorativ — den Namen trägt die
        (unsichtbare) h1 direkt darüber in App.tsx; zweimal "Morse Lab"
        hintereinander wäre nur Rauschen.
      */}
      <span className="wordmark" aria-hidden="true">
        Morse Lab
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="icon-button"
        aria-label="Menu"
        aria-haspopup="dialog"
        onClick={onOpenMenu}
      >
        {/* Drei kurze Linien: 1.5px Strich, runde Kappen, 24er-Raster (1.1 §8). */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 7h12M6 12h12M6 17h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </header>
  );
}

export function MenuPanel({
  location,
  onNavigate,
  onDismiss,
}: {
  location: MenuLocation;
  onNavigate: (target: MenuLocation) => void;
  /** Schließen ohne Ortswechsel (X oder Esc) — der Fokus geht zum Trigger zurück. */
  onDismiss: () => void;
}) {
  const firstEntryRef = useRef<HTMLButtonElement | null>(null);

  // Der Fokus wandert ins Panel (CLAUDE.md 6) — auf den ersten Eintrag, nicht
  // auf das X: wer das Menü öffnet, will wohin, nicht wieder heraus.
  useEffect(() => {
    firstEntryRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <div className="menu" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="menu-head">
        <button type="button" className="icon-button" aria-label="Close menu" onClick={onDismiss}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 7l10 10M17 7L7 17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <nav className="menu-nav" aria-label="Menu">
        {ENTRIES.map((entry, index) => {
          const current = entry.location === location;
          return (
            <button
              key={entry.location}
              ref={index === 0 ? firstEntryRef : undefined}
              type="button"
              className="menu-item"
              aria-current={current ? 'page' : undefined}
              onClick={() => onNavigate(entry.location)}
            >
              {/*
                Der Punkt ist bei jedem Eintrag im Layout (sonst spränge der
                Text), aber nur am aktuellen Ort gefüllt.
              */}
              <span className="menu-dot" data-current={current} aria-hidden="true" />
              {entry.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
