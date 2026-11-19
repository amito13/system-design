import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts (PRD §13 privacy: no third-party font requests).
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
// Devanagari subset only; unicode-range means it downloads only when Hindi text is on screen.
import '@fontsource/noto-sans-devanagari/devanagari-400.css';
import '@fontsource/noto-sans-devanagari/devanagari-500.css';
import '@fontsource/noto-sans-devanagari/devanagari-600.css';

import './styles/app.css';
import './lib/i18n';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
