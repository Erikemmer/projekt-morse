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
export type MenuLocation =
  | 'practice'
  | 'learn'
  | 'words'
  | 'send'
  | 'progress'
  | 'account'
  | 'settings'
  | 'about';

/**
 * Ein Eintrag ist entweder ein Ort in dieser App oder ein Link nach draußen.
 *
 * Zwei Formen und kein gemeinsamer Nenner, weil sie sich wirklich
 * unterscheiden: ein Ort wird gemeldet und setzt den Ortsmarker, ein Link
 * verlässt die SPA und kann nie „hier" sein. Ein `<button>`, der navigiert,
 * wäre für Tastatur und Screenreader die falsche Rolle.
 */
type MenuEntry =
  | { readonly kind: 'place'; readonly location: MenuLocation; readonly label: string }
  | { readonly kind: 'link'; readonly href: string; readonly label: string };

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
 *
 * „Words & groups" (Ruling #83) steht bei den Übungsmodi, direkt hinter dem
 * Lernmodus: es *ist* Üben, und wer den Modus sucht, sucht ihn dort. Er kann
 * gesperrt sein — dann steht er gedimmt da, mit dem stillen Hinweis, ab wann
 * er aufgeht.
 *
 * „Send" (Ruling Notion-Log #90) steht direkt dahinter, aus demselben Grund
 * und mit derselben Sperre — dieselbe Konstante (`WORDS_MIN_CHARACTERS`),
 * keine zweite Zahl (Teil A.1).
 *
 * „Learn" ist der redaktionelle Bereich unter `/learn/` und damit kein Ort
 * dieser App, sondern ein Weg hinaus. Er steht bei den sekundären Einträgen
 * und direkt vor „About": beides ist Lesestoff, kein Üben (Ruling #83, C).
 */
/**
 * Exportiert, seit es die Laptop-Schiene gibt (Ruling Notion-Log #95, B.4):
 * **eine** Navigations-Wahrheit. Die Schiene rendert aus derselben Liste wie
 * das Menü-Panel -- keine zweite Liste, die auseinanderlaufen könnte.
 */
/**
 * Der Weg zum Impressum (Ruling L2) -- kein Eintrag in `ENTRIES`: das sind
 * Wege hinaus, keine Orte der App, und die Liste der Übungsmodi bleibt ruhig.
 * Von jeder Seite aus mit einem Klick erreichbar (§ 5 DDG), deshalb am Fuß
 * des einen Orts, der von überall erreichbar ist -- Menü-Panel und Schiene.
 */
function LegalLinks() {
  return (
    <>
      <a href="/imprint/">Imprint</a> · <a href="/privacy/">Privacy</a>
    </>
  );
}

