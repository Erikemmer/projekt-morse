// defineConfig kommt aus vitest/config, damit der test-Block typisiert ist.
// Vite selbst liest dieselbe Datei und ignoriert den Block.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Traegt nach dem Build die gehashten Asset-Pfade und eine daraus abgeleitete
 * Version in dist/sw.js ein (Marker: self.__BUILD_ASSETS, self.__BUILD_VERSION).
 *
 * Warum noetig: der Service Worker soll die App offline ausliefern, kennt die
 * gehashten Dateinamen eines Builds aber nicht im Voraus -- und der erste
 * Seitenaufbau laeuft, bevor der Worker die Seite kontrolliert, landet also
 * nie im Laufzeit-Cache. Die Version haengt am Inhalt der Liste: gleicher
 * Build, gleicher Cache; neuer Build, frischer Cache samt Aufraeumen des alten.
 */
function injectServiceWorkerPrecache(): Plugin {
  return {
    name: 'inject-sw-precache',
    apply: 'build',
    closeBundle() {
      const dist = 'dist';
      const assets = readdirSync(join(dist, 'assets')).map((file) => `/assets/${file}`);
      assets.sort();
      const version = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12);

      const swPath = join(dist, 'sw.js');
      const source = readFileSync(swPath, 'utf8');
      const injected = source
        .replace('self.__BUILD_VERSION', JSON.stringify(version))
        .replace('self.__BUILD_ASSETS', JSON.stringify(assets));
      if (injected === source) {
        throw new Error('sw.js: Marker fuer den Vorab-Cache nicht gefunden');
      }
      writeFileSync(swPath, injected);

      // Dieselbe Version noch einmal, fuer Menschen: der About-Screen liest
      // sie aus <meta name="build"> (Platzhalter "dev" in index.html). Kein
      // eigener Mechanismus -- Build-Kennung und SW-Cache-Name bleiben so
      // per Konstruktion dieselbe Zahl.
      const htmlPath = join(dist, 'index.html');
      const html = readFileSync(htmlPath, 'utf8');
      const stamped = html.replace(
        /<meta name="build" content="dev"\s*\/?>/,
        `<meta name="build" content="${version}" />`,
      );
      if (stamped === html) {
        throw new Error('index.html: Build-Marker (<meta name="build">) nicht gefunden');
      }
      writeFileSync(htmlPath, stamped);
    },
  };
}

export default defineConfig({
  plugins: [react(), injectServiceWorkerPrecache()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
