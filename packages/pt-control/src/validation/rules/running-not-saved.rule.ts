// ============================================================================
// Running Not Saved Rule
// ============================================================================

import type { Rule } from "../rule";
import { createDiagnostic } from "../diagnostic";

export const runningNotSavedRule: Rule = {
  id: "RUNNING_NOT_SAVED",
  appliesTo: "*",
  validate(ctx) {
    if (ctx.phase !== "postflight") return [];

    const device = ctx.twin.devices[ctx.mutation.targetDevice];
    if (!device?.config) return [];

    const { dirty, runningConfigHash, startupConfigHash } = device.config;

    if (!dirty && runningConfigHash === startupConfigHash) return [];

    return [
      createDiagnostic({
        code: "RUNNING_NOT_SAVED",
        severity: "warning",
        blocking: false,
        message: `La configuración de ${device.name} parece no haberse guardado en startup-config.`,
        target: { device: device.name },
        suggestedFix: "Ejecuta 'write memory' o 'copy running-config startup-config'.",
      }),
    ];
  },
};
