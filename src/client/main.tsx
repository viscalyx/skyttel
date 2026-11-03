import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { App } from './App.js';
import { ApplicationError } from './ApplicationError.js';
import { BuildNotice } from './build-guard.js';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('The application root element is missing.');
const modelPrototype =
  import.meta.env.DEV &&
  import.meta.env.MODE === 'development' &&
  location.pathname === '/households/prototype' &&
  new URLSearchParams(location.search).has('variant');
const Prototype = modelPrototype
  ? (await import('./ModelChoicePrototype.js')).ModelChoicePrototype
  : null;
createRoot(root).render(
  <StrictMode>
    {Prototype ? (
      <Prototype />
    ) : (
      <RouterProvider
        router={createBrowserRouter([
          {
            path: '*',
            ErrorBoundary: ApplicationError,
            element: (
              <>
                <BuildNotice />
                <App />
              </>
            ),
          },
        ])}
      />
    )}
  </StrictMode>,
);
