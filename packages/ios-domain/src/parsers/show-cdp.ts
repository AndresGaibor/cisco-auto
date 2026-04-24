import type { ShowCdpNeighbors } from "@cisco-auto/types";

/**
 * Parser para output de "show cdp neighbors".
 * Usa parsing de columnas fixed-width basado en el header format:
 * Device ID(0-16), Local Intrfce(16-30), Holdtime(30-39), Capability(39-56), Platform(56-66), Port ID(66+)
 * @param output - Output crudo del comando
 * @returns ShowCdpNeighbors con array de vecinos descubiertos
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

    if (!started || !trimmed || line.length < 60) continue;

    // Fixed-width column parsing (positions determined from header alignment with 6-char leading indent)
    // Device ID: 6-22, Local Intrfce: 22-38, Holdtime: 38-50, Capability: 50-63, Platform: 63-77, Port ID: 77+
    const deviceId = line.substring(6, 22).trim();
    const localInterface = line.substring(22, 38).trim();
    const holdtimeStr = line.substring(38, 50).trim();
    const capability = line.substring(50, 63).trim();
    // Port ID typically starts with interface types or "Port"
    const portPatterns = ['Gig', 'Ser', 'Fas', 'Port', 'Eth', 'Hun'];
    const afterPlatform = line.substring(63);
    let platformEnd = afterPlatform.length;
    for (const pattern of portPatterns) {
      const idx = afterPlatform.indexOf(pattern);
      if (idx !== -1 && idx < platformEnd) {
        platformEnd = idx;
      }
    }
    const platform = afterPlatform.substring(0, platformEnd).trim();
    const portId = afterPlatform.substring(platformEnd).trim();

    if (!deviceId || !localInterface) continue;

    const holdtime = parseInt(holdtimeStr, 10);
    if (isNaN(holdtime)) continue;

    neighbors.push({
      deviceId,
      localInterface,
      holdtime,
      capability,
      platform,
      portId,
    });
  }

  return { raw: output, neighbors };
}