import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TreeNodeComponent } from './tree-node.component';
import { LucideAngularModule, Search, FolderTree, X, AlertCircle } from 'lucide-angular';

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

  readonly searchQuery = signal<string>('');

  readonly treeData = computed(() => this.engine.treeData());
  readonly isValid = computed(() => this.engine.isValid());
  readonly totalKeys = computed(() => this.engine.jsonStats().keyCount);
  readonly maxDepth = computed(() => this.engine.jsonStats().maxDepth);

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  onPathSelected(path: string): void {
    this.toast.show(`Selected path: ${path}`, 'info');
  }
}
