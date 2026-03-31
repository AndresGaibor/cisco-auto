// ============================================================================
// Subnet Mask Rule
// ============================================================================

import type { Rule } from "../rule";
import type { HostIpInput } from "../validation-context";
import { createDiagnostic } from "../diagnostic";

const VALID_MASKS = new Set([
  "128.0.0.0",
  "192.0.0.0",
  "224.0.0.0",
  "240.0.0.0",
  "248.0.0.0",
  "252.0.0.0",
  "254.0.0.0",
  "255.0.0.0",
  "255.128.0.0",
  "255.192.0.0",
  "255.224.0.0",
  "255.240.0.0",
  "255.248.0.0",
  "255.252.0.0",
  "255.254.0.0",
  "255.255.0.0",
  "255.255.128.0",
  "255.255.192.0",
  "255.255.224.0",
  "255.255.240.0",
  "255.255.248.0",
  "255.255.252.0",
  "255.255.254.0",
  "255.255.255.0",
  "255.255.255.128",
  "255.255.255.192",
  "255.255.255.224",
  "255.255.255.240",
  "255.255.255.248",
  "255.255.255.252",
  "255.255.255.254",
  "255.255.255.255",
]);

export const subnetMaskRule: Rule<HostIpInput> = {
  id: "MASK_INVALID",
  appliesTo: ["assignHostIp", "configureSvi", "configureSubinterface"],
  validate(ctx) {
    const mask = ctx.mutation.input?.mask;
    if (!mask) return [];

    if (VALID_MASKS.has(mask)) return [];

    return [
      createDiagnostic({
        code: "MASK_INVALID",
        severity: "error",
        blocking: true,
        message: `La máscara ${mask} no es válida.`,
        target: {
          device: ctx.mutation.targetDevice,
          interface: ctx.mutation.targetInterface,
          field: "mask",
        },
        suggestedFix: "Usa una máscara contigua válida, por ejemplo 255.255.255.0.",
      }),
    ];
  },
};
