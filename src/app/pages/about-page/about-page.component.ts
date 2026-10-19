import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ChevronDown, Check, Copy, ExternalLink, Download } from 'lucide-angular';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

export interface CreatorProject {
  icon: string;
  title: string;
  badge: string;
  tag: string;
  description: string;
  highlights: string[];
  sourceUrl: string;
  releaseUrl?: string;
  releaseLabel?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export interface ConnectLink {
  label: string;
  url: string;
  color: string;
  iconType: 'linkedin' | 'github' | 'fiverr' | 'gmail';
}

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  private readonly toastService = inject(ToastService);
  private readonly exportService = inject(ExportService);

  readonly isEmailCopied = signal<boolean>(false);
  readonly openFaqs = signal<number[]>([0]); // First FAQ open by default

  // Icons
  readonly chevronDownIcon = ChevronDown;
  readonly checkIcon = Check;
  readonly copyIcon = Copy;
  readonly externalIcon = ExternalLink;
  readonly downloadIcon = Download;

  // Contact form signals
  readonly isSubmitting = signal<boolean>(false);
  readonly contactName = signal<string>('');
  readonly contactEmail = signal<string>('');
  readonly contactSubject = signal<string>('');
  readonly contactMessage = signal<string>('');
  readonly contactHoneypot = signal<string>('');

  readonly creatorName = 'Shawon Talukder';
  readonly creatorRole = 'Software Engineer at Green Delta Insurance PLC';
  readonly creatorEmail = 'shawon.taluckder2@gmail.com';
  readonly creatorAvatarUrl = '/shawon_talukder.jpeg';

  readonly connectLinks: ConnectLink[] = [
    {
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/shawon-taluckder',
      color: '#0A66C2',
      iconType: 'linkedin',
    },
    {
      label: 'GitHub',
      url: 'https://github.com/Melodious-nub',
      color: '#24292e',
      iconType: 'github',
    },
    {
      label: 'Fiverr',
      url: 'https://www.fiverr.com/talukder_shawon/',
      color: '#1DBF73',
      iconType: 'fiverr',
    },
    {
      label: 'Email',
      url: 'mailto:shawon.taluckder2@gmail.com',
      color: '#EA4335',
      iconType: 'gmail',
    },
  ];

  readonly features = [
    {
      icon: '✨',
      title: 'One-Click Syntax Auto-Repair',
      description:
        'Instantly fixes unquoted keys, single quotes, trailing commas, Python booleans (True/False/None), and unescaped quotes with intelligent AST recovery.',
    },
    {
      icon: '🌳',
      title: 'Interactive AST Tree & JSONPath',
      description:
        'Recursively navigate deep hierarchies with automatic type badges, child counts, search auto-expansion, and 1-click JSONPath queries (e.g. $.users[0].id).',
    },
    {
      icon: '🏷️',
      title: '12-Language Type & Schema Generator',
      description:
        'Synthesizes production-ready models in TypeScript, Zod, Go, Python (TypedDict), Rust, Kotlin, Java, C#, Swift, Dart, PHP, and JSON Schema Draft 7.',
    },
    {
      icon: '⚖️',
      title: 'Semantic Visual AST Diff',
      description:
        'Side-by-side structural comparison that categorizes additions, removals, and modifications with color-coded markers, change counters, and swap controls.',
    },
    {
      icon: '🔗',
      title: 'Zero-Server URL Sharing & QR Codes',
      description:
        'Compresses payloads using LZ-String into URL hash fragments (#d=...). Never touches a server. Includes zoomable interactive QR code preview and 512px PNG download.',
    },
    {
      icon: '📤',
      title: 'Multi-Format Export & Local Persistence',
      description:
        'Export formatted JSON, PDF diagnostic reports, flattened CSV spreadsheets, and TypeScript definition files in 1 click. Work auto-persists in local storage.',
    },
  ];

