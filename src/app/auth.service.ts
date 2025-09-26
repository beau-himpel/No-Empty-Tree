import { Injectable, signal, computed } from '@angular/core'; 
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
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
 
  constructor(private readonly supabaseService: SupabaseService, private readonly router: Router) {
    this.initializeAuth();
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

  private updateAuthState(session: Session | null): void {
    this._session.set(session);
    this._isLoggedIn.set(!!session);
    this._currentUser.set(session?.user ?? null);
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

  async signUpWithEmail(email: string, password: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.client.auth.signUp({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabaseService.client.auth.signOut();
      if (error) throw error;
      this.router.navigate(['/sign-in']);
    } catch (error) {
      console.error('Error signing out:', error);
      // Still navigate to sign-in page even if signOut fails
      this.router.navigate(['/sign-in']);
    }
  }

  getCurrentUser(): User | null {
    return this._currentUser();
  }

  getCurrentSession(): Session | null {
    return this._session();
  }
}