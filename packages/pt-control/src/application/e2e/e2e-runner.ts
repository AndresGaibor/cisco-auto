/**
 * E2eRunner - Ejecuta smoke tests E2E contra PT real.
 */

import type { PTController } from "../../controller/index.js";
import type { DoctorPaths } from "../doctor/doctor-types.js";
import { runAllDoctorChecks } from "../doctor/doctor-use-cases.js";

export interface SmokeCaseResult {
  name: string;
  ok: boolean;
  severity: "pass" | "fail" | "degraded";
  durationMs: number;
  error?: string;
  output?: string;
}

export interface E2eSuiteResult {
  suite: "smoke";
  status: "pass" | "degraded" | "fail";
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  cases: SmokeCaseResult[];
  doctorCheck?: {
    ok: boolean;
    checks: Array<{ name: string; ok: boolean; severity: string; message: string }>;
  };
}

export interface E2eRunnerOptions {
  controller: PTController;
  paths: DoctorPaths;
  timeoutMs?: number;
}

export class E2eRunner {
  private controller: PTController;
  private paths: DoctorPaths;
  private timeoutMs: number;

  constructor(options: E2eRunnerOptions) {
    this.controller = options.controller;
    this.paths = options.paths;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async runSmoke(): Promise<E2eSuiteResult> {
    const startedAt = Date.now();
    const cases: SmokeCaseResult[] = [];

    let doctorResult: E2eSuiteResult["doctorCheck"] | undefined;

    const controllerForDoctor = this.controller as unknown as {
      getHeartbeat: () => unknown;
      getHeartbeatHealth: () => { state: string; ageMs?: number };
      getSystemContext: () => {
        bridgeReady: boolean;
        topologyMaterialized: boolean;
        deviceCount: number;
        linkCount: number;
        heartbeat: { state: string; ageMs?: number; lastSeenTs?: number };
        warnings: string[];
        bridge: { ready: boolean; queuedCount?: number; inFlightCount?: number; warnings?: string[] };
        notes: string[];
      };
    };

    try {
      const doctorChecks = await runAllDoctorChecks(controllerForDoctor, this.paths, false);
      const doctorOk = doctorChecks.every((c) => c.ok);
      doctorResult = {
        ok: doctorOk,
        checks: doctorChecks.map((c) => ({
          name: c.name,
          ok: c.ok,
          severity: c.severity,
          message: c.message,
        })),
      };

      cases.push({
        name: "doctor",
        ok: doctorOk,
        severity: doctorOk ? "pass" : "degraded",
        durationMs: 0,
      });

      if (!doctorOk) {
        const criticalCount = doctorChecks.filter((c) => !c.ok && c.severity === "critical").length;
        if (criticalCount > 0) {
          cases.push({
            name: "device-list",
            ok: false,
            severity: "fail",
            durationMs: 0,
            error: "Doctor crítico falló - no se continúa con device-list",
          });
          cases.push({
            name: "show-version",
            ok: false,
            severity: "fail",
            durationMs: 0,
            error: "Doctor crítico falló - no se continúa con show-version",
          });

          const finishedAt = Date.now();
          return {
            suite: "smoke",
            status: "fail",
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
            cases,
            doctorCheck: doctorResult,
          };
        }
      }
    } catch (err) {
      cases.push({
        name: "doctor",
        ok: false,
        severity: "fail",
        durationMs: 0,
        error: String(err),
      });
    }

    try {
      const deviceListResult = await this.controller.listDevices();
      cases.push({
        name: "device-list",
        ok: true,
        severity: "pass",
        durationMs: 0,
        output: `devices:${deviceListResult.length}`,
      });
    } catch (err) {
      cases.push({
        name: "device-list",
        ok: false,
        severity: "fail",
        durationMs: 0,
        error: String(err),
      });
    }

    try {
      const devices = await this.controller.listDevices();
      const firstRouter = devices.find((d) =>
        d.model.toLowerCase().includes("router") || d.type === "router"
      );

      let targetDevice = firstRouter ?? devices[0];

      if (!targetDevice) {
        cases.push({
          name: "show-version",
          ok: false,
          severity: "degraded",
          durationMs: 0,
          error: "No se encontraron dispositivos IOS para ejecutar show version",
        });
      } else {
        const execResult = await this.controller.execIos(targetDevice.name, "show version", false, this.timeoutMs) as { raw?: string };
        cases.push({
          name: "show-version",
          ok: true,
          severity: "pass",
          durationMs: 0,
          output: execResult?.raw?.slice(0, 200) ?? "ok",
        });
      }
    } catch (err) {
      cases.push({
        name: "show-version",
        ok: false,
        severity: "fail",
        durationMs: 0,
        error: String(err),
      });
    }

    const finishedAt = Date.now();
    const hasFails = cases.some((c) => c.severity === "fail");
    const hasDegraded = cases.some((c) => c.severity === "degraded");

    return {
      suite: "smoke",
      status: hasFails ? "fail" : hasDegraded ? "degraded" : "pass",
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      cases,
      doctorCheck: doctorResult,
    };
  }
}