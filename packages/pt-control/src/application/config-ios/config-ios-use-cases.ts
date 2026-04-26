// ============================================================================
// Config IOS Use Cases
// ============================================================================

import type {
  ConfigIOSPayload,
  ConfigIOSResult,
  VerificationStep,
} from "./config-ios-types.js";
import { buildVerificationPlan } from "./verification-planner.js";

/**
 * Controller port for Config IOS operations.
 * Abstracts the PT controller so use cases remain decoupled.
 */
export interface ConfigIOSControllerPort {
  /**
   * List all devices available in the topology.
   */
  listDevices(): Promise<{ devices: ConfigIOSDevice[] } | ConfigIOSDevice[]>;

  /**
   * Execute configuration commands on an IOS device.
   */
  configIosWithResult(
    device: string,
    commands: string[],
    options: { save: boolean },
  ): Promise<ConfigIOSApplyResult>;

  /**
   * Execute a show command and return evidence for verification.
   */
  execIosWithEvidence(
    device: string,
    command: string,
    waitForOutput: boolean,
    timeout?: number,
  ): Promise<{
    raw: string;
    parsed: unknown;
    evidence: Record<string, unknown>;
  }>;
}

/**
 * Device representation for IOS operations.
 */
export interface ConfigIOSDevice {
  name: string;
  model?: string;
  type?: string | number;
}

/**
 * Result of applying IOS configuration commands.
 */
export interface ConfigIOSApplyResult {
  results?: Array<{
    index: number;
    command: string;
    ok: boolean;
    output: string;
  }>;
}

/**
 * Result type for Config IOS operations.
 */
export type ConfigIOSUseCaseResult<T> =
  | {
      ok: true;
      data: T;
      verification?: ConfigIOSVerification;
      advice?: string[];
    }
  | {
      ok: false;
      error: {
        message: string;
        details?: Record<string, unknown>;
      };
    };

/**
 * Verification result from running verification plan.
 */
export interface ConfigIOSVerification {
  executed: boolean;
  verified: boolean;
  partiallyVerified: boolean;
  verificationSource: string[];
  checks: ConfigIOSVerificationCheck[];
}

/**
 * Individual verification check result.
 */
export interface ConfigIOSVerificationCheck {
  name: string;
  ok: boolean;
  details: {
    verifyCommand?: string;
    rawPreview?: string;
    evidence?: Record<string, unknown>;
    error?: string;
  };
}

/**
 * Apply IOS configuration with automatic verification.
 *
 * Takes a payload with device name and commands, applies them using the
 * controller, and runs verification steps based on the command types.
 */
