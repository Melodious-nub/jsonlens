import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { JsonRepairService } from './json-repair.service';

describe('JsonRepairService', () => {
  let service: JsonRepairService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JsonRepairService],
    });
    service = TestBed.inject(JsonRepairService);
  });

  it('should repair trailing commas, unquoted keys, and single quotes', () => {
    const broken = "{ name: 'JsonLens', trailing: true, }";
    const result = service.repair(broken);
    expect(result.success).toBe(true);
    expect(result.wasModified).toBe(true);
    const parsed = JSON.parse(result.repaired) as Record<string, unknown>;
    expect(parsed['name']).toBe('JsonLens');
    expect(parsed['trailing']).toBe(true);
  });

  it('should return unchanged when already valid', () => {
    const valid = '{"name":"JsonLens"}';
    const result = service.repair(valid);
    expect(result.success).toBe(true);
    expect(result.wasModified).toBe(false);
  });
});
