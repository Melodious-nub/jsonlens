import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { JsonStats, JsonValue } from '../models/json-lens.model';
import { flattenJsonObject } from '../../shared/utils/json-tree.util';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  downloadJson(filename = 'data.json', content: string): boolean {
    return this.downloadFile(filename, content, 'application/json');
  }

  downloadTs(filename = 'types.ts', content: string): boolean {
    return this.downloadFile(filename, content, 'text/typescript');
  }

  downloadCsv(filename = 'data.csv', json: JsonValue): boolean {
    const csvContent = this.jsonToCsv(json);
    return this.downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
  }

  async downloadPdf(
    filename = 'jsonlens-report.pdf',
    jsonString: string,
    stats?: JsonStats,
  ): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 60, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(248, 250, 252);
      doc.text('JsonLens — Export Report', margin, 36);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(new Date().toUTCString(), pageWidth - margin, 36, { align: 'right' });

      let currentY = 85;

      // Stats block if provided
      if (stats) {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, currentY, contentWidth, 38, 4, 4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        const statsText = `Size: ${(stats.byteSize / 1024).toFixed(2)} KB   |   Keys: ${stats.keyCount}   |   Depth: ${stats.maxDepth}   |   Objects: ${stats.objectCount}   |   Arrays: ${stats.arrayCount}`;
        doc.text(statsText, margin + 12, currentY + 23);

        currentY += 55;
      }

      // JSON Content in Monospace font
      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      const splitLines = doc.splitTextToSize(jsonString, contentWidth) as string[];

      for (const line of splitLines) {
        if (currentY > pageHeight - margin) {
          doc.addPage();
          currentY = margin + 10;
        }
        doc.text(line, margin, currentY);
        currentY += 12;
      }

      doc.save(filename);
      return true;
    } catch (err) {
      console.error('PDF export failed:', err);
      return false;
    }
  }

  async copyToClipboard(text: string): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  }

  downloadFile(filename: string, content: string, mimeType: string): boolean {
    if (!this.isBrowser) {
      return false;
    }
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch {
      return false;
    }
  }

  private jsonToCsv(json: JsonValue): string {
    if (json === null) {
      return '';
    }

    let items: Record<string, unknown>[] = [];

    if (Array.isArray(json)) {
      items = json.map((item) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          return flattenJsonObject(item as JsonValue);
        }
        return { value: item };
      });
    } else if (typeof json === 'object') {
      items = [flattenJsonObject(json)];
    } else {
      items = [{ value: json }];
    }

    if (items.length === 0) {
      return '';
    }

    const headers = Array.from(
      items.reduce((acc, obj) => {
        Object.keys(obj).forEach((k) => acc.add(k));
        return acc;
      }, new Set<string>()),
    );

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows: string[] = [headers.map(escapeCsv).join(',')];

    for (const item of items) {
      const row = headers.map((header) => escapeCsv(item[header]));
      csvRows.push(row.join(','));
    }

    return csvRows.join('\r\n');
  }
}
