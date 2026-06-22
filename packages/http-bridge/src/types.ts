import type { FileBridgeV2 } from "@cisco-auto/file-bridge";

export interface HttpBridgeOptions {
  port?: number;
  host?: string;
  apiKey?: string;
  bridge: FileBridgeV2;
}

export interface CommandRequest {
  type: string;
  payload: unknown;
  timeoutMs?: number;
  expiresAtMs?: number;
}

export interface CommandResponse {
  id: string;
  seq: number;
  status: "queued";
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  version: string;
}
