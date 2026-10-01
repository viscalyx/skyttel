import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.js';
import { BuildNotice } from './build-guard.js';
import './styles.css';

// PROTOTYPE: the voice mode study only loads in the development server, never in a build. It
// contains the text view of the earlier text mode study, so the earlier address opens it too.
const prototype = new URLSearchParams(window.location.search).get('prototype');
const Prototype =
  import.meta.env.DEV && (prototype === 'rostlage' || prototype === 'textlage')
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
