/**
 * POST /api/auth/login/options -- eine Challenge zum Anmelden ausgeben.
 *
 * **Bewusst ohne `allowCredentials`.** Der Nutzer hat nichts eingegeben, was
 * ihn benennen wuerde -- es gibt keinen Namen und keine E-Mail. Der Browser
 * fragt deshalb selbst, welcher Passkey benutzt werden soll; moeglich ist das,
 * weil die Registrierung `residentKey: 'required'` verlangt hat.
 *
 * Der angenehme Nebeneffekt: dieser Endpunkt verraet nichts. Er antwortet fuer
 * jeden gleich, weil er nicht weiss (und nicht wissen muss), wer fragt -- kein
 * Orakel darueber, welche Konten es gibt.
 */

import { generateAuthenticationOptions } from '@simplewebauthn/server';

import type { Env } from '../../../_lib/env';
import { fail, json } from '../../../_lib/http';
import { relyingPartyFor } from '../../../_lib/rp';
import { startFlow } from '../../../_lib/sessions';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rp = relyingPartyFor(request);
  if (rp === null) return fail(400, 'unexpected host');

  const options = await generateAuthenticationOptions({
    rpID: rp.id,
    userVerification: 'preferred',
  });

  const headers = await startFlow(env, 'login', options.challenge, null, Date.now());
  return json(options, 200, headers);
};
