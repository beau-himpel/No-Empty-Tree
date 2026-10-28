import '@fontsource-variable/geist/index.css';
import 'primeicons/primeicons.css';
import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { bindRouter } from './lib/navigation';
import { router } from './router';

bindRouter(router);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
