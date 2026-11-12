import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TreeNode } from '../../../../core/models/json-lens.model';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EditorSettingsService } from '../../../../core/services/editor-settings.service';
import { ExportService } from '../../../../core/services/export.service';
import { countTreeMatches } from '../../../../shared/utils/json-tree.util';
import {
  evaluateJsonPath,
  getValueByJsonPath,
  JsonPathEvaluation,
} from '../../../../shared/utils/json-path.util';
import { TreeExpandCommand, TreeNodeComponent } from './tree-node.component';
import {
  LucideAngularModule,
  Search,
  FolderTree,
  X,
  AlertCircle,
  Copy,
  Check,
  Code,
  ChevronRight,
  ChevronsUpDown,
  ChevronsDownUp,
} from 'lucide-angular';

@Component({
  selector: 'app-tree-lens',
  standalone: true,
  imports: [TreeNodeComponent, LucideAngularModule],
  templateUrl: './tree-lens.component.html',
  styleUrl: './tree-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeLensComponent {
  readonly engine = inject(JsonEngineService);
  private readonly toast = inject(ToastService);
  private readonly exporter = inject(ExportService);
  readonly editorSettings = inject(EditorSettingsService);

  readonly searchIcon = Search;
  readonly treeIcon = FolderTree;
  readonly clearIcon = X;
  readonly alertIcon = AlertCircle;
  readonly copyIcon = Copy;
  readonly checkIcon = Check;
  readonly codeIcon = Code;
  readonly chevronRightIcon = ChevronRight;
  readonly expandAllIcon = ChevronsUpDown;
  readonly collapseAllIcon = ChevronsDownUp;

  readonly searchQuery = signal<string>('');
  readonly selectedNode = signal<TreeNode | null>(null);
  readonly expandCommand = signal<TreeExpandCommand | null>(null);
  readonly isQueryCopied = signal<boolean>(false);
  readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly destroyRef = inject(DestroyRef);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private queryCopyResetTimer: ReturnType<typeof setTimeout> | null = null;
  private expandCommandVersion = 0;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }
      if (this.queryCopyResetTimer) {
        clearTimeout(this.queryCopyResetTimer);
        this.queryCopyResetTimer = null;
      }
    });
  }

  focusSearch(): void {
    const input = this.searchInputRef()?.nativeElement;
    if (input) {
      input.focus();
      input.select();
    }
  }

  readonly treeData = computed(() => this.engine.treeData());
  readonly isValid = computed(() => this.engine.isValid());
  readonly selectedPath = computed(() => this.selectedNode()?.path ?? null);

  readonly isJsonPathQuery = computed(() => this.searchQuery().trim().startsWith('$'));

  readonly jsonPathEval = computed<JsonPathEvaluation | null>(() => {
    if (!this.isJsonPathQuery()) {
      return null;
    }
    return evaluateJsonPath(this.engine.parsedResult().data, this.searchQuery());
  });

  readonly matchedPathSet = computed<ReadonlySet<string> | null>(() => {
    const evalRes = this.jsonPathEval();
    if (!evalRes) {
      return null;
    }
    return new Set(evalRes.matches.map((m) => m.path));
  });

  readonly queryResultPreview = computed<string>(() => {
    const evalRes = this.jsonPathEval();
    if (!evalRes || !evalRes.isValidQuery || evalRes.matches.length === 0) {
      return '';
    }
    const val = evalRes.matches.length === 1
      ? evalRes.matches[0].value
      : evalRes.matches.map((m) => m.value);
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  });

  readonly matchCount = computed(() => {
    const evalRes = this.jsonPathEval();
    if (evalRes) {
      return evalRes.matches.length;
    }
    const q = this.searchQuery().trim();
    if (!q) return 0;
    return countTreeMatches(this.treeData(), q);
  });

  expandAll(): void {
    this.expandCommand.set({ version: ++this.expandCommandVersion, expanded: true });
  }

  collapseAll(): void {
    this.expandCommand.set({ version: ++this.expandCommandVersion, expanded: false });
  }

  async copyQueryResult(): Promise<void> {
    const evalRes = this.jsonPathEval();
    if (!evalRes || !evalRes.isValidQuery || evalRes.matches.length === 0) {
      return;
    }

    const val = evalRes.matches.length === 1
      ? evalRes.matches[0].value
      : evalRes.matches.map((m) => m.value);
    const serialized = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
    const copied = await this.exporter.copyToClipboard(serialized);

    if (copied) {
      this.isQueryCopied.set(true);
      if (this.queryCopyResetTimer) {
        clearTimeout(this.queryCopyResetTimer);
      }
      this.queryCopyResetTimer = setTimeout(() => {
        this.isQueryCopied.set(false);
        this.queryCopyResetTimer = null;
      }, 1800);
      this.toast.show('Copied JSONPath query result', 'success');
    } else {
      this.toast.show('Failed to copy query result', 'error');
    }
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    if (!value.trim()) {
      this.searchQuery.set('');
      return;
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.searchQuery.set(value);
    }, 120);
  }

  clearSearch(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.searchQuery.set('');
  }

  onNodeSelected(node: TreeNode): void {
    this.selectedNode.set(node);
  }

  clearSelection(): void {
    this.selectedNode.set(null);
  }

  async copySelectedPath(): Promise<void> {
    const node = this.selectedNode();
    if (!node) return;
    try {
      await navigator.clipboard.writeText(node.path);
      this.toast.show('Copied JSONPath', 'success');
    } catch {
      this.toast.show('Failed to copy JSONPath', 'error');
    }
  }

  async copySelectedValue(): Promise<void> {
    const node = this.selectedNode();
    if (!node) return;

    let textToCopy = '';
    if (node.type === 'object' || node.type === 'array') {
      const fullData = this.engine.parsedResult().data;
      const resolved = getValueByJsonPath(fullData, node.path);
      textToCopy = JSON.stringify(resolved, null, 2);
    } else if (node.type === 'null') {
      textToCopy = 'null';
    } else if (typeof node.value === 'string') {
      textToCopy = node.value;
    } else {
      textToCopy = String(node.value ?? '');
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      this.toast.show(`Copied value of "${node.key}"`, 'success');
    } catch {
      this.toast.show('Failed to copy value to clipboard', 'error');
    }
  }
}

