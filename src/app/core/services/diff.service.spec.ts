import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
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
    expect(service.secondaryInput()).toBe('{"val": "primary"}');
  });

  it('should clear and reload sample', () => {
    const service = TestBed.inject(DiffService);
    service.clearSecondary();
    expect(service.secondaryInput()).toBe('');

    service.loadSample();
    expect(service.secondaryInput().length).toBeGreaterThan(0);
  });
});
