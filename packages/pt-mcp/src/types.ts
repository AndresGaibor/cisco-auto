export interface PtMcpCommandCatalogEntry {
  id: string;
  name: string;
  aliases?: string[];
  group: string;
  summary: string;
  description: string;
  examples: Array<{ command: string; description: string }>;
  related: string[];
  agentHints: string[];
}

export interface RunPtCliInput {
  repoRoot: string;
  cliEntrypoint: string;
  argv: string[];
  stdin?: string | null;
  timeoutMs?: number;
  parseJson?: boolean;
  outputMode?: "buffer" | "spool";
  spoolDir?: string;
  previewBytes?: number;
  env?: Record<string, string | undefined>;
}

export interface RunPtCliResult {
  ok: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  argv: string[];
  durationMs: number;
  stdout: string;
  stderr: string;
  json: unknown | null;
  truncated: {
    stdout: boolean;
    stderr: boolean;
  };
  stdoutBytes?: number;
  stderrBytes?: number;
  stdoutPath?: string;
  stderrPath?: string;
  jsonPath?: string;
  jsonParsed?: boolean;
  spoolDir?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface StartPtMcpServerOptions {
  repoRoot: string;
  cliEntrypoint: string;
  host?: string;
  port?: number;
  path?: string;
  appName?: string;
  appVersion?: string;
  commandCatalog?: PtMcpCommandCatalogEntry[];
  autoFunnel?: boolean;
  live?: boolean;
  allowOrigins?: string[];
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

export interface PtMcpServerHandle {
  localUrl: string;
  publicUrl: string | null;
  close(): Promise<void>;
}
