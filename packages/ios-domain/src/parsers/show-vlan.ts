import type { ShowVlan } from "@cisco-auto/types";

/**
 * Parse "show vlan" output
 */
export function parseShowVlan(output: string): ShowVlan {
  const lines = output.split("\n");
  const vlans: ShowVlan["vlans"] = [];
  let currentVlan: ShowVlan["vlans"][0] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match: VLAN Name Status Ports
    // Example: 1 default active Fa0/1, Fa0/2, Gi0/1
    const match = trimmed.match(/^(\d+)\s+(\S+)\s+(\S+)\s*(.*?)$/);
    
    if (match && !match[1]!.startsWith("VLAN")) {
      const portsStr = match[4] || "";
      const ports = portsStr
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      currentVlan = {
        id: parseInt(match[1]!, 10),
        name: match[2]!,
        status: match[3]! as "active" | "suspended" | "act/unsup",
        ports,
      };
      vlans.push(currentVlan);
    } else if (currentVlan && line.match(/^\s+[FGS]/)) {
      // Continuation line with additional ports
      const ports = trimmed.split(",").map(p => p.trim()).filter(Boolean);
      currentVlan.ports.push(...ports);
    } else if (!line.match(/^\s/) || line.trim().length === 0) {
      currentVlan = null;
    }
  }

  return { raw: output, vlans };
}