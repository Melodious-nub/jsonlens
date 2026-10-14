import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JsonEngineService } from '../../../core/services/json-engine.service';
import { FileSizePipe } from '../../pipes/file-size.pipe';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [FileSizePipe],
  templateUrl: './status-bar.component.html',
  styleUrl: './status-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBarComponent {
  readonly engine = inject(JsonEngineService);
}
