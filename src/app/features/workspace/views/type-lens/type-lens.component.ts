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
import { ClickOutsideDirective } from '../../../../shared/directives/click-outside.directive';
import { toPascalCase } from '../../../../shared/utils/type-generators/helpers';
import {
  LucideAngularModule,
  Copy,
  Check,
  Download,
  Code2,
  AlertCircle,
  ChevronDown,
  Save,
} from 'lucide-angular';

export interface TargetLanguageOption {
  readonly id: TypeGenTarget;
  readonly label: string;
  readonly category: string;
  readonly extension: string;
  readonly mimeType: string;
  readonly monacoLanguage: string;
  readonly tag: string;
}

export const TARGET_LANGUAGE_OPTIONS: readonly TargetLanguageOption[] = [
  // Web & JS
  {
    id: 'typescript',
    label: 'TypeScript Interfaces',
    category: 'Web & TypeScript',
    extension: '.ts',
    mimeType: 'text/typescript',
    monacoLanguage: 'typescript',
    tag: 'TS',
  },
  {
    id: 'zod',
    label: 'Zod Schemas',
    category: 'Web & TypeScript',
    extension: '.ts',
    mimeType: 'text/typescript',
    monacoLanguage: 'typescript',
    tag: 'ZOD',
  },
  {
    id: 'javascript',
    label: 'JavaScript (JSDoc)',
    category: 'Web & TypeScript',
    extension: '.js',
    mimeType: 'text/javascript',
    monacoLanguage: 'javascript',
    tag: 'JS',
  },

  // Backend & Cloud
  {
    id: 'python',
    label: 'Python (Pydantic)',
    category: 'Backend & Cloud',
    extension: '.py',
    mimeType: 'text/x-python',
    monacoLanguage: 'python',
    tag: 'PY',
  },
  {
    id: 'go',
    label: 'Go (Structs)',
    category: 'Backend & Cloud',
    extension: '.go',
    mimeType: 'text/x-go',
    monacoLanguage: 'go',
    tag: 'GO',
  },
  {
    id: 'java',
    label: 'Java (Jackson POJO)',
    category: 'Backend & Cloud',
    extension: '.java',
    mimeType: 'text/x-java-source',
    monacoLanguage: 'java',
    tag: 'JAVA',
  },
  {
    id: 'csharp',
    label: 'C# (.NET System.Text)',
    category: 'Backend & Cloud',
    extension: '.cs',
    mimeType: 'text/x-csharp',
    monacoLanguage: 'csharp',
    tag: 'C#',
  },
  {
    id: 'php',
    label: 'PHP 8.2+ (Typed)',
    category: 'Backend & Cloud',
    extension: '.php',
    mimeType: 'application/x-httpd-php',
    monacoLanguage: 'php',
    tag: 'PHP',
  },

  // Mobile & Native
  {
    id: 'kotlin',
    label: 'Kotlin (Data Class)',
    category: 'Mobile & Native',
    extension: '.kt',
    mimeType: 'text/x-kotlin',
    monacoLanguage: 'kotlin',
    tag: 'KT',
  },
  {
    id: 'dart',
    label: 'Dart / Flutter (JSON)',
    category: 'Mobile & Native',
    extension: '.dart',
    mimeType: 'text/x-dart',
    monacoLanguage: 'dart',
    tag: 'DART',
  },
  {
    id: 'swift',
    label: 'Swift (Codable)',
    category: 'Mobile & Native',
    extension: '.swift',
    mimeType: 'text/x-swift',
    monacoLanguage: 'swift',
    tag: 'SWIFT',
  },

  // Systems
  {
    id: 'rust',
    label: 'Rust (Serde Structs)',
    category: 'Systems & Performance',
    extension: '.rs',
    mimeType: 'text/rust',
    monacoLanguage: 'rust',
    tag: 'RS',
  },
];