export const ENTRIES: readonly MenuEntry[] = Object.freeze([
  { kind: 'place', location: 'practice', label: 'Practice' },
  { kind: 'place', location: 'learn', label: 'Learn the sounds' },
  { kind: 'place', location: 'words', label: 'Words & groups' },
  { kind: 'place', location: 'send', label: 'Send' },
  { kind: 'place', location: 'progress', label: 'Progress' },
  { kind: 'place', location: 'account', label: 'Account' },
  { kind: 'place', location: 'settings', label: 'Settings' },
  { kind: 'link', href: '/learn/', label: 'Learn' },
  { kind: 'place', location: 'about', label: 'About' },
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

/**
 * Die Navigations-Schiene ab 900 px (Runde D1, Notion-Log #95/#96, Teil A.2).
 *
 * **Ersetzt nichts, sie steht daneben.** Anders als `MenuPanel` (das den
 * Screen ersetzt) rendert die Schiene neben der Übungsfläche und bleibt auch
 * während einer laufenden Übung stehen (Teil B.8) -- Platz ist da, und sie
 * ist der einzige Ausgang, seit die App-Kopfzeile mit dem Hamburger ab dieser
 * Breite verschwindet (CSS, `.app-header`).
 *
 * **Eine Navigations-Wahrheit** (Teil B.4): sie rendert aus `ENTRIES`, genau
 * der Liste, aus der auch `MenuPanel` baut. Ortsmarker und Sperre verhalten
 * sich wie dort -- nur die Form des Markers ist eine andere.
 *
 * **Kein Amber** (Teil B.5): der Ortsmarker ist eine kurze Tinten-Linie links
 * vom aktiven Eintrag (aktiv ink, übrige gray), nicht der gefüllte Punkt aus
 * `.menu-dot`. Sonst trüge die Übungsfläche daneben zwei Amber, sobald der
 * Play-Kreis während der Wiedergabe füllt (styles.css, `.nav-rail-item`).
 */
export function NavRail({
  location,
  locked,
  onNavigate,
}: {
  location: MenuLocation;
  locked?: Partial<Record<MenuLocation, string>>;
  onNavigate: (target: MenuLocation) => void;
}) {
  return (
    <nav className="nav-rail" aria-label="Morse Lab">
      <p className="nav-rail-lockup">
        <img className="nav-rail-mark" src="/logo-key.svg" alt="" width="24" height="16" />
        <span className="wordmark nav-rail-wordmark">Morse Lab</span>
      </p>

      <div className="nav-rail-list">
        {ENTRIES.map((entry) => {
          if (entry.kind === 'link') {
            return (
              <a key={entry.href} className="nav-rail-item" href={entry.href}>
                {entry.label}
              </a>
            );
          }

          const current = entry.location === location;
          const hint = locked?.[entry.location];

          return (
            <button
              key={entry.location}
              type="button"
              className="nav-rail-item"
              aria-current={current ? 'page' : undefined}
              disabled={hint !== undefined}
              onClick={() => onNavigate(entry.location)}
            >
              {entry.label}
              {hint !== undefined && (
                <>
                  <span className="menu-hint" aria-hidden="true">
                    {hint}
                  </span>
                  <span className="visually-hidden">{` — locked, ${hint}`}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <p className="nav-rail-footer">
        <LegalLinks />
      </p>
    </nav>
  );
}

export function MenuPanel({
  location,
  locked,
  onNavigate,
  onDismiss,
}: {
  location: MenuLocation;
  /**
   * Gesperrte Orte samt ihrem stillen Hinweis, z. B.
   * `{ words: 'from 8 characters' }`.
   *
   * Der Text kommt von außen und wird hier nicht gebaut: *ab wann* ein Modus
   * aufgeht, ist eine Regel der Engine, und diese Komponente rechnet nicht
   * (CLAUDE.md 4). Ohne Eintrag ist ein Ort offen.
   */
  locked?: Partial<Record<MenuLocation, string>>;
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
          /*
            Der Punkt ist bei jedem Eintrag im Layout (sonst spränge der Text),
            aber nur am aktuellen Ort gefüllt. Ein Link nach draußen ist nie
            der aktuelle Ort.
          */
          if (entry.kind === 'link') {
            return (
              <a key={entry.href} className="menu-item" href={entry.href}>
                <span className="menu-dot" data-current={false} aria-hidden="true" />
                {entry.label}
              </a>
            );
          }

          const current = entry.location === location;
          const hint = locked?.[entry.location];

          return (
            <button
              key={entry.location}
              ref={index === 0 ? firstEntryRef : undefined}
              type="button"
              className="menu-item"
              aria-current={current ? 'page' : undefined}
              /*
                Gesperrt heißt wirklich gesperrt -- das Attribut steht, nicht
                nur die Optik (wie im Tastenfeld, Ruling #75). Der Hinweis
                daneben sagt, ab wann es aufgeht; für Screenreader steht er
                zusätzlich im Namen des Eintrags, denn eine gedimmte Zeile
                allein ist keine Auskunft (CLAUDE.md 6).
              */
              disabled={hint !== undefined}
              onClick={() => onNavigate(entry.location)}
            >
              <span className="menu-dot" data-current={current} aria-hidden="true" />
              {entry.label}
              {hint !== undefined && (
                <>
                  <span className="menu-hint" aria-hidden="true">
                    {hint}
                  </span>
                  <span className="visually-hidden">{` — locked, ${hint}`}</span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      <p className="menu-footer">
        <LegalLinks />
      </p>
    </div>
  );
}
