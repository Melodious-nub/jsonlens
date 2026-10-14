import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { MonacoEditorComponent } from '../../../../shared/components/monaco-wrapper/monaco-editor.component';
import { LucideAngularModule, Copy, Check, FileCode } from 'lucide-angular';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';

@Component({
  selector: 'app-code-lens',
  standalone: true,
  imports: [MonacoEditorComponent, LucideAngularModule, FileSizePipe],
  templateUrl: './code-lens.component.html',
  styleUrl: './code-lens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeLensComponent {
  readonly engine = inject(JsonEngineService);
  private readonly toast = inject(ToastService);

  readonly copyIcon = Copy;
  readonly checkIcon = Check;
  readonly fileCodeIcon = FileCode;

  readonly formattedJson = computed(() => this.engine.parsedResult().formatted);
  readonly lineCount = computed(() => {
    const text = this.formattedJson();
    return text ? text.split('\n').length : 0;
  });

  async copyToClipboard(): Promise<void> {
    const text = this.formattedJson();
    if (!text) {
      this.toast.show('No JSON content to copy', 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.toast.show('Formatted JSON copied to clipboard', 'success');
    } catch {
      this.toast.show('Failed to copy to clipboard', 'error');
    }
  }
}