  readonly faqs: FaqItem[] = [
    {
      category: 'Privacy & Security',
      question: 'How does JsonLens guarantee 100% client-side privacy?',
      answer:
        'Every single operation—parsing, formatting, syntax auto-repair, tree AST construction, 12-language type generation, and side-by-side AST diffing—runs strictly inside your local browser memory sandbox. Not a single byte of your confidential payloads, bearer tokens, customer records, or database dumps is ever transmitted to remote cloud servers or collected by analytics.',
    },
    {
      category: 'Privacy & Security',
      question: 'How does Zero-Server URL Sharing (#d=...) work without storing my data?',
      answer:
        'When you click "Share", JsonLens pre-minifies and compresses your JSON into the URL hash fragment (#d=...) using LZ-String compression. Per RFC HTTP specifications, web browsers never transmit URL hash fragments (#...) to web servers in HTTP request headers. The URL can be sent through your own private channels or scanned via the integrated QR code previewer with zero database storage.',
    },
    {
      category: 'Performance',
      question: 'What payload sizes can JsonLens comfortably handle?',
      answer:
        'Thanks to Monaco Editor GPU-accelerated virtualized viewports, CSS content-visibility: auto DOM row virtualization, and our multi-task background Web Worker, JsonLens renders, repairs, and diffs multi-megabyte JSON payloads (up to 50MB+) smoothly at 60/120 FPS without UI freezes or frame drops.',
    },
    {
      category: 'Engine & Tooling',
      question: 'How does One-Click Syntax Auto-Repair resolve broken JSON?',
      answer:
        'JsonLens integrates a fault-tolerant AST recovery engine that automatically diagnoses and resolves common syntax errors: unquoted object keys, single quotes converted to RFC 8259 double quotes, trailing commas in objects and arrays, Python/JavaScript literals (True, False, None, undefined), and unescaped quotes or unbalanced braces.',
    },
    {
      category: 'Engine & Tooling',
      question: 'Which programming languages are supported in the Type Generator?',
      answer:
        'JsonLens includes a built-in Type Generator Lens supporting 12 target languages and schema formats: TypeScript (interfaces & types), Zod schemas, Python (TypedDict), Java (Jackson POJOs), Kotlin (data classes), Go (structs with json tags), Rust (Serde structs), C# (System.Text.Json), Swift (Codable structs), Dart, PHP, and JSON Schema (Draft 7).',
    },
    {
      category: 'Deployment',
      question: 'Can I use JsonLens offline or inside air-gapped corporate environments?',
      answer:
        'Yes. JsonLens has zero external API runtime dependencies for its parser, repair engine, visualizers, or generators. Once loaded in your browser, it operates completely offline and is suitable for strict air-gapped corporate intranets and security-cleared development machines.',
    },
    {
      category: 'Open Source',
      question: 'Is JsonLens free and open-source?',
      answer:
        'Yes, JsonLens is 100% free, licensed under the MIT License, and completely free of third-party advertisements or trackers. The complete source code is public on GitHub.',
    },
  ];

  readonly creatorProjects: CreatorProject[] = [
    {
      icon: '💸',
      title: 'FundFlow',
      badge: 'Android App',
      tag: 'Android / Kotlin / Jetpack Compose / Offline-First',
      description:
        'A modern, privacy-focused and offline-first personal finance manager for Android, designed around flexible budget cycles instead of rigid calendar months.',
      highlights: [
        'Custom budget cycles & flexible periods',
        'Spending analytics and visual insights',
        'Offline-first architecture with zero ads or tracking',
        'Local backup & optional Google Drive sync',
        'Light, Dark, and System theme support',
        'Smart in-app updates directly from GitHub Releases',
        'Android 8.0+ support',
      ],
      sourceUrl: 'https://github.com/Melodious-nub/FundFlow',
      releaseUrl: 'https://github.com/Melodious-nub/FundFlow/releases/latest',
      releaseLabel: 'Download APK',
    },
    {
      icon: '🔒',
      title: 'ScreenLocker',
      badge: 'Android Utility',
      tag: 'Android / Kotlin / Accessibility API',
      description:
        'A lightweight and privacy-focused Android application that lets users lock their device screen with a single tap, keeping the experience minimal and offline.',
      highlights: [
        'Native Android application built with Kotlin',
        'Android Accessibility API integration',
        'Zero internet access required',
        'No ads, no analytics, no background tracking',
        'Privacy-focused and ultra-minimal by design',
        'Android 9.0+ support',
      ],
      sourceUrl: 'https://github.com/Melodious-nub/screenlocker',
      releaseUrl: 'https://github.com/Melodious-nub/screenlocker/releases/latest',
      releaseLabel: 'Download APK',
    },
    {
      icon: '⚡',
      title: 'JsonLens',
      badge: 'Web App',
      tag: 'Angular 22 / Monaco / Web Workers / TypeScript',
      description:
        'Zero-latency, 100% in-browser JSON developer suite, visual AST diffing, syntax auto-repair, and 12-language type synthesis.',
      highlights: [
        '100% Client-side sandbox with zero telemetry',
        'Monaco Editor GPU virtualization & Web Workers',
        'Interactive AST Tree & 1-click JSONPath queries',
        '12-language type generation (Zod, Go, Rust, etc.)',
        'Zero-server compressed URL sharing & QR code lightbox',
        'Local storage persistence across browser reloads',
      ],
      sourceUrl: 'https://github.com/Melodious-nub/jsonlens',
      releaseUrl: 'https://github.com/Melodious-nub/jsonlens/releases/latest',
      releaseLabel: 'Latest Release',
    },
  ];

