import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

export interface CreatorProject {
  title: string;
  description: string;
  tag: string;
  url: string;
}

@Component({
  selector: 'app-creator-page',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './creator-page.component.html',
  styleUrl: './creator-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatorPageComponent {
  private readonly toastService = inject(ToastService);
  private readonly exportService = inject(ExportService);

  readonly isEmailCopied = signal<boolean>(false);

  // Form input signals
  readonly contactName = signal<string>('');
  readonly contactEmail = signal<string>('');
  readonly contactSubject = signal<string>('');
  readonly contactMessage = signal<string>('');

  readonly creatorProjects: CreatorProject[] = [
    {
      title: 'JsonLens',
      description: 'Zero-latency, 100% in-browser JSON engineering workspace & visual AST diff.',
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

  async onCopyEmail(): Promise<void> {
    const email = 'shawon.dev@gmail.com';
    const success = await this.exportService.copyToClipboard(email);
    if (success) {
      this.isEmailCopied.set(true);
      this.toastService.show('Copied creator email to clipboard!', 'success');
      setTimeout(() => this.isEmailCopied.set(false), 2000);
    } else {
      this.toastService.show('Failed to copy email', 'error');
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
