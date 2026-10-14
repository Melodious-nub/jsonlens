import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [StorageService],
    });
    service = TestBed.inject(StorageService);
  });

  it('should instantiate', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve typed values', () => {
    service.setItem('test_key', { count: 123, name: 'JsonLens' });
    const result = service.getItem<{ count: number; name: string }>('test_key', {
      count: 0,
      name: '',
    });
    expect(result.count).toBe(123);
    expect(result.name).toBe('JsonLens');
  });

  it('should return fallback if key does not exist', () => {
    const fallback = 'default_fallback';
    const result = service.getItem<string>('non_existent_key', fallback);
    expect(result).toBe(fallback);
  });

  it('should remove item', () => {
    service.setItem('to_delete', 'value');
    expect(service.getItem('to_delete', '')).toBe('value');
    service.removeItem('to_delete');
    expect(service.getItem('to_delete', 'missing')).toBe('missing');
  });

  it('should clear all storage', () => {
    service.setItem('key_a', 'valA');
    service.setItem('key_b', 'valB');
    service.clear();
    expect(service.getItem('key_a', null)).toBeNull();
    expect(service.getItem('key_b', null)).toBeNull();
  });
});
