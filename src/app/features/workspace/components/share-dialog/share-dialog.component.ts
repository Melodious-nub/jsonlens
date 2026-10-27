import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';
import { SharePayloadInfo } from '../../../../core/models/json-lens.model';
import { formatBytes } from '../../../../shared/utils/format.util';
import { ClickOutsideDirective } from '../../../../shared/directives/click-outside.directive';
import {
  LucideAngularModule,
  Share2,
  X,
  Link2,
  Copy,
  Check,
  QrCode,
  Eye,
  Download,
  ShieldCheck,
} from 'lucide-angular';

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [
    LucideAngularModule,
    ClickOutsideDirective,
  ],
  templateUrl: './share-dialog.component.html',
  styleUrl: './share-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareDialogComponent {
  // Signal inputs & two-way models
  readonly isOpen = model<boolean>(false);
  readonly splitPercent = input<number>(50);
  readonly shareData = input<SharePayloadInfo | null>(null);
  readonly isShareCopied = input<boolean>(false);
  readonly isQrPreviewOpen = model<boolean>(false);
  readonly qrCodeDataUrl = input<string | null>(null);

  // Outputs
  readonly closeRequested = output<void>();
  readonly copyRequested = output<void>();
  readonly viewQrRequested = output<void>();
  readonly downloadQrRequested = output<void>();
  readonly closeQrPreviewRequested = output<void>();

  // Icons
  readonly shareIcon = Share2;
  readonly closeIcon = X;
  readonly linkIcon = Link2;
  readonly copyIcon = Copy;
  readonly checkIcon = Check;
  readonly qrCodeIcon = QrCode;
  readonly viewQrIcon = Eye;
  readonly downloadQrIcon = Download;
  readonly shieldIcon = ShieldCheck;

  formatBytes(bytes: number): string {
    return formatBytes(bytes);
  }

  onSelectInput(event: MouseEvent): void {
    const inputEl = event.target as HTMLInputElement | null;
    inputEl?.select();
  }

  onClose(): void {
    this.closeRequested.emit();
    this.isOpen.set(false);
  }

  onCopy(): void {
    this.copyRequested.emit();
  }

  onViewQr(): void {
    this.viewQrRequested.emit();
  }

  onDownloadQr(): void {
    this.downloadQrRequested.emit();
  }

  onCloseQrPreview(): void {
    this.closeQrPreviewRequested.emit();
    this.isQrPreviewOpen.set(false);
  }
}
