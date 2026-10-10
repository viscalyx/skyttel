import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { App } from './App.js';
import { BuildNotice } from './build-guard.js';
import './styles.css';

// THROWAWAY: an opt-in, in-memory comparison using the real map component.
const DepthPrototype =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('prototype') === 'spatial-depth'
    ? lazy(() =>
        import('./SpatialDepthPrototype.js').then(({ SpatialDepthPrototype }) => ({
          default: SpatialDepthPrototype,
        })),
      )
    : null;

const root = document.getElementById('root');
if (!root) throw new Error('The application root element is missing.');
createRoot(root).render(
  <StrictMode>
    <RouterProvider
      router={createBrowserRouter([
        {
          path: '*',
          element: (
            <>
              <BuildNotice />
              {DepthPrototype ? (
                <Suspense fallback={<p>Öppnar prototypen…</p>}>
                  <DepthPrototype />
                </Suspense>
              ) : (
                <App />
              )}
            </>
          ),
        },
      ])}
    />
  </StrictMode>,
);
