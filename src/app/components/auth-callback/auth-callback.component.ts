import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="flex justify-center items-center min-h-screen p-8">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p class="text-slate-600 font-medium">Confirming your email...</p>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  private readonly supabaseService = inject(SupabaseService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    try {
      // Supabase automatically processes tokens from URL hash
      // Wait for the auth state to be processed (Supabase handles this via onAuthStateChange)
      // We'll check for a session after giving it time to process
      
      // Check if we have tokens in the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      const hasTokens = hashParams.has('access_token') || 
                        hashParams.has('type') || 
                        queryParams.has('token_hash') ||
                        hashParams.has('token');
      
      if (!hasTokens) {
        // No tokens - might be a direct visit or invalid callback
        console.warn('No tokens found in callback URL');
        this.router.navigate(['/sign-in'], {
          queryParams: { error: 'Invalid confirmation link. Please try requesting a new one.' }
        });
        return;
      }

      // Wait for Supabase to process the tokens (auth state change handler processes them)
      // Check session multiple times with increasing delays
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempts + 1)));
        
        const { data, error } = await this.supabaseService.client.auth.getSession();
        
        if (error) {
          console.error('Error getting session from callback:', error);
          this.router.navigate(['/sign-in'], { 
            queryParams: { error: 'Failed to confirm email. Please try signing in again.' } 
          });
          return;
        }

        if (data.session) {
          // Email confirmed and session created successfully
          console.log('Email confirmed successfully, session created');
          this.router.navigate(['/']);
          return;
        }
        
        attempts++;
      }

      // After max attempts, no session was created
      // This could mean email confirmation is required but user needs to sign in
      console.warn('No session after callback - email may be confirmed but login required');
      this.router.navigate(['/sign-in'], { 
        queryParams: { message: 'Email confirmed! Please sign in with your credentials.' } 
      });
    } catch (error) {
      console.error('Error in auth callback:', error);
      this.router.navigate(['/sign-in'], { 
        queryParams: { error: 'An error occurred. Please try signing in again.' } 
      });
    }
  }
}
