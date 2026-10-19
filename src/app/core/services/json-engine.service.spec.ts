import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { JsonEngineService } from './json-engine.service';
import { StorageService } from './storage.service';
import { UrlShareService } from './url-share.service';
import { JsonRepairService } from './json-repair.service';

describe('JsonEngineService', () => {
  let service: JsonEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JsonEngineService, StorageService, UrlShareService, JsonRepairService],
    });
    service = TestBed.inject(JsonEngineService);
  });

  it('should initialize with default sample JSON and be valid', () => {
    expect(service.rawInput()).toBeTruthy();
    expect(service.isValid()).toBe(true);
    expect(service.parsedResult().success).toBe(true);
    expect(service.jsonStats().keyCount).toBeGreaterThan(0);
  });

  it('should format, minify, and clear input', () => {
    service.setInput('{"a":1,"b":2}');
    expect(service.isValid()).toBe(true);

    service.format();
    expect(service.rawInput()).toContain('\n');

    service.minify();
    expect(service.rawInput()).toBe('{"a":1,"b":2}');

    service.clear();
    expect(service.rawInput()).toBe('');
  });

  it('should detect invalid JSON syntax', () => {
    service.setInput('{invalid: json,}');
    expect(service.isValid()).toBe(false);
    expect(service.jsonError()).toBeTruthy();
  });

  it('should perform synchronous autoRepair for broken syntax', () => {
    service.setInput('{name: "JsonLens",}');
    const repaired = service.autoRepair();
    expect(repaired).toBe(true);
    expect(service.isValid()).toBe(true);
    expect(JSON.parse(service.rawInput())).toEqual({ name: 'JsonLens' });
  });

  it('should resolve autoRepairAsync gracefully', async () => {
    service.setInput('{key: "value",}');
    const repaired = await service.autoRepairAsync();
    expect(repaired).toBe(true);
    expect(service.isValid()).toBe(true);
  });

  it('should sort keys in ascending and descending orders', () => {
    service.setInput('{"z": 1, "a": 2, "m": 3}');
    service.sortKeys('asc');
    const keysAsc = Object.keys(JSON.parse(service.rawInput()));
    expect(keysAsc).toEqual(['a', 'm', 'z']);

    service.sortKeys('desc');
    const keysDesc = Object.keys(JSON.parse(service.rawInput()));
    expect(keysDesc).toEqual(['z', 'm', 'a']);
  });

  it('should strip null properties and flatten/unflatten object', () => {
    service.setInput('{"name":"test","empty":null,"deep":{"child":1}}');
    service.stripNulls();
    expect(JSON.parse(service.rawInput())).toEqual({ name: 'test', deep: { child: 1 } });

    service.flatten();
    expect(JSON.parse(service.rawInput())).toEqual({ name: 'test', 'deep.child': 1 });

    service.unflatten();
    expect(JSON.parse(service.rawInput())).toEqual({ name: 'test', deep: { child: 1 } });
  });

  it('should provide computeDiffWorker cancel callback', () => {
    let resultReceived: unknown = undefined;
    const cancel = service.computeDiffWorker({ a: 1 }, { a: 2 }, (res) => {
      resultReceived = res;
    });
    expect(typeof cancel).toBe('function');
    expect(resultReceived).toBe(null);
  });
});
