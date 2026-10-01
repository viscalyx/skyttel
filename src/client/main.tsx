import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.js';
import { BuildNotice } from './build-guard.js';
import './styles.css';

// PROTOTYPE: the mobile study only loads in the development server, never in a build. It contains
// the earlier text mode and voice mode studies, so the earlier addresses open it too.
const prototype = new URLSearchParams(window.location.search).get('prototype');
const Prototype =
  import.meta.env.DEV && ['mobil', 'rostlage', 'textlage'].includes(prototype ?? '')
    ? (await import('./VoiceModePrototype.js')).VoiceModePrototype
    : null;

const root = document.getElementById('root');
if (!root) throw new Error('The application root element is missing.');
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      {Prototype ? (
        <Prototype />
      ) : (
        <>
          <BuildNotice />
          <App />
        </>
      )}
    </BrowserRouter>
  </StrictMode>,
);
