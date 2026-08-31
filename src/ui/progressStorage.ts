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
 * Schreibt den Fortschritt, sobald der Hauptthread Luft hat.
 *
 * Serialisieren und Schreiben sind billig, aber sie haben auf dem Eingabepfad
 * einer Uebung nichts zu suchen (CLAUDE.md 7). `requestIdleCallback` kennt Safari
 * nicht zuverlaessig, deshalb der setTimeout-Rueckfall.
 */
export function saveProgressWhenIdle(progress: Progress): () => void {
  const write = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Voller oder gesperrter Speicher darf die laufende Sitzung nicht stoeren.
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(write);
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(write, 200);
  return () => window.clearTimeout(handle);
}
