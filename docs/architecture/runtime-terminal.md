# Arquitectura Runtime-Terminal

## Propósito

El terminal engine es la parte de `pt-runtime` que gestiona sesiones IOS en Packet Tracer: apertura de sesión, ejecución de comandos, parsing de prompts, y manejo del pager `--More--`.

## Ubicación en el codebase

```
packages/pt-runtime/src/
├── pt/terminal/
│   ├── terminal-engine.ts      # Interface principal
│   ├── terminal-session.ts      # Estado por sesión
│   └── prompt-parser.ts         # Parsing de prompts IOS
└── handlers/
    └── ios-session.ts           # Helpers de sesión IOS
```

## TerminalEngine

```typescript
interface TerminalEngine {
  attach(device: string, term: PTCommandLine): void;
  detach(device: string): void;
  getSession(device: string): SessionStateSnapshot | null;
  getMode(device: string): IosMode;
  isBusy(device: string): boolean;
  executeCommand(device: string, command: string, options?: ExecuteOptions): Promise<TerminalResult>;
  continuePager(device: string): void;
  confirmPrompt(device: string): void;
}
```

### attach/detach

- `attach(device, term)` — Registra una sesión PTCommandLine para un dispositivo
- `detach(device)` — Limpia la sesión

### getSession / getMode

- `getSession(device)` — Retorna snapshot del estado actual
- `getMode(device)` — Retorna el modo IOS actual (`user-exec`, `priv-exec`, `config`, etc.)

### isBusy

Retorna `true` si el dispositivo tiene un comando en ejecución. **No retorna `false` si hay pager `--More--`** — en ese caso `session.paging === true`.

### executeCommand

```typescript
executeCommand(device: string, command: string, options?: {
  timeoutMs?: number;
  stopOnError?: boolean;
  expectMode?: IosMode;
}): Promise<TerminalResult>
```

Retorna:

```typescript
interface TerminalResult {
  ok: boolean;
  output: string;
  status: number;  // 0 = éxito, non-0 = error
  session: SessionStateSnapshot;
  mode: IosMode;
}
```

### continuePager

Envía espacio para avanzar en `--More--`. No hace nada si no hay pager activo.

### confirmPrompt

Responde "yes" a prompts de confirmación IOS.

## PromptParser

```typescript
export type IosMode =
  | "user-exec"
  | "priv-exec"
  | "config"
  | "config-if"
  | "config-line"
  | "config-router"
  | "config-subif"
  | "config-vlan"
  | "unknown";

export function parsePrompt(prompt: string): IosMode;
export function isPrivileged(mode: IosMode): boolean;
export function isConfigMode(mode: IosMode): boolean;
```

## Estados de Sesión

```typescript
interface TerminalSessionState {
  device: string;
  mode: string;           // ej: "user-exec", "config-if"
  prompt: string;         // ej: "Router> ", "Router(config-if)#"
  paging: boolean;        // true si hay --More--
  awaitingConfirm: boolean;
  lastOutputAt: number;
  busyJobId: string | null;
  healthy: boolean;
}
```

## Flujo de Ejecución de un Comando

```
1. executeCommand("R1", "show ip int brief")
2. Validar que no esté busy (isBusy)
3. Registrar handler para "commandEnded"
4. term.enterCommand("show ip int brief")
5. Esperar evento "commandEnded" o timeout
6. Parsear prompt para determinar modo final
7. Retornar { ok, output, status, session, mode }
```

## Pager --More--

Cuando un comando produce output largo, IOS muestra `--More--`. En PT esto dispara el evento `moreDisplayed`.

Para continuar:
- `continuePager(device)` — envía Space
- El usuario también puede enviar Enter (avanza 1 línea)

## Errores Comunes

### 1. No verificar isBusy antes de ejecutar

Si se envía comando mientras `isBusy === true`, el comando puede perderse o ejecutarse en contexto errado.

### 2. Asumir que commandEnded tiene el output completo

El output puede llegar en múltiples partes via el evento `outputWritten`. El handler de `commandEnded` debe acumular output.

### 3. Ignorar el modo IOS

有些命令 solo funcionan en ciertos modos. `executeCommand` puede recibir `expectMode` para validar.

### 4. Timeout sin distinguir pager de error

Si hay `--More--` activo y el timeout expire, puede ser un falso positivo. Verificar `session.paging`.

## Integración con Kernel

```
Kernel (pt/kernel/)
├── ExecutionEngine
│   └── usa TerminalEngine.executeCommand() para deferred jobs
└── HeartbeatManager
    └── lee session state para reportar device health
```

## Reglas para Agentes

1. **Terminal engine vive en pt-runtime** — NO en pt-control
2. **CLI NO accede directamente a PTCommandLine** — siempre pasa por el bridge
3. **pt-control recibe resultados parseados** — el terminal engine NO devuelve output raw, sino `TerminalResult`