@Component({
  selector: 'app-type-lens',
  standalone: true,
  imports: [
    MonacoEditorComponent,
    LucideAngularModule,
    ClickOutsideDirective,
  ],
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
  readonly checkIcon = Check;
  readonly downloadIcon = Download;
  readonly saveIcon = Save;
  readonly codeIcon = Code2;
  readonly alertIcon = AlertCircle;
  readonly chevronDownIcon = ChevronDown;

  readonly isDropdownOpen = signal<boolean>(false);
  readonly isDownloadOpen = signal<boolean>(false);
  readonly isCopied = signal<boolean>(false);
  readonly downloadFileName = signal<string>('root');

  readonly rootName = computed<string>(() => {
    const raw = this.downloadFileName().trim();
    if (!raw) return 'Root';
    const ext = this.currentTargetConfig().extension;
    let clean = raw;
    if (clean.toLowerCase().endsWith(ext.toLowerCase())) {
      clean = clean.slice(0, -ext.length);
    }
    return toPascalCase(clean, 'Root');
  });

  readonly languageOptions = TARGET_LANGUAGE_OPTIONS;
  readonly selectedTarget = computed<TypeGenTarget>(() => this.typeGen.currentTarget());

  readonly currentTargetConfig = computed<TargetLanguageOption>(() => {
    const target = this.selectedTarget();
    return (
      this.languageOptions.find((opt) => opt.id === target) ??
      this.languageOptions[0]
    );
  });

  readonly targetLabel = computed(() => this.currentTargetConfig().label);

  readonly isValid = computed(() => this.engine.isValid());
  readonly hasData = computed(() => {
    const data = this.engine.parsedResult().data;
    return data !== null && data !== undefined;
  });

  readonly generatedCode = computed<string>(() => {
    const data = this.engine.parsedResult().data;
    if (data === null || data === undefined) {
      return '';
    }
    const name = this.rootName() || 'Root';
    return this.typeGen.generate(this.selectedTarget(), data, name);
  });

  readonly monacoLanguage = computed<string>(() => {
    return this.currentTargetConfig().monacoLanguage;
  });

  // Grouped language categories for structured dropdown
  readonly languageCategories = computed(() => {
    const map = new Map<string, TargetLanguageOption[]>();
    for (const opt of this.languageOptions) {
      const list = map.get(opt.category) ?? [];
      list.push(opt);
      map.set(opt.category, list);
    }
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  });

  setTarget(target: TypeGenTarget): void {
    this.typeGen.setTarget(target);
    this.isDropdownOpen.set(false);
  }

  toggleDropdown(): void {
    const next = !this.isDropdownOpen();
    this.isDropdownOpen.set(next);
    if (next) {
      this.isDownloadOpen.set(false);
    }
  }

  toggleDownloadMenu(): void {
    const next = !this.isDownloadOpen();
    this.isDownloadOpen.set(next);
    if (next) {
      this.isDropdownOpen.set(false);
      // Autofocus input field and select text
      setTimeout(() => {
        const input = document.getElementById('export-filename-input') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        }
      }, 50);
    }
  }

  onDownloadFileNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.downloadFileName.set(input.value);
  }

  async copyTypes(): Promise<void> {
    const code = this.generatedCode();
    if (!code) {
      this.toast.show('No generated types to copy', 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.isCopied.set(true);
      this.toast.show(
        `Copied ${this.currentTargetConfig().tag} types to clipboard`,
        'success',
      );
      setTimeout(() => this.isCopied.set(false), 1800);
    } catch {
      this.toast.show('Failed to copy types', 'error');
    }
  }

  executeDownload(): void {
    const code = this.generatedCode();
    if (!code) {
      this.toast.show('No types to export', 'info');
      return;
    }

    const config = this.currentTargetConfig();
    let name = this.downloadFileName().trim() || 'root';

    // Strip accidental duplicate extension (e.g., 'user.ts' -> 'user')
    const ext = config.extension;
    if (name.toLowerCase().endsWith(ext.toLowerCase())) {
      name = name.slice(0, -ext.length);
    }
    // Sanitize invalid filesystem characters
    name = name.replace(/[/\\?%*:|"<>]/g, '_').trim();
    if (!name) {
      name = 'root';
    }

    const finalFilename = `${name}${ext}`;
    const success = this.exporter.downloadFile(finalFilename, code, config.mimeType);

    if (success) {
      this.toast.show(`Downloaded ${finalFilename}`, 'success');
      this.isDownloadOpen.set(false);
    } else {
      this.toast.show(`Failed to download ${finalFilename}`, 'error');
    }
  }
}
