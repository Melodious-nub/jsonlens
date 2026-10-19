import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MonacoEditorComponent } from './monaco-editor.component';
import { ThemeService } from '../../../core/services/theme.service';
import { StorageService } from '../../../core/services/storage.service';

describe('MonacoEditorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonacoEditorComponent],
      providers: [ThemeService, StorageService],
    }).compileComponents();
  });

  it('should instantiate and configure default signal inputs', () => {
    const fixture = TestBed.createComponent(MonacoEditorComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.content()).toBe('');
    expect(comp.readOnly()).toBe(false);
    expect(comp.language()).toBe('json');
    expect(comp.minimap()).toBe(false);
    expect(comp.wordWrap()).toBe('on');
    expect(comp.lineNumbers()).toBe('on');
  });

  it('should update content model and react to inputs', () => {
    const fixture = TestBed.createComponent(MonacoEditorComponent);
    const comp = fixture.componentInstance;

    comp.content.set('{"test": true}');
    expect(comp.content()).toBe('{"test": true}');

    fixture.componentRef.setInput('readOnly', true);
    fixture.componentRef.setInput('language', 'typescript');
    fixture.detectChanges();

    expect(comp.readOnly()).toBe(true);
    expect(comp.language()).toBe('typescript');
  });

  it('should safely handle layout and find widget queries when unmounted', () => {
    const fixture = TestBed.createComponent(MonacoEditorComponent);
    const comp = fixture.componentInstance;

    expect(() => comp.layout()).not.toThrow();
    expect(comp.isFindWidgetVisible()).toBe(false);
    expect(() => comp.closeFindWidget()).not.toThrow();
  });

  it('should emit shortcut action outputs', () => {
    const fixture = TestBed.createComponent(MonacoEditorComponent);
    const comp = fixture.componentInstance;

    let formatEmitted = false;
    let minifyEmitted = false;
    let autoRepairEmitted = false;

    comp.formatRequested.subscribe(() => {
      formatEmitted = true;
    });
    comp.minifyRequested.subscribe(() => {
      minifyEmitted = true;
    });
    comp.autoRepairRequested.subscribe(() => {
      autoRepairEmitted = true;
    });

    comp.formatRequested.emit();
    comp.minifyRequested.emit();
    comp.autoRepairRequested.emit();

    expect(formatEmitted).toBe(true);
    expect(minifyEmitted).toBe(true);
    expect(autoRepairEmitted).toBe(true);
  });
});
