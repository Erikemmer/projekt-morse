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

import type { Progress } from '../engine/stats';
import { buildVersion } from './build';
import { SOUND_ONLY_NOTE } from './Intro';
import { KeyMark } from './KeyMark';
import { todayISO } from './today';

/**
 * Der eigene Stand als Datei (Review E6): die Daten liegen auf dem Geraet,
 * also soll man sie auch mitnehmen koennen -- ohne Konto. Exakt der Blob, der
 * im localStorage steht; nichts wird umgerechnet oder weggelassen.
 */
function downloadProgress(progress: Progress): void {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `morse-lab-progress-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function About({
  headingRef,
  progress,
}: {
  headingRef: (element: HTMLElement | null) => void;
  progress: Progress;
}) {
  const build = buildVersion();

  return (
    <section className="screen" aria-labelledby="about-heading">
      <h2 id="about-heading" className="screen-heading" ref={headingRef} tabIndex={-1}>
        About
      </h2>

      <p className="about-lockup">
        {/* Dekorativ: den Namen sagt die Wortmarke daneben. */}
        <KeyMark className="about-mark" width={90} />
        <span className="wordmark about-wordmark">Morse Lab</span>
      </p>

      <p className="about-line">
        An adaptive trainer for hearing Morse code — you learn each character as a sound, at full
        speed from day one.
      </p>

      {/*
        Sichtbar statt nur fuer Screenreader (Review F3, CLAUDE.md 6: wer nicht
        hoeren kann, muss klar erfahren, dass ein Modus auditiv ist -- und
        warum). Send zeigt das Zeichen und fragt das Muster ab; es geht ohne
        Ton. Wortlaut-Entwurf, Fable-Abnahme offen.
      */}
      <p className="about-line">{SOUND_ONLY_NOTE}</p>

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

      <p className="about-more">
        <button type="button" className="quiet-action" onClick={() => downloadProgress(progress)}>
          Download your practice data
        </button>
      </p>

      {/*
        Der eine leise Weg in den Learn-Bereich (CONCEPT-LEARN §2). Ein echter
        Link, keine Screen-Navigation: /learn/ ist statisches HTML neben der
        App, nicht einer ihrer Screens. `.quiet-link` ist dieselbe Regel wie
        `.skip` — erreichbar und sonst nichts. Amber bleibt in dieser View der
        Amber-Knopf des Tasters oben (1.1 §4).
      */}
      <p className="about-more">
        <a className="quiet-link" href="/learn/">
          Learn more about Morse
        </a>
      </p>
    </section>
  );
}
