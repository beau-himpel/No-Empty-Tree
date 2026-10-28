import type { createBrowserRouter } from 'react-router';

type AppRouter = ReturnType<typeof createBrowserRouter>;

let router: AppRouter | null = null;

/** Called once from main.tsx, so code outside components (auth) can change pages. */
export function bindRouter(appRouter: AppRouter): void {
  router = appRouter;
}

export function navigate(path: string): void {
  router?.navigate(path, { viewTransition: true });
}

/**
 * Waits for the app's first navigation and first painted frame: a route view
 * transition that starts before the page has rendered is skipped by the browser.
 */
export async function navigateAfterStartup(path: string): Promise<void> {
  if (!router) return;
  const appRouter = router;
  if (!appRouter.state.initialized) {
    await new Promise<void>((resolve) => {
      const unsubscribe = appRouter.subscribe((state) => {
        if (state.initialized) {
          unsubscribe();
          resolve();
        }
      });
    });
  }
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
  navigate(path);
}
