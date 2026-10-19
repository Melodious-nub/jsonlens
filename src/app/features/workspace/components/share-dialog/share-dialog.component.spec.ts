import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShareDialogComponent } from './share-dialog.component';
import { SharePayloadInfo } from '../../../../core/models/json-lens.model';

describe('ShareDialogComponent', () => {
  let fixture: ComponentFixture<ShareDialogComponent>;
  let comp: ShareDialogComponent;

  const mockShareData: SharePayloadInfo = {
    url: 'https://jsonlens.dev/#d=mock-compressed-data',
    originalBytes: 1024,
    compressedBytes: 256,
    percentSaved: 75,
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
});
