import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
  Heart,
  Code2,
  ExternalLink,
  Sparkles,
} from 'lucide-angular';
import { ThemeService } from '../../services/theme.service';
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

  // Icons
  readonly menuIcon = Menu;
  readonly closeIcon = X;
  readonly infoIcon = Info;
  readonly heartIcon = Heart;
  readonly codeIcon = Code2;
  readonly externalIcon = ExternalLink;
  readonly sparklesIcon = Sparkles;

  constructor() {
    if (this.isBrowser) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.isMobileMenuOpen()) {
          this.closeMobileMenu();
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
    this.isMobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  onToggleTheme(event?: MouseEvent): void {
    this.themeService.toggleTheme(event);
  }
}
