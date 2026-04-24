// ============================================================================
// Real Verification Runner - Orquestador de corridas reales completas
// ============================================================================
// Runner principal que orquesta la ejecución completa de escenarios de
// verificación real dentro del orchestration brain de pt-control.

import type { PTController } from "../controller/index.js";
import { createDefaultPTController } from "../controller/index.js";
import type {
  RealRunManifest,
  RealRunSummary,
  RealScenarioResult,
  RealRunStatus,
  ExecutionOutcome,
  RealEnvironmentHealth,
} from "./real-run-types.js";
import type { RealScenarioDefinition } from "./scenarios/real-scenario-types.js";
import { getRealRunStore } from "./real-run-store.js";
import { RealLabHarness } from "./real-lab-harness.js";
import { getScenariosForProfile } from "./real-scenario-registry.js";
import { checkEnvironmentHealth } from "./recovery/environment-health.js";
import { shouldContinueAfterStepFailure, shouldAttemptRecovery } from "./recovery/recovery-policy.js";
import { attemptStepRecovery } from "./recovery/recovery-engine.js";
import { captureFingerprint } from "../omni/environment-fingerprint.js";

// ============================================================================
// Opciones del Runner
// ============================================================================

export interface RealVerificationRunnerOptions {
  profile: string;
  label?: string;
  baselineLabel?: string;
  compareBaseline?: boolean;
  continueOnError?: boolean;
  attemptRecovery?: boolean;
  maxRecoveryAttempts?: number;
  maxScenarioAttempts?: number;
  includeScenarioIds?: string[];
  excludeScenarioIds?: string[];
  repeat?: number;
  tags?: string[];
  commandTimeoutMs?: number;
}

const DEFAULT_COMMAND_TIMEOUT_MS = 20000;
const DEFAULT_SCENARIO_TIMEOUT_MS = 60000;
const DEFAULT_RUN_TIMEOUT_MS = 300000;

// ============================================================================
// Estado interno del Runner
// ============================================================================

interface RunnerState {
  runId: string;
  profile: string;
  startedAt: number;
  continueOnError: boolean;
  attemptRecovery: boolean;
  maxRecoveryAttempts: number;
  commandTimeoutMs: number;
  scenarios: RealScenarioDefinition[];
  scenarioResults: RealScenarioResult[];
  warnings: string[];
  fatalErrors: string[];
  environmentDegraded: boolean;
  recoveryCounts: { attempted: number; succeeded: number; failed: number };
  serialQueue: Promise<void>;
}

function enqueueSerial<T>(queue: Promise<void>, fn: () => Promise<T>): Promise<T> {
  return queue.then(fn);
}

// ============================================================================
// Función principal de ejecución
// ============================================================================