  toggleFaq(index: number): void {
    this.openFaqs.update((indices) =>
      indices.includes(index)
        ? indices.filter((i) => i !== index)
        : [...indices, index]
    );
  }

  isFaqOpen(index: number): boolean {
    return this.openFaqs().includes(index);
  }

  onInputChange(field: 'name' | 'email' | 'subject' | 'message' | 'honey', event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    const value = target?.value ?? '';
    switch (field) {
      case 'name':
        this.contactName.set(value);
        break;
      case 'email':
        this.contactEmail.set(value);
        break;
      case 'subject':
        this.contactSubject.set(value);
        break;
      case 'message':
        this.contactMessage.set(value);
        break;
      case 'honey':
        this.contactHoneypot.set(value);
        break;
    }
  }

  async onCopyEmail(): Promise<void> {
    const email = this.creatorEmail;
    const success = await this.exportService.copyToClipboard(email);
    if (success) {
      this.isEmailCopied.set(true);
      this.toastService.show('Copied creator email to clipboard!', 'success');
      setTimeout(() => this.isEmailCopied.set(false), 2000);
    } else {
      this.toastService.show('Failed to copy email', 'error');
    }
  }

  async onSendContact(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const name = this.contactName().trim();
    const email = this.contactEmail().trim();
    const subject = this.contactSubject().trim() || 'Inquiry regarding JsonLens';
    const message = this.contactMessage().trim();

    if (!name || !email || !message) {
      this.toastService.show('Please fill in Name, Email, and Message', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.toastService.show('Please enter a valid email address', 'error');
      return;
    }

    // Bot honeypot check: silently drop if a bot filled the hidden honeypot
    if (this.contactHoneypot().trim()) {
      this.contactName.set('');
      this.contactEmail.set('');
      this.contactSubject.set('');
      this.contactMessage.set('');
      this.contactHoneypot.set('');
      this.toastService.show('Message delivered directly to Shawon!', 'success');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(this.creatorEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          _subject: `[JsonLens Contact] ${subject}`,
          message,
          _captcha: 'false',
          _template: 'table',
        }),
      });

      const result = (await response.json()) as { success?: string | boolean; message?: string };

      if (response.ok && (result.success === 'true' || result.success === true)) {
        this.toastService.show(
          'Message delivered directly to Shawon! Thank you for reaching out.',
          'success'
        );
        this.contactName.set('');
        this.contactEmail.set('');
        this.contactSubject.set('');
        this.contactMessage.set('');
      } else {
        throw new Error(result.message || 'Form submission failed');
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      this.toastService.show(
        'Online delivery failed. Opening email client fallback...',
        'error'
      );
      // Fallback to mailto so the user never loses their message
      const mailtoUrl = `mailto:${this.creatorEmail}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(`From: ${name} (${email})\n\n${message}`)}`;
      if (typeof window !== 'undefined') {
        window.open(mailtoUrl, '_blank');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
