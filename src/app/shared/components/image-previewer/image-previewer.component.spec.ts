import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { ImagePreviewerComponent } from './image-previewer.component';

@Component({
  standalone: true,
  imports: [ImagePreviewerComponent],
  template: `
    <app-image-previewer
      [isOpen]="isOpen()"
      [src]="src()"
      [title]="title()"
      [subtitle]="subtitle()"
      [alt]="alt()"
      (closed)="onClosed()"
      (download)="onDownload()"
    />
  `,
})
class TestHostComponent {
  readonly isOpen = signal(false);
  readonly src = signal<string | null>('data:image/svg+xml;utf8,<svg></svg>');
  readonly title = signal('Test Title');
  readonly subtitle = signal<string | null>('Test Subtitle');
  readonly alt = signal('Test Alt');

  closedCalled = false;
  downloadCalled = false;

  onClosed(): void {
    this.closedCalled = true;
    this.isOpen.set(false);
  }

  onDownload(): void {
    this.downloadCalled = true;
  }
}

describe('ImagePreviewerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, ImagePreviewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not render dialog when isOpen is false', () => {
    const dialog = fixture.nativeElement.querySelector('.image-previewer');
    expect(dialog).toBeNull();
  });

  it('should render dialog, toolbar, and image when isOpen is true', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.image-previewer');
    expect(dialog).not.toBeNull();

    const titleEl = fixture.nativeElement.querySelector('.toolbar__title');
    expect(titleEl.textContent.trim()).toBe('Test Title');

    const img = fixture.nativeElement.querySelector('.previewer-img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('data:image/svg+xml;utf8,<svg></svg>');
  });

  it('should zoom in and zoom out within clamped range', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    const previewerDebug = fixture.debugElement.children[0];
    const previewerComp = previewerDebug.componentInstance as ImagePreviewerComponent;

    expect(previewerComp.zoom()).toBe(1);

    previewerComp.zoomIn();
    expect(previewerComp.zoom()).toBe(1.25);

    previewerComp.zoomOut();
    expect(previewerComp.zoom()).toBe(1);

    previewerComp.resetZoom();
    expect(previewerComp.zoom()).toBe(1);
    expect(previewerComp.panX()).toBe(0);
    expect(previewerComp.panY()).toBe(0);
  });

  it('should clamp zoom at maximum and minimum bounds', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    const previewerDebug = fixture.debugElement.children[0];
    const previewerComp = previewerDebug.componentInstance as ImagePreviewerComponent;

    // Zoom way out
    for (let i = 0; i < 20; i++) {
      previewerComp.zoomOut();
    }
    expect(previewerComp.zoom()).toBe(0.4);
    expect(previewerComp.isMinZoom()).toBe(true);

    // Zoom way in
    for (let i = 0; i < 30; i++) {
      previewerComp.zoomIn();
    }
    expect(previewerComp.zoom()).toBe(3.5);
    expect(previewerComp.isMaxZoom()).toBe(true);
  });

  it('should toggle zoom on double click', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    const previewerDebug = fixture.debugElement.children[0];
    const previewerComp = previewerDebug.componentInstance as ImagePreviewerComponent;

    previewerComp.onDoubleClick();
    expect(previewerComp.zoom()).toBe(1.75);

    previewerComp.onDoubleClick();
    expect(previewerComp.zoom()).toBe(1);
  });

  it('should adjust zoom on wheel event', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    const previewerDebug = fixture.debugElement.children[0];
    const previewerComp = previewerDebug.componentInstance as ImagePreviewerComponent;

    const mockWheelEvent = {
      preventDefault: vi.fn(),
      deltaY: -100, // Wheel up -> zoom in
    } as unknown as WheelEvent;

    previewerComp.onWheel(mockWheelEvent);
    expect(mockWheelEvent.preventDefault).toHaveBeenCalled();
    expect(previewerComp.zoom()).toBe(1.15);
  });

  it('should update pan coordinates during pointer drag', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    const previewerDebug = fixture.debugElement.children[0];
    const previewerComp = previewerDebug.componentInstance as ImagePreviewerComponent;

    const mockTarget = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    };

    const downEvent = {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      currentTarget: mockTarget,
    } as unknown as PointerEvent;

    previewerComp.onPointerDown(downEvent);
    expect(previewerComp.isDragging()).toBe(true);
    expect(mockTarget.setPointerCapture).toHaveBeenCalledWith(1);

    const moveEvent = {
      clientX: 150,
      clientY: 180,
    } as unknown as PointerEvent;

    previewerComp.onPointerMove(moveEvent);
    expect(previewerComp.panX()).toBe(50);
    expect(previewerComp.panY()).toBe(80);

    const upEvent = {
      pointerId: 1,
      currentTarget: mockTarget,
    } as unknown as PointerEvent;

    previewerComp.onPointerUp(upEvent);
    expect(previewerComp.isDragging()).toBe(false);
    expect(mockTarget.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('should emit closed output and download output', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    const downloadBtn = fixture.nativeElement.querySelector('.toolbar-download-btn') as HTMLButtonElement;
    expect(downloadBtn).not.toBeNull();
    downloadBtn.click();
    expect(host.downloadCalled).toBe(true);

    const closeBtn = fixture.nativeElement.querySelector('.toolbar-close-btn') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(host.closedCalled).toBe(true);
  });

  it('should handle keyboard shortcuts', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    const previewerDebug = fixture.debugElement.children[0];
    const previewerComp = previewerDebug.componentInstance as ImagePreviewerComponent;

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
    expect(previewerComp.zoom()).toBe(1.25);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
    expect(previewerComp.zoom()).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.closedCalled).toBe(true);
  });
});
