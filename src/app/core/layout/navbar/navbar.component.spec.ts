import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { NavbarComponent } from './navbar.component';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { ExportService } from '../../services/export.service';

describe('NavbarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), ThemeService, ToastService, ExportService],
    }).compileComponents();
  });

  it('should instantiate and have no active modal initially', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.activeModal()).toBeNull();
  });

  it('should open and close modals', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;

    comp.openModal('about');
    expect(comp.activeModal()).toBe('about');

    comp.openModal('support');
    expect(comp.activeModal()).toBe('support');

    comp.closeModal();
    expect(comp.activeModal()).toBeNull();
  });

  it('should have 6 pre-configured support channels with copyable details', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;

    expect(comp.supportChannels.length).toBe(6);
    const providers = comp.supportChannels.map((c) => c.id);
    expect(providers).toContain('bkash');
    expect(providers).toContain('nagad');
    expect(providers).toContain('rocket');
    expect(providers).toContain('brac');
    expect(providers).toContain('binance');
    expect(providers).toContain('payoneer');
  });

  it('should copy text and set copiedKey feedback when exportService succeeds', async () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const comp = fixture.componentInstance;
    const exportService = TestBed.inject(ExportService);
    vi.spyOn(exportService, 'copyToClipboard').mockResolvedValue(true);

    await comp.copyText('01700000000', 'bKash Number', 'bkash');
    expect(comp.copiedKey()).toBe('bkash');
  });
});
