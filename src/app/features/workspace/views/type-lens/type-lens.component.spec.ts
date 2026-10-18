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
    TestBed.inject(TypeGenService).setTarget('typescript');
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
    expect(comp.targetLabel()).toBe('Zod Schemas');
    expect(comp.monacoLanguage()).toBe('typescript');
    expect(comp.generatedCode()).toContain('z.object');
  });

  it('should switch target to Python and generate Pydantic models', () => {
    const fixture = TestBed.createComponent(TypeLensComponent);
    const comp = fixture.componentInstance;
    comp.setTarget('python');
    expect(comp.selectedTarget()).toBe('python');
    expect(comp.monacoLanguage()).toBe('python');
    expect(comp.currentTargetConfig().extension).toBe('.py');
    expect(comp.generatedCode()).toContain('class Root(BaseModel):');
  });

  it('should switch target to Java, Kotlin, Dart, C#, Rust, PHP, Swift', () => {
    const fixture = TestBed.createComponent(TypeLensComponent);
    const comp = fixture.componentInstance;

    comp.setTarget('java');
    expect(comp.monacoLanguage()).toBe('java');
    expect(comp.currentTargetConfig().extension).toBe('.java');

    comp.setTarget('kotlin');
    expect(comp.monacoLanguage()).toBe('kotlin');
    expect(comp.currentTargetConfig().extension).toBe('.kt');

    comp.setTarget('dart');
    expect(comp.monacoLanguage()).toBe('dart');
    expect(comp.currentTargetConfig().extension).toBe('.dart');

    comp.setTarget('csharp');
    expect(comp.monacoLanguage()).toBe('csharp');
    expect(comp.currentTargetConfig().extension).toBe('.cs');

    comp.setTarget('rust');
    expect(comp.monacoLanguage()).toBe('rust');
    expect(comp.currentTargetConfig().extension).toBe('.rs');

    comp.setTarget('php');
    expect(comp.monacoLanguage()).toBe('php');
    expect(comp.currentTargetConfig().extension).toBe('.php');

    comp.setTarget('swift');
    expect(comp.monacoLanguage()).toBe('swift');
    expect(comp.currentTargetConfig().extension).toBe('.swift');
  });

  it('should toggle dropdown and download popover states', () => {
    const fixture = TestBed.createComponent(TypeLensComponent);
    const comp = fixture.componentInstance;

    expect(comp.isDropdownOpen()).toBe(false);
    comp.toggleDropdown();
    expect(comp.isDropdownOpen()).toBe(true);

    expect(comp.isDownloadOpen()).toBe(false);
    comp.toggleDownloadMenu();
    expect(comp.isDownloadOpen()).toBe(true);
    // opening download should close target dropdown
    expect(comp.isDropdownOpen()).toBe(false);
  });

  it('should execute download with custom filename', () => {
    const fixture = TestBed.createComponent(TypeLensComponent);
    const comp = fixture.componentInstance;
    const exportService = TestBed.inject(ExportService);
    let capturedFilename = '';

    // Mock downloadFile
    exportService.downloadFile = (filename: string): boolean => {
      capturedFilename = filename;
      return true;
    };

    comp.setTarget('python');
    comp.downloadFileName.set('user_profile');
    comp.executeDownload();

    expect(capturedFilename).toBe('user_profile.py');
    expect(comp.isDownloadOpen()).toBe(false);
  });

  it('should strip redundant extension typed by user in download filename', () => {
    const fixture = TestBed.createComponent(TypeLensComponent);
    const comp = fixture.componentInstance;
    const exportService = TestBed.inject(ExportService);
    let capturedFilename = '';

    exportService.downloadFile = (filename: string): boolean => {
      capturedFilename = filename;
      return true;
    };

    comp.setTarget('java');
    comp.downloadFileName.set('UserData.java');
    comp.executeDownload();

    expect(capturedFilename).toBe('UserData.java');
  });
});
