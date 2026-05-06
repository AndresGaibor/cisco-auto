# Packet Tracer App Project MCP Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir una capa robusta para abrir, detectar, guardar, autosalvar, cerrar, recuperar y continuar laboratorios de Cisco Packet Tracer desde `bun run pt` y desde MCP con herramientas dedicadas.

**Architecture:** Mantener `pt-runtime` como thin runtime con handlers PT-safe para project/app primitives; poner orquestación, filesystem host, procesos OS, autosaves y recovery en `pt-control`; mantener `apps/pt-cli` como capa delgada de comandos y presentación; exponer herramientas MCP específicas que llamen argv fijos y reduzcan el uso de `pt_cli` y `pt_omni_raw`. Implementar primero project status/save/autosave porque elimina el riesgo inmediato de pérdida de trabajo, luego app open/close/wait, luego recovery resilient, y al final hardening/chunking.

**Tech Stack:** TypeScript, Bun, Commander, `@cisco-auto/file-bridge`, runtime Packet Tracer ES5-safe, MCP SDK con `zod/v4`, Node/Bun filesystem, `child_process.spawn`, macOS `open`/`pgrep`/`osascript`, Windows PowerShell.

## Contexto Verificado

- CLI pública se registra en `apps/pt-cli/src/commands/command-registry.ts` mediante `PUBLIC_COMMAND_DEFINITIONS`.
- MCP registra tools en `packages/pt-mcp/src/tools/register-tools.ts`; hoy existen `pt_cli`, `pt_doctor`, `pt_runtime_status`, `pt_device_list`, `pt_help`, `pt_list_commands`, `pt_omni_raw`.
- MCP ejecuta CLI en `packages/pt-mcp/src/runner/run-pt-cli.ts` con `spawn("bun", ["run", input.cliEntrypoint, ...argv])`.
- Runtime estable se registra en `packages/pt-runtime/src/handlers/registration/stable-handlers.ts`.
- `pt-runtime` ya tiene heartbeat en `packages/pt-runtime/src/pt/kernel/heartbeat.ts`, actualmente escribe `PT_DEV_DIR/heartbeat.json`.
- `file-bridge` ya tiene recovery de comandos/in-flight en `packages/file-bridge/src/v2/crash-recovery.ts`; no duplicar esa responsabilidad en `pt-control`, solo consumir sus señales.
- `pt-control` compone servicios en `packages/pt-control/src/application/bootstrap/control-composition.ts` y expone API por `packages/pt-control/src/controller/pt-controller.ts`.
- Evidencia empírica adicional está en `/Users/andresgaibor/Downloads/packet_tracer_omni_raw_api_descubierta.md`, generada con `pt_omni_raw` sobre Packet Tracer 9.0.

## Evidencia Omni Raw A Usar Como Contrato Empírico

- `ipc.appWindow().getActiveFile()` devuelve clase `NetworkFile`.
- `NetworkFile.getSavedFilename()` devuelve el path `.pkt` activo; vacío implica proyecto no guardado en disco.
- `NetworkFile.isActivityFile()` está validado y devuelve `false` para `.pkt` normal.
- `NetworkFile.getNetworkDescription()` existe y puede devolver string vacío.
- `ipc.appWindow().fileSave()` está validado, devuelve boolean y no acepta argumentos; `fileSave(true)` y `fileSave(false)` dan `Invalid arguments`.
- `ipc.appWindow().fileSaveToBytes()` devuelve un `Array` normal de enteros con signo; en host convertir con `b & 0xff` antes de `Buffer.from(...)`.
- `ipc.appWindow().fileSaveAsNoPrompt(path, bool)` funciona, pero cambia `getSavedFilename()` al destino; no usar para autosave normal.
- `ipc.appWindow().getDefaultFileSaveLocation()`, `getTempFileLocation()` y `getBasePath()` están validados y sirven para `project status`/`app status`.
- `ipc.appWindow().getActiveWorkspace().getLogicalWorkspace().addDevice(type, model, x, y)` está validado; `addDevice(9, "Server-PT", 100, 100)` devuelve un nombre como `Server0`.
- `addDevice(9, 0, 100, 100)` creó residuos `Power Distribution Device*`; validar tipos/modelos antes de mutar.
- `LogicalWorkspace.createLink(nameA, portA, nameB, portB, 8100|8101)` está validado para Ethernet; `-1`, `0`, `1` no crean enlace entre servidores.
- `LogicalWorkspace.removeDevice(name)` elimina el dispositivo y limpia links asociados.
- `LogicalWorkspace.deleteLink(linkObject)` no funciona; `deleteLink(uuid)` y firmas por endpoints quedan pendientes y no deben documentarse como contrato hasta validarlas.
- Para resolver cables, usar `link.getPort1()`/`getPort2()` y luego `port.getOwnerDevice().getName()` + `port.getName()`; `link.getOtherPort(...)` no quedó validado.
- Para IOS, usar `device.getConsoleLine()` o `device.getCommandLine()` y `line.enterCommand(string)`; `device.enterCommand(string)` falla.
- `ConsoleLine.getOutput()` entrega salida, pero la paginación `--More--` puede consumir el primer carácter del siguiente comando; recovery/runner debe tratar pager como riesgo conocido.
- APIs como `_NetAccess`, `_SystemFileManager`, `_ScriptModule.*`, `fileOpen`, `fileSaveToBytes`, `fileSaveAsNoPrompt` son sensibles porque pueden tocar host/filesystem/red o estado de app; tools MCP dedicadas deben tener schemas estrechos y anotaciones correctas.

## Reglas De Implementación

- No editar `~/pt-dev` como source; modificar TypeScript y validar con `bun run pt build` cuando cambie runtime.
- Todo handler nuevo en `pt-runtime` debe ser PT-safe: sin `async/await`, `class`, `let/const`, template literals, optional chaining, `globalThis`, `require`, `node:*` en código generado.
- No usar `fileSaveAsNoPrompt()` para autosave normal porque cambia `getSavedFilename()` activo.
- Para autosaves frecuentes usar `ipc.appWindow().fileSaveToBytes()` y escribir bytes en host desde Node/Bun.
- `pt app close --force` y tool MCP `pt_app_close` se consideran destructivos operacionalmente.
- Cada fase termina con tests focalizados y `git diff --check`; no hacer commits a menos que el usuario lo pida.

## Fase 0: Preparación Y Baseline

### Task 0.1: Confirmar contrato público actual

**Files:**
- Read: `apps/pt-cli/src/commands/command-registry.ts`
- Read: `apps/pt-cli/src/__tests__/ux/root-registry.test.ts`
- Read: `apps/pt-cli/src/__tests__/ux/help.test.ts`
- Read: `packages/pt-mcp/src/tools/register-tools.ts`

**Step 1: Ejecutar baseline de CLI**

Run: `bun run pt --help`

Expected: PASS; aparecen comandos públicos actuales y todavía no aparecen `app` ni `project`.

**Step 2: Ejecutar baseline de tests UX/MCP**

Run: `bun test apps/pt-cli/src/__tests__/ux/root-registry.test.ts apps/pt-cli/src/__tests__/ux/help.test.ts packages/pt-mcp/src/tools/register-tools.test.ts packages/pt-mcp/src/runner/run-pt-cli.test.ts`

Expected: PASS antes de tocar código; si falla, registrar fallo como preexistente.

**Step 3: Verificar whitespace**

Run: `git diff --check`

Expected: Sin salida.

## Fase 1: Runtime Project Handlers

### Task 1.1: Agregar tests de handlers project

**Files:**
- Create: `packages/pt-runtime/src/__tests__/handlers/project.test.ts`
- Later create: `packages/pt-runtime/src/handlers/project.ts`
- Modify later: `packages/pt-runtime/src/handlers/registration/stable-handlers.ts`

