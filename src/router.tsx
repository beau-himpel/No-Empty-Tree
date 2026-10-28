import { useEffect } from 'react';
import { createBrowserRouter, Navigate, useNavigate } from 'react-router';
import Home, { Splash } from './components/home/Home';
import { passwordRecovery } from './lib/supabase';
import { useStore } from './lib/store';

/** The bare root has nothing to show once signed in; reset-password links are routed by auth instead. */
function IndexRedirect() {
  const navigate = useNavigate();
  const recovering = useStore(passwordRecovery);
  useEffect(() => {
    if (!recovering) navigate('/adopt-family', { replace: true });
  }, [recovering, navigate]);
  return null;
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
    HydrateFallback: Splash,
    children: [
      { index: true, Component: IndexRedirect },
      {
        path: 'adopt-family',
        handle: { title: 'Adopt families' },
        lazy: async () => ({ Component: (await import('./components/adopt-family/AdoptFamily')).default }),
      },
      {
        // Always routed; the page itself shows "closed" unless nomination_settings enables it
        path: 'nominate-family',
        handle: { title: 'Nominate a family' },
        lazy: async () => ({ Component: (await import('./components/nominate-family/NominateFamily')).default }),
      },
      {
        path: 'reset-password',
        handle: { title: 'Reset password' },
        lazy: async () => ({ Component: (await import('./components/auth/ResetPassword')).default }),
      },
      {
        path: 'my-adoptions',
        handle: { title: 'My adoptions' },
        lazy: async () => ({ Component: (await import('./components/my-adoptions/MyAdoptions')).default }),
      },
      {
        path: 'my-adoptions/shopping-list',
        handle: { title: 'Shopping list' },
        lazy: async () => ({ Component: (await import('./components/shopping-list/ShoppingList')).default }),
      },
      {
        path: 'my-adoptions/past',
        handle: { title: 'Past adoptions' },
        lazy: async () => ({ Component: (await import('./components/past-adoptions/PastAdoptions')).default }),
      },
      { path: '*', element: <Navigate to="/adopt-family" replace /> },
    ],
  },
]);