export async function applyConfigIOS(
  controller: ConfigIOSControllerPort,
  payload: ConfigIOSPayload,
  runVerification: boolean = true,
): Promise<ConfigIOSUseCaseResult<ConfigIOSResult>> {
  try {
    // Validate device
    const deviceListResult = await controller.listDevices();
    const devices = Array.isArray(deviceListResult)
      ? deviceListResult
      : deviceListResult.devices;

    const iosDevices = devices.filter((d) => {
      const type = d.type;
      if (typeof type === "number") {
        return type === 0 || type === 1 || type === 16; // router, switch, multilayer
      }
      return (
        type === "router" || type === "switch" || type === "switch_layer3"
      );
    });

    if (iosDevices.length === 0) {
      return {
        ok: false,
        error: {
          message: "No hay dispositivos capaces de ejecutar IOS",
        },
      };
    }

    const targetDevice = payload.device;
    if (!targetDevice) {
      return {
        ok: false,
        error: {
          message: "Debe especificar un dispositivo",
        },
      };
    }

    const selectedDevice = iosDevices.find((d) => d.name === targetDevice);
    if (!selectedDevice) {
      return {
        ok: false,
        error: {
          message: `Dispositivo "${targetDevice}" no encontrado o no es capaz de ejecutar IOS`,
          details: {
            availableDevices: iosDevices.map((d) => d.name),
          },
        },
      };
    }

    if (payload.commands.length === 0) {
      return {
        ok: false,
        error: {
          message: "Se requiere al menos un comando IOS",
        },
      };
    }

    // Apply configuration
    const applyResult = await controller.configIosWithResult(
      targetDevice,
      payload.commands,
      { save: true },
    );

    // Build and execute verification plan if enabled
    const verificationPlan = buildVerificationPlan(payload.commands);
    let verification: ConfigIOSVerification | undefined;

    if (runVerification && verificationPlan.length > 0) {
      const checks: ConfigIOSVerificationCheck[] = [];

      for (const step of verificationPlan) {
        try {
          const showResult = await controller.execIosWithEvidence(
            targetDevice,
            step.verifyCommand,
            false,
            10000,
          );
          const ok = step.assert(
            showResult.raw || "",
            showResult.parsed,
            payload.commands,
          );
          checks.push({
            name: `${step.kind}:${step.verifyCommand}`,
            ok,
            details: {
              verifyCommand: step.verifyCommand,
              rawPreview: (showResult.raw || "").slice(0, 400),
              evidence: showResult.evidence,
            },
          });
        } catch (e) {
          checks.push({
            name: `${step.kind}:${step.verifyCommand}`,
            ok: false,
            details: {
              error: e instanceof Error ? e.message : String(e),
            },
          });
        }
      }

      const verified = checks.length > 0 && checks.every((check) => check.ok);
      const partiallyVerified =
        checks.some((check) => check.ok) && !verified;

      verification = {
        executed: true,
        verified,
        partiallyVerified,
        verificationSource: verificationPlan.map((step) => step.verifyCommand),
        checks,
      };
    }

    // Build command outputs
    const commandOutputs =
      applyResult?.results?.length > 0
        ? applyResult.results.map((r) => ({
            index: r.index,
            command: r.command,
            ok: r.ok,
            output: r.output,
          }))
        : undefined;

    const resultData: ConfigIOSResult = {
      device: targetDevice,
      commands: payload.commands,
      executed: payload.commands.length,
      errors: [],
      commandOutputs,
    };

    return {
      ok: true,
      data: resultData,
      verification,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Execute verification plan without applying config.
 * Useful for checking current state of a device.
 */
export async function verifyConfigIOS(
  controller: ConfigIOSControllerPort,
  deviceName: string,
  commands: string[],
): Promise<ConfigIOSUseCaseResult<ConfigIOSVerification>> {
  try {
    const verificationPlan = buildVerificationPlan(commands);

    if (verificationPlan.length === 0) {
      return {
        ok: true,
        data: {
          executed: false,
          verified: false,
          partiallyVerified: false,
          verificationSource: [],
          checks: [],
        },
        advice: ["No hay pasos de verificación definidos para estos comandos"],
      };
    }

    const checks: ConfigIOSVerificationCheck[] = [];

    for (const step of verificationPlan) {
      try {
        const showResult = await controller.execIosWithEvidence(
          deviceName,
          step.verifyCommand,
          false,
          10000,
        );
        const ok = step.assert(showResult.raw || "", showResult.parsed, commands);
        checks.push({
          name: `${step.kind}:${step.verifyCommand}`,
          ok,
          details: {
            verifyCommand: step.verifyCommand,
            rawPreview: (showResult.raw || "").slice(0, 400),
            evidence: showResult.evidence,
          },
        });
      } catch (e) {
        checks.push({
          name: `${step.kind}:${step.verifyCommand}`,
          ok: false,
          details: {
            error: e instanceof Error ? e.message : String(e),
          },
        });
      }
    }

    const verified = checks.length > 0 && checks.every((check) => check.ok);
    const partiallyVerified =
      checks.some((check) => check.ok) && !verified;

    return {
      ok: true,
      data: {
        executed: true,
        verified,
        partiallyVerified,
        verificationSource: verificationPlan.map((step) => step.verifyCommand),
        checks,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}