**Step 1: Escribir test fallido para `__projectStatus`**

Add test covering active file metadata with fake `ipc.appWindow()` and fake `getNet()`.

```ts
import { describe, expect, test } from "bun:test";
import { handleProjectStatus } from "../../handlers/project.js";

function createDeps(overrides: Record<string, unknown> = {}) {
  const archivoActivo = {
    getClassName: () => "NetworkFile",
    getSavedFilename: () => "/Users/me/labs/taller.pkt",
    isActivityFile: () => false,
    getNetworkDescription: () => "Taller CCNA",
  };
  const appWindow = {
    getActiveFile: () => archivoActivo,
    getDefaultFileSaveLocation: () => "/Users/me/Cisco Packet Tracer 9.0.0/saves",
    getTempFileLocation: () => "/tmp/pt",
  };
  return {
    ipc: { appWindow: () => appWindow },
    getNet: () => ({ getDeviceCount: () => 17, getLinkCount: () => 37 }),
    ...overrides,
  } as any;
}

describe("project handlers", () => {
  test("__projectStatus devuelve archivo activo y conteos", () => {
    const result = handleProjectStatus({}, createDeps());
    expect(result).toMatchObject({
      ok: true,
      parsed: {
        activeFileClass: "NetworkFile",
        activeFile: "/Users/me/labs/taller.pkt",
        isSavedToDisk: true,
        isActivityFile: false,
        deviceCount: 17,
        linkCount: 37,
      },
    });
  });
});
```

**Step 2: Ejecutar test y verificar fallo**

Run: `bun test packages/pt-runtime/src/__tests__/handlers/project.test.ts`

Expected: FAIL con módulo `../../handlers/project.js` no encontrado.

### Task 1.2: Implementar `packages/pt-runtime/src/handlers/project.ts`

**Files:**
- Create: `packages/pt-runtime/src/handlers/project.ts`

**Step 1: Escribir implementación mínima**

```ts
import { errorResult, okResult } from "../domain/runtime-result.js";
import type { RuntimeResult } from "../runtime/contracts.js";

function getAppWindow(api: any): any {
  if (!api || !api.ipc || typeof api.ipc.appWindow !== "function") {
    return null;
  }
  return api.ipc.appWindow();
}

function getActiveFile(aw: any): any {
  if (!aw || typeof aw.getActiveFile !== "function") return null;
  return aw.getActiveFile();
}

function getSavedFilename(file: any): string {
  if (!file || typeof file.getSavedFilename !== "function") return "";
  return String(file.getSavedFilename() || "");
}

export function handleProjectStatus(_payload: Record<string, unknown>, api: any): RuntimeResult {
  try {
    const aw = getAppWindow(api);
    if (!aw) return errorResult("AppWindow no disponible", { code: "APP_WINDOW_UNAVAILABLE" });

    const f = getActiveFile(aw);
    const net = typeof api.getNet === "function" ? api.getNet() : null;
    const activeFile = getSavedFilename(f);

    return okResult("", {
      parsed: {
        ok: true,
        activeFileClass: f && typeof f.getClassName === "function" ? f.getClassName() : null,
        activeFile,
        savedFilename: activeFile,
        isSavedToDisk: activeFile.length > 0,
        isActivityFile: f && typeof f.isActivityFile === "function" ? f.isActivityFile() : null,
        networkDescription: f && typeof f.getNetworkDescription === "function" ? f.getNetworkDescription() : "",
        defaultSaveLocation: typeof aw.getDefaultFileSaveLocation === "function" ? aw.getDefaultFileSaveLocation() : "",
        tempFileLocation: typeof aw.getTempFileLocation === "function" ? aw.getTempFileLocation() : "",
        deviceCount: net && typeof net.getDeviceCount === "function" ? net.getDeviceCount() : null,
        linkCount: net && typeof net.getLinkCount === "function" ? net.getLinkCount() : null,
      },
    });
  } catch (error) {
    return errorResult(String(error instanceof Error ? error.message : error), { code: "PROJECT_STATUS_FAILED" });
  }
}
```

**Step 2: Ejecutar test**

Run: `bun test packages/pt-runtime/src/__tests__/handlers/project.test.ts`

Expected: PASS para `__projectStatus`.

### Task 1.3: Agregar `__projectSave`

**Files:**
- Modify: `packages/pt-runtime/src/__tests__/handlers/project.test.ts`
- Modify: `packages/pt-runtime/src/handlers/project.ts`

**Step 1: Escribir test fallido**

Add test that verifies `fileSave()` is called without arguments and active filename does not change.

```ts
test("__projectSave llama fileSave sin argumentos", () => {
  const llamadas: unknown[][] = [];
  const archivoActivo = { getSavedFilename: () => "/tmp/taller.pkt" };
  const deps = createDeps({
    ipc: {
      appWindow: () => ({
        getActiveFile: () => archivoActivo,
        fileSave: (...args: unknown[]) => {
          llamadas.push(args);
          return true;
        },
      }),
    },
  });
  const result = handleProjectSave({}, deps) as any;
  expect(llamadas).toEqual([[]]);
  expect(result.parsed).toMatchObject({ ok: true, saved: true, before: "/tmp/taller.pkt", after: "/tmp/taller.pkt" });
});
```

Expected initial failure: `handleProjectSave` no exportado.

**Step 2: Implementar handler**

```ts
export function handleProjectSave(_payload: Record<string, unknown>, api: any): RuntimeResult {
  try {
    const aw = getAppWindow(api);
    if (!aw || typeof aw.fileSave !== "function") return errorResult("fileSave no disponible", { code: "PROJECT_SAVE_UNAVAILABLE" });
    const beforeFile = getActiveFile(aw);
    const before = getSavedFilename(beforeFile);
    const saved = aw.fileSave();
    const after = getSavedFilename(getActiveFile(aw));
    return okResult("", { parsed: { ok: !!saved, saved: !!saved, before, after } });
  } catch (error) {
    return errorResult(String(error instanceof Error ? error.message : error), { code: "PROJECT_SAVE_FAILED" });
  }
}
```

**Step 3: Ejecutar test**

Run: `bun test packages/pt-runtime/src/__tests__/handlers/project.test.ts`

Expected: PASS.

### Task 1.4: Agregar snapshot chunked desde el inicio

**Files:**
- Modify: `packages/pt-runtime/src/__tests__/handlers/project.test.ts`
- Modify: `packages/pt-runtime/src/handlers/project.ts`

**Step 1: Escribir tests fallidos para begin/read/clear**

```ts
test("snapshot chunked lee bytes firmados por partes", () => {
  const scope: any = {};
  const deps = createDeps({
    global: scope,
    ipc: {
      appWindow: () => ({
        getActiveFile: () => ({ getSavedFilename: () => "/tmp/taller.pkt" }),
        fileSaveToBytes: () => [-1, 0, 127, 128, 255],
      }),
    },
  });
  const begin = handleProjectSnapshotBegin({ chunkSize: 2 }, deps) as any;
  expect(begin.parsed).toMatchObject({ ok: true, length: 5, chunkSize: 2, savedFilename: "/tmp/taller.pkt" });
  const snapshotId = begin.parsed.snapshotId;
  const first = handleProjectSnapshotRead({ snapshotId, offset: 0, limit: 2 }, deps) as any;
  expect(first.parsed.bytes).toEqual([-1, 0]);
  expect(first.parsed.eof).toBe(false);
  const last = handleProjectSnapshotRead({ snapshotId, offset: 4, limit: 2 }, deps) as any;
  expect(last.parsed.bytes).toEqual([255]);
  expect(last.parsed.eof).toBe(true);
  const cleared = handleProjectSnapshotClear({ snapshotId }, deps) as any;
  expect(cleared.parsed.ok).toBe(true);
});
```

