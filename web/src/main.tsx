import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/source-serif-4/latin-600.css';
import 'virtual:tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

/**
 * The fonts ship with the app, so waiting for them costs a few milliseconds and
 * means text never re-flows when Manrope replaces a fallback. Capped, in case.
 */
async function fontsReady() {
  const loads = ['400 16px Manrope', '700 16px Manrope', '800 16px Manrope'].map((font) => document.fonts.load(font));
  await Promise.race([Promise.all(loads), new Promise((resolve) => setTimeout(resolve, 1200))]);
}

fontsReady().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
