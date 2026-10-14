import {
  Directive,
  HostBinding,
  HostListener,
  output,
} from '@angular/core';

@Directive({
  selector: '[appDropZone]',
  standalone: true,
})
export class DropZoneDirective {
  readonly fileDropped = output<string>();
  readonly isDragOverChange = output<boolean>();

  @HostBinding('class.drag-over')
  isDragOver = false;

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isDragOver) {
      this.isDragOver = true;
      this.isDragOverChange.emit(true);
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isDragOver) {
      this.isDragOver = false;
      this.isDragOverChange.emit(false);
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    this.isDragOverChange.emit(false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.fileDropped.emit(reader.result);
      }
    };
    reader.readAsText(file);
  }
}
