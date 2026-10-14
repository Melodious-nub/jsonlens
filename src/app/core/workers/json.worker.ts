/// <reference lib="webworker" />

import { extractJsonError, calculateStats } from '../../shared/utils/json-tree.util';

export interface WorkerParseRequest {
  readonly id: string;
  readonly input: string;
  readonly indent: number | string;
}

export interface WorkerParseSuccess {
  readonly id: string;
  readonly success: true;
  readonly data: unknown;
  readonly formatted: string;
  readonly minified: string;
  readonly stats: unknown;
}

export interface WorkerParseFailure {
  readonly id: string;
  readonly success: false;
  readonly error: unknown;
}

export type WorkerParseResponse = WorkerParseSuccess | WorkerParseFailure;

addEventListener('message', ({ data }: MessageEvent<WorkerParseRequest>) => {
  const { id, input, indent } = data;

  try {
    const parsed = JSON.parse(input);
    const formatted = JSON.stringify(parsed, null, indent);
    const minified = JSON.stringify(parsed);
    const byteSize = new Blob([input]).size;
    const stats = calculateStats(parsed, byteSize);

    const response: WorkerParseSuccess = {
      id,
      success: true,
      data: parsed,
      formatted,
      minified,
      stats,
    };
    postMessage(response);
  } catch (err) {
    const errorDetails = extractJsonError(err, input);
    const response: WorkerParseFailure = {
      id,
      success: false,
      error: errorDetails,
    };
    postMessage(response);
  }
});
