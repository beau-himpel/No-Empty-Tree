import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          // Enable session persistence
          persistSession: true,
          autoRefreshToken: true,
          // Use a consistent storage key but handle lock errors gracefully
          storageKey: 'sb-auth-token',
          // Handle storage errors gracefully, including NavigatorLockAcquireTimeoutError
          storage: {
            getItem: (key: string) => {
              try {
                return localStorage.getItem(key);
              } catch (error: any) {
                if (error?.name === 'NavigatorLockAcquireTimeoutError') {
                  console.warn('NavigatorLockAcquireTimeoutError - falling back to sessionStorage');
                  try {
                    return sessionStorage.getItem(key);
                  } catch (sessionError) {
                    console.warn('SessionStorage also failed:', sessionError);
                    return null;
                  }
                }
                console.warn('Failed to get item from localStorage:', error);
                return null;
              }
            },
            setItem: (key: string, value: string) => {
              try {
                localStorage.setItem(key, value);
              } catch (error: any) {
                if (error?.name === 'NavigatorLockAcquireTimeoutError') {
                  console.warn('NavigatorLockAcquireTimeoutError - falling back to sessionStorage');
                  try {
                    sessionStorage.setItem(key, value);
                  } catch (sessionError) {
                    console.warn('SessionStorage also failed:', sessionError);
                  }
                } else {
                  console.warn('Failed to set item in localStorage:', error);
                }
              }
            },
            removeItem: (key: string) => {
              try {
                localStorage.removeItem(key);
              } catch (error: any) {
                if (error?.name === 'NavigatorLockAcquireTimeoutError') {
                  console.warn('NavigatorLockAcquireTimeoutError - removing from sessionStorage');
                  try {
                    sessionStorage.removeItem(key);
                  } catch (sessionError) {
                    console.warn('SessionStorage removal also failed:', sessionError);
                  }
                } else {
                  console.warn('Failed to remove item from localStorage:', error);
                }
              }
            }
          }
        }
      }
    );

    // Handle auth state changes with error handling
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthStateChange(event, session);
    });
  }


  private handleAuthStateChange(event: string, session: any): void {
    try {
      // Handle auth state changes
      console.log('Auth state change:', event, session);
    } catch (error) {
      console.warn('Error handling auth state change:', error);
    }
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
} 