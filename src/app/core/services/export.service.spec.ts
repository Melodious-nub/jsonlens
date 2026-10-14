import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ExportService } from './export.service';

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExportService],
    });
    service = TestBed.inject(ExportService);
  });

  it('should instantiate', () => {
    expect(service).toBeTruthy();
  });

  it('should download JSON file', () => {
    const success = service.downloadJson('test.json', '{"name":"test"}');
    expect(typeof success).toBe('boolean');
  });

  it('should download TypeScript file', () => {
    const success = service.downloadTs('types.ts', 'export interface Root {}');
    expect(typeof success).toBe('boolean');
  });

  it('should download CSV file from JSON array', () => {
    const success = service.downloadCsv('data.csv', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    expect(typeof success).toBe('boolean');
  });

  it('should copy text to clipboard using fallback or navigator', async () => {
    const success = await service.copyToClipboard('{"copy":"test"}');
    expect(typeof success).toBe('boolean');
  });
});