**Step 2: Implementar snapshot storage PT-safe**

Use `api.global` if available; fallback to `Function("return this")()` only inside runtime handler.

```ts
function getScope(api: any): any {
  if (api && api.global) return api.global;
  try { return Function("return this")(); } catch { return {}; }
}

function ensureSnapshotStore(scope: any): Record<string, any> {
  if (!scope.__ptProjectSnapshots) scope.__ptProjectSnapshots = {};
  return scope.__ptProjectSnapshots;
}

export function handleProjectSnapshotBegin(payload: Record<string, unknown>, api: any): RuntimeResult {
  try {
    const aw = getAppWindow(api);
    if (!aw || typeof aw.fileSaveToBytes !== "function") return errorResult("fileSaveToBytes no disponible", { code: "PROJECT_SNAPSHOT_UNAVAILABLE" });
    const bytes = aw.fileSaveToBytes();
    const chunkSize = typeof payload.chunkSize === "number" ? Math.max(1, Math.min(payload.chunkSize, 262144)) : 65536;
    const snapshotId = "snap_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 100000));
    const savedFilename = getSavedFilename(getActiveFile(aw));
    const store = ensureSnapshotStore(getScope(api));
    store[snapshotId] = { id: snapshotId, savedFilename, bytes, createdAt: Date.now() };
    return okResult("", { parsed: { ok: true, snapshotId, savedFilename, length: bytes.length, chunkSize } });
  } catch (error) {
    return errorResult(String(error instanceof Error ? error.message : error), { code: "PROJECT_SNAPSHOT_BEGIN_FAILED" });
  }
}
```

**Step 3: Implement read/clear**

```ts
export function handleProjectSnapshotRead(payload: Record<string, unknown>, api: any): RuntimeResult {
  try {
    const snapshotId = String(payload.snapshotId || "");
    const offset = typeof payload.offset === "number" ? Math.max(0, payload.offset) : 0;
    const limit = typeof payload.limit === "number" ? Math.max(1, Math.min(payload.limit, 262144)) : 65536;
    const store = ensureSnapshotStore(getScope(api));
    const snapshot = store[snapshotId];
    if (!snapshot) return errorResult("Snapshot no encontrado", { code: "PROJECT_SNAPSHOT_NOT_FOUND" });
    const slice = snapshot.bytes.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    return okResult("", { parsed: { ok: true, snapshotId, offset, nextOffset, eof: nextOffset >= snapshot.bytes.length, bytes: slice } });
  } catch (error) {
    return errorResult(String(error instanceof Error ? error.message : error), { code: "PROJECT_SNAPSHOT_READ_FAILED" });
  }
}

export function handleProjectSnapshotClear(payload: Record<string, unknown>, api: any): RuntimeResult {
  const snapshotId = String(payload.snapshotId || "");
  const store = ensureSnapshotStore(getScope(api));
  if (snapshotId) delete store[snapshotId];
  return okResult("", { parsed: { ok: true, snapshotId } });
}
```

**Step 4: Ejecutar tests**

Run: `bun test packages/pt-runtime/src/__tests__/handlers/project.test.ts`

Expected: PASS.

### Task 1.5: Registrar handlers estables

**Files:**
- Modify: `packages/pt-runtime/src/handlers/registration/stable-handlers.ts`
- Modify: `packages/pt-runtime/src/__tests__/handlers/runtime-handler-wiring.test.ts` or `packages/pt-runtime/src/__tests__/handlers/handler-registry.test.ts`

**Step 1: Escribir test fallido de wiring**

Add assertions that `__projectStatus`, `__projectSave`, `__projectSnapshotBegin`, `__projectSnapshotRead`, `__projectSnapshotClear` are registered.

Expected: FAIL because handlers not registered.

**Step 2: Registrar imports y handlers**

```ts
import {
  handleProjectStatus,
  handleProjectSave,
  handleProjectSnapshotBegin,
  handleProjectSnapshotRead,
  handleProjectSnapshotClear,
} from "../project.js";
```

In `registerStableRuntimeHandlers()`:

```ts
registerHandler("__projectStatus", handleProjectStatus as unknown as HandlerFn);
registerHandler("__projectSave", handleProjectSave as unknown as HandlerFn);
registerHandler("__projectSnapshotBegin", handleProjectSnapshotBegin as unknown as HandlerFn);
registerHandler("__projectSnapshotRead", handleProjectSnapshotRead as unknown as HandlerFn);
registerHandler("__projectSnapshotClear", handleProjectSnapshotClear as unknown as HandlerFn);
```

**Step 3: Ejecutar runtime tests**

Run: `bun test packages/pt-runtime/src/__tests__/handlers/project.test.ts packages/pt-runtime/src/__tests__/handlers/runtime-handler-wiring.test.ts`

Expected: PASS.

**Step 4: Validar PT-safe**

Run: `bun test packages/pt-runtime/src/__tests__/architecture/runtime-handlers-boundary.test.ts packages/pt-runtime/tests/main-runtime-boundary.test.ts`

Expected: PASS. If `packages/pt-runtime/tests/main-runtime-boundary.test.ts` does not exist in this checkout, use `bun test packages/pt-runtime/src/__tests__/architecture/runtime-handlers-boundary.test.ts` and `bun run pt build`.

## Fase 2: pt-control Project Services

### Task 2.1: Crear tipos project/autosave

**Files:**
- Create: `packages/pt-control/src/application/project/project-types.ts`
- Create: `packages/pt-control/src/application/project/index.ts`

**Step 1: Definir contratos**

```ts
export interface ProjectStatus {
  ok: boolean;
  activeFile: string;
  savedFilename: string;
  isSavedToDisk: boolean;
  isActivityFile: boolean | null;
  defaultSaveLocation: string;
  tempFileLocation: string;
  deviceCount: number | null;
  linkCount: number | null;
}

export interface ProjectSaveResult {
  ok: boolean;
  action: "project.save";
  activeFile: string;
  saved: boolean;
}

export interface ProjectSnapshotChunk {
  snapshotId: string;
  offset: number;
  nextOffset: number;
  eof: boolean;
  bytes: number[];
}

export interface AutosaveEntry {
  id: string;
  createdAt: string;
  projectPath: string;
  autosavePath: string;
  bytes: number;
  sha256: string;
  source: "fileSaveToBytes";
  deviceCount: number | null;
  linkCount: number | null;
}

export interface AutosaveResult {
  ok: boolean;
  action: "project.autosave";
  activeFile: string;
  autosavePath: string;
  bytes: number;
  sha256: string;
  kept: number;
  deletedOld: string[];
}
```

**Step 2: Exportar index**

```ts
export * from "./project-types.js";
export * from "./project-service.js";
export * from "./autosave-service.js";
```

### Task 2.2: Implementar `ProjectService` con TDD

**Files:**
- Create: `packages/pt-control/src/application/project/project-service.test.ts`
- Create: `packages/pt-control/src/application/project/project-service.ts`

**Step 1: Escribir test fallido**

```ts
import { describe, expect, test } from "bun:test";
import { ProjectService } from "./project-service.js";

function createBridge(responses: Record<string, unknown>) {
  const calls: Array<{ type: string; payload: unknown; timeoutMs?: number }> = [];
  return {
    calls,
    bridge: {
      sendCommandAndWait: async (type: string, payload: unknown, timeoutMs?: number) => {
        calls.push({ type, payload, timeoutMs });
        return { ok: true, value: responses[type] };
      },
    },
  };
}

describe("ProjectService", () => {
  test("status llama __projectStatus y normaliza parsed", async () => {
    const { bridge, calls } = createBridge({
      __projectStatus: { parsed: { ok: true, activeFile: "/tmp/taller.pkt", savedFilename: "/tmp/taller.pkt", isSavedToDisk: true } },
    });
    const service = new ProjectService(bridge as any);
    const status = await service.status();
    expect(calls[0]?.type).toBe("__projectStatus");
    expect(status.activeFile).toBe("/tmp/taller.pkt");
  });
});
```

