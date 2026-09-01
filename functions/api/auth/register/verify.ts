/**
 * POST /api/auth/register/verify -- die Signatur pruefen, dann das Konto anlegen.
 *
 * Erst hier entstehen Zeilen in `users` und `credentials`, und zwar in einem
 * `batch`: ein Konto ohne Passkey waere ein Konto, in das niemand mehr
 * hineinkommt.
 *
 * Die Verifikation macht `@simplewebauthn/server` -- die eine genehmigte neue
 * Abhaengigkeit dieser Runde. Handgerollt waere sie die riskantere Wahl: hier
 * haengen CBOR-Dekodierung, COSE-Schluessel, Flag-Bits und Zaehlerlogik
 * zusammen, und jeder einzelne Fehler darin ist eine stille Authentifizierungs-
 * luecke, die kein Test dieses Projekts finden wuerde.
 *
 * SimpleWebAuthn **wirft** bei den meisten Fehlschlaegen statt `verified:false`
 * zurueckzugeben. Deshalb der try/catch -- und deshalb geht nach aussen nur ein
 * nackter 400: *warum* eine Signatur nicht passte, ist Information fuer einen
 * Angreifer, nicht fuer einen Nutzer.
 */

import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

import type { Env } from '../../../_lib/env';
import { fail, json, readJson } from '../../../_lib/http';
import { relyingPartyFor } from '../../../_lib/rp';
import { base64url, promoteToUser, readFlow } from '../../../_lib/sessions';

/** Eine Attestation ist ein paar Kilobyte. 16 KiB ist reichlich Luft. */
const MAX_BODY_BYTES = 16 * 1024;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rp = relyingPartyFor(request);
  if (rp === null) return fail(400, 'unexpected host');

  const body = await readJson(request, MAX_BODY_BYTES);
  if (body === undefined) return fail(400, 'malformed body');

  const now = Date.now();
  const flow = await readFlow(request, env, 'register', now);
  if (flow === null || flow.challenge === null || flow.new_user_id === null) {
    return fail(400, 'no pending registration');
  }

  let credential;
  try {
    const verification = await verifyRegistrationResponse({
      response: body as RegistrationResponseJSON,
      expectedChallenge: flow.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      // Passend zu 'preferred' in options.ts -- siehe die Begruendung dort.
      requireUserVerification: false,
    });
    if (!verification.verified) return fail(400, 'registration not verified');
    credential = verification.registrationInfo.credential;
  } catch {
    return fail(400, 'registration not verified');
  }

  const userId = flow.new_user_id;

  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').bind(userId, now),
    env.DB
      .prepare(
        `INSERT INTO credentials (credential_id, user_id, public_key, counter, transports, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        credential.id,
        userId,
        base64url(credential.publicKey),
        credential.counter,
        (credential.transports ?? []).join(','),
        now,
      ),
  ]);

  const headers = await promoteToUser(env, flow.id, userId, now);
  // Der Rumpf sagt nichts ueber das Konto -- es gibt nichts zu sagen. Die UI
  // braucht nur "es hat geklappt"; alles andere holt sie ueber /api/progress.
  return json({ ok: true }, 200, headers);
};
