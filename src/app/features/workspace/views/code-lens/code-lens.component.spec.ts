import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CodeLensComponent } from './code-lens.component';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';

describe('CodeLensComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeLensComponent],
      providers: [JsonEngineService, ToastService],
    }).compileComponents();
  });

  it('should instantiate and compute formattedJson and lineCount', () => {
    const fixture = TestBed.createComponent(CodeLensComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.formattedJson()).toBeTruthy();
    expect(comp.lineCount()).toBeGreaterThan(0);
  });
});
