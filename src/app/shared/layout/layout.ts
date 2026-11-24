import { NgComponentOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { Comment } from '@primeicons/angular/comment';
import { Home } from '@primeicons/angular/home';
import { Sidebar as SidebarIcon } from '@primeicons/angular/sidebar';
import { Resumen } from '../../features/resumen/pages/resumen/resumen';
import { Sesiones } from '../../features/sesiones/pages/sesiones/sesiones';

type DashboardMenuItem = {
  label: string;
  icon: Type<unknown>;
  component: Type<unknown>;
};

@Component({
  imports: [NgComponentOutlet, SidebarModule, ButtonModule, Comment, Home, SidebarIcon],
  selector: 'app-layout',
  templateUrl: './layout.html',
})
export class Layout implements OnInit, OnDestroy {
  readonly menuItems: DashboardMenuItem[] = [
    { label: 'Resumen', icon: Home, component: Resumen },
    { label: 'Sesiones', icon: Comment, component: Sesiones },
  ];
  readonly activeItem = signal(this.menuItems[0]);
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

  selectMenuItem(item: DashboardMenuItem): void {
    this.activeItem.set(item);
    if (this.isMobile()) {
      this.navOpen.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }
}
