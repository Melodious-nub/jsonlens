import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { TypeGenService } from '../../../../core/services/type-gen.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ExportService } from '../../../../core/services/export.service';
import { TypeGenTarget } from '../../../../core/models/json-lens.model';
import { MonacoEditorComponent } from '../../../../shared/components/monaco-wrapper/monaco-editor.component';
import { LucideAngularModule, Copy, Download, Code2, AlertCircle } from 'lucide-angular';

@Component({
  selector: 'app-type-lens',
  standalone: true,
  imports: [MonacoEditorComponent, LucideAngularModule],
  templateUrl: './type-lens.component.html',
  styleUrl: './type-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeLensComponent {
  readonly engine = inject(JsonEngineService);
  readonly typeGen = inject(TypeGenService);
  private readonly toast = inject(ToastService);
  private readonly exporter = inject(ExportService);

  readonly copyIcon = Copy;
  readonly downloadIcon = Download;
  readonly codeIcon = Code2;
  readonly alertIcon = AlertCircle;

  readonly rootName = signal<string>('Root');
  readonly selectedTarget = signal<TypeGenTarget>('typescript');

  readonly isValid = computed(() => this.engine.isValid());

  readonly generatedCode = computed<string>(() => {
    const data = this.engine.parsedResult().data;
    if (!data) {
      return '';
    }
    const name = this.rootName().trim() || 'Root';
    return this.typeGen.generate(this.selectedTarget(), data, name);
  });

  readonly monacoLanguage = computed<string>(() => {
    return this.selectedTarget() === 'go' ? 'go' : 'typescript';
  });

  setTarget(target: TypeGenTarget): void {
    this.selectedTarget.set(target);
    this.typeGen.setTarget(target);
  }

  onRootNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.rootName.set(input.value || 'Root');
  }

  async copyTypes(): Promise<void> {
    const code = this.generatedCode();
    if (!code) {
      this.toast.show('No generated types to copy', 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.toast.show(
        `Copied ${this.selectedTarget().toUpperCase()} types to clipboard`,
        'success',
      );
    } catch {
      this.toast.show('Failed to copy types', 'error');
    }
  }

  downloadTypes(): void {
    const code = this.generatedCode();
    if (!code) {
      this.toast.show('No types to export', 'info');
      return;
    }

    const isGo = this.selectedTarget() === 'go';
    const filename = `${this.rootName().toLowerCase()}.${isGo ? 'go' : 'ts'}`;

    const success = isGo
      ? this.exporter.downloadFile(filename, code, 'text/plain')
      : this.exporter.downloadTs(filename, code);

    if (success) {
      this.toast.show(`Downloaded ${filename}`, 'success');
    }
  }
}
