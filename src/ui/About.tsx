/**
 * Der About-Screen: Marke, ein Satz, drei Fakten. Keine Marketing-Prosa
 * (1.1 §11: kurz, präzise, ehrlich).
 *
 * Das primäre Lockup (Marke links der Wortmarke, 1.1 §3) ist hier aus dem
 * Taster-SVG und einer HTML-Wortmarke zusammengesetzt statt als
 * `logo-lockup.svg` eingebunden: ein SVG in einem `<img>` darf die Schriften
 * der Seite nicht laden, die Wortmarke stünde dort im Georgia-Fallback.
 * So trägt sie echtes Newsreader — dieselbe Datei, die die Kopfzeile nutzt.
 *
 * Der Amber-Knopf des Tasters ist das eine Amber dieser View (1.1 §4).
 */

export function About({ headingRef }: { headingRef: (element: HTMLElement | null) => void }) {
  // Die Build-Kennung schreibt der Produktionsbuild in index.html
  // (vite.config.ts) -- dieselbe deterministische Asset-Version, die auch den
  // Service-Worker-Cache benennt. Im Dev-Server steht hier ehrlich "dev".
  const build = document.querySelector('meta[name="build"]')?.getAttribute('content') ?? 'dev';

  return (
    <section className="screen" aria-labelledby="about-heading">
      <h2 id="about-heading" className="screen-heading" ref={headingRef} tabIndex={-1}>
        About
      </h2>

      <p className="about-lockup">
        {/* Dekorativ: den Namen sagt die Wortmarke daneben. */}
        <img className="about-mark" src="/logo-key.svg" alt="" width="90" height="60" />
        <span className="wordmark about-wordmark">Morse Lab</span>
      </p>

      <p className="about-line">
        An adaptive trainer for hearing Morse code — you learn each character as a sound, at full
        speed from day one.
      </p>

      <ul className="about-facts">
        <li>Build {build}</li>
        <li>Works offline once loaded.</li>
        {/*
          Diese Zeile hiess bis Runde B „stored only on this device — nothing is
          sent anywhere". Seit es Konten gibt, waere das fuer einen Teil der
          Nutzer schlicht falsch, und eine falsche Behauptung ist hier
          schlimmer als eine laengere (CLAUDE.md 2.6). Der neue Wortlaut stimmt
          in beiden Faellen und nennt die Bedingung, statt sie zu verschweigen.
        */}
        <li>
          Your practice data stays on this device unless you create an account to sync it.
        </li>
      </ul>
    </section>
  );
}
