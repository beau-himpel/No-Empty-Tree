import { Injectable, signal, computed, effect, untracked } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import type { User, Session } from '@supabase/supabase-js';

export type AuthErrorKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_exists'
  | 'weak_password'
  | 'same_password'
  | 'rate_limited'
  | 'network'
  | 'unknown';

/** Maps Supabase auth errors (by code, falling back to message text) to a stable kind. */
export function authErrorKind(error: unknown): AuthErrorKind {
  const e = (error ?? {}) as { code?: string; message?: string; status?: number; name?: string };
  const code = e.code ?? '';
  const message = e.message ?? '';
  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) return 'invalid_credentials';
  if (code === 'email_not_confirmed' || message.includes('Email not confirmed')) return 'email_not_confirmed';
  if (code === 'user_already_exists' || message.includes('already registered')) return 'user_exists';
  // Before weak_password: "New password should be different…" also contains "password should"
  if (code === 'same_password' || /different from the old password/i.test(message)) return 'same_password';
  if (code === 'weak_password' || /password should (be at least|contain)/i.test(message)) return 'weak_password';
  if (code.startsWith('over_') || e.status === 429) return 'rate_limited';
  if (e.name === 'AuthRetryableFetchError' || message.includes('Failed to fetch')) return 'network';
  return 'unknown';
}

const ERROR_MESSAGES: Record<AuthErrorKind, string> = {
  invalid_credentials: "That email and password don't match. Try again or reset your password.",
  email_not_confirmed: 'Confirm your email first by opening the link we sent you.',
  user_exists: 'An account with this email already exists. Sign in instead.',
  weak_password: 'Choose a stronger password with at least 6 characters.',
  same_password: 'Choose a password different from your current one.',
  rate_limited: 'Too many attempts. Wait a minute and try again.',
  network: "We can't reach the server. Check your connection and try again.",
  unknown: 'Something went wrong. Please try again.',
};

export function authErrorMessage(error: unknown): string {
  return ERROR_MESSAGES[authErrorKind(error)];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly _isLoggedIn = signal(false);
  private readonly _currentUser = signal<User | null>(null);
  private readonly _session = signal<Session | null>(null);
  private readonly _isReady = signal(false);

  readonly isLoggedIn = this._isLoggedIn.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly session = this._session.asReadonly();
  readonly userEmail = computed(() => this._currentUser()?.email ?? null);
  /** False until the stored session (if any) has been restored on page load. */
  readonly isReady = this._isReady.asReadonly();
  /** True while the user arrived from a reset-password link and hasn't set one yet. */
  readonly isPasswordRecovery = computed(() => this.supabaseService.passwordRecovery());

  private readonly ready: Promise<void>;

  constructor(private readonly supabaseService: SupabaseService, private readonly router: Router) {
    this.ready = this.initializeAuth();

    // A reset-password link signs the user in with a recovery session; send them
    // to choose a new password instead of into the app.
    effect(() => {
      if (this.supabaseService.passwordRecovery() && this._isLoggedIn()) {
        untracked(() => this.navigateAfterStartup('/reset-password'));
      }
    });
  }

  /**
   * Waits for the app's first navigation and first painted frame: a route view
   * transition that starts before the page has rendered is skipped by the browser.
   */
  private async navigateAfterStartup(path: string): Promise<void> {
    if (!this.router.navigated) {
      await firstValueFrom(
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd))
      );
    }
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
    this.router.navigate([path]);
  }

  /** Resolves once the persisted session (if any) has been restored. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  private async initializeAuth(): Promise<void> {
    try {
      const { data: { session } } = await this.supabaseService.client.auth.getSession();
      this.updateAuthState(session ?? null);
    } catch (error) {
      console.warn('Error getting initial session:', error);
      this.updateAuthState(null);
    } finally {
      this._isReady.set(true);
    }

    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      try {
        this.updateAuthState(session ?? null);
      } catch (error) {
        console.warn('Error updating auth state:', error);
      }
    });
  }

  private updateAuthState(session: Session | null) {
    const wasLoggedIn = this._isLoggedIn();

    this._session.set(session);
    this._isLoggedIn.set(!!session);
    this._currentUser.set(session?.user ?? null);

    // Route only on an actual sign-in from the landing screen. Token refreshes and
    // page reloads fire auth events too, and must leave the user where they are.
    if (
      session &&
      !wasLoggedIn &&
      this.isOnLandingRoute() &&
      !this.supabaseService.passwordRecovery()
    ) {
      this.router.navigate(['/adopt-family']);
    }
  }

  private isOnLandingRoute(): boolean {
    const path = window.location.pathname;
    return path === '/' || path === '/landing';
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabaseService.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/landing` }
    });
    if (error) throw error;
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabaseService.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUpWithEmail(email: string, password: string, metadata?: Record<string, unknown>): Promise<{ user: User | null; session: Session | null; needsConfirmation: boolean }> {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        // The confirmation link returns to this site's root, where the session is picked up
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    if (error) throw error;

    return {
      user: data?.user ?? null,
      session: data?.session ?? null,
      // When email confirmation is required there's a user but no session yet
      needsConfirmation: !data?.session && !!data?.user
    };
  }

  async resendConfirmation(email: string): Promise<void> {
    const { error } = await this.supabaseService.client.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/` }
    });
    if (error) throw error;
  }

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.supabaseService.client.auth.updateUser({ password });
    if (error) throw error;
    this.supabaseService.passwordRecovery.set(false);
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabaseService.client.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      this.supabaseService.passwordRecovery.set(false);
      this.router.navigate(['/']);
    }
  }

  getCurrentUser(): User | null {
    return this._currentUser();
  }

  getCurrentSession(): Session | null {
    return this._session();
  }
}
