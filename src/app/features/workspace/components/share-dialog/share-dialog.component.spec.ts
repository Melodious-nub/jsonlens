import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShareDialogComponent } from './share-dialog.component';
import { SharePayloadInfo, ShortSharePayloadInfo } from '../../../../core/models/json-lens.model';

describe('ShareDialogComponent', () => {
  let fixture: ComponentFixture<ShareDialogComponent>;
  let comp: ShareDialogComponent;

  const mockShareData: SharePayloadInfo = {
    url: 'https://jsonlens.dev/#d=mock-compressed-data',
    originalBytes: 1024,
    compressedBytes: 256,
    percentSaved: 75,
    isShort: false,
  };

  const mockShortShareData: ShortSharePayloadInfo = {
    id: 'Ab12Cd34',
    expiresAt: Math.floor(Date.now() / 1000) + 30 * 86400,
    url: 'https://jsonlens.dev/?s=Ab12Cd34#k=secretFragmentKey',
    originalBytes: 1024,
    compressedBytes: 58,
    percentSaved: 94,
    isShort: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareDialogComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should instantiate and not render popover when closed', () => {
    expect(comp).toBeTruthy();
    expect(comp.isOpen()).toBe(false);
    const popover = fixture.nativeElement.querySelector('.share-popover');
    expect(popover).toBeNull();
  });

  it('should render popover with metrics and URL when open', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('shareData', mockShareData);
    fixture.detectChanges();

    const popover = fixture.nativeElement.querySelector('.share-popover');
    expect(popover).toBeTruthy();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.share-popover__input');
    expect(input.value).toBe(mockShareData.url);

    const badge = fixture.nativeElement.querySelector('.stat-pill__badge');
    expect(badge.textContent).toContain('-75%');
  });

  it('should emit action outputs on button clicks', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('shareData', mockShareData);
    fixture.detectChanges();

    let closeEmitted = false;
    let copyEmitted = false;
    let viewQrEmitted = false;
    let downloadQrEmitted = false;

    comp.closeRequested.subscribe(() => {
      closeEmitted = true;
    });
    comp.copyRequested.subscribe(() => {
      copyEmitted = true;
    });
    comp.viewQrRequested.subscribe(() => {
      viewQrEmitted = true;
    });
    comp.downloadQrRequested.subscribe(() => {
      downloadQrEmitted = true;
    });

    const closeBtn: HTMLElement = fixture.nativeElement.querySelector('.share-popover__close-btn');
    closeBtn.click();
    expect(closeEmitted).toBe(true);

    const copyBtn: HTMLElement = fixture.nativeElement.querySelector('.share-popover__copy-btn');
    copyBtn.click();
    expect(copyEmitted).toBe(true);

    const viewBtn: HTMLElement = fixture.nativeElement.querySelector('.qr-btn--view');
    viewBtn.click();
    expect(viewQrEmitted).toBe(true);

    const downloadBtn: HTMLElement = fixture.nativeElement.querySelector('.qr-btn--download');
    downloadBtn.click();
    expect(downloadQrEmitted).toBe(true);
  });

  it('should support Instant Link and Short URL tabs with loading, error/retry, and E2EE link display', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('shareData', mockShareData);
    fixture.detectChanges();

    const tabs: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.share-tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('Instant Link');
    expect(tabs[1].textContent).toContain('Short URL');

    // Switch to Short URL tab (loading state)
    fixture.componentRef.setInput('isShortLoading', true);
    tabs[1].click();
    fixture.detectChanges();
    expect(comp.activeTab()).toBe('short');

    const copyBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.share-popover__copy-btn');
    expect(copyBtn.disabled).toBe(true);

    // Simulate error + retry button
    let retryEmitted = false;
    comp.retryShortRequested.subscribe(() => {
      retryEmitted = true;
    });
    fixture.componentRef.setInput('isShortLoading', false);
    fixture.componentRef.setInput('shortError', 'Service temporarily unavailable');
    fixture.detectChanges();

    const retryBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.error-box__btn--retry');
    retryBtn.click();
    expect(retryEmitted).toBe(true);

    // Simulate ready short URL
    fixture.componentRef.setInput('shortError', null);
    fixture.componentRef.setInput('shortShareData', mockShortShareData);
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.share-popover__input');
    const readyCopyBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.share-popover__copy-btn',
    );
    expect(input.value).toBe(mockShortShareData.url);
    expect(readyCopyBtn.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.share-popover__footer').textContent).toContain('AES-256');
  });
});
