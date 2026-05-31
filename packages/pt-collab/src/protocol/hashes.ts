import { createHash } from "node:crypto";

export function sha256Buffer(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function stableJsonHash(value: unknown): string {
  const normalized = JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
  return createHash("sha256").update(normalized).digest("hex");
}

export function normalizeIosConfig(config: string): string {
  return config
    .replace(/^.*[#>]\s*/gm, "")
    .replace(/^(Building configuration|Current configuration).*$/gm, "")
    .replace(/^!.*$/gm, "")
    .replace(/^end$/gm, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeDeviceXml(xml: string): string {
  return xml.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
}

export function normalizeTopologySnapshot(snapshot: unknown): unknown {
  if (Array.isArray(snapshot)) {
    return snapshot.map(normalizeTopologySnapshot).sort((a, b) => {
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      return aStr.localeCompare(bStr);
    });
  }

  if (snapshot && typeof snapshot === "object") {
    const keys = Object.keys(snapshot as Record<string, unknown>).sort();
    const result: Record<string, unknown> = {};

    for (const key of keys) {
      if (["timestamp", "id", "uuid"].includes(key)) continue;
      result[key] = normalizeTopologySnapshot((snapshot as Record<string, unknown>)[key]);
    }

    return result;
  }

  return snapshot;
}
