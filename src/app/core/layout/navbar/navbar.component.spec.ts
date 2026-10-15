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
  });

  it('should toggle theme when onToggleTheme is called', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;
    const initialTheme = comp.themeService.theme();

    comp.onToggleTheme();
    expect(comp.themeService.theme()).not.toBe(initialTheme);
  });
});
