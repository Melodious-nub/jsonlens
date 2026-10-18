import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DiffService } from '../../../../core/services/diff.service';
import { MonacoEditorComponent } from '../../../../shared/components/monaco-wrapper/monaco-editor.component';
import { LucideAngularModule, ArrowLeftRight, Sparkles, Trash2, GitCompare, CheckCircle2 } from 'lucide-angular';

@Component({
  selector: 'app-diff-lens',
  standalone: true,
  imports: [MonacoEditorComponent, LucideAngularModule],
  templateUrl: './diff-lens.component.html',
  styleUrl: './diff-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffLensComponent {
  readonly engine = inject(JsonEngineService);
  readonly diff = inject(DiffService);
  private readonly toast = inject(ToastService);

  readonly swapIcon = ArrowLeftRight;
  readonly sampleIcon = Sparkles;
  readonly clearIcon = Trash2;
  readonly compareIcon = GitCompare;
  readonly matchIcon = CheckCircle2;

  readonly secondaryInput = this.diff.secondaryInput;
  readonly parsedSecondary = this.diff.parsedSecondary;
  readonly diffItems = this.diff.diffItems;
  readonly meaningfulDiffs = this.diff.meaningfulDiffs;
  readonly diffSummary = this.diff.diffSummary;

  onSecondaryInput(val: string): void {
    this.diff.setSecondaryInput(val);
  }

  loadSample(): void {
    this.diff.loadSample();
    this.toast.show('Loaded sample modified JSON', 'info');
  }

  clearSecondary(): void {
    this.diff.clearSecondary();
    this.toast.show('Cleared comparison JSON', 'info');
  }

  swapInputs(): void {
    this.diff.swapInputs();
    this.toast.show('Swapped Left and Right JSON', 'success');
  }

  formatVal(val: unknown): string {
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'object' && val !== null) {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }
}

