/**
 * Der Fortschritt im localStorage.
 *
 * Hier steht *nur* das Lesen und Schreiben. Was ein gueltiger Stand ist und wie
 * fehlende Felder aufgefuellt werden, entscheidet `parseProgress` in der Engine --
 * damit bleibt diese Regel testbar, ohne einen Browser zu starten.
 *
 * localStorage ist fuer V1 bewusst genug: der Stand sind ein paar Dutzend Zahlen,
 * synchron gelesen einmal beim Start. Wird daraus je eine Historie ueber Wochen,
 * ist IndexedDB die naechste Station -- nicht vorher.
 */

import { emptyProgress, parseProgress, type Progress } from '../engine/stats';

const STORAGE_KEY = 'projekt-morse:progress';

/**
 * Wann der Stand zuletzt geschrieben wurde -- ein eigener Eintrag, nicht ein
 * Feld in `Progress`.
 *
 * Der Grund ist der Sync: `mergeProgress` (engine/sync.ts) braucht den
 * Zeitstempel, um zu entscheiden, welcher von zwei Staenden der juengere ist.
 * Er gehoert aber nicht *in* den Stand, denn der Stand ist der Blob, der zum
 * Server geht -- dort fuehrt die Datenbank ihren eigenen `updated_at`. Zwei
 * Uhren in einem Objekt waeren zwei Wahrheiten.
 *
 * Fehlt der Eintrag, ist der Stand "nie geschrieben" (0). Zusammen mit der
 * Regel aus sync.ts (ein Stand ohne Versuche ist nie der juengere) ist das
 * genau der Fall "frisches Geraet".
 */
const STAMP_KEY = 'projekt-morse:progress-at';

/**
 * Laedt den Fortschritt. Jeder Fehler endet in einem leeren Stand statt in einer
 * kaputten Seite: kein Speicher (privater Modus), kein Eintrag, kaputtes JSON.
 */
export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? emptyProgress() : parseProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

/**
 * Schreibt den Fortschritt sofort.
 *
 * Der Regelfall ist `saveProgressWhenIdle`: waehrend einer Uebung hat Schreiben
 * auf dem Eingabepfad nichts zu suchen (CLAUDE.md 7). An genau einer Stelle ist
 * das falsch herum -- beim Abschluss der Einfuehrung. Der Merker entscheidet,
 * ob jemand sie *je wieder* sieht, und wer direkt nach "Begin" oder "Skip intro"
 * neu laedt, verlaengert den Leerlauf nie so weit, dass ein
 * requestIdleCallback noch drankommt (gemessen: der Leerlauf-Schreiber lief
 * erst nach ~700 ms). Hier ist der Ton laengst nicht im Spiel, also kostet der
 * synchrone Schreibvorgang auch nichts.
 */
export function saveProgressNow(progress: Progress): void {
  write(progress);
}

/**
 * Der Zeitstempel des letzten Schreibvorgangs, in Millisekunden -- oder 0.
 *
 * Nur der Sync liest ihn (siehe STAMP_KEY). Die App selbst rechnet nie mit ihm;
 * "heute" kommt weiterhin aus `today.ts`, damit die Engine ohne Uhr bleibt.
 */
export function loadProgressStamp(): number {
  try {
    const raw = window.localStorage.getItem(STAMP_KEY);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * Ein Schreibvorgang: Stand und Zeitstempel.
 *
 * Der Zeitstempel wird *nach* dem Stand geschrieben. Bricht es dazwischen ab
 * (voller Speicher), steht ein neuer Stand mit einem alten Zeitstempel da --
 * der Stand gilt dann als aelter, als er ist. Das ist die harmlosere von zwei
 * Reihenfolgen: der Merge verliert im schlimmsten Fall einen Verlauf, statt
 * einen leeren Stand als den juengeren auszugeben.
 */
function write(progress: Progress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    window.localStorage.setItem(STAMP_KEY, String(Date.now()));
  } catch {
    // Voller oder gesperrter Speicher darf die laufende Sitzung nicht stoeren.
  }
}

/**
 * Schreibt den Fortschritt, sobald der Hauptthread Luft hat.
 *
 * Serialisieren und Schreiben sind billig, aber sie haben auf dem Eingabepfad
 * einer Uebung nichts zu suchen (CLAUDE.md 7). `requestIdleCallback` kennt Safari
 * nicht zuverlaessig, deshalb der setTimeout-Rueckfall.
 */
export function saveProgressWhenIdle(progress: Progress): () => void {
  const later = () => write(progress);

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(later);
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(later, 200);
  return () => window.clearTimeout(handle);
}
