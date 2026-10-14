import { Injectable } from '@angular/core';
import { jsonrepair } from 'jsonrepair';

export interface RepairResult {
  readonly success: boolean;
  readonly repaired: string;
  readonly wasModified: boolean;
  readonly error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class JsonRepairService {
  repair(input: string): RepairResult {
    if (!input || input.trim() === '') {
      return { success: true, repaired: '', wasModified: false };
    }

    try {
      const fixed = jsonrepair(input);
      const wasModified = fixed.trim() !== input.trim();
      return {
        success: true,
        repaired: fixed,
        wasModified,
      };
    } catch (err) {
      return {
        success: false,
        repaired: input,
        wasModified: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
