import type { SequentialSubCommandResult } from "./cmd-run-helpers.js";

export function evaluateAdaptiveBatchIntegrity(
  commands: string[],
  subResults: SequentialSubCommandResult[],
  adaptiveBatchChunks: Array<{ ok?: boolean }>,
): {
  missingSubResultIndexes: number[];
  failedChunkCount: number;
  failedSubcommandCount: number;
  integrityOk: boolean;
} {
  const expectedIndexes = commands.map((_command, index) => index);
  const seenIndexes = new Set(
    subResults
      .map((item) => item?.index)
      .filter((index: unknown): index is number => Number.isInteger(index)),
  );

  const missingSubResultIndexes = expectedIndexes.filter((index) => !seenIndexes.has(index));
  const failedChunkCount = adaptiveBatchChunks.filter((chunk) => chunk?.ok === false).length;
  const failedSubcommandCount = subResults.filter((item) => item.ok === false).length;
  const integrityOk =
    missingSubResultIndexes.length === 0 &&
    failedChunkCount === 0 &&
    failedSubcommandCount === 0;

  return {
    missingSubResultIndexes,
    failedChunkCount,
    failedSubcommandCount,
    integrityOk,
  };
}

export function findMissingSubResultIndexes(commands: string[], subResults: Array<{ index?: number }>): number[] {
  const seen = new Set(
    subResults
      .map((item) => item?.index)
      .filter((index: unknown): index is number => Number.isInteger(index)),
  );

  return commands
    .map((_command, index) => index)
    .filter((index) => !seen.has(index));
}

export function findRecoverableFailedSubResultIndexes(subResults: Array<{ index?: number; ok?: boolean; result?: any }>): number[] {
  return subResults
    .filter((item) => {
      const code = item?.result?.error?.code;
      return (
        item?.ok === false &&
        (code === "ADAPTIVE_BATCH_CHUNK_FAILED" ||
          code === "ADAPTIVE_BATCH_INCOMPLETE" ||
          code === "IOS_EXEC_FAILED")
      );
    })
    .map((item) => item.index)
    .filter((index: unknown): index is number => Number.isInteger(index));
}

export function mergeRecoveredSubResults(original: SequentialSubCommandResult[], recovered: SequentialSubCommandResult[]): SequentialSubCommandResult[] {
  const byIndex = new Map<number, SequentialSubCommandResult>();

  for (const item of original) {
    if (Number.isInteger(item?.index)) {
      byIndex.set(item.index, item);
    }
  }

  for (const item of recovered) {
    if (Number.isInteger(item?.index)) {
      byIndex.set(item.index, item);
    }
  }

  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorFactory: () => Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(errorFactory()), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function buildRecoveryTimeoutWarning(index: number, command: string): { code: string; severity: "warning"; message: string; actionable: boolean } {
  return {
    code: "CMD_ADAPTIVE_BATCH_RECOVERY_TIMEOUT",
    severity: "warning",
    message: `Adaptive batch sequential recovery timed out for command index ${index}: ${command}.`,
    actionable: true,
  };
}

export function buildAdaptiveBatchIncompleteWarning(actualCount: number, expectedCount: number, missingIndexes: number[]): { code: string; severity: "warning"; message: string; actionable: boolean } {
  return {
    code: "CMD_ADAPTIVE_BATCH_INCOMPLETE",
    severity: "warning",
    message: `Adaptive batch returned only ${actualCount}/${expectedCount} subResults. Missing command indexes: ${missingIndexes.join(", ")}.`,
    actionable: true,
  };
}
