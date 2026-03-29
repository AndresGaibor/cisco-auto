// ============================================================================
// Duplicate IP Rule
// ============================================================================

import type { Rule } from "../rule";
import type { HostIpInput } from "../validation-context";
import { createDiagnostic } from "../diagnostic";

export const duplicateIpRule: Rule<HostIpInput> = {
  id: "IP_DUPLICATE",
  appliesTo: ["assignHostIp", "configureSvi", "configureSubinterface"],
  validate(ctx) {
    const ip = ctx.mutation.input?.ip;
    if (!ip) return [];

    const duplicates: string[] = [];

    for (const device of Object.values(ctx.twin.devices)) {
      for (const port of Object.values(device.ports)) {
        if (port.ipAddress === ip) {
          const sameTarget =
            device.name === ctx.mutation.targetDevice &&
            port.name === ctx.mutation.targetInterface;

          if (!sameTarget) {
            duplicates.push(`${device.name}:${port.name}`);
          }
        }
      }
    }

    if (duplicates.length === 0) return [];

    return [
      createDiagnostic({
        code: "IP_DUPLICATE",
        severity: "error",
        blocking: true,
        message: `La IP ${ip} ya está en uso por ${duplicates.join(", ")}.`,
        target: {
          device: ctx.mutation.targetDevice,
          interface: ctx.mutation.targetInterface,
          field: "ip",
        },
        suggestedFix: "Usa una IP libre dentro de la subred correcta.",
        related: duplicates,
      }),
    ];
  },
};
