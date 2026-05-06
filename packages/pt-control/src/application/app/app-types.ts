export type PlatformSource = "env" | "known-path" | "fallback";

export interface PacketTracerPathResolution {
  platform: NodeJS.Platform;
  candidates: string[];
  selected: string | null;
  source: PlatformSource;
}

export type AppStatusLevel = "unknown" | "stopped" | "running";

export interface AppProcessStatus {
  level: AppStatusLevel;
  pid: number | null;
  pidFile: string | null;
  lastHeartbeat: string | null;
  lastStatus: string | null;
}

export interface AppStatus {
  process: AppProcessStatus;
  runtime: {
    loaded: boolean;
    mainJs: string | null;
    mainJsExists: boolean;
    runtimeJs: string | null;
    runtimeJsExists: boolean;
  };
  project: {
    hasActiveFile: boolean;
    activeFile: string | null;
  };
}

export interface AppOpenOptions {
  wait?: boolean;
  waitTimeoutMs?: number;
  closeExisting?: boolean;
  saveExisting?: boolean;
  autosaveExisting?: boolean;
  force?: boolean;
  noRuntimeWait?: boolean;
}

export interface AppCloseOptions {
  save?: boolean;
  autosave?: boolean;
  force?: boolean;
  timeoutMs?: number;
}

export interface AppWaitOptions {
  runtime?: boolean;
  activeFile?: string;
  timeoutMs?: number;
}