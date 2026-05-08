import type { PacketTracerPathResolution } from "./app-types.js";

const DARWIN_CANDIDATES = [
  "/Applications/Cisco Packet Tracer 9.0.0/Cisco Packet Tracer 9.0.app",
  "/Applications/Cisco Packet Tracer 9.0.0.app",
  "/Applications/Cisco Packet Tracer 8.2.0.app",
  "/Applications/Cisco Packet Tracer 8.2.2/Cisco Packet Tracer 8.2.app",
  "/Applications/Cisco Packet Tracer 8.2.2/Cisco Packet Tracer.app",
  "/Applications/Cisco Packet Tracer 8.1.0.app",
  "/Applications/Cisco Packet Tracer 8.0.app",
  "/Applications/Cisco Packet Tracer.app",
  "/Applications/Cisco Packet Tracer 7.3.1.app",
  "/Applications/Cisco Packet Tracer 7.3.0.app",
];

const WINDOWS_CANDIDATES = [
  "C:\\Program Files\\Cisco Packet Tracer 9.0\\PacketTracer.exe",
  "C:\\Program Files\\Cisco Packet Tracer 8.2\\PacketTracer.exe",
  "C:\\Program Files\\Cisco Packet Tracer 8.1\\PacketTracer.exe",
  "C:\\Program Files\\Cisco Packet Tracer 8.0\\PacketTracer.exe",
  "C:\\Program Files\\Cisco Packet Tracer\\PacketTracer.exe",
];

export interface PacketTracerPathResolverDeps {
  platform: NodeJS.Platform;
  env: Record<string, string | undefined>;
  exists(path: string): boolean;
  scanDir?(dir: string): string[];
}

export class PacketTracerPathResolver {
  constructor(private readonly deps: PacketTracerPathResolverDeps) {}

  resolve(): PacketTracerPathResolution {
    const envPath = this.deps.env.PT_APP_PATH;
    if (envPath && this.deps.exists(envPath)) {
      return {
        platform: this.deps.platform,
        candidates: this.deps.platform === "win32" ? WINDOWS_CANDIDATES : DARWIN_CANDIDATES,
        selected: envPath,
        source: "env",
      };
    }
    const candidates = this.deps.platform === "win32" ? WINDOWS_CANDIDATES : DARWIN_CANDIDATES;
    const existing = candidates.filter((path) => this.deps.exists(path));
    if (existing[0]) {
      return {
        platform: this.deps.platform,
        candidates,
        selected: existing[0],
        source: "known-path",
      };
    }
    if (this.deps.platform === "darwin" && this.deps.scanDir) {
      try {
        const apps = this.deps.scanDir("/Applications");
        const ptApps = apps
          .filter((n) => n.includes("Packet Tracer") || n.includes("Cisco Packet Tracer"))
          .sort()
          .reverse();
        const appBundles: string[] = [];
        for (const app of ptApps) {
          const fullPath = `/Applications/${app}`;
          if (fullPath.endsWith(".app") && this.deps.exists(fullPath)) {
            appBundles.push(fullPath);
          } else if (!fullPath.endsWith(".app")) {
            const nested = (this.deps.scanDir(fullPath) ?? [])
              .filter((n) => n.endsWith(".app") && n.includes("Packet Tracer"))
              .map((n) => `${fullPath}/${n}`);
            appBundles.push(...nested);
          }
        }
        if (appBundles.length > 0) {
          return {
            platform: this.deps.platform,
            candidates: [...candidates, ...appBundles],
            selected: appBundles[0]!,
            source: "scan" as const,
          };
        }
      } catch {}
    }
    return {
      platform: this.deps.platform,
      candidates,
      selected: null,
      source: "fallback",
    };
  }
}