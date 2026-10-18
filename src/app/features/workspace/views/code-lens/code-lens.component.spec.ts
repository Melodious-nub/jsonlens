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

  it('should toggle and set indent option without mutating input', () => {
    const fixture = TestBed.createComponent(CodeLensComponent);
    const comp = fixture.componentInstance;
    const initialInput = comp.engine.rawInput();

    expect(comp.isIndentMenuOpen()).toBe(false);
    comp.toggleIndentMenu();
    expect(comp.isIndentMenuOpen()).toBe(true);

    comp.onSetIndent('4-spaces');
    expect(comp.engine.indentOption()).toBe('4-spaces');
    expect(comp.isIndentMenuOpen()).toBe(false);
    expect(comp.indentLabel()).toBe('4sp');
    expect(comp.engine.rawInput()).toBe(initialInput);
  });

  it('should change sort option on output without mutating input raw data', () => {
    const fixture = TestBed.createComponent(CodeLensComponent);
    const comp = fixture.componentInstance;

    const originalJson = '{\n  "z": 1,\n  "a": 2\n}';
    comp.engine.setInput(originalJson);

    // Initial default: maintains original input order (z before a)
    expect(comp.sortOption()).toBe('default');
    expect(comp.sortLabel()).toBe('Def');
    const defaultOutput = comp.formattedJson();
    expect(defaultOutput.indexOf('"z"')).toBeLessThan(defaultOutput.indexOf('"a"'));

    // Ascending: sorts A-Z on output
    comp.onSetSort('asc');
    expect(comp.sortOption()).toBe('asc');
    expect(comp.sortLabel()).toBe('A-Z');
    const ascOutput = comp.formattedJson();
    expect(ascOutput.indexOf('"a"')).toBeLessThan(ascOutput.indexOf('"z"'));

    // Descending: sorts Z-A on output
    comp.onSetSort('desc');
    expect(comp.sortOption()).toBe('desc');
    expect(comp.sortLabel()).toBe('Z-A');
    const descOutput = comp.formattedJson();
    expect(descOutput.indexOf('"z"')).toBeLessThan(descOutput.indexOf('"a"'));

    // Return to default: restores original key order
    comp.onSetSort('default');
    expect(comp.sortOption()).toBe('default');
    expect(comp.sortLabel()).toBe('Def');
    const restoredOutput = comp.formattedJson();
    expect(restoredOutput.indexOf('"z"')).toBeLessThan(restoredOutput.indexOf('"a"'));

    // CRITICAL: input raw data was NEVER altered by sorting
    expect(comp.engine.rawInput()).toBe(originalJson);
  });

  it('should change transform option on output without mutating input raw data', () => {
    const fixture = TestBed.createComponent(CodeLensComponent);
    const comp = fixture.componentInstance;

    const originalJson = '{\n  "user": {\n    "name": "Alex",\n    "nullProp": null\n  }\n}';
    comp.engine.setInput(originalJson);

    // 1. Flatten
    comp.onSetTransform('flatten');
    expect(comp.transformOption()).toBe('flatten');
    expect(comp.transformLabel()).toBe('Flat');
    expect(comp.formattedJson()).toContain('"user.name"');
    expect(comp.engine.rawInput()).toBe(originalJson);

    // 2. Strip nulls
    comp.onSetTransform('stripNulls');
    expect(comp.transformOption()).toBe('stripNulls');
    expect(comp.transformLabel()).toBe('Strip');
    expect(comp.formattedJson()).not.toContain('nullProp');
    expect(comp.engine.rawInput()).toBe(originalJson);

    // 3. Reset to default: restores original structure
    comp.onSetTransform('default');
    expect(comp.transformOption()).toBe('default');
    expect(comp.transformLabel()).toBe('Def');
    expect(comp.formattedJson()).toContain('"nullProp": null');
    expect(comp.formattedJson()).toContain('"name": "Alex"');
    expect(comp.engine.rawInput()).toBe(originalJson);
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
