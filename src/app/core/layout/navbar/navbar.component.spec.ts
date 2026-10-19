import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
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
  });

  it('should toggle theme when onToggleTheme is called', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;
    const initialTheme = comp.themeService.theme();

    comp.onToggleTheme();
    expect(comp.themeService.theme()).not.toBe(initialTheme);
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

  it('should close mobile menu on Escape keydown', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;

    comp.toggleMobileMenu();
    expect(comp.isMobileMenuOpen()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(comp.isMobileMenuOpen()).toBe(false);
  });
});