Expected: FAIL module not found.

**Step 2: Implementar servicio mínimo**

```ts
import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { ProjectSaveResult, ProjectStatus, ProjectSnapshotChunk } from "./project-types.js";

function unwrapParsed<T>(result: unknown): T {
  const value = (result as any)?.value ?? result;
  return ((value as any)?.parsed ?? value) as T;
}

export class ProjectService {
  constructor(private readonly bridge: FileBridgePort, private readonly timeoutMs = 30_000) {}

  async status(): Promise<ProjectStatus> {
    const result = await this.bridge.sendCommandAndWait("__projectStatus", {}, this.timeoutMs);
    return unwrapParsed<ProjectStatus>(result);
  }

  async save(): Promise<ProjectSaveResult> {
    const result = await this.bridge.sendCommandAndWait("__projectSave", {}, this.timeoutMs);
    const parsed = unwrapParsed<any>(result);
    return { ok: Boolean(parsed.ok), action: "project.save", activeFile: parsed.after || parsed.before || "", saved: Boolean(parsed.saved) };
  }

  async snapshotBegin(chunkSize = 65_536): Promise<{ snapshotId: string; savedFilename: string; length: number; chunkSize: number }> {
    const result = await this.bridge.sendCommandAndWait("__projectSnapshotBegin", { chunkSize }, this.timeoutMs);
    return unwrapParsed(result);
  }

  async snapshotRead(snapshotId: string, offset: number, limit: number): Promise<ProjectSnapshotChunk> {
    const result = await this.bridge.sendCommandAndWait("__projectSnapshotRead", { snapshotId, offset, limit }, this.timeoutMs);
    return unwrapParsed(result);
  }

  async snapshotClear(snapshotId: string): Promise<void> {
    await this.bridge.sendCommandAndWait("__projectSnapshotClear", { snapshotId }, this.timeoutMs);
  }
}
```

**Step 3: Ejecutar test**

Run: `bun test packages/pt-control/src/application/project/project-service.test.ts`

Expected: PASS.

### Task 2.3: Implementar `AutosaveService`

**Files:**
- Create: `packages/pt-control/src/application/project/autosave-service.test.ts`
- Create: `packages/pt-control/src/application/project/autosave-service.ts`
- Read/Reuse: `packages/pt-control/src/system/paths.ts`

**Step 1: Escribir tests fallidos**

Cases:
- Convierte bytes firmados a unsigned con `b & 0xff`.
- Escribe `.pkt` externo.
- Calcula `sha256`.
- Mantiene `index.json`.
- `pruneAutosaves(keep)` borra antiguos y conserva últimos N.
- No usa `fileSaveAsNoPrompt`.

```ts
import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AutosaveService } from "./autosave-service.js";

describe("AutosaveService", () => {
  test("crea autosave con bytes unsigned y sha256", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pt-autosave-"));
    const project = {
      status: async () => ({ ok: true, activeFile: "/labs/Taller grupal.pkt", savedFilename: "/labs/Taller grupal.pkt", isSavedToDisk: true, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: 1, linkCount: 2 }),
      snapshotBegin: async () => ({ snapshotId: "snap_1", savedFilename: "/labs/Taller grupal.pkt", length: 4, chunkSize: 2 }),
      snapshotRead: async (_id: string, offset: number) => offset === 0
        ? { snapshotId: "snap_1", offset: 0, nextOffset: 2, eof: false, bytes: [-1, 0] }
        : { snapshotId: "snap_1", offset: 2, nextOffset: 4, eof: true, bytes: [127, 128] },
      snapshotClear: async () => undefined,
    };
    const service = new AutosaveService(project as any, { homeDir: dir });
    const result = await service.createAutosave({ keep: 20 });
    expect(result.bytes).toBe(4);
    expect(result.autosavePath).toContain("Taller_grupal");
    const bytes = await readFile(result.autosavePath);
    expect([...bytes]).toEqual([255, 0, 127, 128]);
    expect(result.sha256).toHaveLength(64);
    await rm(dir, { recursive: true, force: true });
  });
});
```

**Step 2: Implementar autosave service**

```ts
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";
import type { ProjectService } from "./project-service.js";
import type { AutosaveEntry, AutosaveResult } from "./project-types.js";

export interface AutosaveOptions { dir?: string; keep?: number; chunkSize?: number }
export interface AutosaveServiceConfig { homeDir?: string }

function sanitizeBaseName(path: string): string {
  return basename(path || "unsaved.pkt", ".pkt").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function toUnsignedBuffer(bytes: number[]): Buffer {
  return Buffer.from(bytes.map((b) => b & 0xff));
}

export class AutosaveService {
  constructor(private readonly project: ProjectService, private readonly config: AutosaveServiceConfig = {}) {}

  private rootDir(outputDir?: string): string {
    return outputDir ?? join(this.config.homeDir ?? homedir(), ".pt-cli", "autosaves");
  }

  async createAutosave(options: AutosaveOptions = {}): Promise<AutosaveResult> {
    const status = await this.project.status();
    const activeFile = status.activeFile || status.savedFilename || "unsaved.pkt";
    const base = sanitizeBaseName(activeFile);
    const createdAt = new Date().toISOString();
    const safeCreatedAt = createdAt.replace(/[:.]/g, "-");
    const targetDir = join(this.rootDir(options.dir), base);
    await mkdir(targetDir, { recursive: true });

    const begin = await this.project.snapshotBegin(options.chunkSize ?? 65_536);
    const chunks: Buffer[] = [];
    let offset = 0;
    try {
      while (offset < begin.length) {
        const chunk = await this.project.snapshotRead(begin.snapshotId, offset, begin.chunkSize);
        chunks.push(toUnsignedBuffer(chunk.bytes));
        offset = chunk.nextOffset;
        if (chunk.eof) break;
      }
    } finally {
      await this.project.snapshotClear(begin.snapshotId).catch(() => undefined);
    }

    const buffer = Buffer.concat(chunks);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const autosavePath = join(targetDir, `${base}.${safeCreatedAt}.${buffer.length}.${sha256.slice(0, 8)}.pkt`);
    await writeFile(autosavePath, buffer);

    const entry: AutosaveEntry = {
      id: `autosave_${randomUUID().replace(/-/g, "")}`,
      createdAt,
      projectPath: activeFile,
      autosavePath,
      bytes: buffer.length,
      sha256,
      source: "fileSaveToBytes",
      deviceCount: status.deviceCount,
      linkCount: status.linkCount,
    };
    await this.appendIndex(entry, options.dir);
    const deletedOld = await this.pruneAutosaves(options.keep ?? 20, activeFile, options.dir);

    return { ok: true, action: "project.autosave", activeFile, autosavePath, bytes: buffer.length, sha256, kept: options.keep ?? 20, deletedOld };
  }

  async listAutosaves(projectPath?: string, outputDir?: string): Promise<AutosaveEntry[]> {
    const indexPath = join(this.rootDir(outputDir), "index.json");
    try {
      const entries = JSON.parse(await readFile(indexPath, "utf8")) as AutosaveEntry[];
      return projectPath ? entries.filter((entry) => entry.projectPath === projectPath) : entries;
    } catch {
      return [];
    }
  }

  async resolveLatestAutosave(projectPath?: string, outputDir?: string): Promise<AutosaveEntry | null> {
    const entries = await this.listAutosaves(projectPath, outputDir);
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }

  private async appendIndex(entry: AutosaveEntry, outputDir?: string): Promise<void> {
    const indexPath = join(this.rootDir(outputDir), "index.json");
    await mkdir(dirname(indexPath), { recursive: true });
    const entries = await this.listAutosaves(undefined, outputDir);
    entries.push(entry);
    await writeFile(indexPath, JSON.stringify(entries, null, 2));
  }

  async pruneAutosaves(keep: number, projectPath?: string, outputDir?: string): Promise<string[]> {
    const indexPath = join(this.rootDir(outputDir), "index.json");
    const entries = await this.listAutosaves(undefined, outputDir);
    const matching = projectPath ? entries.filter((entry) => entry.projectPath === projectPath) : entries;
    const sorted = matching.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const toDelete = sorted.slice(keep);
    for (const entry of toDelete) await rm(entry.autosavePath, { force: true });
    const deleteSet = new Set(toDelete.map((entry) => entry.id));
    await writeFile(indexPath, JSON.stringify(entries.filter((entry) => !deleteSet.has(entry.id)), null, 2));
    return toDelete.map((entry) => entry.autosavePath);
  }
}
```

