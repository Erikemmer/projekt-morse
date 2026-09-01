/**
 * Was die Functions aus der Umgebung brauchen -- und das ist wenig.
 *
 * Genau eine Bindung: die D1-Datenbank. Kein Secret, kein API-Key, keine
 * Konfiguration. Das ist kein Zufall, sondern die Folge zweier Entscheidungen:
 *
 * - **Sitzungen sind opake Zufallswerte, keine signierten Tokens.** Ein
 *   HMAC-Geheimnis waere ein Deploy-Geheimnis mehr, das jemand rotieren muss;
 *   eine Zeile in D1 ist billiger und laesst sich serverseitig widerrufen
 *   (was ein JWT nicht kann).
 * - **Die Relying Party leitet sich aus der Anfrage ab** (siehe rp.ts), nicht
 *   aus einer Variable. Damit laeuft dieselbe Function auf localhost, auf
 *   pages.dev und auf morse-lab.com, ohne dass jemand pro Umgebung etwas setzt
 *   -- und ohne dass eine vergessene Variable die Anmeldung stillegt.
 */

export interface Env {
  DB: D1Database;
}
