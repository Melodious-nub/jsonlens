import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileSize',
  standalone: true,
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number | null | undefined, precision = 2): string {
    if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
      return '0 B';
    }

    if (bytes === 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const unitIndex = Math.min(i, units.length - 1);
    const value = bytes / Math.pow(k, unitIndex);

    return `${unitIndex === 0 ? value : value.toFixed(precision)} ${units[unitIndex]}`;
  }
}
