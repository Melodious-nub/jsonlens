import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DiffService } from './diff.service';
import { JsonEngineService } from './json-engine.service';

describe('DiffService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DiffService, JsonEngineService],
    });
  });

  it('should initialize with default comparison JSON and compute summary', () => {
    const service = TestBed.inject(DiffService);
    expect(service.secondaryInput()).toBeTruthy();
    expect(service.parsedSecondary().isValid).toBe(true);
    expect(service.diffSummary().added).toBeGreaterThanOrEqual(0);
  });

  it('should update secondary input and swap inputs with engine', () => {
    const service = TestBed.inject(DiffService);
    const engine = TestBed.inject(JsonEngineService);

    engine.setInput('{"val": "primary"}');
    service.setSecondaryInput('{"val": "secondary"}');

    service.swapInputs();
    expect(engine.rawInput()).toBe('{"val": "secondary"}');
    expect(service.secondaryInput()).toBe('{\n  "val": "primary"\n}');
  });

  it('should clear and reload sample', () => {
    const service = TestBed.inject(DiffService);
    service.clearSecondary();
    expect(service.secondaryInput()).toBe('');
    expect(service.isSampleActive()).toBe(false);

    service.loadSample();
    expect(service.secondaryInput().length).toBeGreaterThan(0);
    expect(service.isSampleActive()).toBe(true);
  });

  it('should clone primary input into secondary comparison as formatted JSON', () => {
    const service = TestBed.inject(DiffService);
    const engine = TestBed.inject(JsonEngineService);

    engine.setInput('{"hello": "world"}');
    service.cloneFromPrimary();
    expect(service.secondaryInput()).toBe('{\n  "hello": "world"\n}');
    expect(service.isSampleActive()).toBe(false);
    expect(service.meaningfulDiffs().length).toBe(0);
  });

  it('should auto-synchronize baseline as formatted JSON when new input is added after diff is cleared', () => {
    const service = TestBed.inject(DiffService);
    const engine = TestBed.inject(JsonEngineService);

    // Initial state
    engine.setInput('{"v": 1}');
    TestBed.flushEffects();

    // Clear diff
    service.clearSecondary();
    expect(service.secondaryInput()).toBe('');
    expect(service.awaitingNewInput()).toBe(true);
    TestBed.flushEffects();

    // Secondary stays cleared while primary has not changed
    expect(service.secondaryInput()).toBe('');

    // Now user inputs new JSON into primary editor
    engine.setInput('{"v": 2, "new": true}');
    TestBed.flushEffects();

    // Secondary automatically initializes to the new baseline formatted
    expect(service.secondaryInput()).toBe('{\n  "v": 2,\n  "new": true\n}');
    expect(service.awaitingNewInput()).toBe(false);
    expect(service.meaningfulDiffs().length).toBe(0);

    // Subsequent edit on secondary shows diff
    service.setSecondaryInput('{\n  "v": 3,\n  "new": true\n}');
    TestBed.flushEffects();
    expect(service.meaningfulDiffs().length).toBe(1);
  });

  it('should not auto-minify diff when main code is minified', () => {
    const service = TestBed.inject(DiffService);
    const engine = TestBed.inject(JsonEngineService);

    // Initial state has sample active
    expect(service.isSampleActive()).toBe(true);
    const initialSecondary = service.secondaryInput();

    // User minifies main code in engine
    engine.minify();
    TestBed.flushEffects();

    // Main code is minified
    expect(engine.rawInput()).not.toContain('\n');

    // Diff comparison JSON MUST NOT be auto-minified or overwritten
    expect(service.isSampleActive()).toBe(true);
    expect(service.secondaryInput()).toBe(initialSecondary);
    expect(service.secondaryInput()).toContain('\n');
  });

  it('should format secondary input when formatSecondary is called', () => {
    const service = TestBed.inject(DiffService);
    service.setSecondaryInput('{"a":1,"b":[2,3]}');

    const result = service.formatSecondary();
    expect(result).toBe(true);
    expect(service.secondaryInput()).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  });
});
