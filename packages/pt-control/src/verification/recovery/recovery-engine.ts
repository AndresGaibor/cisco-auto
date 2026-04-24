import type { RealRecoveryAttempt } from "../real-run-types.js";
import { shouldAttemptRecovery } from "./recovery-policy.js";

export interface RecoveryResult {
  ok: boolean;
  attempts: RealRecoveryAttempt[];
  notes: string[];
}

export async function attemptStepRecovery(
  stepId: string,
  reason: string,
  recoveryFn: () => Promise<boolean>,
  maxAttempts: number = 2
): Promise<RecoveryResult> {
  const attempts: RealRecoveryAttempt[] = [];
  const notes: string[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptedAt = Date.now();
    try {
      const ok = await recoveryFn();
      attempts.push({ stepId, reason, attemptedAt, ok, notes: `Attempt ${attempt + 1}` });
      if (ok) {
        notes.push(`Recovery successful on attempt ${attempt + 1}`);
        return { ok: true, attempts, notes };
      }
      notes.push(`Recovery attempt ${attempt + 1} returned false`);
    } catch (e) {
      attempts.push({ stepId, reason, attemptedAt, ok: false, notes: `Error: ${e}` });
      notes.push(`Recovery attempt ${attempt + 1} failed: ${e}`);
    }
  }

  return { ok: false, attempts, notes };
}

export async function attemptScenarioRecovery(
  scenarioId: string,
  setupFn: () => Promise<void>,
  maxAttempts: number = 2
): Promise<RecoveryResult> {
  return attemptStepRecovery(scenarioId, `Scenario recovery for ${scenarioId}`, async () => {
    await setupFn();
    return true;
  }, maxAttempts);
}

export function markDegraded(reason: string, notes: string[]): void {
  notes.push(`[DEGRADED] ${reason}`);
}