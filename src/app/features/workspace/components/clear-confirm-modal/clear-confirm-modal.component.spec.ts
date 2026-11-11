import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ClearConfirmModalComponent } from './clear-confirm-modal.component';

describe('ClearConfirmModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClearConfirmModalComponent],
    }).compileComponents();
  });

  it('should instantiate cleanly', () => {
    const fixture = TestBed.createComponent(ClearConfirmModalComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should not render modal DOM when isOpen is false', () => {
    const fixture = TestBed.createComponent(ClearConfirmModalComponent);
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('.clear-modal');
    expect(modal).toBeNull();
  });

  it('should render dialog, backdrop, title, and description when isOpen is true', () => {
    const fixture = TestBed.createComponent(ClearConfirmModalComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('.clear-modal__backdrop');
    const modal = fixture.nativeElement.querySelector('.clear-modal');
    const title = fixture.nativeElement.querySelector('.clear-modal__title');
    const desc = fixture.nativeElement.querySelector('.clear-modal__desc');
    const badge = fixture.nativeElement.querySelector('.clear-modal__badge');

    expect(backdrop).not.toBeNull();
    expect(modal).not.toBeNull();
    expect(badge).toBeNull();
    expect(title.textContent).toContain('Clear Workspace');
    expect(desc.textContent).toContain('completely fresh workspace');
    expect(desc.textContent).toContain('action cannot be undone');
  });

  it('should emit confirmed when Clear button is clicked', () => {
    const fixture = TestBed.createComponent(ClearConfirmModalComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    let confirmedEmitted = false;
    comp.confirmed.subscribe(() => {
      confirmedEmitted = true;
    });

    const confirmBtn = fixture.nativeElement.querySelector('.btn--danger') as HTMLButtonElement;
    confirmBtn.click();

    expect(confirmedEmitted).toBe(true);
  });

  it('should emit cancelled when Cancel button is clicked', () => {
    const fixture = TestBed.createComponent(ClearConfirmModalComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    let cancelledEmitted = false;
    comp.cancelled.subscribe(() => {
      cancelledEmitted = true;
    });

    const cancelBtn = fixture.nativeElement.querySelector('.btn--secondary') as HTMLButtonElement;
    cancelBtn.click();

    expect(cancelledEmitted).toBe(true);
  });

  it('should emit cancelled when close (X) button is clicked', () => {
    const fixture = TestBed.createComponent(ClearConfirmModalComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    let cancelledEmitted = false;
    comp.cancelled.subscribe(() => {
      cancelledEmitted = true;
    });

    const closeBtn = fixture.nativeElement.querySelector('.clear-modal__close-btn') as HTMLButtonElement;
    closeBtn.click();

    expect(cancelledEmitted).toBe(true);
  });

  it('should emit cancelled when backdrop is clicked', () => {
    const fixture = TestBed.createComponent(ClearConfirmModalComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    let cancelledEmitted = false;
    comp.cancelled.subscribe(() => {
      cancelledEmitted = true;
    });

    const backdrop = fixture.nativeElement.querySelector('.clear-modal__backdrop') as HTMLDivElement;
    backdrop.click();

    expect(cancelledEmitted).toBe(true);
  });

  it('should emit cancelled on Escape keydown', () => {
    const fixture = TestBed.createComponent(ClearConfirmModalComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    let cancelledEmitted = false;
    comp.cancelled.subscribe(() => {
      cancelledEmitted = true;
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(cancelledEmitted).toBe(true);
  });
});