**Step 3: Ejecutar tests**

Run: `bun test packages/pt-control/src/application/project/autosave-service.test.ts packages/pt-control/src/application/project/project-service.test.ts`

Expected: PASS.

### Task 2.4: Cablear project services en composición y controller

**Files:**
- Modify: `packages/pt-control/src/application/bootstrap/control-composition.ts`
- Modify: `packages/pt-control/src/controller/pt-controller.ts`
- Modify: `packages/pt-control/src/application/index.ts`
- Modify: `packages/pt-control/src/__tests__/controller/pt-controller.test.ts`

**Step 1: Escribir test fallido**

Assert `controller.project.status`, `controller.project.save`, `controller.project.autosave` exist.

**Step 2: Agregar composición**

Add imports and fields:

```ts
import { ProjectService, AutosaveService } from "../project/index.js";

export interface ControlComposition {
  projectService: ProjectService;
  autosaveService: AutosaveService;
}
```

Inside `createControlComposition()`:

```ts
const projectService = new ProjectService(bridge);
const autosaveService = new AutosaveService(projectService);
```

Return both.

**Step 3: Agregar facade en `PTController`**

Minimal getter:

```ts
public get project() {
  return {
    status: () => this._composition.projectService.status(),
    save: () => this._composition.projectService.save(),
    autosave: (options?: { dir?: string; keep?: number }) => this._composition.autosaveService.createAutosave(options),
  };
}
```

**Step 4: Ejecutar tests**

Run: `bun test packages/pt-control/src/application/project/project-service.test.ts packages/pt-control/src/application/project/autosave-service.test.ts packages/pt-control/src/__tests__/controller/pt-controller.test.ts`

Expected: PASS.

## Fase 3: CLI `pt project`

### Task 3.1: Crear comando `project`

**Files:**
- Create: `apps/pt-cli/src/commands/project/index.ts`
- Modify: `apps/pt-cli/src/commands/command-registry.ts`
- Modify: `apps/pt-cli/src/__tests__/ux/root-registry.test.ts`
- Modify: `apps/pt-cli/src/__tests__/ux/help.test.ts`

**Step 1: Escribir test fallido de registry**

Add assertion that public definitions contain `project` and examples for `project status`, `project save`, `project autosave`.

Run: `bun test apps/pt-cli/src/__tests__/ux/root-registry.test.ts`

Expected: FAIL, command not registered.

**Step 2: Crear comando CLI delgado**

Implementation pattern: use existing controller provider from `apps/pt-cli/src/application/controller-provider.ts`.

```ts
#!/usr/bin/env bun
import { Command } from "commander";
import { getController } from "../../application/controller-provider.js";

function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function wantsJson(options: { json?: boolean }): boolean {
  return Boolean(options.json || process.argv.includes("--json"));
}

export function createProjectCommand(): Command {
  const project = new Command("project")
    .description("Gestiona archivo .pkt activo, guardado, autosaves y recuperación");

  project.command("status")
    .description("Muestra metadata del proyecto abierto en Packet Tracer")
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const controller = await getController();
      const status = await controller.project.status();
      const output = { ok: status.ok !== false, action: "project.status", ...status };
      if (wantsJson(options)) return printJson(output);
      process.stdout.write(`Archivo activo: ${output.activeFile || "(sin guardar)"}\n`);
    });

  project.command("save")
    .description("Guarda el archivo .pkt activo con fileSave()")
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const controller = await getController();
      const result = await controller.project.save();
      if (wantsJson(options)) return printJson(result);
      process.stdout.write(result.saved ? "Proyecto guardado\n" : "No se pudo guardar el proyecto\n");
      process.exitCode = result.saved ? 0 : 1;
    });

  project.command("autosave")
    .description("Crea un autosave externo usando fileSaveToBytes()")
    .option("--dir <path>", "Directorio de autosaves")
    .option("--keep <count>", "Cantidad de autosaves a conservar", (value) => Number(value), 20)
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const controller = await getController();
      const result = await controller.project.autosave({ dir: options.dir, keep: options.keep });
      if (wantsJson(options)) return printJson(result);
      process.stdout.write(`Autosave: ${result.autosavePath}\n`);
    });

  return project;
}
```

**Step 3: Registrar en `command-registry.ts`**

Add import:

```ts
import { createProjectCommand } from "./project/index.js";
```

Add definition near runtime/core commands:

```ts
{
  id: "project",
  name: "project",
  group: "runtime",
  summary: "Gestiona archivo .pkt activo, guardado y autosaves",
  description: "Lee metadata del archivo abierto, guarda con fileSave() y crea autosaves externos sin cambiar activeFile.",
  examples: [
    { command: "pt project status --json", description: "Ver archivo activo" },
    { command: "pt project save --json", description: "Guardar archivo activo" },
    { command: "pt project autosave --json", description: "Crear backup externo" },
  ],
  related: ["pt runtime status --live --json", "pt doctor"],
  agentHints: ["Usar antes de cambios grandes para evitar pérdida de trabajo."],
  factory: createProjectCommand,
}
```

**Step 4: Ejecutar tests y help**

Run: `bun test apps/pt-cli/src/__tests__/ux/root-registry.test.ts apps/pt-cli/src/__tests__/ux/help.test.ts`

Expected: PASS.

Run: `bun run pt project --help`

Expected: Shows `status`, `save`, `autosave`.

### Task 3.2: Validación manual con Packet Tracer real

**Files:**
- No source change unless failures.

**Step 1: Build runtime**

Run: `bun run pt build`

Expected: PASS and runtime deployed to `PT_DEV_DIR`.

**Step 2: With Packet Tracer open and runtime loaded**

Run: `bun run pt project status --json`

Expected: JSON has `ok: true`, `activeFile`, `deviceCount`, `linkCount`.

Run: `bun run pt project autosave --json`

Expected: Creates external `.pkt`, bytes > 0, active file unchanged.

Run: `bun run pt project save --json`

Expected: `saved: true`.

## Fase 4: MCP tools específicas de project

### Task 4.1: Agregar tests MCP para project tools

**Files:**
- Modify: `packages/pt-mcp/src/tools/register-tools.test.ts`
- Modify: `packages/pt-mcp/src/tools/register-tools.ts`

**Step 1: Escribir test fallido**

Add assertions:

```ts
expect(configs.get("pt_project_status")?.annotations).toEqual({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
expect(configs.get("pt_project_save")?.annotations).toEqual({ readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false });
expect(configs.get("pt_project_autosave")?.annotations).toEqual({ readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false });
```

Add handler calls and argv assertions:

