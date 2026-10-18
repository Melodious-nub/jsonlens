import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { JsonEngineService } from '../../../core/services/json-engine.service';
import { DiffService } from '../../../core/services/diff.service';
import { TypeGenService } from '../../../core/services/type-gen.service';
import { FileSizePipe } from '../../pipes/file-size.pipe';
import { LensTab } from '../../../core/models/json-lens.model';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [FileSizePipe],
  templateUrl: './status-bar.component.html',
  styleUrl: './status-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBarComponent {
  readonly activeLens = input<LensTab>('code');

  readonly engine = inject(JsonEngineService);
  readonly diff = inject(DiffService);
  readonly typeGen = inject(TypeGenService);

  readonly lineCount = computed(() => {
    const formatted = this.engine.parsedResult().formatted;
    return formatted ? formatted.split('\n').length : 0;
  });

  readonly generatedTypesCode = computed(() => {
    const data = this.engine.parsedResult().data;
    if (!data) return '';
    return this.typeGen.generate(this.typeGen.currentTarget(), data, 'Root');
  });

  readonly generatedTypeLines = computed(() => {
    const code = this.generatedTypesCode();
    return code ? code.split('\n').length : 0;
  });

  readonly generatedTypeBytes = computed(() => {
    const code = this.generatedTypesCode();
    if (!code) return 0;
    return new TextEncoder().encode(code).length;
  });

  readonly typeTargetLabel = computed(() => {
    switch (this.typeGen.currentTarget()) {
      case 'typescript':
        return 'TypeScript';
      case 'zod':
        return 'Zod';
      case 'go':
        return 'Go';
      default:
        return this.typeGen.currentTarget();
    }
  });
}

