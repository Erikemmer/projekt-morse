/**
 * POST /api/auth/login/verify -- die Signatur pruefen, dann anmelden.
 *
 * Der Passkey nennt sich selbst (`response.id`); darueber findet sich das
 * Konto. Ein unbekannter Passkey und eine falsche Signatur fuehren zur exakt
 * gleichen Antwort -- wer probiert, erfaehrt nicht, welcher der beiden Faelle
 * vorlag.
 *
 * **Der Signaturzaehler wird nachgezogen.** Er ist der Replay-Schutz von
 * WebAuthn: ein Authenticator zaehlt jede Benutzung mit, und eine Antwort mit
 * einem Zaehler, der nicht gewachsen ist, weist SimpleWebAuthn ab. Ihn nicht zu
 * speichern hiesse, den Schutz zu haben und wegzuwerfen. (Viele Passkeys aus
 * der Cloud melden konstant 0 -- dann greift die Pruefung nicht, und das ist so
 * spezifiziert; deshalb wird der Wert genommen, wie er kommt, nicht erzwungen.)
 */

import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';

import type { Env } from '../../../_lib/env';
import { fail, json, readJson } from '../../../_lib/http';
import { relyingPartyFor } from '../../../_lib/rp';
import { fromBase64url, promoteToUser, readFlow } from '../../../_lib/sessions';

const MAX_BODY_BYTES = 16 * 1024;

interface CredentialRow {
  credential_id: string;
  user_id: string;
  public_key: string;
  counter: number;
  transports: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rp = relyingPartyFor(request);
  if (rp === null) return fail(400, 'unexpected host');

  const body = await readJson(request, MAX_BODY_BYTES);
  if (body === undefined) return fail(400, 'malformed body');

  const now = Date.now();
  const flow = await readFlow(request, env, 'login', now);
  if (flow === null || flow.challenge === null) return fail(400, 'no pending login');

  const response = body as AuthenticationResponseJSON;
  if (typeof response.id !== 'string') return fail(400, 'malformed body');

  const row = await env.DB.prepare(
    `SELECT credential_id, user_id, public_key, counter, transports
     FROM credentials WHERE credential_id = ?`,
  )
    .bind(response.id)
    .first<CredentialRow>();
  // Gleiche Antwort wie eine kaputte Signatur -- kein Orakel (siehe Kopf).
  if (row === null) return fail(400, 'login not verified');

  let newCounter: number;
  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: flow.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: false,
      credential: {
        id: row.credential_id,
        publicKey: fromBase64url(row.public_key),
        counter: row.counter,
        transports:
          row.transports === ''
            ? undefined
            : (row.transports.split(',') as AuthenticatorTransportFuture[]),
      },
    });
    if (!verification.verified) return fail(400, 'login not verified');
    newCounter = verification.authenticationInfo.newCounter;
  } catch {
    return fail(400, 'login not verified');
  }

  await env.DB.prepare('UPDATE credentials SET counter = ? WHERE credential_id = ?')
    .bind(newCounter, row.credential_id)
    .run();

  const headers = await promoteToUser(env, flow.id, row.user_id, now);
  return json({ ok: true }, 200, headers);
};
