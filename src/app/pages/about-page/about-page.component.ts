import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
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
        'Recursively navigate deep hierarchies with automatic type badges, child counts, and 1-click JSONPath query generation (e.g. $.data.users[0].id).',
    },
    {
      icon: '🏷️',
      title: 'Type & Schema Generator',
      description:
        'Infers clean TypeScript interfaces, JSON Schema Draft 7, and Zod validator schemas directly from active payloads.',
    },
    {
      icon: '⚖️',
      title: 'Semantic Visual AST Diff',
      description:
        'Side-by-side structural comparison that categorizes additions, removals, and modifications with color-coded markers and change counters.',
    },
    {
      icon: '🔗',
      title: 'Zero-Server URL Sharing',
      description:
        'Compresses payloads using LZ-String into URL hash fragments (#payload=...). No server logs, preserving 100% end-to-end privacy.',
    },
    {
      icon: '📤',
      title: 'Multi-Format Export',
      description:
        'Export formatted JSON, formatted PDF diagnostic reports, flattened CSV spreadsheets, and TypeScript definition files in 1 click.',
    },
  ];

  readonly faqs = [
    {
      question: 'Is my data transmitted to any remote servers?',
      answer:
        'Never. JsonLens operates 100% client-side inside your browser runtime. Zero bytes of your JSON payloads are ever transmitted, stored, or processed on remote cloud servers.',
    },
    {
      question: 'What file sizes can JsonLens comfortably handle?',
      answer:
        'Thanks to Monaco Editor virtualized viewports and Angular Zoneless change detection, JsonLens smoothly renders multi-megabyte payloads (up to 50MB+) without UI freeze.',
    },
    {
      question: 'How does URL sharing protect my confidential data?',
      answer:
        'Share links store the compressed JSON in the URL fragment (the portion after #). Per HTTP specifications, URL fragments are never sent to web servers in HTTP request headers.',
    },
    {
      question: 'Can I use JsonLens offline or inside a private network?',
      answer:
        'Yes. JsonLens has zero external API dependencies for its core parser, formatter, and visualizer. It functions completely offline and is suitable for air-gapped corporate environments.',
    },
  ];
}
