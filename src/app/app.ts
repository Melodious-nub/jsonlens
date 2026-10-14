import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './core/layout/navbar/navbar.component';
import { ThemeService } from './core/services/theme.service';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { HotkeyDirective } from './shared/directives/hotkey.directive';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    CommandPaletteComponent,
    ToastComponent,
    HotkeyDirective,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Eagerly inject ThemeService to trigger documentElement data-theme sync
  protected readonly theme = inject(ThemeService).theme;
  readonly isCommandPaletteOpen = signal<boolean>(false);

  openCommandPalette(): void {
    this.isCommandPaletteOpen.set(true);
  }
}
