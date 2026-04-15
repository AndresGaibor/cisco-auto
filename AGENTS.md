# AGENTS.md — Cisco Auto

> Guía de desarrollo para agentes de IA que trabajan en este proyecto.

## Identidad del Proyecto

**cisco-auto** — Automatización de laboratorio Cisco Packet Tracer mediante una CLI profesional (`bun run pt`) y un runtime generado que se ejecuta dentro de PT.

## Stack Tecnológico

- **Runtime:** Bun (TypeScript directo, sin compilación)
- **Backend PT:** Scripts JavaScript injectados en Packet Tracer (`main.js`, `runtime.js`)
- **Workspace:** npm workspaces con 7 paquetes en `packages/`
- **Testing:** `bun test`
- **Linting:** `bun run lint` (eslint)

## Paquetes

| Paquete                | Descripción                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `packages/kernel`      | Núcleo: dominio IOS, plugins (VLAN, routing, security, services), backend Packet Tracer |
| `packages/pt-runtime`  | Generador de scripts PT (`main.js`, `runtime.js`, `catalog.js`) y API de tipos PT       |
| `packages/pt-control`  | CLI `bun run pt` — comandos para controlar PT en tiempo real                            |
| `packages/types`       | Tipos compartidos (`@cisco-auto/types`)                                                 |
| `packages/core`        | Utilidades compartidas                                                                  |
| `packages/ios-domain`  | Dominio IOS (value objects, entidades)                                                  |
| `packages/file-bridge` | Puente de archivos                                                                      |

## Convenciones Generales

### TypeScript

- Código fuente es `.ts` puro — Bun ejecuta sin compilación
- **No ejecutar `tsc`** para compilar. Usar `bun run typecheck` para verificación de tipos (solo lectura)
- Archivos compilados (`*.js`, `*.d.ts`) no se trackean en git

### Importaciones

```typescript
import { something } from "@cisco-auto/kernel/domain";
import type { SomeType } from "@cisco-auto/types";
```

### Bun en vez de Node

- `bun <file>` en vez de `node <file>` o `ts-node <file>`
- `bun test` en vez de `jest` o `vitest`
- `bun run <script>` en vez de `npm run <script>`
- `bun install` en vez de `npm install`
- Bun carga `.env` automáticamente

### Convenciones de Código

- **Comentarios en español** (strict rule)
- **Variables de dominio/negocio en español**: `usuario`, `calcularTotal()`, `estadoPedido`
- **Términos técnicos en inglés**: `middleware`, `request`, `payload`
- **Archivos `docs/`** — documentación extraída de PT en vivo, fuente de verdad para la API de PT

## Convenciones de Documentación

### AGENTS.md por paquete

Cada paquete tiene su propio `AGENTS.md` con:

1. Propósito del paquete
2. Clases, funciones, métodos y variables clave (especialmente los de `docs/`)
3. Arquitectura interna
4. Patrones de uso

### Documentación PT (`packages/pt-runtime/docs/`)

**FUENTE DE VERDAD** para la API de Packet Tracer:

- `PT-API.md` — Referencia completa de IPC
- `PT-API-COMPLETE.md` — Dump verificado en vivo (1348 líneas)
- `PT-GLOBAL-SCOPE.md` — 70 globals documentados
- `PT-NETWORK-SERVERS.md` — HTTP/TCP/UDP/WebSocket APIs
- `pt-script-result.json` — Resultado del dump de la API real

> **Regla:** Cualquier discrepancia entre el código y `docs/` —文档 es la fuente de verdad. Actualizar el código, no la docs.

## Workflow de Desarrollo

### Setup

```bash
bun install
```

### Comandos comunes

```bash
bun run pt --help              # Ver ayuda completa de PT CLI
bun test                       # Ejecutar tests
bun run lint                   # Linting
bun run typecheck              # Verificación de tipos
bun run pt:build               # Build y deploy a ~/pt-dev/
```

### Generar y deployar runtime

```bash
cd packages/pt-runtime
bun run deploy                 # Genera main.js, runtime.js, catalog.js → ~/pt-dev/
```

### Workflow de cambios

1. Modificar código en `packages/`
2. Si changed `pt-runtime`: `bun run deploy` para regenerar scripts PT
3. Dentro de PT: `File > Open > ~/pt-dev/main.js`
4. Verificar cambios en PT

## Recursos

- `CLAUDE.md` — Configuración principal del proyecto
- `packages/pt-runtime/docs/` — Documentación extraída de PT (API source of truth)
- `packages/kernel/src/plugin-api/` — Plugin API del kernel
- `packages/pt-runtime/src/pt-api/pt-api-registry.ts` — Definiciones de tipos para la API PT
