import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavbarComponent } from './navbar.component';
import { ThemeService } from '../../services/theme.service';

describe('NavbarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), ThemeService],
    }).compileComponents();
  });

  it('should instantiate cleanly', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.isMobileMenuOpen()).toBe(false);
    expect(comp.isThemeMenuOpen()).toBe(false);
  });

  it('should toggle theme when onToggleTheme is called', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;
    const initialTheme = comp.themeService.theme();

    comp.onToggleTheme();
    expect(comp.themeService.theme()).not.toBe(initialTheme);
  });

  it('should toggle and close theme menu popover', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;

    expect(comp.isThemeMenuOpen()).toBe(false);

    comp.toggleThemeMenu();
    expect(comp.isThemeMenuOpen()).toBe(true);

    comp.closeThemeMenu();
    expect(comp.isThemeMenuOpen()).toBe(false);
  });

  it('should select theme and close popover via onSelectTheme()', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;

    comp.toggleThemeMenu();
    expect(comp.isThemeMenuOpen()).toBe(true);

    comp.onSelectTheme('nord');
    expect(comp.themeService.theme()).toBe('nord');
    expect(comp.isThemeMenuOpen()).toBe(false);
  });

  it('should toggle and close mobile menu', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;

    expect(comp.isMobileMenuOpen()).toBe(false);

    comp.toggleMobileMenu();
    expect(comp.isMobileMenuOpen()).toBe(true);

    comp.closeMobileMenu();
    expect(comp.isMobileMenuOpen()).toBe(false);
  });

  it('should close open menus on Escape keydown', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;

    comp.toggleThemeMenu();
    expect(comp.isThemeMenuOpen()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(comp.isThemeMenuOpen()).toBe(false);

    comp.toggleMobileMenu();
    expect(comp.isMobileMenuOpen()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(comp.isMobileMenuOpen()).toBe(false);
  });
});
