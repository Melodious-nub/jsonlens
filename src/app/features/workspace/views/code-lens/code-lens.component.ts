import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { MonacoEditorComponent } from '../../../../shared/components/monaco-wrapper/monaco-editor.component';
import {
  LucideAngularModule,
  Copy,
  Check,
  ChevronDown,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-angular';
import { ClickOutsideDirective } from '../../../../shared/directives/click-outside.directive';
import { IndentOption } from '../../../../core/models/json-lens.model';

@Component({
  selector: 'app-code-lens',
  standalone: true,
  imports: [
    MonacoEditorComponent,
    LucideAngularModule,
    ClickOutsideDirective,
  ],
  templateUrl: './code-lens.component.html',
  styleUrl: './code-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeLensComponent {
  readonly engine = inject(JsonEngineService);
  private readonly toast = inject(ToastService);

  readonly copyIcon = Copy;
  readonly checkIcon = Check;
  readonly chevronDownIcon = ChevronDown;
  readonly sortIcon = ArrowUpDown;
  readonly transformIcon = SlidersHorizontal;

  readonly isCopied = signal<boolean>(false);
  readonly isIndentMenuOpen = signal<boolean>(false);
  readonly isToolsMenuOpen = signal<boolean>(false);

  readonly formattedJson = computed(() => this.engine.parsedResult().formatted);
  readonly lineCount = computed(() => {
    const text = this.formattedJson();
    return text ? text.split('\n').length : 0;
  });

  readonly indentLabel = computed(() => {
    switch (this.engine.indentOption()) {
      case '2-spaces':
        return '2sp';
      case '4-spaces':
        return '4sp';
      case 'tabs':
        return 'Tabs';
      case 'minified':
        return 'Min';
      default:
        return this.engine.indentOption();
    }
  });

  toggleIndentMenu(): void {
    this.isIndentMenuOpen.update((v) => !v);
    this.isToolsMenuOpen.set(false);
  }

  toggleToolsMenu(): void {
    this.isToolsMenuOpen.update((v) => !v);
    this.isIndentMenuOpen.set(false);
  }

  onSetIndent(option: IndentOption): void {
    this.engine.setIndent(option);
    this.isIndentMenuOpen.set(false);
    this.toast.show(`Indentation set to ${option}`, 'info');
  }

  onSortToggle(): void {
    if (!this.engine.isValid()) {
      this.toast.show('Cannot sort keys on invalid JSON.', 'error');
      return;
    }
    const nextOrder = this.engine.sortOrder() === 'asc' ? 'desc' : 'asc';
    this.engine.sortKeys(nextOrder);
    this.toast.show(`Keys sorted ${nextOrder.toUpperCase()}`, 'success');
  }

  onFlatten(): void {
    if (!this.engine.isValid()) {
      this.toast.show('Cannot flatten invalid JSON.', 'error');
      return;
    }
    this.engine.flatten();
    this.toast.show('Flattened to dot-notation', 'success');
    this.isToolsMenuOpen.set(false);
  }

  onUnflatten(): void {
    if (!this.engine.isValid()) {
      this.toast.show('Cannot unflatten invalid JSON.', 'error');
      return;
    }
    this.engine.unflatten();
    this.toast.show('Restored nested hierarchy', 'success');
    this.isToolsMenuOpen.set(false);
  }

  onStripNulls(): void {
    if (!this.engine.isValid()) {
      this.toast.show('Cannot strip nulls on invalid JSON.', 'error');
      return;
    }
    this.engine.stripNulls();
    this.toast.show('Stripped null properties', 'success');
    this.isToolsMenuOpen.set(false);
  }

  async copyToClipboard(): Promise<void> {
    const text = this.formattedJson();
    if (!text) {
      this.toast.show('No JSON content to copy', 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.isCopied.set(true);
      this.toast.show('Formatted JSON copied to clipboard', 'success');
      setTimeout(() => this.isCopied.set(false), 1800);
    } catch {
      this.toast.show('Failed to copy to clipboard', 'error');
    }
  }
}
