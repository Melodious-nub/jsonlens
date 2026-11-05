import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  Menu,
  X,
  Info,
  Code2,
  ExternalLink,
  Sparkles,
  Palette,
  Check,
} from 'lucide-angular';
import {
  AppTheme,
  THEMES,
  ThemeService,
  ThemeTriggerEvent,
} from '../../services/theme.service';
import { ClickOutsideDirective } from '../../../shared/directives/click-outside.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    ClickOutsideDirective,
    LucideAngularModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly themeService = inject(ThemeService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly destroyRef = inject(DestroyRef);

  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isThemeMenuOpen = signal<boolean>(false);

  readonly themes = THEMES;

  // Icons
  readonly menuIcon = Menu;
  readonly closeIcon = X;
  readonly infoIcon = Info;
  readonly codeIcon = Code2;
  readonly externalIcon = ExternalLink;
  readonly sparklesIcon = Sparkles;
  readonly paletteIcon = Palette;
  readonly checkIcon = Check;

  readonly activeThemePrimaryColor = computed<string>(() => {
    switch (this.themeService.theme()) {
      case 'light':
        return '#4f46e5';
      case 'tokyo-night':
        return '#7aa2f7';
      case 'dracula':
        return '#bd93f9';
      case 'nord':
        return '#88c0d0';
      case 'dark':
      default:
        return '#6366f1';
    }
  });

  constructor() {
    if (this.isBrowser) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (this.isThemeMenuOpen()) {
            this.closeThemeMenu();
          }
          if (this.isMobileMenuOpen()) {
            this.closeMobileMenu();
          }
        }
      };

      const handleResize = () => {
        if (window.innerWidth >= 768 && this.isMobileMenuOpen()) {
          this.closeMobileMenu();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', handleResize);
      });
    }
  }

  toggleMobileMenu(): void {
    if (!this.isMobileMenuOpen()) {
      this.closeThemeMenu();
    }
    this.isMobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleThemeMenu(): void {
    if (!this.isThemeMenuOpen()) {
      this.closeMobileMenu();
    }
    this.isThemeMenuOpen.update((open) => !open);
  }

  closeThemeMenu(): void {
    this.isThemeMenuOpen.set(false);
  }

  onSelectTheme(theme: AppTheme, event?: ThemeTriggerEvent): void {
    this.themeService.setTheme(theme, event);
    this.closeThemeMenu();
  }

  /**
   * Fast toggle between themes (retained for testing & programmatic access).
   */
  onToggleTheme(event?: MouseEvent): void {
    this.themeService.toggleTheme(event);
  }
}