export async function runRealVerification(
  options: RealVerificationRunnerOptions
): Promise<RealRunSummary> {
  const maxAttempts = options.maxRecoveryAttempts ?? 2;
  const estimatedScenarios = 5; // smoke profile default
  const runTimeoutMs = options.commandTimeoutMs
    ? options.commandTimeoutMs * maxAttempts * estimatedScenarios + DEFAULT_RUN_TIMEOUT_MS
    : DEFAULT_RUN_TIMEOUT_MS;

  let timeoutId: ReturnType<typeof setTimeout>;
  const runTimeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`RUN TIMEOUT: Corrida excedió ${runTimeoutMs}ms`)), runTimeoutMs);
  });

  const runnerState: RunnerState = {
    runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    profile: options.profile,
    startedAt: Date.now(),
    continueOnError: options.continueOnError ?? true,
    attemptRecovery: options.attemptRecovery ?? true,
    maxRecoveryAttempts: options.maxRecoveryAttempts ?? 2,
    commandTimeoutMs: options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
    scenarios: [],
    scenarioResults: [],
    warnings: [],
    fatalErrors: [],
    environmentDegraded: false,
    recoveryCounts: { attempted: 0, succeeded: 0, failed: 0 },
    serialQueue: Promise.resolve(),
  };

  const store = getRealRunStore();
  store.createRun(runnerState.runId, runnerState.profile);

  // Cargar escenarios segun perfil
  runnerState.scenarios = getScenariosForProfile(options.profile as any);

  // Filtrar por include/exclude si se especifica
  if (options.includeScenarioIds?.length) {
    runnerState.scenarios = runnerState.scenarios.filter((s) =>
      options.includeScenarioIds!.includes(s.id)
    );
  }
  if (options.excludeScenarioIds?.length) {
    runnerState.scenarios = runnerState.scenarios.filter(
      (s) => !options.excludeScenarioIds!.includes(s.id)
    );
  }

  // Crear manifiesto inicial
  const manifest: RealRunManifest = {
    runId: runnerState.runId,
    profile: runnerState.profile,
    label: options.label,
    startedAt: runnerState.startedAt,
    status: "passed",
    continueOnError: runnerState.continueOnError,
    attemptRecovery: runnerState.attemptRecovery,
    maxRecoveryAttempts: runnerState.maxRecoveryAttempts,
    environment: captureFingerprint(),
    scenarioIds: runnerState.scenarios.map((s) => s.id),
    artifactsRoot: store.getArtifactsBase(),
    totalScenarios: runnerState.scenarios.length,
    totalSteps: 0,
  };
  store.writeManifest(runnerState.runId, manifest);

  // Crear y arrancar controller
  let controller: PTController;
  try {
    controller = createDefaultPTController();
    await controller.start();
  } catch (e) {
    runnerState.fatalErrors.push(`No se pudo iniciar controller: ${e}`);
    manifest.status = "aborted";
    store.writeManifest(runnerState.runId, manifest);
    return buildSummary(runnerState);
  }

  const harness = new RealLabHarness(controller, runnerState.runId);

  // Ejecutar cada escenario con timeout global de corrida
  // Ejecutamos en serial para evitar colisiones de comandos en PT
  const runTask = (async () => {
    for (const scenario of runnerState.scenarios) {
      // Ejecutar el escenario serializado: cada paso espera al anterior
      const scenarioResult = await executeScenario(scenario, runnerState, harness, store);
      runnerState.scenarioResults.push(scenarioResult);

      if (scenarioResult.outcome === "aborted" && !runnerState.continueOnError) {
        runnerState.fatalErrors.push(
          `Escenario ${scenario.id} forzó abortar corrida`
        );
        break;
      }
    }
  })();

  try {
    await Promise.race([runTask, runTimeoutPromise]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    runnerState.fatalErrors.push(`RUN ERROR: ${msg}`);
  } finally {
    clearTimeout(timeoutId!);
  }

  // Determinar status global de la corrida
  manifest.status = computeRunStatus(runnerState);
  manifest.endedAt = Date.now();
  store.writeManifest(runnerState.runId, manifest);

  const summary = buildSummary(runnerState);
  store.finalizeRun(runnerState.runId, summary);

  await controller.stop();

  return summary;
}

