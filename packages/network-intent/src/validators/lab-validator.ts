import { z } from "zod";
import {
  LabSpecSchema,
  type ParsedLabYaml,
  type LabValidationResult,
  type LabSpec,
  validateLabSafe as validateLabSafeOriginal,
  analyzeTopology,
  type TopologyStats,
} from "../model/lab-spec.js";
import { NetworkLabIntentSchema, type NetworkLabIntent } from "../schema.js";

export interface LabValidationResultFull {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats?: TopologyStats;
  schemaErrors?: z.ZodIssue[];
}

export function validateLabSpec(parsed: ParsedLabYaml): LabValidationResultFull {
  const safeResult = validateLabSafeOriginal(parsed);

  if (!safeResult.success) {
    return {
      valid: false,
      errors: safeResult.errors || [],
      warnings: safeResult.warnings || [],
    };
  }

  try {
    const spec = toLabSpecFromParsed(parsed);
    const stats = analyzeTopology(spec);

    return {
      valid: true,
      errors: [],
      warnings: safeResult.warnings || [],
      stats,
    };
  } catch (e) {
    return {
      valid: false,
      errors: [String(e)],
      warnings: safeResult.warnings || [],
    };
  }
}

function toLabSpecFromParsed(parsed: ParsedLabYaml): LabSpec {
  const metadata = parsed.lab?.metadata || parsed.metadata || {};
  const name = metadata.name || parsed.name || "Lab";

  const devices =
    parsed.lab?.topology?.devices || parsed.topology?.devices || parsed.devices || [];

  const connections =
    parsed.lab?.topology?.connections ||
    parsed.topology?.connections ||
    parsed.links ||
    [];

  return {
    metadata: {
      name,
      version: metadata.version ?? "1.0",
      author: metadata.author ?? "unknown",
      createdAt: new Date(),
    },
    devices: devices.map((d: any) => ({
      id: d.name ?? "",
      name: d.name ?? "",
      type: (d.type ?? "router").toLowerCase(),
      hostname: d.hostname ?? d.name ?? "",
      managementIp: d.management?.ip,
      interfaces: (d.interfaces || []).map((i: any) => ({
        name: i.name ?? "",
        description: i.description,
        ip: i.ip,
        subnetMask: i.subnetMask,
        shutdown: i.shutdown,
        switchportMode: i.mode?.toLowerCase(),
        vlan: i.vlan ? { brandedValue: i.vlan.toString() } : undefined,
      })),
      security: d.security,
      vlans: d.vlans,
      routing: d.routing,
      services: d.services,
    })),
    connections: connections.map((c: any) => {
      const fromDevice = typeof c.from === "string" ? c.from : c.from?.device ?? "";
      const fromPort =
        typeof c.from === "string"
          ? c.fromInterface ?? "unknown"
          : c.from?.port ?? c.fromInterface ?? "unknown";
      const toDevice = typeof c.to === "string" ? c.to : c.to?.device ?? "";
      const toPort =
        typeof c.to === "string"
          ? c.toInterface ?? "unknown"
          : c.to?.port ?? c.toInterface ?? "unknown";

      return {
        id: `${fromDevice}-${toDevice}`,
        from: { deviceId: "", deviceName: fromDevice, port: fromPort },
        to: { deviceId: "", deviceName: toDevice, port: toPort },
        cableType: c.cable ?? c.type ?? "straight-through",
      };
    }),
  };
}

export interface NetworkIntentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: z.ZodIssue[];
}

export function validateNetworkIntent(intent: unknown): NetworkIntentValidationResult {
  const result = NetworkLabIntentSchema.safeParse(intent);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      issues: [],
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
    warnings: [],
    issues: result.error.issues,
  };
}

export function validateNetworkIntentFromYaml(yamlContent: string): NetworkIntentValidationResult {
  try {
    const parsed = JSON.parse(yamlContent);
    return validateNetworkIntent(parsed);
  } catch (e) {
    return {
      valid: false,
      errors: [String(e)],
      warnings: [],
      issues: [],
    };
  }
}
