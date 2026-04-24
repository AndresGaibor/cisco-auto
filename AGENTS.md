# AGENTS.md — Cisco Auto

> Guía de desarrollo para agentes de IA que trabajan en este proyecto.

## Regla General: Usar Subagentes Siempre

**Priorizar el uso de subagentes para CUALQUIER actividad que no sea trivial.**

Cuando enfrentes una tarea, delegala a un subagente en vez de resolverla directamente:

- Investigar código, bugs, o arquitectura → delegar
- Implementar features o refactors → delegar
- Escribir tests → delegar
- Reviews de código → delegar
- Buscar archivos o patrones → delegar
- Documentación → delegar
- Cualquier tarea que no sea "unas líneas de cambio obvias" → delegar

**Patrón:**
1. Analizá la tarea → ¿es más que "cambio obvious de unas líneas"?
2. Si sí → usá `Agent` con el subagente apropiado
3. Si no → resolvela directo

**No significa** plan formal para cada cosa. Significa: no hagas trabajo pesado manual cuando podés delegar.

Delegar es más rápido, produce mejor contexto, y evita que se agote el contexto principal.

**Revisar documentación primero:** Antes de actuar, buscar en `docs/` si ya hay respuesta. La documentación de PT (`packages/pt-runtime/docs/`) es fuente de verdad para la API de Packet Tracer.

### Selección Rápida

| Tarea | Subagente |
|-------|-----------|
| Feature nuevo, multi-archivo | `ecc:planner` → `ecc:code-reviewer` |
| Bug sin root cause claro | `ecc:debugger` |
| Refactor arquitectónico | `ecc:architect` |
| Código nuevo/modificado | `ecc:code-reviewer` |
| Changes de seguridad | `ecc:security-reviewer` |
| Tests nuevos | `ecc:tdd` |
| Performance problem | `ecc:performance-optimizer` |
| DB/migration | `ecc:database-reviewer` |
| Limpieza dead code | `ecc:refactor-cleaner` |
| TypeScript específico | `ecc:typescript-reviewer` |

### Cómo Invocar

```typescript
Agent({
  description: "Breve descripción",
  prompt: "Contexto: qué hacés, por qué. Archivos: paths. Pregunta específica.",
  subagent_type: "ecc:code-reviewer"
})
```

## Protocolo de Terminal (Command Prompt)

**IMPORTANTE:** Nunca asumas que los comandos de terminal en Packet Tracer son síncronos ni uses esperas arbitrarias (`setTimeout`).

1. **Uso de `pt cmd`**: Para diagnósticos rápidos en cualquier dispositivo (PC, Router, Switch, WLC, ASA), usa siempre el alias raíz:
   ```bash
   bun run pt cmd "PC1" "ping 192.168.1.1"
   ```
2. **Historial Estructurado**: Para auditar comandos pasados con separación clara de output, usa:
   ```bash
   bun run pt host history "PC1"
   ```
3. **Motor Determinista**: Toda la ejecución de terminal ahora está gobernada por el `CommandExecutor`, el cual detecta la finalización basándose en **estabilidad de output (250ms)** y reconocimiento estructural del prompt, superando la inestabilidad de los eventos nativos de PT. Posee auto-recuperación ante bloqueos de DNS (`Translating...`) mediante `Ctrl+C` proactivo.
4. **Sanitización**: Los parsers siempre reciben texto limpio (sin `\b`, `BELL`, ni `ANSI`); no intentes limpiar el output manualmente en el frontend.

## Protocolo de Omnisciencia (Modo Dios)

**IMPORTANTE:** Si un comando oficial de la API (`addDevice`, `addLink`, `setIpAddress`) falla con un error `[object Object]` o un timeout, NO te rindas. El agente debe contraatacar usando la **Omnisciencia de Capa 0**.

### 🛠️ El Comando `pt omni raw`
Este comando permite inyectar Javascript puro directamente en el motor C++ de Packet Tracer. Úsalo para:
- **Bypass de Nombres:** Si un borrado por nombre falla, borra por referencia de objeto usando el shortcut `w`.
- **Bypass de Booteo:** Si un router bloquea comandos, usa `device.skipBoot()` inyectado.
- **Auditoría Forense:** Lee tablas MAC, ARP y configuraciones sin pasar por la consola (vía `AssessmentModel`).

