import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { MOBILE_BREAKPOINT } from './shared/constants';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BreakpointService implements OnDestroy {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private subscription?: Subscription;

  // Public signals for components to subscribe to
  readonly isMobile = signal<boolean>(false);
  readonly isTablet = signal<boolean>(false);
  readonly isDesktop = signal<boolean>(false);

  constructor() {
    this.initializeBreakpointObserver();
  }

  private initializeBreakpointObserver(): void {
    this.subscription = this.breakpointObserver.observe([
      MOBILE_BREAKPOINT,
      '(min-width: 768px) and (max-width: 1023px)',
      '(min-width: 1024px)'
    ]).subscribe((result: BreakpointState) => {
      this.isMobile.set(result.breakpoints['(max-width: 767px)']);
      this.isTablet.set(result.breakpoints['(min-width: 768px) and (max-width: 1023px)']);
      this.isDesktop.set(result.breakpoints['(min-width: 1024px)']);
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