```ts
await handlers.get("pt_project_status")?.({ timeoutMs: 10_000 });
expect(calls.at(-1)?.argv).toEqual(["project", "status", "--json"]);
await handlers.get("pt_project_save")?.({ timeoutMs: 10_000 });
expect(calls.at(-1)?.argv).toEqual(["project", "save", "--json"]);
await handlers.get("pt_project_autosave")?.({ outputDir: "/tmp/backups", keep: 3, timeoutMs: 10_000 });
expect(calls.at(-1)?.argv).toEqual(["project", "autosave", "--json", "--dir", "/tmp/backups", "--keep", "3"]);
```

Run: `bun test packages/pt-mcp/src/tools/register-tools.test.ts`

Expected: FAIL missing tools.

**Step 2: Implement constants and tools**

Add annotation constants:

```ts
const LOCAL_PRESERVE_WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;
```

Register `pt_project_status`, `pt_project_save`, `pt_project_autosave` after `pt_runtime_status`.

```ts
options.server.registerTool(
  "pt_project_autosave",
  {
    title: "PT Project autosave",
    description: "Crea una copia local del .pkt abierto usando Packet Tracer fileSaveToBytes. No modifica la topología; escribe un backup local.",
    inputSchema: z.object({
      outputDir: z.string().optional(),
      keep: z.number().int().positive().max(100).optional(),
      timeoutMs: z.number().int().positive().max(120_000).optional(),
    }),
    annotations: LOCAL_PRESERVE_WRITE,
  },
  async (input: any) => await withLiveLogging(liveLogger, "pt_project_autosave", input, async (toolInput) => {
    const argv = ["project", "autosave", "--json"];
    if (toolInput.outputDir) argv.push("--dir", toolInput.outputDir);
    if (toolInput.keep) argv.push("--keep", String(toolInput.keep));
    const result = await options.runPtCli({ repoRoot: options.repoRoot, cliEntrypoint: options.cliEntrypoint, argv, timeoutMs: toolInput.timeoutMs ?? options.defaultTimeoutMs, parseJson: true });
    return formatResult(result);
  }),
);
```

**Step 3: Ejecutar tests**

Run: `bun test packages/pt-mcp/src/tools/register-tools.test.ts`

Expected: PASS.

## Fase 5: App Process/Path Services en pt-control

### Task 5.1: Crear path resolver cross-platform

**Files:**
- Create: `packages/pt-control/src/application/app/app-types.ts`
- Create: `packages/pt-control/src/application/app/packet-tracer-path-resolver.test.ts`
- Create: `packages/pt-control/src/application/app/packet-tracer-path-resolver.ts`
- Create: `packages/pt-control/src/application/app/index.ts`

**Step 1: Escribir tests fallidos**

Cases:
- macOS `PT_APP_PATH` wins.
- macOS known paths.
- Windows `PT_APP_PATH` wins.
- Windows Program Files candidates.
- Source field is `env | known-path | registry | path | fallback`.

**Step 2: Implementar resolver puro con injected fs/env/platform**

```ts
export interface PacketTracerPathResolverDeps {
  platform: NodeJS.Platform;
  env: Record<string, string | undefined>;
  exists(path: string): boolean;
}

export class PacketTracerPathResolver {
  constructor(private readonly deps: PacketTracerPathResolverDeps) {}

  resolve(): PacketTracerPathResolution {
    const envPath = this.deps.env.PT_APP_PATH;
    if (envPath && this.deps.exists(envPath)) return { platform: this.deps.platform, candidates: [envPath], selected: envPath, source: "env" };
    const candidates = this.deps.platform === "win32" ? WINDOWS_CANDIDATES : DARWIN_CANDIDATES;
    const existing = candidates.filter((path) => this.deps.exists(path));
    return { platform: this.deps.platform, candidates, selected: existing[0] ?? null, source: existing[0] ? "known-path" : "fallback" };
  }
}
```

**Step 3: Ejecutar tests**

Run: `bun test packages/pt-control/src/application/app/packet-tracer-path-resolver.test.ts`

Expected: PASS.

### Task 5.2: Crear HostProcessPort y process service

**Files:**
- Create: `packages/pt-control/src/application/ports/host-process.port.ts`
- Create: `packages/pt-control/src/application/app/packet-tracer-process-service.test.ts`
- Create: `packages/pt-control/src/application/app/packet-tracer-process-service.ts`

**Step 1: Definir port**

```ts
export interface SpawnResult { ok: boolean; stdout: string; stderr: string; exitCode: number | null }

export interface HostProcessPort {
  platform(): NodeJS.Platform;
  spawn(command: string, argv: string[], options?: { timeoutMs?: number }): Promise<SpawnResult>;
}
```

**Step 2: Tests de comandos construidos**

Test that macOS launch uses `open -a <app> <pkt>`, close graceful uses `osascript`, force uses `pkill -9 -f` only when requested. Test Windows uses PowerShell `Start-Process`, `CloseMainWindow`, `Stop-Process -Force`.

**Step 3: Implement service using port**

Do not call `child_process` here. This service builds commands and delegates to `HostProcessPort`.

**Step 4: Ejecutar tests**

Run: `bun test packages/pt-control/src/application/app/packet-tracer-process-service.test.ts`

Expected: PASS.

### Task 5.3: Crear NodeHostProcessAdapter

**Files:**
- Create: `packages/pt-control/src/infrastructure/host/node-host-process-adapter.ts`
- Create: `packages/pt-control/src/infrastructure/host/node-host-process-adapter.test.ts`

**Step 1: Test timeout and stdout/stderr capture**

Use small `bun`/node one-liners or mock child_process wrapper if existing project pattern prefers pure unit.

**Step 2: Implement adapter**

Use `spawn(command, argv, { stdio: ["ignore", "pipe", "pipe"] })`, timeout kill, bounded output.

**Step 3: Ejecutar tests**

Run: `bun test packages/pt-control/src/infrastructure/host/node-host-process-adapter.test.ts`

Expected: PASS.

### Task 5.4: App service orchestration

**Files:**
- Create: `packages/pt-control/src/application/app/packet-tracer-app-service.test.ts`
- Create: `packages/pt-control/src/application/app/packet-tracer-app-service.ts`

**Step 1: Tests**

Cases:
- `status()` combines process status + runtime heartbeat/status + project status.
- `open(path, { wait: true })` launches, waits process, waits runtime, checks activeFile.
- `close({ save: true, autosave: true })` calls project save/autosave then process close.
- `close({ force: true })` force kills only after graceful failure.

**Step 2: Implement minimal service**

Dependencies: `PacketTracerPathResolver`, `PacketTracerProcessService`, `ProjectService`, `AutosaveService`, `FileBridgePort` or `ControllerContextService`.

**Step 3: Ejecutar tests**

Run: `bun test packages/pt-control/src/application/app/packet-tracer-app-service.test.ts`

Expected: PASS.

### Task 5.5: Cablear app services

**Files:**
- Modify: `packages/pt-control/src/application/bootstrap/control-composition.ts`
- Modify: `packages/pt-control/src/controller/pt-controller.ts`
- Modify: `packages/pt-control/src/application/index.ts`

**Step 1: Add composition fields**

`hostProcess`, `appPathResolver`, `packetTracerProcessService`, `packetTracerAppService`.

**Step 2: Add controller facade**

```ts
public get app() {
  return {
    paths: () => this._composition.appPathResolver.resolve(),
    status: (options?: { live?: boolean; timeoutMs?: number }) => this._composition.packetTracerAppService.status(options),
    open: (path: string, options?: AppOpenOptions) => this._composition.packetTracerAppService.open(path, options),
    close: (options?: AppCloseOptions) => this._composition.packetTracerAppService.close(options),
    wait: (options?: AppWaitOptions) => this._composition.packetTracerAppService.wait(options),
  };
}
```

