import type { ShowIpInterfaceBrief } from "@cisco-auto/types";

/**
 * Parse "show ip interface brief" output
 */
export function parseShowIpInterfaceBrief(output: string): ShowIpInterfaceBrief {
  const lines = output.split("\n");
  const interfaces: ShowIpInterfaceBrief["interfaces"] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match: Interface IP-Address OK? Method Status Protocol
    // Status can be "administratively down" (2 words), "up", or "down"
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+((?:administratively\s+)?(?:up|down))\s+(up|down)$/i);
    
    if (match && !match[1]!.startsWith("Interface")) {
      interfaces.push({
        interface: match[1]!,
        ipAddress: match[2]!,
        ok: match[3]!,
        method: match[4]!,
        status: match[5]!.trim() as "up" | "down" | "administratively down",
        protocol: match[6]! as "up" | "down",
      });
    }
  }

  return { raw: output, interfaces };
}