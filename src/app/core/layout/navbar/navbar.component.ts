import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { ExportService } from '../../services/export.service';

export interface SupportChannel {
  id: string;
  name: string;
  badge: string;
  accentColor: string;
  accountType: string;
  primaryValue: string;
  primaryLabel: string;
  extraDetails?: { label: string; value: string }[];
  note?: string;
}

export interface CreatorProject {
  title: string;
  description: string;
  stars?: string;
  tag: string;
  url: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly themeService = inject(ThemeService);
  private readonly toastService = inject(ToastService);
  private readonly exportService = inject(ExportService);

  // Active dialog modal state
  readonly activeModal = signal<'about' | 'creator' | 'support' | null>(null);

  // 1-click copy feedback tracking
  readonly copiedKey = signal<string | null>(null);

  // Creator contact form inputs
  readonly contactName = signal<string>('');
  readonly contactEmail = signal<string>('');
  readonly contactSubject = signal<string>('');
  readonly contactMessage = signal<string>('');

  // Support Channels with 1-click copyable details
  readonly supportChannels: SupportChannel[] = [
    {
      id: 'bkash',
      name: 'bKash',
      badge: 'Mobile Banking',
      accentColor: '#e2136e',
      accountType: 'Personal (Send Money)',
      primaryValue: '01700000000',
      primaryLabel: 'bKash Number',
      note: 'Instant fee-free transfer via bKash App',
    },
    {
      id: 'nagad',
      name: 'Nagad',
      badge: 'Mobile Banking',
      accentColor: '#f7941d',
      accountType: 'Personal (Send Money)',
      primaryValue: '01700000000',
      primaryLabel: 'Nagad Number',
      note: 'Instant send money via Nagad App / USSD',
    },
    {
      id: 'rocket',
      name: 'Rocket',
      badge: 'DBBL MFS',
      accentColor: '#8c3494',
      accountType: 'Personal Account',
      primaryValue: '01700000000-0',
      primaryLabel: 'Rocket Account',
      note: 'Dutch-Bangla Bank Mobile Financial Services',
    },
    {
      id: 'brac',
      name: 'BRAC Bank',
      badge: 'Bank Transfer',
      accentColor: '#0054a6',
      accountType: 'Savings Account',
      primaryValue: '150120XXXXXXXXXX',
      primaryLabel: 'Account Number',
      extraDetails: [
        { label: 'Account Name', value: 'Md. Shawon' },
        { label: 'Branch Name', value: 'Gulshan Branch, Dhaka' },
        { label: 'Routing Number', value: '06026XXXX' },
      ],
      note: 'EFTN / NPSB / BEFTN bank transfer',
    },
    {
      id: 'binance',
      name: 'Binance Pay',
      badge: 'Crypto (0% Fee)',
      accentColor: '#f0b90b',
      accountType: 'Binance Pay ID / USDT',
      primaryValue: '827364129',
      primaryLabel: 'Binance Pay ID',
      extraDetails: [
        { label: 'USDT (BEP-20)', value: '0x71C5A8B282d96696F2852277d33bEb4b31a8FB29' },
      ],
      note: 'Instant zero-fee transfer via Binance App',
    },
    {
      id: 'payoneer',
      name: 'Payoneer',
      badge: 'International',
      accentColor: '#ff4800',
      accountType: 'Make a Payment',
      primaryValue: 'shawon.payoneer@gmail.com',
      primaryLabel: 'Payoneer Email',
      note: 'Zero fees between Payoneer accounts worldwide',
    },
  ];

  // Creator open source projects
  readonly creatorProjects: CreatorProject[] = [
    {
      title: 'JsonLens',
      description: 'Zero-latency, client-side JSON engineering workspace & visual AST diff.',
      tag: 'Angular 22 / Monaco / TypeScript',
      url: 'https://github.com/Melodious-nub/jsonlens',
    },
    {
      title: 'AnguUI Primitives',
      description: 'Ultra-lightweight, accessible Angular Signals UI headless primitives.',
      tag: 'Angular Signals / Headless',
      url: 'https://github.com/Melodious-nub',
    },
    {
      title: 'FastDev Tools',
      description: 'Micro developer utilities for encoding, hashing, regex, and tokens.',
      tag: 'Web Platform / Zero-Dependency',
      url: 'https://github.com/Melodious-nub',
    },
  ];

  openModal(type: 'about' | 'creator' | 'support'): void {
    this.activeModal.set(type);
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  onToggleTheme(): void {
    this.themeService.toggleTheme();
  }

  async copyText(text: string, label: string, key: string): Promise<void> {
    const success = await this.exportService.copyToClipboard(text);
    if (success) {
      this.copiedKey.set(key);
      this.toastService.show(`Copied ${label} to clipboard!`, 'success');

      setTimeout(() => {
        if (this.copiedKey() === key) {
          this.copiedKey.set(null);
        }
      }, 2000);
    } else {
      this.toastService.show(`Failed to copy ${label}`, 'error');
    }
  }

  onSendContact(): void {
    const name = this.contactName().trim();
    const email = this.contactEmail().trim();
    const subject = this.contactSubject().trim() || 'Inquiry regarding JsonLens';
    const message = this.contactMessage().trim();

    if (!name || !email || !message) {
      this.toastService.show('Please fill in Name, Email, and Message', 'error');
      return;
    }

    const mailtoUrl = `mailto:shawon.dev@gmail.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(`From: ${name} (${email})\n\n${message}`)}`;

    if (typeof window !== 'undefined') {
      window.open(mailtoUrl, '_blank');
    }

    this.toastService.show('Opening your email client to send message...', 'info');
    this.contactName.set('');
    this.contactEmail.set('');
    this.contactSubject.set('');
    this.contactMessage.set('');
  }
}
