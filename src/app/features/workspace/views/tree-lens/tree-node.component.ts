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

  readonly pathSelected = output<string>();

  private readonly toast = inject(ToastService);

  readonly chevronRight = ChevronRight;
  readonly chevronDown = ChevronDown;
  readonly copyIcon = Copy;

  // Track expanded state locally with initial value from input
  readonly isExpanded = signal<boolean>(true);

  // Check if this node has child items
  readonly isExpandable = computed(() => {
    const type = this.node().type;
    return (type === 'object' || type === 'array') && (this.node().children?.length ?? 0) > 0;
  });

  // Highlight key/value matching search query
  readonly isMatch = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return false;
    const n = this.node();
    const keyMatch = n.key.toLowerCase().includes(q);
    const valMatch = n.value !== undefined && String(n.value).toLowerCase().includes(q);
    const pathMatch = n.path.toLowerCase().includes(q);
    return keyMatch || valMatch || pathMatch;
  });

  toggleExpanded(): void {
    if (this.isExpandable()) {
      this.isExpanded.update((v) => !v);
    }
  }

  async copyPath(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const p = this.node().path;
    try {
      await navigator.clipboard.writeText(p);
      this.toast.show(`Copied path: ${p}`, 'success');
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
