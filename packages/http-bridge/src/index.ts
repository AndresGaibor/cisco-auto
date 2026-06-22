import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { HttpBridgeOptions, CommandRequest, CommandResponse, HealthResponse } from "./types.js";
import { createRouter } from "./router.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";

export class HttpBridge {
  private readonly app: Hono;
  private readonly options: Required<HttpBridgeOptions>;
  private server: ReturnType<typeof serve> | null = null;
  private startTime: number;

  constructor(options: HttpBridgeOptions) {
    this.options = {
      port: options.port ?? 3789,
      host: options.host ?? "0.0.0.0",
      apiKey: options.apiKey ?? "dev-key-change-me",
      bridge: options.bridge,
    };
    this.startTime = Date.now();
    this.app = new Hono();
    this.setupMiddleware();
    this.setupRoutes();
  }

  get port(): number {
    const addr = this.server?.address();
    if (!addr || typeof addr === "string") return this.options.port;
    return addr.port;
  }

  private setupMiddleware() {
    this.app.use("*", errorHandler);
  }

  private setupRoutes() {
    this.app.get("/health", (c) =>
      c.json({
        status: "healthy",
        uptime: Date.now() - this.startTime,
        version: "0.1.0",
      } satisfies HealthResponse)
    );
    this.app.use("*", authMiddleware(this.options.apiKey));
    const router = createRouter(this.options.bridge);
    this.app.route("/", router);
  }

  start(): void {
    this.server = serve({
      fetch: this.app.fetch,
      port: this.options.port,
      hostname: this.options.host,
    });
    console.log(`[http-bridge] HTTP server listening on http://${this.options.host}:${this.port}`);
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }
}

export type { HttpBridgeOptions, CommandRequest, CommandResponse, HealthResponse };
