import type { PTFileManager } from "../pt-api/pt-api-registry";
import type { LinkRegistry, RegistryLink } from "./link-types";

const LINK_REGISTRY = "link-registry.json";

export function loadLinksJson(dir: string, fm: PTFileManager): LinkRegistry {
  const legacyPath = dir + "/links.json";
  try {
    if (!fm.fileExists(legacyPath)) return {};
    const content = fm.getFileContents(legacyPath);
    const raw = JSON.parse(content);
    const result: LinkRegistry = {};
    for (const [key, val] of Object.entries(raw)) {
      const entry = val as Record<string, unknown>;
      result[key] = {
        device1: String(entry.device1 ?? entry.dev1 ?? ""),
        port1: String(entry.port1 ?? entry.p1 ?? ""),
        device2: String(entry.device2 ?? entry.dev2 ?? ""),
        port2: String(entry.port2 ?? entry.p2 ?? ""),
        source: String(entry.source ?? entry.linkType ?? "legacy-links-json"),
        createdAt: typeof entry.createdAt === "number" ? entry.createdAt : Date.now(),
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function getLinkRegistry(dir: string, fm: PTFileManager): LinkRegistry {
  const regPath = dir + "/" + LINK_REGISTRY;
  try {
    if (!fm.fileExists(regPath)) return {};
    const content = fm.getFileContents(regPath);
    return JSON.parse(content) as LinkRegistry;
  } catch {
    return {};
  }
}

export function saveLinkRegistry(dir: string, fm: PTFileManager, registry: LinkRegistry): void {
  const regPath = dir + "/" + LINK_REGISTRY;
  fm.writePlainTextToFile(regPath, JSON.stringify(registry, null, 2));
}

export function mergeRegistries(primary: LinkRegistry, legacy: LinkRegistry): LinkRegistry {
  const merged = { ...primary };
  for (const [key, entry] of Object.entries(legacy)) {
    if (!merged[key]) merged[key] = entry;
  }
  return merged;
}

export function collectRegistryLinks(registry: LinkRegistry): RegistryLink[] {
  const entries = Object.entries(registry);
  const result: RegistryLink[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i][1];
    result.push({
      device1: entry.device1,
      port1: entry.port1,
      device2: entry.device2,
      port2: entry.port2,
      source: entry.source,
    });
  }
  return result;
}
