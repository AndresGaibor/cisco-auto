import type { PacketTracerPathResolution } from "./app-types.js";

const DARWIN_CANDIDATES = [
  "/Applications/Cisco Packet Tracer 9.0.0.app",
  "/Applications/Cisco Packet Tracer 8.2.0.app",
  "/Applications/Cisco Packet Tracer 8.1.0.app",
  "/Applications/Cisco Packet Tracer 8.0.app",
  "/Applications/Cisco Packet Tracer.app",
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
    return {
      platform: this.deps.platform,
      candidates,
      selected: existing[0] ?? null,
      source: existing[0] ? "known-path" : "fallback",
    };
  }
}