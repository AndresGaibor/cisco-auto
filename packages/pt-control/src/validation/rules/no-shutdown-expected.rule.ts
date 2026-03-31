// ============================================================================
// No-Shutdown Expected Rule
// ============================================================================

import type { Rule } from "../rule";
import { createDiagnostic } from "../diagnostic";

export const noShutdownExpectedRule: Rule = {
  id: "NO_SHUTDOWN_EXPECTED",
  appliesTo: ["configureSvi", "configureSubinterface", "configureAccessPort", "generic"],
  validate(ctx) {
    const shouldBeUp = ctx.intent?.shouldBeUp;
    if (!shouldBeUp) return [];

    const device = ctx.twin.devices[ctx.mutation.targetDevice];
    const iface = ctx.mutation.targetInterface;
    if (!device || !iface) return [];

    const port = device.ports[iface];
    if (!port) return [];

    if (ctx.phase === "preflight") {
      if (port.adminStatus === "shutdown" || port.adminStatus === "administratively down") {
        return [
          createDiagnostic({
            code: "NO_SHUTDOWN_EXPECTED",
            severity: "warning",
            blocking: false,
            message: `La interfaz ${iface} está apagada y la intención es dejarla activa.`,
            target: { device: device.name, interface: iface },
            suggestedFix: "Asegúrate de incluir 'no shutdown'.",
          }),
        ];
      }
      return [];
    }

    // postflight
    if (port.adminStatus === "shutdown" || port.adminStatus === "administratively down") {
      return [
        createDiagnostic({
          code: "INTERFACE_STILL_DOWN",
          severity: "error",
          blocking: true,
          message: `La interfaz ${iface} sigue administrativamente apagada después del cambio.`,
          target: { device: device.name, interface: iface },
          suggestedFix: "Aplica 'no shutdown' y valida con 'show ip interface brief'.",
        }),
      ];
    }

    return [];
  },
};
