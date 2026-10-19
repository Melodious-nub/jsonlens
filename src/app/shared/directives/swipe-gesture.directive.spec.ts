import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SwipeGestureDirective } from './swipe-gesture.directive';

@Component({
  standalone: true,
  imports: [SwipeGestureDirective],
  template: `
    <div
      #swipeArea
      appSwipeGesture
      [swipeThreshold]="30"
      (swipeLeft)="onSwipeLeft()"
      (swipeRight)="onSwipeRight()"
      style="width: 300px; height: 300px;"
    ></div>
  `,
})
class TestHostComponent {
  leftCount = 0;
  rightCount = 0;

  onSwipeLeft(): void {
    this.leftCount++;
  }

  onSwipeRight(): void {
    this.rightCount++;
  }
}

describe('SwipeGestureDirective', () => {
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

  function createTouchEvent(type: string, clientX: number, clientY: number): TouchEvent {
    const touch = {
      clientX,
      clientY,
      identifier: 0,
      target: document.body,
    } as unknown as Touch;

    return new TouchEvent(type, {
      touches: type === 'touchend' ? [] : [touch],
      changedTouches: [touch],
      bubbles: true,
      cancelable: true,
    });
  }

  it('should emit swipeLeft on horizontal left swipe gesture', () => {
    const el = fixture.nativeElement.querySelector('[appSwipeGesture]');

    el.dispatchEvent(createTouchEvent('touchstart', 200, 100));
    el.dispatchEvent(createTouchEvent('touchend', 100, 105));

    expect(hostComp.leftCount).toBe(1);
    expect(hostComp.rightCount).toBe(0);
  });

  it('should emit swipeRight on horizontal right swipe gesture', () => {
    const el = fixture.nativeElement.querySelector('[appSwipeGesture]');

    el.dispatchEvent(createTouchEvent('touchstart', 100, 100));
    el.dispatchEvent(createTouchEvent('touchend', 200, 105));

    expect(hostComp.leftCount).toBe(0);
    expect(hostComp.rightCount).toBe(1);
  });

  it('should not emit if movement is primarily vertical', () => {
    const el = fixture.nativeElement.querySelector('[appSwipeGesture]');

    el.dispatchEvent(createTouchEvent('touchstart', 100, 100));
    el.dispatchEvent(createTouchEvent('touchend', 120, 250));

    expect(hostComp.leftCount).toBe(0);
    expect(hostComp.rightCount).toBe(0);
  });
});
