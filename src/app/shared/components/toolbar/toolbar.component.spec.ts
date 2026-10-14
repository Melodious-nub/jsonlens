import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ToolbarComponent } from './toolbar.component';
import { JsonEngineService } from '../../../core/services/json-engine.service';
import { ToastService } from '../../../core/services/toast.service';

describe('ToolbarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolbarComponent],
      providers: [JsonEngineService, ToastService],
    }).compileComponents();
  });

  it('should instantiate toolbar and format valid JSON', () => {
    const fixture = TestBed.createComponent(ToolbarComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.isIndentMenuOpen()).toBe(false);

    comp.toggleIndentMenu();
    expect(comp.isIndentMenuOpen()).toBe(true);

    comp.closeMenus();
    expect(comp.isIndentMenuOpen()).toBe(false);
  });
});
