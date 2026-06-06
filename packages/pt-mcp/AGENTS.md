# AGENTS.md — @cisco-auto/pt-mcp

> Guía de desarrollo para agentes de IA que trabajan en pt-mcp.

## Propósito

Servidor MCP (Model Context Protocol) que expone Packet Tracer como recursos y herramientas para LLMs.

## Arquitectura

```
src/
├── index.ts                        # Re-exports
├── types.ts
├── control/
│   └── mcp-control-context.ts      # Contexto de control MCP
├── prompts/
│   ├── register-prompts.ts         # Prompts MCP
├── resources/
│   ├── register-resources.ts       # Recursos MCP
├── runner/
│   ├── run-pt-cli.ts               # Ejecución de CLI en subprocess
│   ├── parse-cli-output.ts         # Parseo de output JSON/text
├── server/
│   ├── create-mcp-server.ts        # Factory del servidor MCP
│   ├── health.ts                   # Health check
│   ├── http-server.ts              # Servidor HTTP con SSE
│   └── start-pt-mcp-server.ts      # Entrypoint
├── queue/
│   ├── cmd-queue.ts                # Cola de comandos
└── tools/                          # 26 tool definitions
    ├── register-all-tools.ts
    ├── cmd-run-tool.ts (822 lines)
    ├── omni-cache.ts (890 lines)
    ├── cmd-performance.ts
    ├── cmd-batch-strategy.ts
    └── ...
```

## Exports principales

```typescript
export { runPtCli, type RunPtCliInput, type RunPtCliResult } from "./runner/run-pt-cli.js";
export { parseCliOutput } from "./runner/parse-cli-output.js";
export { startPtMcpServer, type StartPtMcpServerOptions, type PtMcpServerHandle } from "./server/start-pt-mcp-server.js";
export { type PtMcpCommandCatalogEntry } from "./types.js";
```

## Reglas

- No importar de pt-control, pt-runtime, ni file-bridge directamente.
- Usa subprocesso (`bun run pt <cmd>`) para interactuar con el CLI.
- Tools MCP deben ser registradas en `register-all-tools.ts`.
- Responses MCP siguen formato estándar con content/type text.
- Archivos grandes: `omni-cache.ts` (890), `cmd-run-tool.ts` (822) — candidatos a split.
