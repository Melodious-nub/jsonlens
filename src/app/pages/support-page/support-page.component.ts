import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface PlannedSupportChannel {
  icon: string;
  title: string;
  badge: string;
  description: string;
  highlights: string[];
}

@Component({
  selector: 'app-support-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './support-page.component.html',
  styleUrl: './support-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportPageComponent {
  readonly plannedChannels: PlannedSupportChannel[] = [
    {
      icon: '☕',
      title: 'Micro-Donations & Fuel Support',
      badge: 'Coming Soon',
      description:
        'Instant, zero-fee direct micro-tips via local and international gateways to fuel ongoing development and keep the tool 100% ad-free.',
      highlights: [
        'bKash / Nagad / Rocket (Local MFS)',
        'Stripe & Buy Me a Coffee (International)',
        'Crypto & Binance Pay (0% Fee USDT)',
      ],
    },
    {
      icon: '💖',
      title: 'GitHub Sponsors & Tiered Recognition',
      badge: 'In Preparation',
      description:
        'Monthly developer sponsorships with prominent placement in the project README, website supporters wall, and backer recognition.',
      highlights: [
        'JsonLens Official Backers Wall',
        'Featured GitHub Sponsor profile badge',
        'Priority voting on upcoming developer tools',
      ],
    },
    {
      icon: '⚡',
      title: 'Feature Bounties & Priority Delivery',
      badge: 'Roadmap Idea',
      description:
        'Directly fund specific features, schema validators, or format converters you need for your daily workflow or engineering team.',
      highlights: [
        'JSON Schema Draft 2020-12 Full Validator',
        'Protobuf & MessagePack Binary Viewers',
        'Offline PWA & Native Desktop Package',
      ],
    },
    {
      icon: '🏢',
      title: 'Enterprise & Team Integrations',
      badge: 'Enterprise Idea',
      description:
        'Custom private on-premise deployments, company-wide internal schema pre-configurations, or tailored developer tooling for engineering organizations.',
      highlights: [
        'Air-Gapped On-Premises Artifacts',
        'Custom Team Schema Pre-Configurations',
        'Direct Consulting & Custom Feature Builds',
      ],
    },
  ];

  readonly guarantees = [
    {
      icon: '🔒',
      title: 'Zero Ads, Zero Telemetry — Forever',
      desc: 'JsonLens will never monetize through advertisements, tracking scripts, or collecting sensitive user payloads.',
    },
    {
      icon: '⚡',
      title: '100% Client-Side Invariant',
      desc: 'All development focuses on edge in-browser algorithms, Web Worker concurrency, and zero server storage.',
    },
    {
      icon: '🌍',
      title: 'Public Open-Source Core',
      desc: 'The tool and its underlying algorithms remain transparent, MIT-friendly, and driven by developer community feedback.',
    },
  ];
}
