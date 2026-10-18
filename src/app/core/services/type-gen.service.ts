import { Injectable, signal } from '@angular/core';
import { JsonValue, TypeGenTarget } from '../models/json-lens.model';
import {
  jsonToCSharp,
  jsonToDart,
  jsonToGo,
  jsonToJava,
  jsonToJavascript,
  jsonToKotlin,
  jsonToPhp,
  jsonToPython,
  jsonToRust,
  jsonToSwift,
  jsonToTypescript,
  jsonToZod,
} from '../../shared/utils/type-generators';

@Injectable({
  providedIn: 'root',
})
export class TypeGenService {
  readonly currentTarget = signal<TypeGenTarget>('typescript');

  setTarget(target: TypeGenTarget): void {
    this.currentTarget.set(target);
  }

  generate(target: TypeGenTarget, json: JsonValue, rootName = 'Root'): string {
    if (json === null || json === undefined) {
      return '';
    }

    try {
      switch (target) {
        case 'typescript':
          return jsonToTypescript(json, rootName);
        case 'zod':
          return jsonToZod(json, rootName);
        case 'javascript':
          return jsonToJavascript(json, rootName);
        case 'python':
          return jsonToPython(json, rootName);
        case 'java':
          return jsonToJava(json, rootName);
        case 'kotlin':
          return jsonToKotlin(json, rootName);
        case 'dart':
          return jsonToDart(json, rootName);
        case 'csharp':
          return jsonToCSharp(json, rootName);
        case 'go':
          return jsonToGo(json, rootName);
        case 'rust':
          return jsonToRust(json, rootName);
        case 'php':
          return jsonToPhp(json, rootName);
        case 'swift':
          return jsonToSwift(json, rootName);
        default:
          return jsonToTypescript(json, rootName);
      }
    } catch (err) {
      return `// Failed to generate types:\n// ${err instanceof Error ? err.message : String(err)}`;
    }
  }
}
