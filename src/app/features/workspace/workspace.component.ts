import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { ExportFormat, LensTab, SharePayloadInfo } from '../../core/models/json-lens.model';
import { JsonEngineService } from '../../core/services/json-engine.service';
import { DiffService } from '../../core/services/diff.service';
import { ToastService } from '../../core/services/toast.service';
import { StorageService } from '../../core/services/storage.service';
import { ExportService } from '../../core/services/export.service';
import { UrlShareService } from '../../core/services/url-share.service';
import { formatBytes } from '../../shared/utils/format.util';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { MonacoEditorComponent } from '../../shared/components/monaco-wrapper/monaco-editor.component';
import { DropZoneDirective } from '../../shared/directives/drop-zone.directive';
import { ClickOutsideDirective } from '../../shared/directives/click-outside.directive';
import { ImagePreviewerComponent } from '../../shared/components/image-previewer/image-previewer.component';
import { CodeLensComponent } from './views/code-lens/code-lens.component';
import { TreeLensComponent } from './views/tree-lens/tree-lens.component';
import { TypeLensComponent } from './views/type-lens/type-lens.component';
import { DiffLensComponent } from './views/diff-lens/diff-lens.component';
import {
  LucideAngularModule,
  Code2,
  FolderTree,
  FileCode,
  GitCompare,
  Upload,
  RotateCcw,
  AlignLeft,
  Minimize2,
  Wand2,
  FolderOpen,
  Sparkles,
  Download,
  Share2,
  Trash2,
  Maximize2,
  Columns2,
  QrCode,
  Copy,
  Check,
  X,
  ShieldCheck,
  Link2,
  Eye,
} from 'lucide-angular';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    StatusBarComponent,
    MonacoEditorComponent,
    DropZoneDirective,
    ClickOutsideDirective,
    CodeLensComponent,
    TreeLensComponent,
    TypeLensComponent,
    DiffLensComponent,
    LucideAngularModule,
    ImagePreviewerComponent,
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent {
  readonly engine = inject(JsonEngineService);
  readonly diff = inject(DiffService);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageService);
  private readonly exportService = inject(ExportService);
  private readonly urlShareService = inject(UrlShareService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly destroyRef = inject(DestroyRef);

  // Icons
  readonly codeIcon = FileCode;
  readonly treeIcon = FolderTree;
  readonly typeIcon = Code2;
  readonly diffIcon = GitCompare;
  readonly uploadIcon = Upload;
  readonly resetIcon = RotateCcw;
  readonly formatIcon = AlignLeft;
  readonly minifyIcon = Minimize2;
  readonly fixIcon = Wand2;
  readonly folderOpenIcon = FolderOpen;
  readonly sparklesIcon = Sparkles;
  readonly exportIcon = Download;
  readonly shareIcon = Share2;
  readonly trashIcon = Trash2;
  readonly maximizeIcon = Maximize2;
  readonly minimizeFullscreenIcon = Minimize2;
  readonly centerSplitIcon = Columns2;
  readonly qrCodeIcon = QrCode;
  readonly copyIcon = Copy;
  readonly checkIcon = Check;
  readonly closeIcon = X;
  readonly shieldIcon = ShieldCheck;
  readonly linkIcon = Link2;
  readonly downloadQrIcon = Download;
  readonly viewQrIcon = Eye;

  // Inputs & State
  readonly defaultLens = input<LensTab>('code');
  readonly activeLens = signal<LensTab>('code');
  readonly splitPercent = signal<number>(50); // percentage 20 to 80
  readonly isSplitCentered = computed(() => this.splitPercent() === 50);
  readonly isDragging = signal<boolean>(false);
  readonly isExportMenuOpen = signal<boolean>(false);
  readonly isFullscreen = signal<boolean>(false);

  // 100% Client-Side Share & Mobile QR Code State
  readonly isShareMenuOpen = signal<boolean>(false);
  readonly isQrPreviewOpen = signal<boolean>(false);
  readonly showQrCode = computed(() => this.isQrPreviewOpen());
  readonly isShareCopied = signal<boolean>(false);
  readonly shareData = signal<SharePayloadInfo | null>(null);
  readonly qrCodeDataUrl = signal<string | null>(null);
  readonly qrCodePngUrl = signal<string | null>(null);
  readonly qrTooLarge = signal<boolean>(false);
  readonly isGeneratingQr = signal<boolean>(false);

  // Active Pane State (for separate Ctrl+F input vs output editor search)
  readonly activePane = signal<'input' | 'output'>('input');

  // References
  readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('panelsContainer');
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly inputEditor = viewChild<MonacoEditorComponent>('inputEditor');
  readonly codeLens = viewChild<CodeLensComponent>('codeLens');
  readonly treeLens = viewChild<TreeLensComponent>('treeLens');
  readonly typeLens = viewChild<TypeLensComponent>('typeLens');

  private moveListener: ((e: PointerEvent) => void) | null = null;
  private upListener: ((e: PointerEvent) => void) | null = null;
  private cachedRect: DOMRect | null = null;
  private cachedLowerBound = 25;
  private cachedUpperBound = 75;
  private lastClientX = 0;
  private rafId: number | null = null;

  constructor() {
    if (this.isBrowser) {
      const savedSplit = this.storage.getItem<number>('jsonlens_split_percent', 50);
      this.splitPercent.set(savedSplit);

      const onKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        const isAlt = e.altKey && !e.ctrlKey && !e.metaKey;
        const isCtrlOrMeta = (e.ctrlKey || e.metaKey) && !e.altKey;

        // 1. Alt + F (or Shift + Alt + F) -> Format JSON
        if ((isAlt && key === 'f') || (e.altKey && e.shiftKey && key === 'f')) {
          e.preventDefault();
          this.onFormat();
          return;
        }

        // 2. Alt + M -> Minify JSON
        if (isAlt && key === 'm') {
          e.preventDefault();
          this.onMinify();
          return;
        }

        // 3. Alt + R -> Auto-Fix Broken JSON
        if (isAlt && key === 'r') {
          e.preventDefault();
          this.onAutoRepair();
          return;
        }

        // 4. Ctrl + F / Cmd + F -> Find / Filter
        if (isCtrlOrMeta && key === 'f') {
          e.preventDefault();
          this.onTriggerFind();
          return;
        }

        // 5. Escape -> Priority dismiss
        if (e.key === 'Escape') {
          if (this.isQrPreviewOpen()) {
            this.closeQrPreview();
          } else if (this.isShareMenuOpen()) {
            this.closeShareMenu();
          } else {
            const inputHasFind = this.inputEditor()?.isFindWidgetVisible();
            const codeHasFind = this.codeLens()?.isFindWidgetVisible();
            const typeHasFind = this.typeLens()?.isFindWidgetVisible();

            if (inputHasFind || codeHasFind || typeHasFind) {
              this.inputEditor()?.closeFindWidget();
              this.codeLens()?.closeFindWidget();
              this.typeLens()?.closeFindWidget();
            } else if (this.isFullscreen()) {
              this.toggleFullscreen();
            }
          }
        }
      };

      window.addEventListener('keydown', onKeyDown, true);
      this.destroyRef.onDestroy(() => window.removeEventListener('keydown', onKeyDown, true));
    }

    effect(() => {
      const def = this.defaultLens();
      if (def !== 'code') {
        this.activeLens.set(def);
      } else if (this.isBrowser) {
        const savedLens = this.storage.getItem<LensTab>('jsonlens_lens_tab', 'code');
        this.activeLens.set(savedLens);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.cleanupPointerListeners();
    });
  }

  setActivePane(pane: 'input' | 'output'): void {
    if (this.activePane() !== pane) {
      this.activePane.set(pane);
    }
  }

  setLens(lens: LensTab): void {
    this.activePane.set('output');
    this.activeLens.set(lens);
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_lens_tab', lens);
    }
  }

  onFileDropped(content: string): void {
    this.engine.setInput(content);
    this.toast.show('JSON file loaded into editor', 'success');
  }

  onFormat(): void {
    if (!this.engine.isValid()) {
      this.toast.show('Cannot format invalid JSON. Try Auto-Fix first.', 'error');
      return;
    }
    this.engine.format();
    this.toast.show('Formatted successfully', 'success');
  }

  onMinify(): void {
    if (!this.engine.isValid()) {
      this.toast.show('Cannot minify invalid JSON. Try Auto-Fix first.', 'error');
      return;
    }
    this.engine.minify();
    this.toast.show('Minified to single-line JSON', 'success');
  }

  onAutoRepair(): void {
    const repaired = this.engine.autoRepair();
    if (repaired) {
      this.toast.show('JSON syntax automatically repaired!', 'success');
    } else {
      if (this.engine.isValid()) {
        this.toast.show('JSON is already valid, no repairs needed.', 'info');
      } else {
        this.toast.show('Could not automatically repair syntax error.', 'error');
      }
    }
  }

  onTriggerFind(): void {
    if (!this.isBrowser) return;

    let targetPane = this.activePane();
    const active = typeof document !== 'undefined' ? document.activeElement : null;

    if (active) {
      const outputPane = document.querySelector('.workspace__pane--output');
      const inputPane = document.querySelector('.workspace__pane--input');
      if (outputPane?.contains(active)) {
        targetPane = 'output';
        this.activePane.set('output');
      } else if (inputPane?.contains(active)) {
        targetPane = 'input';
        this.activePane.set('input');
      }
    }

    const lens = this.activeLens();

    if (targetPane === 'output') {
      // Close input editor find widget so searches remain strictly separate
      if (this.inputEditor()?.isFindWidgetVisible()) {
        this.inputEditor()?.closeFindWidget();
      }

      if (lens === 'code') {
        this.codeLens()?.triggerFind();
      } else if (lens === 'type') {
        this.typeLens()?.triggerFind();
      } else if (lens === 'tree') {
        this.treeLens()?.focusSearch();
      }
    } else {
      // Close output editor find widgets so searches remain strictly separate
      if (this.codeLens()?.isFindWidgetVisible()) {
        this.codeLens()?.closeFindWidget();
      }
      if (this.typeLens()?.isFindWidgetVisible()) {
        this.typeLens()?.closeFindWidget();
      }

      this.inputEditor()?.triggerFind();
    }
  }

  toggleExportMenu(): void {
    this.isExportMenuOpen.update((v) => !v);
  }

  onTriggerFileInput(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.engine.setInput(reader.result);
        this.toast.show(`Loaded ${file.name}`, 'success');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  onLoadSample(): void {
    this.engine.loadSample();
    this.diff.loadSample();
    this.toast.show('Loaded sample JSON', 'info');
  }

  onClear(): void {
    this.engine.clear();
    if (this.diff.isSampleActive()) {
      this.diff.clearSecondary();
    }
    this.toast.show('Cleared editor', 'info');
  }

  async onToggleShare(): Promise<void> {
    if (this.isShareMenuOpen()) {
      this.closeShareMenu();
      return;
    }

    const json = this.engine.rawInput();
    if (!json || json.trim() === '') {
      this.toast.show('Enter JSON before generating a share link', 'info');
      return;
    }

    const payload = this.urlShareService.createSharePayload(json);
    this.shareData.set(payload);
    this.isShareCopied.set(false);
    this.isShareMenuOpen.set(true);
    this.isExportMenuOpen.set(false);

    if (this.showQrCode()) {
      await this.generateQrForPayload(payload.url);
    }
  }

  closeShareMenu(): void {
    this.isShareMenuOpen.set(false);
  }

  async copyShareUrl(): Promise<void> {
    const data = this.shareData();
    if (!data || !data.url) return;

    const success = await this.exportService.copyToClipboard(data.url);
    if (success) {
      this.isShareCopied.set(true);
      this.toast.show('Shareable link copied to clipboard!', 'success');
      setTimeout(() => this.isShareCopied.set(false), 2500);
    } else {
      this.toast.show('Failed to copy share link', 'error');
    }
  }

  async toggleQrCode(): Promise<void> {
    if (this.isQrPreviewOpen()) {
      this.closeQrPreview();
    } else {
      await this.onViewQr();
    }
  }

  async onViewQr(): Promise<void> {
    this.isQrPreviewOpen.set(true);
    if (!this.qrCodeDataUrl()) {
      const data = this.shareData();
      if (data?.url) {
        await this.generateQrForPayload(data.url);
      }
    }
  }

  closeQrPreview(): void {
    this.isQrPreviewOpen.set(false);
  }

  private async generateQrForPayload(url: string): Promise<void> {
    this.isGeneratingQr.set(true);
    try {
      const svgUrl = await this.urlShareService.generateQrCodeDataUrl(url);
      this.qrCodeDataUrl.set(svgUrl);
      const pngUrl = await this.urlShareService.generateQrCodePngDataUrl(url, 512);
      this.qrCodePngUrl.set(pngUrl);
      this.qrTooLarge.set(false);
    } catch {
      this.qrCodeDataUrl.set(null);
      this.qrCodePngUrl.set(null);
      this.qrTooLarge.set(true);
    } finally {
      this.isGeneratingQr.set(false);
    }
  }

  async downloadQrImage(): Promise<void> {
    let png = this.qrCodePngUrl();
    if (!png) {
      const data = this.shareData();
      if (data?.url) {
        await this.generateQrForPayload(data.url);
        png = this.qrCodePngUrl();
      }
    }
    if (!png) {
      this.toast.show('QR code image not ready yet', 'info');
      return;
    }
    this.urlShareService.downloadQrCodeImage(png, 'jsonlens-share-qr.png');
    this.toast.show('Downloaded QR Code image (PNG)', 'success');
  }

  onSelectInput(event: MouseEvent): void {
    const input = event.target as HTMLInputElement | null;
    input?.select();
  }

  formatBytes(bytes: number): string {
    return formatBytes(bytes);
  }

  onShare(): void {
    this.onToggleShare();
  }


  async onExport(format: ExportFormat): Promise<void> {
    const raw = this.engine.rawInput();
    const parsed = this.engine.parsedResult();

    if (!raw.trim()) {
      this.toast.show('No JSON content to export', 'info');
      return;
    }

    switch (format) {
      case 'json':
        this.exportService.downloadJson('document.json', parsed.formatted || raw);
        this.toast.show('Downloaded document.json', 'success');
        break;
      case 'pdf':
        this.toast.show('Generating PDF report...', 'info');
        await this.exportService.downloadPdf(
          'jsonlens-report.pdf',
          parsed.formatted || raw,
          this.engine.jsonStats(),
        );
        this.toast.show('Downloaded jsonlens-report.pdf', 'success');
        break;
      case 'csv':
        if (!parsed.data) {
          this.toast.show('Cannot export invalid JSON to CSV', 'error');
          return;
        }
        this.exportService.downloadCsv('data.csv', parsed.data);
        this.toast.show('Downloaded data.csv', 'success');
        break;
      case 'ts':
        break;
    }

    this.isExportMenuOpen.set(false);
  }

  toggleFullscreen(): void {
    const next = !this.isFullscreen();
    this.isFullscreen.set(next);
    if (next) {
      this.toast.show('Entered Fullscreen (Press Esc to exit)', 'info');
    } else {
      this.toast.show('Exited Fullscreen', 'info');
    }
  }

  resetSplit(): void {
    if (this.splitPercent() === 50) {
      this.toast.show('Split is already centered (50/50)', 'info');
      return;
    }
    this.splitPercent.set(50);
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_split_percent', 50);
    }
    this.toast.show('Split reset to center (50/50)', 'success');
  }

  onGripPointerDown(event: PointerEvent): void {
    this.onDividerPointerDown(event);
  }

  onGripDblClick(_event: MouseEvent): void {
    this.resetSplit();
  }

  onRailPointerDown(event: PointerEvent): void {
    this.onGripPointerDown(event);
  }

  onRailDblClick(event: MouseEvent): void {
    this.onGripDblClick(event);
  }

  onDividerPointerDown(event: PointerEvent): void {
    if (!this.isBrowser) return;

    event.preventDefault();
    this.isDragging.set(true);

    const container = this.containerRef()?.nativeElement;
    if (container) {
      this.cachedRect = container.getBoundingClientRect();
      const rectWidth = this.cachedRect.width;

      if (rectWidth > 0) {
        // Minimum left width: 340px (Valid/Invalid badge meets Auto-Fix button without line breaks)
        const minLeftWidth = 340;
        // Minimum right width: 360px (Code, Tree, Types, Diff tabs end with comfortable margin)
        const minRightWidth = 360;

        const minLeftPercent = (minLeftWidth / rectWidth) * 100;
        const maxLeftPercent = ((rectWidth - minRightWidth) / rectWidth) * 100;

        this.cachedLowerBound = Math.min(minLeftPercent, maxLeftPercent);
        this.cachedUpperBound = Math.max(minLeftPercent, maxLeftPercent);
      }
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target && target.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }

    this.lastClientX = event.clientX;
    this.moveListener = (e: PointerEvent) => this.onPointerMove(e);
    this.upListener = (e: PointerEvent) => this.onPointerUp(e, target, event.pointerId);

    window.addEventListener('pointermove', this.moveListener, { passive: true });
    window.addEventListener('pointerup', this.upListener);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.cachedRect || this.cachedRect.width <= 0) return;

    this.lastClientX = event.clientX;
    if (this.rafId !== null) {
      return;
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.cachedRect || this.cachedRect.width <= 0) return;

      const pointerOffset = this.lastClientX - this.cachedRect.left;
      const rawPercent = (pointerOffset / this.cachedRect.width) * 100;
      const clampedPercent = Math.min(
        Math.max(rawPercent, this.cachedLowerBound),
        this.cachedUpperBound,
      );

      // 0.1% precision for buttery smooth, fluid subpixel motion
      this.splitPercent.set(Math.round(clampedPercent * 10) / 10);
    });
  }

  private onPointerUp(
    _event: PointerEvent,
    target: HTMLElement | null,
    pointerId: number,
  ): void {
    this.isDragging.set(false);
    this.cachedRect = null;
    if (this.isBrowser) {
      this.storage.setItem('jsonlens_split_percent', this.splitPercent());
    }
    if (target && target.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // Safe fallback
      }
    }
    this.cleanupPointerListeners();
  }

  private cleanupPointerListeners(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.moveListener) {
      window.removeEventListener('pointermove', this.moveListener);
      this.moveListener = null;
    }
    if (this.upListener) {
      window.removeEventListener('pointerup', this.upListener);
      this.upListener = null;
    }
    this.cachedRect = null;
  }
}
