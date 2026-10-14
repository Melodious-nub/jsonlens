import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TypeLensComponent } from './type-lens.component';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { TypeGenService } from '../../../../core/services/type-gen.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ExportService } from '../../../../core/services/export.service';

describe('TypeLensComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeLensComponent],
      providers: [JsonEngineService, TypeGenService, ToastService, ExportService],
    }).compileComponents();
  });

  it('should instantiate and generate typescript code by default', () => {
    const fixture = TestBed.createComponent(TypeLensComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.selectedTarget()).toBe('typescript');
    expect(comp.generatedCode()).toContain('export interface Root');
  });

  it('should switch target to Go and update generated code and language', () => {
    const fixture = TestBed.createComponent(TypeLensComponent);
    const comp = fixture.componentInstance;
    comp.setTarget('go');
    expect(comp.selectedTarget()).toBe('go');
    expect(comp.monacoLanguage()).toBe('go');
    expect(comp.generatedCode()).toContain('type Root struct');
  });

  it('should switch target to Zod', () => {
    const fixture = TestBed.createComponent(TypeLensComponent);
    const comp = fixture.componentInstance;
    comp.setTarget('zod');
    expect(comp.selectedTarget()).toBe('zod');
    expect(comp.monacoLanguage()).toBe('typescript');
    expect(comp.generatedCode()).toContain('z.object');
  });
});
