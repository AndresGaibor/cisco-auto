/**
 * Campaign Runner - Ejecuta múltiples corridas en secuencia para regression continua
 *
 * @module verification/scaling/campaign-runner
 */

import type { RealRunSummary } from "../real-run-types.js";
import { runRealVerification, type RealVerificationRunnerOptions } from "../real-verification-runner.js";
import { getBaseline, type Baseline } from "../stability/baseline-manager.js";
import { getRealRunStore } from "../real-run-store.js";

export interface CampaignConfig {
  name: string;
  profiles: string[];
  repeatCount: number;
  intervalMs?: number;
  stopOnFirstFailure?: boolean;
  baselineLabel?: string;
}

export interface CampaignResult {
  name: string;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  runIds: string[];
  regressions: string[];
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export async function runCampaign(config: CampaignConfig): Promise<CampaignResult> {
  const {
    name,
    profiles,
    repeatCount,
    intervalMs = 5000,
    stopOnFirstFailure = false,
    baselineLabel,
  } = config;

  const startedAt = Date.now();
  const runIds: string[] = [];
  const regressions: string[] = [];
  let passedRuns = 0;
  let failedRuns = 0;

  for (const profile of profiles) {
    for (let rep = 0; rep < repeatCount; rep++) {
      const runLabel = `${name}-${profile}-rep${rep + 1}`;

      try {
        const runOptions: RealVerificationRunnerOptions = {
          profile,
          label: runLabel,
          continueOnError: true,
          attemptRecovery: true,
          maxRecoveryAttempts: 2,
        };

        const summary = await runRealVerification(runOptions);
        runIds.push(summary.runId);

        if (summary.status === "passed") {
          passedRuns++;
        } else {
          failedRuns++;
          if (stopOnFirstFailure) {
            break;
          }
        }
      } catch (error) {
        failedRuns++;
        const errorMsg = `Error en campaña ${name} profile ${profile} rep ${rep + 1}: ${error}`;
        console.warn(errorMsg);
        if (stopOnFirstFailure) {
          break;
        }
      }

      if (rep < repeatCount - 1 && intervalMs > 0) {
        await dormir(intervalMs);
      }
    }
  }

  const endedAt = Date.now();

  const result: CampaignResult = {
    name,
    totalRuns: profiles.length * repeatCount,
    passedRuns,
    failedRuns,
    runIds,
    regressions,
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
  };

  const store = getRealRunStore();
  try {
    store.writeJsonArtifact(`campaign-${name}`, "campaign-result.json", result);
  } catch (e) {
    console.warn(`No se pudo guardar resultado de campaña: ${e}`);
  }

  return result;
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generarReporteCampaign(result: CampaignResult): string {
  const lineas: string[] = [
    "=".repeat(70),
    `REPORTE DE CAMPAÑA: ${result.name}`,
    "=".repeat(70),
    "",
    `Total de corridas: ${result.totalRuns}`,
    `Pasadas: ${result.passedRuns}`,
    `Fallidas: ${result.failedRuns}`,
    `Duración total: ${(result.durationMs / 1000).toFixed(1)}s`,
    "",
  ];

  if (result.regressions.length > 0) {
    lineas.push("-".repeat(70));
    lineas.push("REGRESIONES DETECTADAS");
    lineas.push("-".repeat(70));
    for (const reg of result.regressions) {
      lineas.push(`  ${reg}`);
    }
    lineas.push("");
  }

  lineas.push("=".repeat(70));

  return lineas.join("\n");
}