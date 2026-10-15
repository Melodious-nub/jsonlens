import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { CreatorPageComponent } from './creator-page.component';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

describe('CreatorPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorPageComponent],
      providers: [provideRouter([]), ToastService, ExportService],
    }).compileComponents();
  });

  it('should instantiate and display open-source projects', () => {
    const fixture = TestBed.createComponent(CreatorPageComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.creatorProjects.length).toBeGreaterThanOrEqual(3);
  });

  it('should copy email and update feedback state', async () => {
    const fixture = TestBed.createComponent(CreatorPageComponent);
    const comp = fixture.componentInstance;
    const exportService = TestBed.inject(ExportService);
    vi.spyOn(exportService, 'copyToClipboard').mockResolvedValue(true);

    await comp.onCopyEmail();
    expect(comp.isEmailCopied()).toBe(true);
  });
});
