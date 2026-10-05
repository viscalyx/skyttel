import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.js';
import { BuildNotice } from './build-guard.js';
import { MapToolsPrototype } from './MapTools.prototype.js';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('The application root element is missing.');
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      {import.meta.env.DEV &&
      new URLSearchParams(location.search).get('prototype') === 'map-tools' ? (
        <MapToolsPrototype />
      ) : (
        <>
          <BuildNotice />
          <App />
        </>
      )}
    </BrowserRouter>
  </StrictMode>,
);
