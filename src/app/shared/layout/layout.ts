import { NgComponentOutlet } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import type { Type } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { Comment } from '@primeicons/angular/comment';
import { Home } from '@primeicons/angular/home';
import { List } from '@primeicons/angular/list';
import { Megaphone } from '@primeicons/angular/megaphone';
import { Sidebar as SidebarIcon } from '@primeicons/angular/sidebar';

type NavigationMenuItem = {
  label: string;
  path: string;
  icon: Type<unknown>;
};

@Component({
  imports: [
    NgComponentOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    SidebarModule,
    ButtonModule,
    SidebarIcon,
  ],
  selector: 'app-layout',
  templateUrl: './layout.html',
})
export class Layout implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  readonly menuItems: NavigationMenuItem[] = [
    { label: 'Resumen', path: '/dashboard', icon: Home },
    { label: 'Sesiones', path: '/sesiones', icon: Comment },
    { label: 'Envío masivo', path: '/masiva', icon: Megaphone },
    { label: 'Lotes', path: '/lotes', icon: List },
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

  closeNavigationOnMobile(): void {
    if (this.isMobile()) {
      this.navOpen.set(false);
    }
  }

  updateActiveItem(): void {
    const activeItem = this.menuItems.find((item) =>
      this.router.isActive(item.path, {
        paths:
          item.path === '/masiva' || item.path === '/lotes'
            ? 'subset'
            : 'exact',
        queryParams: 'ignored',
        matrixParams: 'ignored',
        fragment: 'ignored',
      }),
    );

    if (activeItem) {
      this.activeItem.set(activeItem);
    }
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }
}
