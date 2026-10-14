import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { CommandPaletteComponent } from './command-palette.component';
import { JsonEngineService } from '../../../core/services/json-engine.service';
import { ToastService } from '../../../core/services/toast.service';

describe('CommandPaletteComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandPaletteComponent],
      providers: [provideRouter([]), JsonEngineService, ToastService],
    }).compileComponents();
  });

  it('should filter commands based on query', () => {
    const fixture = TestBed.createComponent(CommandPaletteComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();

    comp.searchQuery.set('Minify');
    const filtered = comp.filteredCommands();
    expect(filtered.some((c) => c.title.includes('Minify'))).toBe(true);

    comp.searchQuery.set('NonExistentCommandXYZ');
    expect(comp.filteredCommands().length).toBe(0);
  });
});
