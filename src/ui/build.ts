/**
 * Die Build-Kennung, fuer Menschen lesbar.
 *
 * Geschrieben wird sie vom Produktionsbuild in `index.html`
 * (`vite.config.ts`) -- dieselbe deterministische Asset-Version, die auch den
 * Service-Worker-Cache benennt. Es gibt bewusst keinen zweiten Mechanismus:
 * Build-Kennung und Cache-Name bleiben so per Konstruktion dieselbe Zahl.
 *
 * Im Dev-Server steht hier ehrlich `dev` -- kein erfundener Wert, der eine
 * Version behauptet, die es nicht gibt (CLAUDE.md 2.6).
 *
 * Eigenes Modul seit dem zweiten Bedarf, nicht ab dem ersten (CLAUDE.md 4):
 * `About` zeigt die Kennung seit jeher, `Settings` seit dem Owner-Wunsch,
 * den Stand ohne Umweg ueber die DevTools pruefen zu koennen.
 */
export function buildVersion(): string {
  return document.querySelector('meta[name="build"]')?.getAttribute('content') ?? 'dev';
}
