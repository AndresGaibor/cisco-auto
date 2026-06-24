// ============================================================================
// Daemon Service — puentea consultas @agent desde canvas notes de PT
// hacia OpenCode (serve + API REST) y escribe las respuestas de vuelta.
// Corre en el HOST (NO en Packet Tracer).
// ============================================================================

import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentQuery, AgentResponse } from "@cisco-auto/types";
import {
  createOpenCodeServerManager,
  type OpenCodeServerManager,
  type OpenCodeServerConfig,
} from "./opencode-server.js";

export interface DaemonConfig {
  devDir: string;
  pollIntervalMs: number;
  opencode: Partial<OpenCodeServerConfig>;
}

export interface DaemonStatus {
  running: boolean;
  pollCount: number;
  queriesProcessed: number;
  errors: number;
  lastPollAt: number | null;
  config: {
    devDir: string;
    pollIntervalMs: number;
    opencodePort: number;
    opencodeHealthy: boolean;
    opencodeRunning: boolean;
    opencodeSessionId: string | null;
  };
}

const DEFAULT_CONFIG: DaemonConfig = {
  devDir: process.env.PT_DEV_DIR || path.join(process.env.HOME || "/tmp", "pt-dev"),
  pollIntervalMs: Number(process.env.AGENT_POLL_INTERVAL) || 2000,
  opencode: {},
};

export function createDaemonService(config?: Partial<DaemonConfig>): DaemonService {
  return new DaemonServiceImpl({ ...DEFAULT_CONFIG, ...config });
}

export interface DaemonService {
  start(): Promise<void>;
  stop(): void;
  getStatus(): DaemonStatus;
  isRunning(): boolean;
}

const AGENT_HTTP_PORT = 4100;

class DaemonServiceImpl implements DaemonService {
  private config: DaemonConfig;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private _running = false;
  private pollCount = 0;
  private queriesProcessed = 0;
  private errors = 0;
  private lastPollAt: number | null = null;
  private processing = false;
  private opencodeServer: OpenCodeServerManager;
  private httpServer: ReturnType<typeof import("node:http").createServer> | null = null;
  private responses = new Map<string, string>();

  constructor(config: DaemonConfig) {
    this.config = config;
    this.opencodeServer = createOpenCodeServerManager(config.opencode);
  }

  async start(): Promise<void> {
    if (this._running) return;

    this.ensureDirectories();
    this.startHttpServer();

    try {
      await this.startOpencodeServer();
    } catch (err) {
      console.error(`[daemon] Error iniciando OpenCode: ${err instanceof Error ? err.message : String(err)}`);
    }

    this._running = true;

    this.timerId = setInterval(() => this.poll(), this.config.pollIntervalMs);

    console.log(
      `[daemon] Iniciado (devDir=${this.config.devDir}, intervalo=${this.config.pollIntervalMs}ms, httpPort=${AGENT_HTTP_PORT})`,
    );
  }

  stop(): void {
    if (!this._running) return;

    this._running = false;

    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    this.opencodeServer.stop();
    console.log("[daemon] Detenido");
  }

  isRunning(): boolean {
    return this._running;
  }

  getStatus(): DaemonStatus {
    const serverStatus = this.opencodeServer.getStatus();

    return {
      running: this._running,
      pollCount: this.pollCount,
      queriesProcessed: this.queriesProcessed,
      errors: this.errors,
      lastPollAt: this.lastPollAt,
      config: {
        devDir: this.config.devDir,
        pollIntervalMs: this.config.pollIntervalMs,
        opencodePort: serverStatus.port ?? 0,
        opencodeHealthy: serverStatus.healthy,
        opencodeRunning: serverStatus.running,
        opencodeSessionId: serverStatus.sessionId,
      },
    };
  }

  private startOpencodeServer(): void {
    this.opencodeServer.start().catch((err) => {
      console.error(`[daemon] Error iniciando OpenCode server: ${err.message}`);
      this.errors++;
    });
  }

  private startHttpServer(): void {
    const http = require("node:http");

    const server = http.createServer((req: any, res: any) => {
      console.log(`[daemon] HTTP ${req.method} ${req.url}`);

      if (req.method === "GET" && req.url.startsWith("/response/")) {
        const noteId = req.url.substring("/response/".length);
        const response = this.responses.get(noteId);

        console.log(`[daemon] Response request for: ${noteId}, found: ${response !== undefined}`);

        if (response !== undefined) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ response }));
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Respuesta no disponible" }));
        }
      } else if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    });

    server.on("error", (err: any) => {
      console.error(`[daemon] Error HTTP server: ${err.message}`);
    });

    server.listen(AGENT_HTTP_PORT, "127.0.0.1", () => {
      console.log(`[daemon] HTTP server listening on 127.0.0.1:${AGENT_HTTP_PORT}`);
    });

    this.httpServer = server;
  }

  private ensureDirectories(): void {
    const inbox = path.join(this.config.devDir, "agent", "inbox");
    const outbox = path.join(this.config.devDir, "agent", "outbox");

    try {
      fs.mkdirSync(path.join(this.config.devDir, "agent"), { recursive: true });
      fs.mkdirSync(inbox, { recursive: true });
      fs.mkdirSync(outbox, { recursive: true });
    } catch {
      console.error("[daemon] Error creando directorios agent/");
    }
  }

  private async poll(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      this.pollCount++;
      this.lastPollAt = Date.now();

      const inboxDir = path.join(this.config.devDir, "agent", "inbox");
      let files: string[] = [];

      try {
        files = fs.readdirSync(inboxDir).filter((f) => f.endsWith(".json"));
      } catch {
        return;
      }

      for (const file of files) {
        if (!this._running) break;

        const filePath = path.join(inboxDir, file);

        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const query: AgentQuery = JSON.parse(content);

          if (!query.query || !query.noteId) {
            fs.unlinkSync(filePath);
            continue;
          }

          const response = await this.opencodeServer.query(query.query);

          const agentResponse: AgentResponse = {
            id: query.id,
            noteId: query.noteId,
            response,
            completedAt: Date.now(),
          };

          this.responses.set(query.noteId, response);
          console.log(`[daemon] Respuesta almacenada en Map para nota ${query.noteId}`);

          try {
            const commandsDir = path.join(this.config.devDir, "commands");
            fs.writeFileSync(
              path.join(commandsDir, "agent-response-" + query.noteId + ".json"),
              JSON.stringify(agentResponse, null, 2),
              "utf-8",
            );
          } catch {}

          fs.unlinkSync(filePath);

          this.queriesProcessed++;
          console.log(`[daemon] Respuesta enviada para nota ${query.noteId}`);
        } catch (err) {
          this.errors++;
          const errorMsg = `Error del agente: ${err instanceof Error ? err.message : String(err)}`;
          const noteId = file.replace(".json", "");

          this.responses.set(noteId, errorMsg);
          console.log(`[daemon] Error almacenado en Map para nota ${noteId}`);

          try {
            const commandsDir = path.join(this.config.devDir, "commands");
            fs.writeFileSync(
              path.join(commandsDir, "agent-response-" + noteId + ".json"),
              JSON.stringify({ noteId, response: errorMsg, completedAt: Date.now() }, null, 2),
              "utf-8",
            );
            fs.unlinkSync(filePath);
          } catch {}

          console.error(`[daemon] Error procesando ${file}:`, err);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
