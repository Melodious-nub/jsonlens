import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

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

@Component({
  selector: 'app-support-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './support-page.component.html',
  styleUrl: './support-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportPageComponent {
  private readonly toastService = inject(ToastService);
  private readonly exportService = inject(ExportService);

  readonly copiedKey = signal<string | null>(null);

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
      note: 'EFTN / NPSB / BEFTN instant bank transfer',
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
}
