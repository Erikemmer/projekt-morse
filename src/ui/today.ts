/**
 * Der heutige Kalendertag als `YYYY-MM-DD`.
 *
 * Steht hier und nicht in `src/engine/`, weil die Engine ohne Uhr auskommt
 * (CLAUDE.md 4): sie bekommt den Tag hereingereicht und bleibt damit ohne
 * Browser testbar. Wer testen will, was am Monatswechsel passiert, ruft die
 * Engine mit einem festen String auf statt die Systemzeit zu stellen.
 *
 * Lokale Zeit, nicht UTC: "heute" ist die Frage des Nutzers vor dem Geraet.
 * `toISOString()` waere hier falsch -- es rechnet nach UTC um und schoebe den
 * Tageswechsel je nach Zeitzone um Stunden.
 */
export function todayISO(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
