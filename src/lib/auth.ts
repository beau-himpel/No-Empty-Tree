import type { Session, User } from '@supabase/supabase-js';
import { authErrorKind } from './auth-errors';
import { navigate, navigateAfterStartup } from './navigation';
import { createStore, useStore } from './store';
import { passwordRecovery, supabase } from './supabase';

const STARTUP_TIMEOUT_MS = 5000;

export { type AuthErrorKind, authErrorKind, authErrorMessage } from './auth-errors';

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  session: Session | null;
  /** False until the stored session (if any) has been restored on page load. */
  isReady: boolean;
  /** Set when the auth server couldn't be reached while starting up. */
  connectionProblem: boolean;
}

const authStore = createStore<AuthState>({
  isLoggedIn: false,
  user: null,
  session: null,
  isReady: false,
  connectionProblem: false,
});

export function useAuth(): AuthState {
  return useStore(authStore);
}

export function currentUser(): User | null {
  return authStore.get().user;
}

function patch(changes: Partial<AuthState>): void {
  authStore.set((state) => ({ ...state, ...changes }));
}

function isOnLandingRoute(): boolean {
  const path = window.location.pathname;
  return path === '/' || path === '/landing';
}

function updateAuthState(session: Session | null): void {
  const wasLoggedIn = authStore.get().isLoggedIn;
  patch({
    session,
    isLoggedIn: !!session,
    user: session?.user ?? null,
    ...(session ? { connectionProblem: false } : {}),
  });

  // Route only on an actual sign-in from the landing screen. Token refreshes and
  // page reloads fire auth events too, and must leave the user where they are.
  if (session && !wasLoggedIn && isOnLandingRoute() && !passwordRecovery.get()) {
    navigate('/adopt-family');
  }
}

async function initializeAuth(): Promise<void> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error restoring session:', error);
      if (authErrorKind(error) === 'network') patch({ connectionProblem: true });
    }
    updateAuthState(session ?? null);
  } catch (error) {
    console.warn('Error getting initial session:', error);
    updateAuthState(null);
  } finally {
    patch({ isReady: true });
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    try {
      updateAuthState(session ?? null);
    } catch (error) {
      console.warn('Error updating auth state:', error);
    }
  });
}

initializeAuth();

// Restoring an expired session needs the network, and the Supabase client
// retries for a long time when the server is unreachable. Stop waiting after
// a few seconds so the page doesn't hang on the splash.
setTimeout(() => {
  if (!authStore.get().isReady) patch({ connectionProblem: true, isReady: true });
}, STARTUP_TIMEOUT_MS);

// A reset-password link signs the user in with a recovery session; send them
// to choose a new password instead of into the app.
let recovering = false;
function checkRecovery(): void {
  const next = passwordRecovery.get() && authStore.get().isLoggedIn;
  if (next && !recovering) navigateAfterStartup('/reset-password');
  recovering = next;
}
authStore.subscribe(checkRecovery);
passwordRecovery.subscribe(checkRecovery);

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/landing` },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: Record<string, unknown>
): Promise<{ user: User | null; session: Session | null; needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      // The confirmation link returns to this site's root, where the session is picked up
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;

  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    // When email confirmation is required there's a user but no session yet
    needsConfirmation: !data?.session && !!data?.user,
  };
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  passwordRecovery.set(false);
}

export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
  } finally {
    passwordRecovery.set(false);
    navigate('/');
  }
}
