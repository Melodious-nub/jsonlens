import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { StatusBarComponent } from './status-bar.component';
import { JsonEngineService } from '../../../core/services/json-engine.service';

describe('StatusBarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBarComponent],
      providers: [JsonEngineService],
    }).compileComponents();
  });

  it('should instantiate and show valid state by default', () => {
    const fixture = TestBed.createComponent(StatusBarComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.engine.isValid()).toBe(true);
  });
});
