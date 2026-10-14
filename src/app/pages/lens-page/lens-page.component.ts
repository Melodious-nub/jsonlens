import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LensTab } from '../../core/models/json-lens.model';
import { SeoService } from '../../core/services/seo.service';
import { WorkspaceComponent } from '../../features/workspace/workspace.component';
import { SeoGuideComponent } from '../../shared/components/seo-guide/seo-guide.component';

@Component({
  selector: 'app-lens-page',
  standalone: true,
  imports: [WorkspaceComponent, SeoGuideComponent],
  templateUrl: './lens-page.component.html',
  styleUrl: './lens-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LensPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly seoService = inject(SeoService);

  private readonly routeData = toSignal(this.route.data, {
    initialValue: {} as Record<string, unknown>,
  });

  readonly seoKey = computed<string>(() => {
    const data = this.routeData() as Record<string, unknown>;
    return (data?.['seoKey'] as string) || 'formatter';
  });

  readonly defaultLens = computed<LensTab>(() => {
    const data = this.routeData() as Record<string, unknown>;
    return (data?.['defaultLens'] as LensTab) || 'code';
  });

  constructor() {
    effect(() => {
      const key = this.seoKey();
      this.seoService.updateRoute(key);
    });
  }
}
