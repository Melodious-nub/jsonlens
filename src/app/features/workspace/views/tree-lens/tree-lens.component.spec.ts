import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TreeLensComponent } from './tree-lens.component';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TreeNode } from '../../../../core/models/json-lens.model';

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
    expect(comp.isValid()).toBe(true);
  });

  it('should filter search queries and compute matchCount', () => {
    const fixture = TestBed.createComponent(TreeLensComponent);
    const comp = fixture.componentInstance;
    comp.searchQuery.set('name');
    expect(comp.searchQuery()).toBe('name');
    expect(comp.matchCount()).toBeGreaterThan(0);

    comp.clearSearch();
    expect(comp.searchQuery()).toBe('');
    expect(comp.matchCount()).toBe(0);
  });

  it('should handle node selection and deselection', () => {
    const fixture = TestBed.createComponent(TreeLensComponent);
    const comp = fixture.componentInstance;
    expect(comp.selectedNode()).toBeNull();
    expect(comp.selectedPath()).toBeNull();

    const mockNode: TreeNode = {
      id: 'root.0',
      key: 'title',
      path: '$.title',
      type: 'string',
      value: 'JsonLens',
    };

    comp.onNodeSelected(mockNode);
    expect(comp.selectedNode()).toBe(mockNode);
    expect(comp.selectedPath()).toBe('$.title');

    comp.clearSelection();
    expect(comp.selectedNode()).toBeNull();
    expect(comp.selectedPath()).toBeNull();
  });

  it('should copy selected path and value without error', async () => {
    const fixture = TestBed.createComponent(TreeLensComponent);
    const comp = fixture.componentInstance;

    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    const mockNode: TreeNode = {
      id: 'root.name',
      key: 'name',
      path: '$.name',
      type: 'string',
      value: 'JsonLens Suite',
    };

    comp.onNodeSelected(mockNode);
    await comp.copySelectedPath();
    expect(writeTextSpy).toHaveBeenCalledWith('$.name');

    await comp.copySelectedValue();
    expect(writeTextSpy).toHaveBeenCalledWith('JsonLens Suite');
  });
});

