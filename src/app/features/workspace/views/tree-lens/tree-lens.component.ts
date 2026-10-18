import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TreeNode } from '../../../../core/models/json-lens.model';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { countTreeMatches } from '../../../../shared/utils/json-tree.util';
import { getValueByJsonPath } from '../../../../shared/utils/json-path.util';
import { TreeNodeComponent } from './tree-node.component';
import {
  LucideAngularModule,
  Search,
  FolderTree,
  X,
  AlertCircle,
  Copy,
  Code,
  ChevronRight,
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

  readonly searchIcon = Search;
  readonly treeIcon = FolderTree;
  readonly clearIcon = X;
  readonly alertIcon = AlertCircle;
  readonly copyIcon = Copy;
  readonly codeIcon = Code;
  readonly chevronRightIcon = ChevronRight;

  readonly searchQuery = signal<string>('');
  readonly selectedNode = signal<TreeNode | null>(null);

  readonly treeData = computed(() => this.engine.treeData());
  readonly isValid = computed(() => this.engine.isValid());
  readonly selectedPath = computed(() => this.selectedNode()?.path ?? null);

  readonly matchCount = computed(() => {
    const q = this.searchQuery().trim();
    if (!q) return 0;
    return countTreeMatches(this.treeData(), q);
  });

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch(): void {
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
      this.toast.show(`Copied path: ${node.path}`, 'success');
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

