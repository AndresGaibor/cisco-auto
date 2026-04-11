import type { ShowCdpNeighbors } from "@cisco-auto/types";

/**
 * Parse "show cdp neighbors" output
 */
export function parseShowCdpNeighbors(output: string): ShowCdpNeighbors {
  const lines = output.split("\n");
  const neighbors: ShowCdpNeighbors["neighbors"] = [];
  let started = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip header
    if (trimmed.startsWith("Device ID")) {
      started = true;
      continue;
    }

    if (!started || !trimmed) continue;

    // Device ID Local Intrfce Holdtme Capability Platform Port ID
    // Capability can be multiple tokens like "R S" or "R S I"
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(\d+)\s+((?:[A-Z]\s*)+)\s+(\S+)\s+(\S+)$/);
    
    if (match) {
      neighbors.push({
        deviceId: match[1]!,
        localInterface: match[2]!,
        holdtime: parseInt(match[3]!, 10),
        capability: match[4]!.trim(),
        platform: match[5]!,
        portId: match[6]!,
      });
    }
  }

  return { raw: output, neighbors };
}