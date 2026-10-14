import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router';
import { App } from './App.js';
import { BuildNotice } from './build-guard.js';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('The application root element is missing.');
const CookiePrototype = import.meta.env.DEV
  ? lazy(() => import('./CookieFlows.prototype.js'))
  : null;
function ApplicationEntry() {
  const location = useLocation();
  // A–C compare standalone frames. D runs inside the actual App.
  const standalone =
    import.meta.env.DEV &&
    location.pathname === '/cookies' &&
    new URLSearchParams(location.search).get('variant') !== 'D';
  return standalone && CookiePrototype ? (
    <Suspense fallback={<p>Öppnar prototypen…</p>}>
      <CookiePrototype />
    </Suspense>
  ) : (
    <>
      <BuildNotice />
      <App />
    </>
  );
}
createRoot(root).render(
  <StrictMode>
    <RouterProvider
      router={createBrowserRouter([
        {
          path: '*',
          element: <ApplicationEntry />,
        },
      ])}
    />
  </StrictMode>,
);
