import { ClerkProvider } from '@clerk/react';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';

import { Spinner } from './components/ui';
import { CLERK_PUBLISHABLE_KEY } from './lib/config';
import { DownloadPage } from './pages/info/download-page';
import { PrivacyPage, TermsPage } from './pages/info/legal-pages';
import { LandingPage } from './pages/landing/landing-page';
import { SignInPage } from './pages/auth/sign-in-page';
import { SsoCallbackPage } from './pages/auth/sso-callback-page';
import { WelcomePage } from './pages/welcome-page';

// The app (and SQLite's WebAssembly) loads only once someone signs in.
const AppRoot = lazy(() => import('./pages/app/app-root'));

function PageFallback() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <Spinner />
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/', element: <WelcomePage /> },
  { path: '/landing', element: <LandingPage /> },
  { path: '/download', element: <DownloadPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/sso-callback', element: <SsoCallbackPage /> },
  {
    path: '/app/*',
    element: (
      <Suspense fallback={<PageFallback />}>
        <AppRoot />
      </Suspense>
    ),
  },
  { path: '*', element: <WelcomePage /> },
]);

export function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/landing">
      <RouterProvider router={router} />
    </ClerkProvider>
  );
}
