import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { SupportPageComponent } from './support-page.component';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

describe('SupportPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupportPageComponent],
      providers: [provideRouter([]), ToastService, ExportService],
    }).compileComponents();
  });

  it('should instantiate and contain 6 payment channels', () => {
    const fixture = TestBed.createComponent(SupportPageComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.supportChannels.length).toBe(6);

    const ids = comp.supportChannels.map((c) => c.id);
    expect(ids).toContain('bkash');
    expect(ids).toContain('nagad');
    expect(ids).toContain('rocket');
    expect(ids).toContain('brac');
    expect(ids).toContain('binance');
    expect(ids).toContain('payoneer');
  });

  it('should copy text and update copiedKey feedback', async () => {
    const fixture = TestBed.createComponent(SupportPageComponent);
    const comp = fixture.componentInstance;
    const exportService = TestBed.inject(ExportService);
    vi.spyOn(exportService, 'copyToClipboard').mockResolvedValue(true);

    await comp.copyText('01700000000', 'bKash Number', 'bkash');
    expect(comp.copiedKey()).toBe('bkash');
  });
});
