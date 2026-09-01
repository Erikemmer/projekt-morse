-- Migration 0001 -- Konten, Passkeys, Sitzungen, Lernstand.
--
-- Angewendet mit:
--   npx wrangler d1 migrations apply morse-lab --local     (Entwicklung)
--   npx wrangler d1 migrations apply morse-lab --remote     (Produktion)
--
-- Was hier NICHT steht, ist Absicht (DSGVO, CLAUDE.md 2.5): keine E-Mail,
-- kein Name, kein Anzeigename, keine IP, kein User-Agent, kein Zeitstempel
-- eines Logins. Ein Konto ist ein oeffentlicher Passkey-Schluessel und ein
-- Lernstand. Mehr braucht Sync nicht, also wird mehr nicht erhoben.

-- Ein Konto. Mehr als seine Existenz weiss der Server nicht.
CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

-- Ein Passkey. `public_key` ist base64url (COSE), wie SimpleWebAuthn ihn liefert.
-- `counter` traegt den Signaturzaehler des Authenticators und wird bei jedem
-- Login nachgezogen -- er ist der Replay-Schutz und darf nie ruecklaufen.
CREATE TABLE credentials (
  credential_id TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  public_key    TEXT NOT NULL,
  counter       INTEGER NOT NULL DEFAULT 0,
  -- Kommagetrennte Transports ('internal,hybrid'), leer wenn der Browser keine nennt.
  transports    TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX credentials_by_user ON credentials(user_id);

-- Sitzungen, serverseitig gefuehrt. Zwei Zustaende in einer Tabelle:
--
--  * `user_id IS NULL` -- ein *laufender WebAuthn-Flow*. Die Zeile haelt die
--    Challenge, die der Server ausgegeben hat, plus (bei Registrierung) die
--    reservierte Nutzer-ID. Kurze Frist (Minuten).
--  * `user_id IS NOT NULL` -- eine *angemeldete Sitzung*. Challenge leer.
--
-- Die Challenge gehoert zwingend auf den Server (sonst ist die Signatur nicht
-- gegen ein frisches Geheimnis gepruefft). Sie hier zu fuehren statt in einer
-- fuenften Tabelle haelt das Schema bei den vier vorgegebenen Tabellen.
--
-- `id` ist der SHA-256 des Cookie-Werts, nicht der Wert selbst: wer die
-- Datenbank liest, haelt damit keine gueltige Sitzung in der Hand.
CREATE TABLE sessions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT,
  challenge      TEXT,
  challenge_kind TEXT,
  new_user_id    TEXT,
  created_at     INTEGER NOT NULL,
  expires_at     INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX sessions_by_user ON sessions(user_id);
CREATE INDEX sessions_by_expiry ON sessions(expires_at);

-- Der Lernstand als Blob -- genau das JSON, das lokal im localStorage steht.
--
-- Bewusst opak: der Server bewertet nichts, rechnet nichts und kennt die
-- Felder nicht. Die Merge-Semantik ist reine Client-Logik (src/engine/sync.ts),
-- damit sie ohne Netz testbar bleibt (CLAUDE.md 4). Ein Feld dazuzulegen
-- braucht deshalb keine Migration.
CREATE TABLE progress (
  user_id    TEXT PRIMARY KEY,
  blob       TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
