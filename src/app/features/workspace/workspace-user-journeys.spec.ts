import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceComponent } from './workspace.component';
import { JsonEngineService } from '../../core/services/json-engine.service';
import { ToastService } from '../../core/services/toast.service';
import { TypeGenService } from '../../core/services/type-gen.service';
import { ExportService } from '../../core/services/export.service';
import { DiffService } from '../../core/services/diff.service';
import { UrlShareService } from '../../core/services/url-share.service';
import { JsonValue } from '../../core/models/json-lens.model';

describe('Professional QA Suite: End-to-End User Journeys', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceComponent],
      providers: [
        JsonEngineService,
        ToastService,
        TypeGenService,
        ExportService,
        DiffService,
        UrlShareService,
      ],
    }).compileComponents();
  });

  it('Journey 1: Broken JSON Input -> Diagnostics -> Auto-Repair -> Tree Visualization -> Clean Export', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    const toast = TestBed.inject(ToastService);
    const toastSpy = vi.spyOn(toast, 'show');

    // 1. User arrives with dirty / broken JSON from an API or log file
    const dirtyJson = `{
      // Configuration
      app: 'JsonLens',
      port: 8080,
      features: ['formatting', 'diagnostics',],
    }`;

    comp.engine.setInput(dirtyJson);
    fixture.detectChanges();

    // 2. Diagnostics should detect syntax error
    expect(comp.engine.isValid()).toBe(false);
    expect(comp.engine.jsonError()).not.toBeNull();

    // 3. User clicks One-Click Auto-Fix
    comp.onAutoRepair();
    fixture.detectChanges();

    // 4. Engine should now be completely valid
    expect(comp.engine.isValid()).toBe(true);
    expect(comp.engine.jsonError()).toBeNull();
    expect(toastSpy).toHaveBeenCalledWith('JSON syntax automatically repaired!', 'success');

    const parsed = comp.engine.parsedResult();
    expect(parsed.success).toBe(true);
    const data = parsed.data as Record<string, unknown>;
    expect(data['app']).toBe('JsonLens');
    expect(data['port']).toBe(8080);
    expect(Array.isArray(data['features'])).toBe(true);

    // 5. User switches to Tree Lens to visually inspect nodes
    comp.setLens('tree');
    fixture.detectChanges();
    expect(comp.activeLens()).toBe('tree');
    expect(comp.engine.treeData()).not.toBeNull();
    expect(comp.engine.treeData()?.children?.length).toBe(3);

    // 6. User exports the cleaned JSON
    const exportService = TestBed.inject(ExportService);
    const exportSpy = vi.spyOn(exportService, 'downloadJson');
    comp.onExport('json');
    expect(exportSpy).toHaveBeenCalled();
  });

  it('Journey 2: Complex API Schema Input -> Type Generation Across TypeScript, Zod, and Go', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    const typeGen = TestBed.inject(TypeGenService);

    const apiPayload = {
      orderId: 'ORD-9821',
      totalAmount: 149.95,
      isPaid: true,
      customer: {
        id: 42,
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
      items: [
        { sku: 'ITEM-1', qty: 2, unitPrice: 49.95 },
        { sku: 'ITEM-2', qty: 1, unitPrice: 50.05 },
      ],
    };

    comp.engine.setInput(JSON.stringify(apiPayload));
    fixture.detectChanges();

    // User switches to Type Lens
    comp.setLens('type');
    fixture.detectChanges();
    expect(comp.activeLens()).toBe('type');

    // Generate TypeScript
    const tsCode = typeGen.generate('typescript', apiPayload as unknown as JsonValue, 'OrderModel');
    expect(tsCode).toContain('orderId: string;');
    expect(tsCode).toContain('totalAmount: number;');
    expect(tsCode).toContain('customer: Customer;');
    expect(tsCode).toContain('items: Item[];');

    // Generate Zod Schema
    const zodCode = typeGen.generate('zod', apiPayload as unknown as JsonValue, 'orderModel');
    expect(zodCode).toContain("import { z } from 'zod';");
    expect(zodCode).toContain('orderId: z.string()');
    expect(zodCode).toContain('totalAmount: z.number()');

    // Generate Go Struct
    const goCode = typeGen.generate('go', apiPayload as unknown as JsonValue, 'OrderModel');
    expect(goCode).toContain('type OrderModel struct');
  });

  it('Journey 3: Side-by-Side Deep Diff Comparison with Highlighting and Summary', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    const diffService = TestBed.inject(DiffService);

    const version1 = JSON.stringify({
      version: '1.0.0',
      database: { host: 'localhost', port: 5432, ssl: false },
      features: ['auth', 'billing'],
    });

    const version2 = JSON.stringify({
      version: '1.1.0',
      database: { host: 'db.prod.internal', port: 5432, ssl: true },
      features: ['auth', 'billing', 'analytics'],
      extraSetting: true,
    });

    // Load v1 on left pane, v2 on diff pane
    comp.engine.setInput(version1);
    TestBed.flushEffects();
    diffService.setSecondaryInput(version2);
    comp.setLens('diff');
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(comp.activeLens()).toBe('diff');

    const summary = diffService.diffSummary();
    expect(summary.modified).toBeGreaterThan(0); // version, host, ssl
    expect(summary.added).toBeGreaterThan(0); // extraSetting, analytics
    expect(summary.removed).toBe(0);

    // Swap panes functionality
    diffService.swapInputs();
    fixture.detectChanges();
    TestBed.flushEffects();

    const swappedSummary = diffService.diffSummary();
    expect(swappedSummary.removed).toBeGreaterThan(0); // extraSetting is now removed
  });

  it('Journey 4: 100% Client-Side URL Sharing Roundtrip with LZ-String Compression', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    const shareService = TestBed.inject(UrlShareService);

    const originalData = {
      message: 'Hello from JsonLens!',
      unicode: 'Rocket 🚀 and Fire 🔥',
      nested: { counter: 42, active: true },
    };
    const jsonStr = JSON.stringify(originalData);

    comp.engine.setInput(jsonStr);
    fixture.detectChanges();

    // Generate Share Payload
    const sharePayload = shareService.createSharePayload(jsonStr);
    expect(sharePayload.url).toContain('#d=');
    expect(sharePayload.percentSaved).toBeGreaterThanOrEqual(0);

    // Extract the hash and simulate a new user opening that link
    const generatedHash = new URL(sharePayload.url).hash;
    window.location.hash = generatedHash;

    const restoredJson = shareService.readSharedPayload();
    expect(restoredJson).not.toBeNull();
    const restoredObj = JSON.parse(restoredJson!);
    expect(restoredObj).toEqual(originalData);

    // Clean up share hash
    shareService.clearShareHash();
    expect(window.location.hash).toBe('');
  });
});

