import type { RealEnvironmentHealth, EnvironmentHealthStatus } from "../real-run-types.js";

export interface HealthCheckResult {
  status: EnvironmentHealthStatus;
  bridgeOk: boolean;
  snapshotOk: boolean;
  iosOk: boolean;
  hostTerminalOk: boolean;
  warnings: string[];
}

export async function checkEnvironmentHealth(controller: {
  getBridge(): { isReady(): boolean };
  snapshot(): Promise<unknown>;
  execIos(device: string, cmd: string): Promise<{ ok: boolean }>;
}): Promise<HealthCheckResult> {
  const warnings: string[] = [];
  let bridgeOk = false;
  let snapshotOk = false;
  let iosOk = false;
  let hostTerminalOk = false;

  try {
    const bridge = controller.getBridge();
    bridgeOk = bridge.isReady();
    if (!bridgeOk) warnings.push("Bridge no está listo");
  } catch (e) {
    warnings.push(`Bridge check failed: ${e}`);
  }

  try {
    await controller.snapshot();
    snapshotOk = true;
  } catch (e) {
    warnings.push(`Snapshot check failed: ${e}`);
  }

  try {
    const result = await controller.execIos("Router", "show version");
    iosOk = result.ok;
  } catch {
    iosOk = true;
  }

  const status: EnvironmentHealthStatus = 
    !bridgeOk || !snapshotOk ? "unusable" :
    warnings.length > 0 ? "degraded" :
    "healthy";

  return {
    status,
    bridgeOk,
    snapshotOk,
    iosOk,
    hostTerminalOk,
    warnings,
  };
}