**Step 3: Tests**

Run: `bun test packages/pt-control/src/application/app/*.test.ts packages/pt-control/src/__tests__/controller/pt-controller.test.ts`

Expected: PASS.

## Fase 6: CLI `pt app` y `pt project open/recover`

### Task 6.1: Agregar `pt app` CLI

**Files:**
- Create: `apps/pt-cli/src/commands/app/index.ts`
- Modify: `apps/pt-cli/src/commands/command-registry.ts`
- Modify: `apps/pt-cli/src/__tests__/ux/root-registry.test.ts`
- Modify: `apps/pt-cli/src/__tests__/ux/help.test.ts`

**Step 1: Tests fail**

Assert registry contains `app`, help contains `status`, `paths`, `open`, `close`, `wait`, `restart`.

**Step 2: Implement commands**

Commands:
- `app paths --json`
- `app status --json`
- `app open <path> --wait --timeout <ms> --close-existing --save-existing --autosave-existing --force --no-runtime-wait --json`
- `app close --save --autosave --force --timeout <ms> --json`
- `app wait --runtime --active-file <path> --timeout <ms> --json`
- `app restart --save --autosave --open-last --wait --json`

**Step 3: Ejecutar help tests**

Run: `bun test apps/pt-cli/src/__tests__/ux/root-registry.test.ts apps/pt-cli/src/__tests__/ux/help.test.ts`

Expected: PASS.

### Task 6.2: Agregar `pt project open/recover/checkpoints`

**Files:**
- Modify: `apps/pt-cli/src/commands/project/index.ts`
- Create/Modify: `packages/pt-control/src/application/project/recovery-service.ts`
- Create: `packages/pt-control/src/application/project/recovery-service.test.ts`

**Step 1: Validate extension**

MVP allow `.pkt` only; plan for `.pka`, `.pkz` later.

**Step 2: `project open` delegates to app open**

Output action `project.open` and active file match.

**Step 3: `project recover --last` opens latest autosave**

Use `AutosaveService.resolveLatestAutosave()`.

**Step 4: Tests**

Run: `bun test packages/pt-control/src/application/project/recovery-service.test.ts apps/pt-cli/src/__tests__/ux/help.test.ts`

Expected: PASS.

## Fase 7: MCP App/Recover Tools

### Task 7.1: Add MCP app tools tests

**Files:**
- Modify: `packages/pt-mcp/src/tools/register-tools.test.ts`
- Modify: `packages/pt-mcp/src/tools/register-tools.ts`

**Step 1: Tests**

Tools and argv:
- `pt_app_status` -> `["app", "status", "--json"]`
- `pt_app_open` -> `["app", "open", path, "--json", "--wait"]` when wait true
- `pt_app_close` -> `["app", "close", "--json", "--save", "--autosave"]`
- `pt_project_open` -> `["project", "open", path, "--json"]`
- `pt_project_recover` -> `["project", "recover", "--json", "--last"]`

Annotations:
- app/project status read-only.
- save/autosave/open/recover non-destructive.
- app close destructive.

**Step 2: Implement fixed argv tools**

Keep schemas narrow with `z.object` and timeout caps from spec.

**Step 3: Tests**

Run: `bun test packages/pt-mcp/src/tools/register-tools.test.ts`

Expected: PASS.

## Fase 8: Stabilize MCP CLI Entrypoint

### Task 8.1: Add direct run mode resolver

**Files:**
- Create: `packages/pt-mcp/src/runner/resolve-cli-entrypoint.ts`
- Create: `packages/pt-mcp/src/runner/resolve-cli-entrypoint.test.ts`
- Modify: `packages/pt-mcp/src/runner/run-pt-cli.ts`
- Modify: `packages/pt-mcp/src/runner/run-pt-cli.test.ts`

**Step 1: Tests**

Cases:
- default mode direct returns `command: "bun"`, `argv: [absoluteEntrypoint, ...argv]`.
- `PT_MCP_RUN_MODE=bun-run` returns `argv: ["run", absoluteEntrypoint, ...argv]`.
- rejects non-absolute cliEntrypoint or resolves it against repoRoot.

**Step 2: Implement resolver**

```ts
export function resolveCliExecution(input: { repoRoot: string; cliEntrypoint: string; argv: string[]; env?: Record<string, string | undefined> }) {
  const mode = input.env?.PT_MCP_RUN_MODE ?? process.env.PT_MCP_RUN_MODE ?? "direct";
  const entrypoint = isAbsolute(input.cliEntrypoint) ? input.cliEntrypoint : resolve(input.repoRoot, input.cliEntrypoint);
  if (mode === "bun-run") return { command: "bun", argv: ["run", entrypoint, ...input.argv] };
  return { command: "bun", argv: [entrypoint, ...input.argv] };
}
```

**Step 3: Update `runPtCli` line 49**

Replace `spawn("bun", ["run", input.cliEntrypoint, ...argv], ...)` with resolver result.

**Step 4: Tests**

Run: `bun test packages/pt-mcp/src/runner/resolve-cli-entrypoint.test.ts packages/pt-mcp/src/runner/run-pt-cli.test.ts`

Expected: PASS.

## Fase 9: Recovery Manager MVP

### Task 9.1: Command journal

**Files:**
- Create: `packages/pt-control/src/application/recovery/recovery-types.ts`
- Create: `packages/pt-control/src/application/recovery/command-journal.test.ts`
- Create: `packages/pt-control/src/application/recovery/command-journal.ts`
- Create: `packages/pt-control/src/application/recovery/index.ts`

**Step 1: Tests**

Cases:
- creates `current-session.json`.
- appends command seq.
- marks completed.
- loads existing journal after process restart.

**Step 2: Implement atomic writes**

Use `writeFile(temp)` then `rename` or reuse `packages/pt-control/src/shared/filesystem.ts` if it has atomic helpers.

**Step 3: Tests**

Run: `bun test packages/pt-control/src/application/recovery/command-journal.test.ts`

Expected: PASS.

### Task 9.2: Crash detector

**Files:**
- Create: `packages/pt-control/src/application/recovery/crash-detector.test.ts`
- Create: `packages/pt-control/src/application/recovery/crash-detector.ts`

**Step 1: Tests**

Detect crash for:
- run result timeout.
- `CLI_FAILED` plus bridge status not ready.
- runtime heartbeat stale.
- Packet Tracer process missing.

**Step 2: Implement pure classifier**

No OS calls here; input is app status/runtime status/bridge status/CLI error.

**Step 3: Tests**

Run: `bun test packages/pt-control/src/application/recovery/crash-detector.test.ts`

Expected: PASS.

### Task 9.3: ResilientCommandRunner

**Files:**
- Create: `packages/pt-control/src/application/recovery/resilient-command-runner.test.ts`
- Create: `packages/pt-control/src/application/recovery/resilient-command-runner.ts`

**Step 1: Tests**

Cases:
- crash after command 3 reopens latest autosave and continues command 4.
- completed commands not re-executed.
- aborts after `maxRecoveryAttempts`.
- autosave before mutating commands.

**Step 2: Implement MVP**

Dependencies:
- `runCommand(argv)` function injected.
- `AutosaveService`.
- `PacketTracerAppService`.
- `CommandJournal`.
- `CrashDetector`.

**Step 3: Tests**

Run: `bun test packages/pt-control/src/application/recovery/*.test.ts`

Expected: PASS.

### Task 9.4: CLI `pt batch run --recover`

**Files:**
- Create: `apps/pt-cli/src/commands/batch/index.ts`
- Modify: `apps/pt-cli/src/commands/command-registry.ts`
- Create: `apps/pt-cli/src/__tests__/batch-run.test.ts`

**Step 1: Tests**

