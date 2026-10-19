import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { StatusBarComponent } from './status-bar.component';
import { JsonEngineService } from '../../../core/services/json-engine.service';
import { DiffService } from '../../../core/services/diff.service';
import { TypeGenService } from '../../../core/services/type-gen.service';

describe('StatusBarComponent', () => {
  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    await TestBed.configureTestingModule({
      imports: [StatusBarComponent],
      providers: [JsonEngineService, DiffService, TypeGenService],
    }).compileComponents();
  });

  it('should instantiate and show metrics by default', () => {
    const fixture = TestBed.createComponent(StatusBarComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.engine.isValid()).toBe(true);
    expect(comp.lineCount()).toBeGreaterThan(0);
    expect(comp.activeLens()).toBe('code');
  });

  it('should calculate line count from formatted json', () => {
    const fixture = TestBed.createComponent(StatusBarComponent);
    const comp = fixture.componentInstance;
    comp.engine.setInput('{\n  "a": 1,\n  "b": 2\n}');
    expect(comp.lineCount()).toBeGreaterThan(1);
  });

  it('should compute type generation metrics for types tab', () => {
    const fixture = TestBed.createComponent(StatusBarComponent);
    const comp = fixture.componentInstance;
    comp.engine.setInput('{"id": 1, "name": "Item"}');
    expect(comp.typeTargetLabel()).toBe('TypeScript');
    expect(comp.generatedTypeLines()).toBeGreaterThan(0);
    expect(comp.generatedTypeBytes()).toBeGreaterThan(0);

    comp.typeGen.setTarget('go');
    expect(comp.typeTargetLabel()).toBe('Go');
  });

  it('should format indent label and accept mobilePane input', () => {
    const fixture = TestBed.createComponent(StatusBarComponent);
    const comp = fixture.componentInstance;
    expect(comp.mobilePane()).toBe('input');
    expect(comp.indentLabel()).toBe('2 spaces');

    fixture.componentRef.setInput('mobilePane', 'output');
    fixture.detectChanges();
    expect(comp.mobilePane()).toBe('output');
  });
});