### 🚀 Shortcuts Inyectados en el Kernel
Cuando escribas código para `pt omni raw`, tienes acceso a estos alias pre-inyectados:
- `ipc`: El objeto base de comunicación.
- `n`: El objeto `Network` (topología en RAM).
- `w`: El `LogicalWorkspace` (control gráfico y creación de enlaces).
- `global`: El contexto raíz (acceso a `AssessmentModel`, `Simulation`, `Base64`).
- `privileged`: El `_ScriptModule` (acceso a archivos del host macOS/Linux).

### 🔍 Estrategia de Auto-Mejora y Debugging
Si detectas un fallo persistente:
1.  **Investigación Genómica:** Usa `pt omni genome <device>` para ver el XML real del equipo.
2.  **Inyección de Prueba:** Usa `pt omni raw` para interrogar la memoria RAM del simulador (ej. `n.getDeviceCount()`).
3.  **Parcheo Dinámico:** Si descubres un método nuevo, documéntalo inmediatamente en `docs/ULTIMATE_PT_API_DEEP_DIVE.md` y actualiza el `OmniscienceService` en `pt-control`.

Referencia técnica completa: `docs/PT_EVALUATE_HACKING_GUIDE.md`.

---

## Identidad del Proyecto

**cisco-auto** — Automatización de laboratorio Cisco Packet Tracer mediante una CLI profesional (`bun run pt`) y un runtime generado que se ejecuta dentro de PT.

## Stack Tecnológico

- **Runtime:** Bun (TypeScript directo, sin compilación)
- **Backend PT:** Scripts JavaScript injectados en Packet Tracer (`main.js`, `runtime.js`)
- **Workspace:** npm workspaces con 7 paquetes en `packages/`
- **Testing:** `bun test`
- **Linting:** `bun run lint` (eslint)

## Arquitectura main.js / runtime.js

**main.js (kernel):** Solo carga `runtime.js`. Maneja lifecycle, command queue, lease, heartbeat, job execution. **No se modifica más.** Su único trabajo: bootstrap → load runtime → poll commands → delegate to runtime.

**runtime.js:** Primitives PT-safe, terminal engine, y adapters de bajo nivel. NO contiene lógica de negocio compuesta. Ver `docs/architecture/runtime-control-boundary.md`.

```
main.js (kernel, casi estático)
  └─ load runtime.js
  └─ poll commands/
  └─ write results/
  └─ deferred jobs (job-executor)

runtime.js (lógica, iterativo)
  └─ _ptDispatch(payload, api)
      ├─ handleListDevices
      ├─ handleSnapshot
      ├─ handleConfigIos
      ├─ handleExecIos
      └─ ...todos los command handlers
```

**Flujo:**
1. CLI escribe `commands/<id>-<type>.json`
2. `main.js` polls → claims → pasa payload a `runtime.js` via `_ptDispatch()`
3. `runtime.js` ejecuta handler → retorna `RuntimeResult`
4. `main.js` escribe `results/<id>.json`
5. CLI lee resultado

**Build:** `bun run pt:build` genera ambos desde `packages/pt-runtime/src/`. `main.js` se genera de `src/pt/kernel/` (kernel + terminal + entry). `runtime.js` se genera de `src/runtime/`.

**Hot reload:** Si solo se cambia `runtime.js` (lógica), NO hace falta recargar `main.js` en PT. El kernel tiene reload automático de `runtime.js` cuando detecta que cambió el archivo `mtime`. Solo recargar `main.js` si se modificó el kernel (`src/pt/kernel/`) o hay un error de bootstrap.

**Reglas de kernel vs runtime:**

**IMPORTANTE — Nueva Frontera (Fase 1):**

- `pt-runtime` es **thin kernel**: kernel lifecycle, dispatch, primitives PT-safe, terminal engine, adapters omni de bajo nivel. **NO lógica de negocio**.
- `pt-control` es **orchestration brain**: planners, workflows, diagnosis, verification, policies, evidence evaluation.
- Handlers de negocio (VLAN, DHCP compuesto, routing) deben vivir en `pt-control`, no en runtime.
- Ver documento canónico: `docs/architecture/runtime-control-boundary.md`

**Reglas heredadas:**
- NO agregar lógica de negocio en el kernel (`src/pt/kernel/`)
- Si el usuario pide algo en el kernel y es lógica → hacerlo en runtime (`src/runtime/`) en vez
- Si se necesita testear lógica del kernel → probar primero en runtime si es posible (es el entorno real de ejecución)
- Tests para kernel son temporales, solo para verificar que algo no se rompió

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
- `packages/pt-runtime/AGENTS.md` — Detalle completo de la API PT (interfaces, globals, constants, patrones de uso)
