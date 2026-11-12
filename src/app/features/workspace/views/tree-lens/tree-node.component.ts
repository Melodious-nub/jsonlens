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
import { toStandardJsonPath } from '../../../../shared/utils/json-path.util';
import { LucideAngularModule, ChevronRight, ChevronDown, Copy } from 'lucide-angular';

export interface TreeExpandCommand {
  readonly version: number;
  readonly expanded: boolean;
}

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
  readonly expandCommand = input<TreeExpandCommand | null>(null);
  readonly matchedPaths = input<ReadonlySet<string> | null>(null);

  readonly pathSelected = output<string>();
  readonly nodeSelected = output<TreeNode>();

  private readonly toast = inject(ToastService);

  readonly chevronRight = ChevronRight;
  readonly chevronDown = ChevronDown;
  readonly copyIcon = Copy;

  // Track user manual expansion override per search query & expand/collapse command version
  private readonly manualState = signal<{
    query: string;
    commandVersion: number;
    expanded: boolean;
  } | null>(null);

  // Check if this node has child items
  readonly isExpandable = computed(() => {
    const type = this.node().type;
    return (type === 'object' || type === 'array') && (this.node().children?.length ?? 0) > 0;
  });

  // Highlight key/value matching search query or active JSONPath matches
  readonly isMatch = computed(() => {
    const pathMatches = this.matchedPaths();
    if (pathMatches !== null) {
      return pathMatches.has(toStandardJsonPath(this.node().path));
    }
    const q = this.searchQuery().trim();
    if (!q) return false;
    return isNodeMatch(this.node(), q);
  });

  // Check if any descendant node matches query or JSONPath matches
  readonly hasDescendantMatch = computed(() => {
    const pathMatches = this.matchedPaths();
    if (pathMatches !== null) {
      if (pathMatches.size === 0) return false;
      const selfStd = toStandardJsonPath(this.node().path);
      if (selfStd === '$') return true;
      const dotPrefix = `${selfStd}.`;
      const bracketPrefix = `${selfStd}[`;
      for (const p of pathMatches) {
        if (p.startsWith(dotPrefix) || p.startsWith(bracketPrefix)) {
          return true;
        }
      }
      return false;
    }
    const q = this.searchQuery().trim();
    if (!q) return false;
    return hasMatchingDescendant(this.node(), q);
  });

  // Computed expansion state: auto-expands when matching descendants, respects manual overrides & bulk commands
  readonly isExpanded = computed(() => {
    const q = this.searchQuery().trim();
    const cmd = this.expandCommand();
    const cmdVer = cmd?.version ?? 0;
    const manual = this.manualState();

    if (q) {
      if (manual && manual.query === q && manual.commandVersion >= cmdVer) {
        return manual.expanded;
      }
      return this.isMatch() || this.hasDescendantMatch();
    }

    if (manual && manual.commandVersion >= cmdVer) {
      return manual.expanded;
    }

    if (cmd) {
      if (!cmd.expanded && this.node().path === '$') {
        return true;
      }
      return cmd.expanded;
    }

    return this.defaultExpanded();
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
      this.manualState.set({
        query: this.searchQuery().trim(),
        commandVersion: this.expandCommand()?.version ?? 0,
        expanded: next,
      });
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
      this.toast.show('Copied JSONPath', 'success');
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

