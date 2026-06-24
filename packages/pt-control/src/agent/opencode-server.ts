// ============================================================================
// OpenCode Server Manager — gestiona opencode serve como proceso hijo
// y envía consultas via REST API.
// ============================================================================

import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export interface OpenCodeServerConfig {
  port: number;
  binaryPath: string;
  projectDir: string;
  pure: boolean;
  modelId: string;
  providerId: string;
}

export interface OpenCodeServerStatus {
  running: boolean;
  port: number | null;
  pid: number | null;
  sessionId: string | null;
  healthy: boolean;
  errorCount: number;
  lastError: string | null;
}

export interface OpenCodeServerManager {
  start(): Promise<void>;
  stop(): void;
  query(prompt: string): Promise<string>;
  getStatus(): OpenCodeServerStatus;
}

const DEFAULT_CONFIG: OpenCodeServerConfig = {
  port: Number(process.env.OPENCODE_SERVER_PORT) || 4099,
  binaryPath: process.env.OPENCODE_BIN || "/opt/homebrew/bin/opencode",
  projectDir: process.env.OPENCODE_PROJECT_DIR || process.cwd(),
  pure: process.env.OPENCODE_PURE !== "false",
  modelId: process.env.OPENCODE_MODEL || "",
  providerId: process.env.OPENCODE_PROVIDER || "",
};

const SERVER_READY_TIMEOUT = 30_000;
const QUERY_TIMEOUT = 60_000;

export function createOpenCodeServerManager(config?: Partial<OpenCodeServerConfig>): OpenCodeServerManager {
  return new OpenCodeServerManagerImpl({ ...DEFAULT_CONFIG, ...config });
}

class OpenCodeServerManagerImpl implements OpenCodeServerManager {
  private config: OpenCodeServerConfig;
  private process: ChildProcess | null = null;
  private sessionId: string | null = null;
  private _healthy = false;
  private port: number | null = null;
  private errorCount = 0;
  private lastError: string | null = null;
  private serverLogFile: string | null = null;

  constructor(config: OpenCodeServerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.process) {
      console.log("[opencode-server] Ya está en ejecución");
      return;
    }

    if (!fs.existsSync(this.config.binaryPath)) {
      throw new Error(`Binario opencode no encontrado: ${this.config.binaryPath}`);
    }

    this.port = this.config.port;

    // Log file for server output
    this.serverLogFile = path.join(
      this.config.projectDir,
      ".opencode-server.log",
    );

    const args = ["serve", "--port", String(this.port)];

    if (this.config.pure) {
      args.push("--pure");
    }

    console.log(`[opencode-server] Iniciando: ${this.config.binaryPath} ${args.join(" ")}`);

    // Start the server
    this.process = spawn(this.config.binaryPath, args, {
      cwd: this.config.projectDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      this.appendLog(data.toString());
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      this.appendLog(text);
    });

    this.process.on("exit", (code, signal) => {
      console.log(`[opencode-server] Proceso terminado (code=${code}, signal=${signal})`);
      this.process = null;
      this._healthy = false;

      if (signal !== "SIGTERM" && signal !== "SIGKILL") {
        this.lastError = `Server exited unexpectedly with code ${code}`;
        this.errorCount++;
      }
    });

    this.process.on("error", (err) => {
      console.error(`[opencode-server] Error en proceso: ${err.message}`);
      this.lastError = err.message;
      this.errorCount++;
    });

    // Wait for the server to become healthy
    await this.waitForReady();
    console.log(`[opencode-server] Servidor listo en http://127.0.0.1:${this.port}`);

    // Create a session
    await this.createSession();
  }

  stop(): void {
    if (this.process) {
      console.log("[opencode-server] Deteniendo servidor...");
      this.process.kill("SIGTERM");

      // Force kill if still running after 5s
      setTimeout(() => {
        if (this.process) {
          this.process.kill("SIGKILL");
          this.process = null;
        }
      }, 5000);
    }

    this.process = null;
    this._healthy = false;
    this.sessionId = null;
  }

  async query(prompt: string): Promise<string> {
    if (!this._healthy || !this.sessionId) {
      throw new Error("OpenCode server no está listo");
    }

    const url = `http://127.0.0.1:${this.port}/session/${this.sessionId}/message`;

    const body = {
      modelID: this.config.modelId || undefined,
      providerID: this.config.providerId || undefined,
      parts: [{ type: "text" as const, text: prompt }],
      system: "Eres un asistente experto en redes Cisco y Packet Tracer. Responde de forma clara y directa, en el mismo idioma de la consulta. Da comandos IOS completos cuando corresponda.",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(QUERY_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenCode API error ${response.status}: ${text}`);
    }

    const data = await response.json() as {
      parts?: Array<{ type?: string; text?: string }>;
    };

    const textParts = data?.parts?.filter((p) => p.type === "text") ?? [];
    const responseText = textParts.map((p) => p.text ?? "").join("\n");

    if (!responseText.trim()) {
      throw new Error("OpenCode devolvió respuesta vacía");
    }

    return responseText.trim();
  }

  getStatus(): OpenCodeServerStatus {
    return {
      running: this.process !== null,
      port: this.port,
      pid: this.process?.pid ?? null,
      sessionId: this.sessionId,
      healthy: this._healthy,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  private async waitForReady(): Promise<void> {
    const startTime = Date.now();
    const healthUrl = `http://127.0.0.1:${this.port}/api/health`;

    while (Date.now() - startTime < SERVER_READY_TIMEOUT) {
      if (!this.process) {
        throw new Error("OpenCode server process died during startup");
      }

      try {
        const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2000) });

        if (response.ok) {
          this._healthy = true;
          return;
        }
      } catch {
        // Server not ready yet, wait and retry
      }

      await sleep(500);
    }

    throw new Error(`OpenCode server no se inició en ${SERVER_READY_TIMEOUT}ms`);
  }

  private async createSession(): Promise<void> {
    const url = `http://127.0.0.1:${this.port}/session`;

    const body: Record<string, unknown> = {};
    if (this.config.modelId) body.modelID = this.config.modelId;
    if (this.config.providerId) body.providerID = this.config.providerId;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error creando sesión: ${response.status}: ${text}`);
    }

    const data = await response.json() as { id?: string };

    if (!data.id) {
      throw new Error("Respuesta sin session ID");
    }

    this.sessionId = data.id;
    console.log(`[opencode-server] Sesión creada: ${this.sessionId}`);
  }

  private appendLog(text: string): void {
    if (!this.serverLogFile) return;

    try {
      fs.appendFileSync(this.serverLogFile, text);
    } catch {
      // Ignore log errors
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
