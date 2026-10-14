import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TreeLensComponent } from './tree-lens.component';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';

describe('TreeLensComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeLensComponent],
      providers: [JsonEngineService, ToastService],
    }).compileComponents();
  });

  it('should instantiate and populate treeData', () => {
    const fixture = TestBed.createComponent(TreeLensComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.treeData()).not.toBeNull();
    expect(comp.totalKeys()).toBeGreaterThan(0);
    expect(comp.isValid()).toBe(true);
  });

  it('should filter search queries', () => {
    const fixture = TestBed.createComponent(TreeLensComponent);
    const comp = fixture.componentInstance;
    comp.searchQuery.set('version');
    expect(comp.searchQuery()).toBe('version');
    comp.clearSearch();
    expect(comp.searchQuery()).toBe('');
  });
});
