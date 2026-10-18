import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { CodeLensComponent } from './code-lens.component';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';

describe('CodeLensComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeLensComponent],
      providers: [JsonEngineService, ToastService],
    }).compileComponents();
  });

  it('should instantiate and compute formattedJson and lineCount', () => {
    const fixture = TestBed.createComponent(CodeLensComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.formattedJson()).toBeTruthy();
    expect(comp.lineCount()).toBeGreaterThan(0);
  });

  it('should toggle and set indent option', () => {
    const fixture = TestBed.createComponent(CodeLensComponent);
    const comp = fixture.componentInstance;

    expect(comp.isIndentMenuOpen()).toBe(false);
    comp.toggleIndentMenu();
    expect(comp.isIndentMenuOpen()).toBe(true);

    comp.onSetIndent('4-spaces');
    expect(comp.engine.indentOption()).toBe('4-spaces');
    expect(comp.isIndentMenuOpen()).toBe(false);
    expect(comp.indentLabel()).toBe('4sp');
  });

  it('should toggle sort order', () => {
    const fixture = TestBed.createComponent(CodeLensComponent);
    const comp = fixture.componentInstance;

    comp.engine.setInput('{"z": 1, "a": 2}');
    comp.onSortToggle();
    expect(comp.engine.sortOrder()).toBe('asc');
    expect(comp.formattedJson()).toContain('"a": 2');
  });

  it('should toggle tools menu and perform transform operations', () => {
    const fixture = TestBed.createComponent(CodeLensComponent);
    const comp = fixture.componentInstance;

    comp.toggleToolsMenu();
    expect(comp.isToolsMenuOpen()).toBe(true);

    comp.engine.setInput('{"user": {"name": "Alex", "nullProp": null}}');
    comp.onFlatten();
    expect(comp.engine.rawInput()).toContain('user.name');

    comp.onUnflatten();
    expect(comp.engine.rawInput()).toContain('user');

    comp.onStripNulls();
    expect(comp.engine.rawInput()).not.toContain('nullProp');
  });

  it('should copy formatted JSON to clipboard', async () => {
    const fixture = TestBed.createComponent(CodeLensComponent);
    const comp = fixture.componentInstance;

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    await comp.copyToClipboard();
    expect(writeTextMock).toHaveBeenCalledWith(comp.formattedJson());
    expect(comp.isCopied()).toBe(true);
  });
});
