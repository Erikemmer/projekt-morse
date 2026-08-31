import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './ui/App';
import './styles.css';

const container = document.getElementById('root');
if (container === null) throw new Error('#root fehlt in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline-Faehigkeit (PWA). Nur im Produktionsbuild: im Dev-Server wuerde der
// Worker gebaute Assets cachen, die es dort nicht gibt, und HMR durchkreuzen.
// Ein Fehlschlag ist kein Beinbruch -- die App laeuft dann wie eine normale
// Seite, nur eben nicht offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // bewusst still: kein Feature der App haengt am Worker
    });
  });
}
