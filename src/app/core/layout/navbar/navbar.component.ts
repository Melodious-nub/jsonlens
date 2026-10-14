import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly themeService = inject(ThemeService);
  readonly triggerCommandPalette = output<void>();

  onCommandPaletteClick(): void {
    this.triggerCommandPalette.emit();
  }

  onToggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
