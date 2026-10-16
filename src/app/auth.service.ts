import { Injectable, signal, computed } from '@angular/core'; 
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { environment } from '../environments/environment';
import type { User, Session } from '@supabase/supabase-js';
 
@Injectable({ 
  providedIn: 'root' 
}) 
export class AuthService { 
  private readonly _isLoggedIn = signal(false); 
  private readonly _currentUser = signal<User | null>(null); 
  private readonly _session = signal<Session | null>(null);
 
  readonly isLoggedIn = this._isLoggedIn.asReadonly(); 
  readonly currentUser = this._currentUser.asReadonly(); 
  readonly session = this._session.asReadonly();
  readonly userEmail = computed(() => this._currentUser()?.email ?? null);

  private readonly ready: Promise<void>;

  constructor(private readonly supabaseService: SupabaseService, private readonly router: Router) {
    this.ready = this.initializeAuth();
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
    if (session && !wasLoggedIn && this.isOnLandingRoute()) {
      this.router.navigate(['/adopt-family']);
    }
  }

  private isOnLandingRoute(): boolean {
    const path = window.location.pathname;
    return path === '/' || path === '/landing';
  }

  async signInWithGoogle(): Promise<void> {
    try {
      const { error } = await this.supabaseService.client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/landing` }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string, metadata?: any): Promise<{ user: User | null; session: Session | null; needsConfirmation: boolean }> {
    try {
      const { data, error } = await this.supabaseService.client.auth.signUp({ 
        email, 
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${environment.appUrl}/auth/callback`
        }
      });
      
      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }
      
      // Log response for debugging
      console.log('Signup response:', {
        user: data?.user?.id,
        session: data?.session ? 'exists' : 'null',
        email: data?.user?.email,
        emailConfirmed: data?.user?.email_confirmed_at ? 'yes' : 'no'
      });
      
      // When email confirmation is required, user will be null until email is confirmed
      const needsConfirmation = !data?.session && !!data?.user;
      
      return {
        user: data?.user ?? null,
        session: data?.session ?? null,
        needsConfirmation
      };
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabaseService.client.auth.signOut();
      if (error) throw error;
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error signing out:', error);
      // Still navigate to home page even if signOut fails
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