Parse `.ptcmd` lines into argv arrays. Ignore blank/comment lines. Reject nested `mcp`. Reject direct `omni raw` in resilient runner.

**Step 2: Implement CLI**

Command: `pt batch run <file.ptcmd> --recover --checkpoint-every <n> --autosave --json`.

**Step 3: Tests**

Run: `bun test apps/pt-cli/src/__tests__/batch-run.test.ts apps/pt-cli/src/__tests__/ux/help.test.ts`

Expected: PASS.

### Task 9.5: MCP `pt_run_resilient`

**Files:**
- Modify: `packages/pt-mcp/src/tools/register-tools.test.ts`
- Modify: `packages/pt-mcp/src/tools/register-tools.ts`

**Step 1: Tests**

Input schema supports:

```ts
z.object({
  argv: z.array(z.string()).min(1),
  checkpointEveryCommands: z.number().int().positive().max(50).optional(),
  autosaveBefore: z.boolean().optional(),
  recover: z.boolean().optional(),
  timeoutMs: z.number().int().positive().max(600_000).optional(),
})
```

Reject argv beginning with `mcp` or `omni raw`.

**Step 2: Implement tool**

Map to `pt run resilient` only if that CLI command exists, or to `pt_cli` equivalent batch runner if implemented as `batch run`. Prefer one public command and document it in command catalog.

**Step 3: Tests**

Run: `bun test packages/pt-mcp/src/tools/register-tools.test.ts`

Expected: PASS.

## Fase 10: File Bridge Heartbeat Hardening

### Task 10.1: Enriquecer heartbeat runtime

**Files:**
- Modify: `packages/pt-runtime/src/pt/kernel/heartbeat.ts`
- Modify: `packages/pt-runtime/src/pt/kernel/types.ts`
- Modify: `packages/pt-runtime/src/pt/kernel/__tests__/kernel-lifecycle.test.ts` or add focused heartbeat test if existing setup allows.

**Step 1: Tests**

Assert heartbeat includes `runtimeLoaded: true`, `activeFile`, `deviceCount`, `linkCount`, `queueDepth` when dependencies available.

**Step 2: Implement conservative enrichment**

Do not break old `heartbeat.json`; either extend same file or additionally write `heartbeat/runtime.json` only after ensuring directories exist. MVP: extend same `heartbeat.json` because consumers already read it.

**Step 3: Tests/build**

Run: `bun test packages/pt-runtime/src/pt/kernel/__tests__/kernel-lifecycle.test.ts`

Run: `bun run pt build`

Expected: PASS.

## Fase 11: Doctor Checks

### Task 11.1: Extend doctor use cases

**Files:**
- Read/Modify: `packages/pt-control/src/application/doctor/doctor-use-cases.ts`
- Read/Modify: `apps/pt-cli/src/commands/doctor.ts`
- Modify: `packages/pt-control/src/application/doctor/doctor-use-cases.test.ts`

**Step 1: Tests for new checks**

Add checks:
- `packet-tracer-executable-found`
- `packet-tracer-process-running`
- `packet-tracer-active-file`
- `packet-tracer-file-save-api`
- `packet-tracer-autosave-dir-writable`
- `runtime-live-heartbeat`
- `mcp-tools-version`
- `recovery-session-state`
- `autosave-index-valid`

**Step 2: Implement checks with injected services**

No automatic open/kill in `doctor --fix`; only create dirs `~/.pt-cli/autosaves` and `~/.pt-cli/recovery`.

**Step 3: Tests**

Run: `bun test packages/pt-control/src/application/doctor/doctor-use-cases.test.ts apps/pt-cli/src/__tests__/architecture/doctor-thin-cli.test.ts`

Expected: PASS.

## Fase 12: Manual E2E

### Task 12.1: macOS E2E

**Preconditions:** Packet Tracer installed; runtime loaded or can load `main.js`; test `.pkt` exists.

Run:

```bash
bun run pt app paths --json
bun run pt project open "/Users/andresgaibor/Downloads/Taller_grupal.pkt" --wait --json
bun run pt project status --json
bun run pt project autosave --json
bun run pt project save --json
bun run pt app close --save --autosave --json
```

Expected:
- `app paths` selects Packet Tracer app or reports candidates.
- `project open` opens PT and `matchesRequestedPath: true`.
- `project autosave` creates `.pkt`, `bytes > 0`, `sha256` length 64.
- `project save` returns `saved: true`.
- `app close` closes process; if internal close fails, OS graceful succeeds.

### Task 12.2: Windows E2E

Run equivalent with `C:\Users\<user>\Downloads\Taller_grupal.pkt`.

Expected:
- Paths with spaces are quoted correctly.
- `PacketTracer` process is detected.
- `CloseMainWindow()` graceful close works; `Stop-Process -Force` only with `--force`.

## Acceptance Criteria

- `bun run pt project status --json` reports `activeFile`, `isSavedToDisk`, `isActivityFile`, save/temp locations, `deviceCount`, `linkCount` from stable runtime handler.
- `bun run pt project save --json` calls `aw.fileSave()` with no args and does not change active file.
- `bun run pt project autosave --json` writes external `.pkt`, bytes > 0, sha256 exists, updates `~/.pt-cli/autosaves/index.json`, and does not call `fileSaveAsNoPrompt`.
- `bun run pt app open <pkt> --wait --json` opens Packet Tracer, waits process/runtime, and confirms active file matches requested path.
- `bun run pt app close --save --autosave --json` saves, autosaves, then closes; force kill only happens with `--force`.
- MCP exposes `pt_app_status`, `pt_app_open`, `pt_app_close`, `pt_project_status`, `pt_project_save`, `pt_project_autosave`, `pt_project_open`, `pt_project_recover`, `pt_run_resilient` with precise schemas and annotations.
- Resilient runner detects crash/stall, reopens latest autosave or active file, waits runtime, resumes pending commands, and does not re-run completed commands.
- `pt_omni_raw` remains for investigation; save/open/close/autosave/recover flows use dedicated CLI/MCP tools.

## Validation Matrix

Run after each relevant phase:

```bash
git diff --check
bun test packages/pt-runtime/src/__tests__/handlers/project.test.ts
bun test packages/pt-control/src/application/project/project-service.test.ts packages/pt-control/src/application/project/autosave-service.test.ts
bun test packages/pt-control/src/application/app/packet-tracer-path-resolver.test.ts packages/pt-control/src/application/app/packet-tracer-process-service.test.ts packages/pt-control/src/application/app/packet-tracer-app-service.test.ts
bun test packages/pt-mcp/src/tools/register-tools.test.ts packages/pt-mcp/src/runner/run-pt-cli.test.ts
bun test apps/pt-cli/src/__tests__/ux/root-registry.test.ts apps/pt-cli/src/__tests__/ux/help.test.ts
```

Run before claiming runtime work complete:

```bash
bun run pt build
bun test packages/pt-runtime/src/__tests__/architecture/runtime-handlers-boundary.test.ts
```

Run before claiming real Packet Tracer integration complete:

```bash
bun run pt doctor --json
bun run pt runtime status --live --json
bun run pt project status --json
bun run pt project autosave --json
```

## Recommended Implementation Order

1. Fase 1: `pt-runtime` project handlers.
2. Fase 2: `pt-control` project/autosave services.
3. Fase 3: `pt project status/save/autosave`.
4. Fase 4: MCP project tools.
5. Fase 5: app process/path services.
6. Fase 6: `pt app` and `project open/recover`.
7. Fase 7: MCP app/recover tools.
8. Fase 8: MCP entrypoint stabilization.
9. Fase 9: recovery journal/resilient runner.
10. Fase 10: heartbeat hardening.
11. Fase 11: doctor checks.
12. Fase 12: manual E2E macOS/Windows.
