import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
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
import { IndentOption, JsonValue } from '../../../../core/models/json-lens.model';
import {
  flattenJsonObject,
  sortJsonKeys,
  stripNullProperties,
  unflattenJsonObject,
} from '../../../../shared/utils/json-tree.util';

export type OutputSortOption = 'default' | 'asc' | 'desc';
export type OutputTransformOption = 'default' | 'flatten' | 'unflatten' | 'stripNulls';

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
  readonly isSortMenuOpen = signal<boolean>(false);
  readonly isTransformMenuOpen = signal<boolean>(false);

  // Output-only view filters (non-destructive: do NOT mutate input editor)
  readonly sortOption = signal<OutputSortOption>('default');
  readonly transformOption = signal<OutputTransformOption>('default');

  readonly editorComponent = viewChild<MonacoEditorComponent>('editorComponent');

  triggerFind(): void {
    this.editorComponent()?.triggerFind();
  }

  closeFindWidget(): void {
    this.editorComponent()?.closeFindWidget();
  }

  isFindWidgetVisible(): boolean {
    return this.editorComponent()?.isFindWidgetVisible() ?? false;
  }

  layout(): void {
    this.editorComponent()?.layout();
  }

  readonly formattedJson = computed<string>(() => {
    const result = this.engine.parsedResult();
    if (!result.success || result.data === null || result.data === undefined) {
      return result.formatted;
    }

    let data: JsonValue = result.data;

    // 1. Apply Output Transform Filter
    const transform = this.transformOption();
    if (transform === 'flatten') {
      data = flattenJsonObject(data);
    } else if (transform === 'unflatten') {
      if (typeof data === 'object' && !Array.isArray(data)) {
        data = unflattenJsonObject(data as Record<string, unknown>);
      }
    } else if (transform === 'stripNulls') {
      data = stripNullProperties(data);
    }

    // 2. Apply Output Sort Filter
    const sort = this.sortOption();
    if (sort === 'asc') {
      data = sortJsonKeys(data, 'asc');
    } else if (sort === 'desc') {
      data = sortJsonKeys(data, 'desc');
    }

    // 3. Format with Active Indentation
    if (this.engine.indentOption() === 'minified') {
      return JSON.stringify(data);
    }
    return JSON.stringify(data, null, this.engine.indentValue());
  });

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

  readonly sortLabel = computed<string>(() => {
    switch (this.sortOption()) {
      case 'default':
        return 'Def';
      case 'asc':
        return 'A-Z';
      case 'desc':
        return 'Z-A';
    }
  });

  readonly transformLabel = computed<string>(() => {
    switch (this.transformOption()) {
      case 'default':
        return 'Def';
      case 'flatten':
        return 'Flat';
      case 'unflatten':
        return 'Unflat';
      case 'stripNulls':
        return 'Strip';
    }
  });

  toggleIndentMenu(): void {
    this.isIndentMenuOpen.update((v) => !v);
    this.isSortMenuOpen.set(false);
    this.isTransformMenuOpen.set(false);
  }

  toggleSortMenu(): void {
    this.isSortMenuOpen.update((v) => !v);
    this.isIndentMenuOpen.set(false);
    this.isTransformMenuOpen.set(false);
  }

  toggleTransformMenu(): void {
    this.isTransformMenuOpen.update((v) => !v);
    this.isIndentMenuOpen.set(false);
    this.isSortMenuOpen.set(false);
  }

  onSetIndent(option: IndentOption): void {
    this.engine.setIndent(option);
    this.isIndentMenuOpen.set(false);
    this.toast.show(`Indentation set to ${option}`, 'info');
  }

  onSetSort(option: OutputSortOption): void {
    if (option !== 'default' && !this.engine.isValid()) {
      this.toast.show('Cannot sort keys on invalid JSON.', 'error');
      this.isSortMenuOpen.set(false);
      return;
    }

    this.sortOption.set(option);
    this.isSortMenuOpen.set(false);

    switch (option) {
      case 'default':
        this.toast.show('Output sorting reset to default', 'info');
        break;
      case 'asc':
        this.toast.show('Output keys sorted A-Z', 'success');
        break;
      case 'desc':
        this.toast.show('Output keys sorted Z-A', 'success');
        break;
    }
  }

  onSetTransform(option: OutputTransformOption): void {
    if (option !== 'default' && !this.engine.isValid()) {
      this.toast.show('Cannot transform invalid JSON.', 'error');
      this.isTransformMenuOpen.set(false);
      return;
    }

    this.transformOption.set(option);
    this.isTransformMenuOpen.set(false);

    switch (option) {
      case 'default':
        this.toast.show('Output transform reset to default', 'info');
        break;
      case 'flatten':
        this.toast.show('Output flattened to dot-notation', 'success');
        break;
      case 'unflatten':
        this.toast.show('Output unflattened to hierarchy', 'success');
        break;
      case 'stripNulls':
        this.toast.show('Output stripped of null properties', 'success');
        break;
    }
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
