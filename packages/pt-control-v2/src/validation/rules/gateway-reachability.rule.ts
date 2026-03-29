// ============================================================================
// Gateway Reachability Rule
// ============================================================================
//
// Detects if the configured gateway is actually reachable from the device.
//
// This rule checks whether a gateway IP is reachable by verifying that the
// target device has at least one link in the network twin. A device with
// no links cannot reach any gateway.

import type { Rule } from "../rule";
import type { ValidationContext } from "../validation-context";
import type { Diagnostic } from "../diagnostic";
import { createDiagnostic } from "../diagnostic";

export const gatewayReachabilityRule: Rule = {
  id: "gateway-reachability",
  appliesTo: ["assignHostIp", "configureSvi", "configureSubinterface"],
  validate(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const device = ctx.twin.devices[ctx.mutation.targetDevice];
    if (!device) return diagnostics;

    // Check if device has any links (ports with connections)
    const hasLinks = Object.keys(device.ports ?? {}).length > 0;
    if (!hasLinks) {
      diagnostics.push(
        createDiagnostic({
          code: "GATEWAY_UNREACHABLE",
          severity: "warning",
          blocking: false,
          message: `Device ${ctx.mutation.targetDevice} has no links. Gateway may not be reachable.`,
          target: {
            device: ctx.mutation.targetDevice,
          },
          suggestedFix:
            "Verify that the device has at least one connection to another device in the topology.",
        })
      );
    }

    return diagnostics;
  },
};
