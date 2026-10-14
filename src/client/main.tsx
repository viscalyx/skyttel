import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { App } from './App.js';
import { BuildNotice } from './build-guard.js';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('The application root element is missing.');
// Throwaway route: no App, auth, server requests, or persisted product state.
const cookiePrototype = import.meta.env.DEV && window.location.pathname === '/cookies';
const CookiePrototype = import.meta.env.DEV
  ? lazy(() => import('./CookieFlows.prototype.js'))
  : null;
createRoot(root).render(
  <StrictMode>
    <RouterProvider
      router={createBrowserRouter([
        {
          path: '*',
          element: (
            <>
              {cookiePrototype && CookiePrototype ? (
                <Suspense fallback={<p>Öppnar prototypen…</p>}>
                  <CookiePrototype />
                </Suspense>
              ) : (
                <>
                  <BuildNotice />
                  <App />
                </>
              )}
            </>
          ),
        },
      ])}
    />
  </StrictMode>,
);
