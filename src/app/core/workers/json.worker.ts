/// <reference lib="webworker" />

import { extractJsonError, calculateStats } from '../../shared/utils/json-tree.util';
import { deepDiffJson, summarizeDiff } from '../../shared/utils/json-diff.util';
import { jsonrepair } from 'jsonrepair';

export type WorkerTaskType = 'parse' | 'repair' | 'diff';

export interface WorkerParseRequest {
  readonly id: string;
  readonly type?: 'parse';
  readonly input: string;
  readonly indent: number | string;
}

export interface WorkerRepairRequest {
  readonly id: string;
  readonly type: 'repair';
  readonly input: string;
}

export interface WorkerDiffRequest {
  readonly id: string;
  readonly type: 'diff';
  readonly left: unknown;
  readonly right: unknown;
}

export type WorkerRequest = WorkerParseRequest | WorkerRepairRequest | WorkerDiffRequest;

export interface WorkerParseSuccess {
  readonly id: string;
  readonly type: 'parse';
  readonly success: true;
  readonly data: unknown;
  readonly formatted: string;
  readonly minified: string;
  readonly stats: unknown;
}

export interface WorkerParseFailure {
  readonly id: string;
  readonly type: 'parse';
  readonly success: false;
  readonly error: unknown;
}

export interface WorkerRepairSuccess {
  readonly id: string;
  readonly type: 'repair';
  readonly success: true;
  readonly repaired: string;
  readonly wasModified: boolean;
}

export interface WorkerRepairFailure {
  readonly id: string;
  readonly type: 'repair';
  readonly success: false;
  readonly error: string;
}

export interface WorkerDiffSuccess {
  readonly id: string;
  readonly type: 'diff';
  readonly success: true;
  readonly diffItems: unknown[];
  readonly summary: unknown;
}

export interface WorkerDiffFailure {
  readonly id: string;
  readonly type: 'diff';
  readonly success: false;
  readonly error: string;
}

export type WorkerResponse =
  | WorkerParseSuccess
  | WorkerParseFailure
  | WorkerRepairSuccess
  | WorkerRepairFailure
  | WorkerDiffSuccess
  | WorkerDiffFailure;

// Legacy alias for backwards compatibility
export type WorkerParseResponse = WorkerResponse;

addEventListener('message', ({ data }: MessageEvent<WorkerRequest>) => {
  const taskType: WorkerTaskType = data.type || 'parse';
  const id = data.id;

  if (taskType === 'parse') {
    const parseReq = data as WorkerParseRequest;
    try {
      const parsed = JSON.parse(parseReq.input);
      const formatted = JSON.stringify(parsed, null, parseReq.indent);
      const minified = JSON.stringify(parsed);
      const byteSize = new Blob([parseReq.input]).size;
      const stats = calculateStats(parsed, byteSize);

      const response: WorkerParseSuccess = {
        id,
        type: 'parse',
        success: true,
        data: parsed,
        formatted,
        minified,
        stats,
      };
      postMessage(response);
    } catch (err) {
      const errorDetails = extractJsonError(err, parseReq.input);
      const response: WorkerParseFailure = {
        id,
        type: 'parse',
        success: false,
        error: errorDetails,
      };
      postMessage(response);
    }
  } else if (taskType === 'repair') {
    const repairReq = data as WorkerRepairRequest;
    try {
      const fixed = jsonrepair(repairReq.input);
      const wasModified = fixed.trim() !== repairReq.input.trim();
      const response: WorkerRepairSuccess = {
        id,
        type: 'repair',
        success: true,
        repaired: fixed,
        wasModified,
      };
      postMessage(response);
    } catch (err) {
      const response: WorkerRepairFailure = {
        id,
        type: 'repair',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
      postMessage(response);
    }
  } else if (taskType === 'diff') {
    const diffReq = data as WorkerDiffRequest;
    try {
      const diffItems = deepDiffJson(diffReq.left, diffReq.right);
      const summary = summarizeDiff(diffItems);
      const response: WorkerDiffSuccess = {
        id,
        type: 'diff',
        success: true,
        diffItems,
        summary,
      };
      postMessage(response);
    } catch (err) {
      const response: WorkerDiffFailure = {
        id,
        type: 'diff',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
      postMessage(response);
    }
  }
});
