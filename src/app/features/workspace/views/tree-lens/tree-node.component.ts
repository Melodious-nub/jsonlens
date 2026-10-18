import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TreeNode } from '../../../../core/models/json-lens.model';
import { ToastService } from '../../../../core/services/toast.service';
import {
  hasMatchingDescendant,
  isNodeMatch,
} from '../../../../shared/utils/json-tree.util';
import { LucideAngularModule, ChevronRight, ChevronDown, Copy } from 'lucide-angular';

@Component({
  selector: 'app-tree-node',
  standalone: true,
  imports: [LucideAngularModule, forwardRef(() => TreeNodeComponent)],
  templateUrl: './tree-node.component.html',
  styleUrl: './tree-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeNodeComponent {
  readonly node = input.required<TreeNode>();
  readonly searchQuery = input<string>('');
  readonly defaultExpanded = input<boolean>(true);
  readonly selectedPath = input<string | null>(null);

  readonly pathSelected = output<string>();
  readonly nodeSelected = output<TreeNode>();

  private readonly toast = inject(ToastService);

  readonly chevronRight = ChevronRight;
  readonly chevronDown = ChevronDown;
  readonly copyIcon = Copy;

  // Track user manual expansion override per search query
  private readonly manualState = signal<{ query: string; expanded: boolean } | null>(null);

  // Check if this node has child items
  readonly isExpandable = computed(() => {
    const type = this.node().type;
    return (type === 'object' || type === 'array') && (this.node().children?.length ?? 0) > 0;
  });

  // Highlight key/value matching search query
  readonly isMatch = computed(() => {
    const q = this.searchQuery().trim();
    if (!q) return false;
    return isNodeMatch(this.node(), q);
  });

  // Check if any descendant node matches query
  readonly hasDescendantMatch = computed(() => {
    const q = this.searchQuery().trim();
    if (!q) return false;
    return hasMatchingDescendant(this.node(), q);
  });

  // Computed expansion state: auto-expands when matching descendants or query match
  readonly isExpanded = computed(() => {
    const q = this.searchQuery().trim();
    const manual = this.manualState();
    if (manual && manual.query === q) {
      return manual.expanded;
    }
    if (q) {
      return this.isMatch() || this.hasDescendantMatch();
    }
    return manual ? manual.expanded : this.defaultExpanded();
  });

  // Active selection state
  readonly isSelected = computed(() => {
    const selected = this.selectedPath();
    return selected !== null && selected === this.node().path;
  });

  toggleExpanded(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.isExpandable()) {
      const next = !this.isExpanded();
      this.manualState.set({ query: this.searchQuery().trim(), expanded: next });
    }
  }

  onRowClick(event: MouseEvent): void {
    event.stopPropagation();
    this.nodeSelected.emit(this.node());
    this.pathSelected.emit(this.node().path);
  }

  onRowDblClick(event: MouseEvent): void {
    event.stopPropagation();
    this.toggleExpanded();
  }

  async copyPath(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const p = this.node().path;
    try {
      await navigator.clipboard.writeText(p);
      this.toast.show(`Copied path: ${p}`, 'success');
      this.nodeSelected.emit(this.node());
      this.pathSelected.emit(p);
    } catch {
      this.toast.show('Failed to copy JSONPath', 'error');
    }
  }

  formatValue(val: unknown): string {
    if (typeof val === 'string') {
      return `"${val}"`;
    }
    return String(val);
  }
}

