export interface VerifyResult {
  check: string;
  ok: boolean;
  source?: string;
  target?: string;
  evidence: string[];
  probableCause?: string;
  nextSteps: string[];
}

export function printVerifyResult(result: unknown, flags: { json: boolean }): void {
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
