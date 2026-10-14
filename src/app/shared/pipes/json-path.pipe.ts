import { Pipe, PipeTransform } from '@angular/core';
import { toStandardJsonPath } from '../utils/json-path.util';

@Pipe({
  name: 'jsonPath',
  standalone: true,
})
export class JsonPathPipe implements PipeTransform {
  transform(path: string | null | undefined): string {
    if (!path) {
      return '$';
    }
    return toStandardJsonPath(path);
  }
}
