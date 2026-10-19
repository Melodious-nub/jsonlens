import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ResizableSplitterDirective } from './resizable-splitter.directive';

@Component({
  standalone: true,
  imports: [ResizableSplitterDirective],
  template: `
    <div #container style="width: 1000px; height: 500px;">
      <div
        #splitter
        appResizableSplitter
        [container]="container"
        direction="horizontal"
        [(splitPercent)]="splitVal"
        [(isDragging)]="draggingVal"
        (resetRequested)="onReset()"
      ></div>
    </div>
  `,
})
class TestHostComponent {
  splitVal = 50;
  draggingVal = false;
  resetCalled = false;

  onReset(): void {
    this.resetCalled = true;
    this.splitVal = 50;
  }
}

describe('ResizableSplitterDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComp: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should instantiate and configure accessibility attributes', () => {
    const splitterEl: HTMLElement = fixture.nativeElement.querySelector('[appResizableSplitter]');
    expect(splitterEl).toBeTruthy();
    expect(splitterEl.getAttribute('role')).toBe('separator');
    expect(splitterEl.getAttribute('aria-orientation')).toBe('horizontal');
    expect(splitterEl.getAttribute('aria-valuenow')).toBe('50');
  });

  it('should emit resetRequested on double click', () => {
    const splitterEl: HTMLElement = fixture.nativeElement.querySelector('[appResizableSplitter]');
    hostComp.splitVal = 70;
    fixture.detectChanges();

    splitterEl.dispatchEvent(new MouseEvent('dblclick'));
    fixture.detectChanges();

    expect(hostComp.resetCalled).toBe(true);
    expect(hostComp.splitVal).toBe(50);
  });

  it('should adjust split value via keyboard arrows', () => {
    const splitterEl: HTMLElement = fixture.nativeElement.querySelector('[appResizableSplitter]');

    splitterEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(hostComp.splitVal).toBe(45);

    splitterEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(hostComp.splitVal).toBe(50);
  });
});
