import { Injectable, signal } from '@angular/core'; 
 
@Injectable({ 
  providedIn: 'root' 
}) 
export class AuthService { 
  private readonly _isLoggedIn = signal(false); 
  private readonly _currentUser = signal<string | null>(null); 
 
  readonly isLoggedIn = this._isLoggedIn.asReadonly(); 
  readonly currentUser = this._currentUser.asReadonly(); 
 
  constructor() {

   }
  }