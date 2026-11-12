import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import {
  SharePayloadInfo,
  ShareTabMode,
  ShortSharePayloadInfo,
} from '../../../../core/models/json-lens.model';
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
  Lock,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  Zap,
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
  readonly activeTab = model<ShareTabMode>('direct');
  readonly splitPercent = input<number>(50);
  readonly shareData = input<SharePayloadInfo | null>(null);
  readonly shortShareData = input<ShortSharePayloadInfo | null>(null);
  readonly isShortLoading = input<boolean>(false);
  readonly shortError = input<string | null>(null);
  readonly isShareCopied = input<boolean>(false);
  readonly isQrPreviewOpen = model<boolean>(false);
  readonly qrCodeDataUrl = input<string | null>(null);

  // Outputs
  readonly closeRequested = output<void>();
  readonly copyRequested = output<void>();
  readonly retryShortRequested = output<void>();
  readonly viewQrRequested = output<void>();
  readonly downloadQrRequested = output<void>();
  readonly closeQrPreviewRequested = output<void>();

  // Derived active link metrics
  readonly activePayload = computed<SharePayloadInfo | null>(() =>
    this.activeTab() === 'short' ? this.shortShareData() : this.shareData(),
  );

  readonly hasActiveUrl = computed<boolean>(() => {
    if (this.activeTab() === 'short') {
      return !this.isShortLoading() && !this.shortError() && !!this.shortShareData()?.url;
    }
    return !!this.shareData()?.url;
  });

  readonly expiryLabel = computed<string>(() => {
    const shortData = this.shortShareData();
    if (!shortData?.expiresAt) {
      return '30d E2EE';
    }
    const diffMs = shortData.expiresAt * 1000 - Date.now();
    const days = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
    return `${days}d E2EE`;
  });

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
  readonly lockIcon = Lock;
  readonly retryIcon = RefreshCw;
  readonly loaderIcon = LoaderCircle;
  readonly alertIcon = AlertCircle;
  readonly zapIcon = Zap;

  formatBytes(bytes: number): string {
    return formatBytes(bytes);
  }

  onSelectTab(tab: ShareTabMode): void {
    if (this.activeTab() !== tab) {
      this.activeTab.set(tab);
    }
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

  onRetryShort(): void {
    this.retryShortRequested.emit();
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
