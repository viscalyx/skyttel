import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.js';
import { BuildNotice } from './build-guard.js';
import './styles.css';

const prototype = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('prototype')
  : null;
const Prototype =
  prototype === 'map' || prototype === 'voice'
    ? (await import('./MapStudyEntry.js')).MapStudyEntry
    : prototype === 'navigation'
      ? (await import('./NavigationPrototype.js')).NavigationPrototype
      : prototype === 'visual'
        ? (await import('./VisualPrototype.js')).VisualPrototype
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
