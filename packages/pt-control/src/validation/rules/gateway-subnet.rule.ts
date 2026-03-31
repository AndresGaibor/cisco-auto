// ============================================================================
// Gateway Subnet Rule
// ============================================================================

import type { Rule } from "../rule";
import type { HostIpInput } from "../validation-context";
import { createDiagnostic } from "../diagnostic";

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function sameSubnet(ip: string, gateway: string, mask: string): boolean {
  const ipNet = ipToInt(ip) & ipToInt(mask);
  const gwNet = ipToInt(gateway) & ipToInt(mask);
  return ipNet === gwNet;
}

export const gatewaySubnetRule: Rule<HostIpInput> = {
  id: "GATEWAY_OUTSIDE_SUBNET",
  appliesTo: ["assignHostIp"],
  validate(ctx) {
    const { ip, mask, gateway } = ctx.mutation.input ?? {};
    if (!ip || !mask || !gateway) return [];

    if (sameSubnet(ip, gateway, mask)) return [];

    return [
      createDiagnostic({
        code: "GATEWAY_OUTSIDE_SUBNET",
        severity: "error",
        blocking: true,
        message: `El gateway ${gateway} no pertenece a la misma subred que ${ip}/${mask}.`,
        target: {
          device: ctx.mutation.targetDevice,
          field: "gateway",
        },
        suggestedFix: "Usa un gateway dentro de la misma red del host.",
      }),
    ];
  },
};
