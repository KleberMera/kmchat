import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { Calendar } from '@primeicons/angular/calendar';
import { ChartBar } from '@primeicons/angular/chart-bar';
import { Cog } from '@primeicons/angular/cog';
import { Home } from '@primeicons/angular/home';
import { Inbox } from '@primeicons/angular/inbox';
import { Sidebar as SidebarIcon } from '@primeicons/angular/sidebar';
import { Users } from '@primeicons/angular/users';

@Component({
  imports: [SidebarModule, ButtonModule, Calendar, ChartBar, Cog, Home, Inbox, SidebarIcon, Users],
  selector: 'app-layout',
  templateUrl: './layout.html',
})
export class Layout implements OnInit, OnDestroy {
  readonly isMobile = signal(false);
  readonly navOpen = signal(true);

  private mediaQuery?: MediaQueryList;
  private mediaQueryListener?: (event: MediaQueryListEvent) => void;

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.mediaQuery = window.matchMedia('(max-width: 1023px)');
    this.isMobile.set(this.mediaQuery.matches);
    this.navOpen.set(!this.mediaQuery.matches);
    this.mediaQueryListener = (event) => {
      this.isMobile.set(event.matches);
      this.navOpen.set(!event.matches);
    };
    this.mediaQuery.addEventListener('change', this.mediaQueryListener);
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }
}
