import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { SEO_ROUTES_DATA, SeoGuideContent } from '../../../core/models/seo-content.model';
import { LucideAngularModule, HelpCircle, Sparkles, CheckCircle2 } from 'lucide-angular';

@Component({
  selector: 'app-seo-guide',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './seo-guide.component.html',
  styleUrl: './seo-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoGuideComponent {
  readonly topic = input<string>('formatter');

  readonly helpIcon = HelpCircle;
  readonly sparkleIcon = Sparkles;
  readonly checkIcon = CheckCircle2;

  readonly content = computed<SeoGuideContent>(() => {
    return SEO_ROUTES_DATA[this.topic()] ?? SEO_ROUTES_DATA['formatter'];
  });
}
