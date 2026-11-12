import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { DiffLensComponent } from './diff-lens.component';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DiffService } from '../../../../core/services/diff.service';
import { ExportService } from '../../../../core/services/export.service';

describe('DiffLensComponent', () => {
  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    await TestBed.configureTestingModule({
      imports: [DiffLensComponent],
      providers: [JsonEngineService, ToastService, DiffService],
    }).compileComponents();
  });

  it('should instantiate with identical sample data and detect diffs when modified', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.diffItems().length).toBeGreaterThan(0);
    expect(comp.meaningfulDiffs().length).toBe(0);

    comp.diff.setSecondaryInput('{"name": "JsonLens", "modified": true}');
    expect(comp.meaningfulDiffs().length).toBeGreaterThan(0);
  });

  it('should swap inputs correctly', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;
    const initialPrimary = comp.engine.rawInput();
    const initialSecondary = comp.secondaryInput();

    comp.swapInputs();

    expect(comp.engine.rawInput()).toBe(initialSecondary);
    expect(comp.secondaryInput()).toBe(initialPrimary);
  });

  it('should clear secondary input', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;

    comp.clearSecondary();
    expect(comp.secondaryInput()).toBe('');
  });

  it('should collapse and expand differences drawer via double-click, pointer double-tap, and keyboard navigation', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;

    comp.splitPercent.set(70);
    expect(comp.isCollapsed()).toBe(false);

    // Double click to collapse drawer to 0% (splitPercent = 100)
    comp.onHeaderDblClick(new MouseEvent('dblclick'));
    expect(comp.splitPercent()).toBe(100);
    expect(comp.isCollapsed()).toBe(true);

    // Double click to expand drawer back to 50% shortcut
    comp['lastToggleTime'] = 0;
    comp.onHeaderDblClick(new MouseEvent('dblclick'));
    expect(comp.splitPercent()).toBe(50);
    expect(comp.isCollapsed()).toBe(false);

    // Keyboard ArrowUp expands drawer (decreases top editor percent by 5)
    comp.onHeaderKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(comp.splitPercent()).toBe(45);

    // Keyboard ArrowDown collapses drawer (increases top editor percent by 5)
    comp.onHeaderKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(comp.splitPercent()).toBe(50);

    // Keyboard Enter / Space toggles collapse
    comp['lastToggleTime'] = 0;
    comp.onHeaderKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(comp.splitPercent()).toBe(100);
    expect(comp.isCollapsed()).toBe(true);

    // Pointer double-tap toggles back to 50%
    comp['lastToggleTime'] = 0;
    comp['lastHeaderTapTime'] = Date.now() - 100;
    comp.onHeaderPointerUp(new PointerEvent('pointerup'));
    expect(comp.splitPercent()).toBe(50);
    expect(comp.isCollapsed()).toBe(false);
  });

  it('should not render the removed comparison editor heading bar', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.editor-header')).toBeNull();
  });

  it('should format secondary input when formatSecondary is called', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;

    comp.diff.setSecondaryInput('{"key":"value"}');
    comp.formatSecondary();
    expect(comp.secondaryInput()).toBe('{\n  "key": "value"\n}');
  });

  it('should render icon-only Format, Swap, Open File, and Clear buttons with accessible labels', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.diff-lens__actions button')
    ) as HTMLButtonElement[];
    const ariaLabels = buttons.map((b) => b.getAttribute('aria-label'));
    expect(ariaLabels).toEqual([
      'Format comparison JSON',
      'Swap Left and Right JSON',
      'Open comparison .json file',
      'Clear comparison JSON',
    ]);
    for (const btn of buttons) {
      expect(btn.textContent?.trim()).toBe('');
    }
  });

  it('should show conditional icon-only Auto-Fix button on invalid comparison JSON and repair on click', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    // Valid default JSON should NOT display Auto-Fix button
    expect(fixture.nativeElement.querySelector('.action-btn--fix')).toBeNull();

    // Broken JSON shows error badge & icon-only Auto-Fix button
    comp.onSecondaryInput('{invalid: true,}');
    fixture.detectChanges();

    const fixBtn = fixture.nativeElement.querySelector('.action-btn--fix') as HTMLButtonElement | null;
    expect(fixBtn).toBeTruthy();
    expect(fixBtn?.getAttribute('aria-label')).toBe('Auto-Fix comparison JSON syntax errors');
    expect(fixBtn?.textContent?.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('.invalid-indicator')).toBeTruthy();

    fixBtn!.click();
    fixture.detectChanges();

    expect(comp.parsedSecondary().isValid).toBe(true);
    expect(JSON.parse(comp.secondaryInput())).toEqual({ invalid: true });
    expect(fixture.nativeElement.querySelector('.action-btn--fix')).toBeNull();
  });

  it('should filter differences by type chip and search query and export patch or markdown', async () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;
    const exporter = TestBed.inject(ExportService);

    comp.engine.setInput('{"a": 1, "b": "old", "drop": true}');
    comp.diff.setSecondaryInput('{"a": 1, "b": "new", "addedKey": 42}');
    fixture.detectChanges();

    // 3 meaningful diffs: b (modified), drop (removed), addedKey (added)
    expect(comp.filteredDiffs().length).toBe(3);

    // Filter to added only
    comp.setFilter('added');
    expect(comp.filteredDiffs().map((d) => d.path)).toEqual(['addedKey']);

    // Clicking active filter toggles back to 'all'
    comp.setFilter('added');
    expect(comp.activeFilter()).toBe('all');
    expect(comp.filteredDiffs().length).toBe(3);

    // Path/value search filtering
    comp.pathQuery.set('new');
    expect(comp.filteredDiffs().map((d) => d.path)).toEqual(['b']);

    // Reset filters
    comp.resetFilters();
    expect(comp.filteredDiffs().length).toBe(3);

    // Keyboard ArrowUp can expand drawer all the way down to splitPercent 0 (100% drawer pane view)
    comp.splitPercent.set(5);
    comp.onHeaderKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(comp.splitPercent()).toBe(0);

    // Export JSON Patch & Markdown / Plain Text Reports without verbose toast overflow
    const toast = TestBed.inject(ToastService);
    const toastSpy = vi.spyOn(toast, 'show');
    const copySpy = vi.spyOn(exporter, 'copyToClipboard').mockResolvedValue(true);
    const downloadSpy = vi.spyOn(exporter, 'downloadFile').mockReturnValue(true);

    await comp.copyDiffPath('data.model.claimsApprovalHistoryList[0].currentApprover');
    expect(copySpy).toHaveBeenCalledWith('$.data.model.claimsApprovalHistoryList[0].currentApprover');
    expect(toastSpy).toHaveBeenCalledWith('Copied JSONPath', 'success');

    await comp.copyJsonPatch();
    expect(copySpy).toHaveBeenCalledTimes(2);
    expect(comp.isPatchCopied()).toBe(true);

    comp.toggleExportMenu();
    expect(comp.isExportMenuOpen()).toBe(true);

    comp.downloadReport('md');
    expect(comp.isExportMenuOpen()).toBe(false);
    expect(downloadSpy).toHaveBeenCalledWith(
      'jsonlens-diff-report.md',
      expect.stringContaining('# JsonLens Diff Report'),
      'text/markdown;charset=utf-8',
    );

    comp.downloadReport('txt');
    expect(downloadSpy).toHaveBeenCalledWith(
      'jsonlens-diff-report.txt',
      expect.stringContaining('JsonLens Diff Report'),
      'text/plain;charset=utf-8',
    );
  });

  it('should emit navigateDiff with resolved line numbers on click-to-jump and toggle smart arrays', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;

    comp.engine.setInput('{\n  "title": "Left"\n}');
    comp.diff.setSecondaryInput('{\n  "title": "Right"\n}');
    fixture.detectChanges();

    const emittedTargets: Array<{ leftLine?: number; rightLine?: number }> = [];
    comp.navigateDiff.subscribe((t) => emittedTargets.push(t));

    const item = comp.filteredDiffs()[0];
    const pathEl = fixture.nativeElement.querySelector('.diff-row__path') as HTMLElement;
    expect(pathEl).toBeTruthy();
    pathEl.click();

    expect(comp.selectedDiffKey()).toBe(`${item.path}:${item.type}`);
    expect(emittedTargets).toEqual([{ leftLine: 2, rightLine: 2 }]);

    const exporter = TestBed.inject(ExportService);
    const copySpy = vi.spyOn(exporter, 'copyToClipboard').mockResolvedValue(true);
    const copyBtn = fixture.nativeElement.querySelector('.diff-row__copy-btn') as HTMLButtonElement;
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.textContent?.trim()).toBe('');
    copyBtn.click();

    expect(copySpy).toHaveBeenCalledWith('$.title');
    expect(emittedTargets.length).toBe(1);

    expect(comp.diff.diffMode()).toBe('strict');
    comp.toggleSmartArrays();
    expect(comp.diff.diffMode()).toBe('smart-array');
  });
});