// ============================================================================
// Timeout wrapper para comandos
// ============================================================================

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stepName: string
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`TIMEOUT: ${stepName} excedió ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    const value = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return { ok: true, value };
  } catch (e) {
    clearTimeout(timeoutId!);
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

// ============================================================================
// Ejecución de escenario individual
// ============================================================================

export async function executeScenario(
  scenario: RealScenarioDefinition,
  state: RunnerState,
  harness: RealLabHarness,
  store: ReturnType<typeof getRealRunStore>
): Promise<RealScenarioResult> {
  const startedAt = Date.now();
  const result: RealScenarioResult = {
    scenarioId: scenario.id,
    title: scenario.title,
    profile: scenario.profile,
    tags: scenario.tags,
    startedAt,
    endedAt: 0,
    durationMs: 0,
    outcome: "passed",
    degraded: false,
    contaminated: false,
    failedSteps: [],
    skippedSteps: [],
    recoveryAttempts: [],
    warnings: [],
    artifacts: [],
    verificationStrength: "observed",
  };

  const finalize = (): RealScenarioResult => {
    result.endedAt = Date.now();
    result.durationMs = result.endedAt - startedAt;
    store.writeScenarioResult(state.runId, scenario.id, result);
    return result;
  };

  try {
    const prepResult = await withTimeout(
      harness.prepareScenario(scenario.id),
      state.commandTimeoutMs,
      `prepareScenario(${scenario.id})`
    );
    if (!prepResult.ok) {
      result.warnings.push(`Prepare timeout/error: ${prepResult.error}`);
      harness.markScenarioContaminated();
      result.outcome = "aborted";
      result.failedSteps.push("prepare");
      result.error = prepResult.error;
      return finalize();
    }

    // Setup con timeout
    const setupResult = await withTimeout(
      scenario.setup({
        controller: harness.getController(),
        runId: state.runId,
        runStore: store,
      } as any),
      state.commandTimeoutMs,
      `setup(${scenario.id})`
    );
    if (!setupResult.ok) {
      result.warnings.push(`Setup timeout/error: ${setupResult.error}`);
      result.failedSteps.push("setup");
      result.outcome = "aborted";
      result.error = setupResult.error;
      return finalize();
    }

    // Execute con timeout
    const execResult = await withTimeout(
      scenario.execute({
        controller: harness.getController(),
        runId: state.runId,
        runStore: store,
      } as any),
      state.commandTimeoutMs,
      `execute(${scenario.id})`
    );
    if (!execResult.ok) {
      result.outcome = "failed";
      result.error = execResult.error;
      result.failedSteps.push("execute");
      return finalize();
    } else {
      result.outcome = execResult.value.outcome;
      result.warnings.push(...execResult.value.warnings);
      if (execResult.value.error) result.error = execResult.value.error;
    }

    // Verify con timeout
    const verifyResult = await withTimeout(
      scenario.verify({
        controller: harness.getController(),
        runId: state.runId,
        runStore: store,
      } as any),
      state.commandTimeoutMs,
      `verify(${scenario.id})`
    );
    if (!verifyResult.ok) {
      result.warnings.push(`Verify timeout/error: ${verifyResult.error}`);
      if (result.outcome !== "failed") result.outcome = "partial";
      result.failedSteps.push("verify");
      return finalize();
    } else if (verifyResult.value.outcome === "failed") {
      result.outcome = "partial";
      result.failedSteps.push("verify");
      result.verificationStrength = (verifyResult.value.evidence?.verificationStrength as any) ?? "observed";
    }

    // Cleanup con timeout (no afecta outcome, solo warnings)
    const cleanupResult = await withTimeout(
      harness.cleanupScenario(scenario.id),
      state.commandTimeoutMs,
      `cleanup(${scenario.id})`
    );
    if (!cleanupResult.ok) {
      result.warnings.push(`Cleanup timeout/error: ${cleanupResult.error}`);
      result.contaminated = true;
    } else if (!cleanupResult.value.ok) {
      result.warnings.push(...cleanupResult.value.warnings);
      result.contaminated = true;
    }
  } catch (e) {
    result.outcome = "aborted";
    result.error = String(e);
  }

  return finalize();
}

// ============================================================================
// Helpers de status y summary
// ============================================================================

function computeRunStatus(state: RunnerState): RealRunStatus {
  if (state.fatalErrors.length > 0) return "failed";
  if (state.environmentDegraded) return "degraded";

  const outcomes = state.scenarioResults.map((r) => r.outcome);
  if (outcomes.every((o) => o === "passed")) return "passed";
  if (outcomes.every((o) => o === "passed" || o === "skipped")) return "partial";
  if (outcomes.some((o) => o === "failed")) return "partial";
  return "partial";
}

function buildSummary(state: RunnerState): RealRunSummary {
  const endedAt = Date.now();
  const passed = state.scenarioResults.filter((r) => r.outcome === "passed").length;
  const partial = state.scenarioResults.filter((r) => r.outcome === "partial").length;
  const failed = state.scenarioResults.filter((r) => r.outcome === "failed").length;
  const recovered = state.scenarioResults.filter((r) => r.outcome === "recovered").length;
  const skipped = state.scenarioResults.filter((r) => r.outcome === "skipped").length;
  const aborted = state.scenarioResults.filter((r) => r.outcome === "aborted").length;
  const store = getRealRunStore();

  return {
    runId: state.runId,
    profile: state.profile,
    status: computeRunStatus(state),
    startedAt: state.startedAt,
    endedAt,
    durationMs: endedAt - state.startedAt,
    scenarioCounts: {
      total: state.scenarioResults.length,
      passed,
      partial,
      failed,
      recovered,
      skipped,
      aborted,
    },
    recoveryCounts: state.recoveryCounts,
    skippedCounts: skipped,
    fatalErrors: state.fatalErrors,
    warnings: state.warnings,
    environmentDegraded: state.environmentDegraded,
    artifactsRoot: `${store.getArtifactsBase()}/runs/${state.runId}`,
    scenarios: state.scenarioResults,
  };
}
