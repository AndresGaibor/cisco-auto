# IOS Session Guard — Diseño de Arquitectura

## Goal
Refactorizar el manejo del Initial Configuration Dialog de IOS hacia una arquitectura clean code con detección inteligente, automática, y extensible por tipo de dispositivo.

## Context

### Problema actual
El manejo del setup dialog está disperso en múltiples lugares con comportamiento inconsistente:

| Archivo | Qué hace | Problema |
|---------|----------|----------|
| `ios-execution-service.ts:165-183` | Solo detecta y warnorea | No hace dismiss |
| `ios-exec-handlers-template.ts:455-478` | Detecta y hace dismiss en JS | Lógica en template, no en TypeScript |
| `lift.ts:304-316` | `dismissInitialDialog` manda `"no"` | Sin verificación, puede fallar |
| `config.ts:226` | Solo filtra líneas del output | No hace dismiss |
| `runtime-handlers.ts:192` | Solo filtra líneas | No hace dismiss |

### Síntomas
- A veces manda "no" cuando ya salió del setup
- A veces no responde cuando el setup está activo
- Lógica duplicada sin verificación de éxito
- No hay manera de saber si el dismiss funcionó

---

## Architecture

### Hexagonal Ports & Adapters

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Application Layer                                │
│                                                                      │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │ IosService   │───▶│ IosSessionGuard  │◀───│ FileBridgePort   │  │
│  │ (orquesta)   │    │ (setup auto)     │    │ (infra)          │  │
│  └──────────────┘    └────────┬─────────┘    └──────────────────┘  │
│                                 │                                     │
│                      ┌──────────▼──────────┐                       │
│                      │  PromptClassifier   │  ← Detecta prompts     │
│                      └──────────┬──────────┘                       │
│                                 │                                     │
│                      ┌──────────▼──────────┐                       │
│                      │ IosCommandStrategy │  ← Comandos por tipo   │
│                      │ (port)             │                       │
│                      └────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Directorio
`packages/pt-control/src/domain/ios/session/`

---

## Components

### 1. `prompt-classifier.ts`

Clasifica los patrones de output de IOS para determinar el estado del prompt.

```typescript
export enum IosPromptState {
  NORMAL = "normal",           // # o > - prompt normal
  SETUP_DIALOG = "setup_dialog", // "Would you like to enter the initial configuration dialog?"
  PRESS_RETURN = "press_return",  // "Press RETURN to get started!"
  PASSWORD = "password",          // "Password:"
  CONFIRM = "confirm",            // "[y/n]?" 
  AWAITING_INPUT = "awaiting_input", // cualquier otro prompt inesperado
}

export class PromptClassifier {
  classify(output: string): IosPromptState[];
  
  isSetupDialog(output: string): boolean;
  isPressReturn(output: string): boolean;
  isNormalPrompt(output: string): boolean;
  needsSetupDismiss(output: string): boolean;
}
```

### 2. `ios-commands.ts` (Port)

Estrategia de comandos por tipo de dispositivo.

```typescript
export type IosDeviceType = "router" | "switch" | "pc";

export interface IosCommandStrategy {
  readonly deviceType: IosDeviceType;
  readonly supportedCommands: string[];
  
  dismissSetupCommand(): string;
  pressReturnCommand(): string;
  confirmationCommand(): string;
}

export interface IosCommandStrategies {
  router: IosCommandStrategy;
  switch: IosCommandStrategy;
  pc: IosCommandStrategy;
}

export function getStrategy(deviceType: IosDeviceType): IosCommandStrategy;
```

Implementaciones:
- **RouterStrategy**: dismiss="no", pressReturn="", confirm="y"
- **SwitchStrategy**: dismiss="no", pressReturn="", confirm="y" (mismo que router)
- **PcStrategy**: no tiene setup dialog (N/A)

### 3. `setup-guard.ts` (Core Logic)

Handler central que garantiza que el dispositivo está listo antes de ejecutar comandos.

```typescript
export interface SetupGuardOptions {
  maxWaitMs?: number;
  maxAttempts?: number;
  dryRun?: boolean;
}

export class IosSetupGuard {
  constructor(
    private readonly bridge: FileBridgePort,
    private readonly strategies: IosCommandStrategies,
    private readonly options?: SetupGuardOptions,
  );
  
  async ensureReady(device: string, deviceType?: IosDeviceType): Promise<SetupDetectionResult>;
  async isSetupActive(device: string): Promise<boolean>;
}

export interface SetupDetectionResult {
  wasActive: boolean;
  dismissed: boolean;
  attempts: number;
  finalState: IosPromptState;
  durationMs: number;
}
```

### 4. `index.ts`

Exports públicos del módulo.

---

## Data Flow

```
execInteractive(device, command)
  │
  ▼
IosSetupGuard.ensureReady(device, deviceType)
  │
  ├── Leer output actual del bridge
  ├── PromptClassifier.classify(output)
  ├── ¿needsSetupDismiss?
  │   ├── Sí → Strategy.dismissSetupCommand() → "no"
  │   ├── Esperar nuevo output (maxAttempts)
  │   ├── Re-clasificar
  │   └── ¿Still setup? → retry o throw
  ├── ¿Press RETURN?
  │   ├── Sí → Strategy.pressReturnCommand() → ""
  │   └── Esperar confirmación
  │
  ▼
Bridge.sendCommandAndWait("execInteractive", {device, command, ...})
  │
  ▼
{ ok: true, raw: output, evidence: {...} }
```

---

## Key Decisions

### 1. ¿Por qué no singleton/global state?
Cada `IosService` crea su propia instancia de `IosSetupGuard` con deps inyectadas. Esto permite:
- Testing isolado
- Configuración por instancia
- Sin estado compartido entre dispositivos

### 2. ¿Por qué no middleware en el bridge?
El bridge es infraestructura. La lógica de negocio (qué hacer con el setup dialog) pertenece a la capa de aplicación, no de infraestructura.

### 3. ¿Por qué deviceType como parámetro y no hardcoded?
Permite que el caller decida el tipo de dispositivo. Si el caller no sabe, puede consultarlo al `DeviceCapabilitiesResolver`.

### 4. Timeout y retries
- `maxWaitMs=5000`: tiempo máximo esperando que el setup se cierre
- `maxAttempts=20`: máximo de polls al output antes de dar timeout
- Ambos son configurables via `SetupGuardOptions`

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Setup no se cierra después de N intentos | Throw `SetupDismissError` con contexto |
| Output inesperado no clasificado | Log warning, continuar (fail-open) |
| Bridge unavailable | Delegar error al caller |
| Device type unknown | Default a "router" strategy |

---

## Testing Strategy

### Unit tests
- `PromptClassifier`: tests con outputs known de IOS
- `SetupGuard`: mock del bridge, verificar secuencia de comandos
- `IosCommandStrategies`: verificar comandos correcta por tipo

### Integration tests
- `ios-exec-setup-regression.test.ts` existente se mantiene
- Nuevo test: `setup-guard.integration.test.ts`

---

## Migration Plan

1. **Fase 1**: Crear módulos nuevos en `domain/ios/session/`
2. **Fase 2**: `IosExecutionService` usa `IosSetupGuard` internamente
3. **Fase 3**: Eliminar lógica duplicada en `lift.ts`, `config.ts`, etc.
4. **Fase 4**: Eliminar patterns duplicados en `ios-exec-handlers-template.ts`

---

## Files to Create/Modify

### New files
- `packages/pt-control/src/domain/ios/session/prompt-classifier.ts`
- `packages/pt-control/src/domain/ios/session/ios-commands.ts`
- `packages/pt-control/src/domain/ios/session/setup-guard.ts`
- `packages/pt-control/src/domain/ios/session/index.ts`
- `packages/pt-control/src/domain/ios/session/setup-guard.test.ts`
- `packages/pt-control/src/domain/ios/session/prompt-classifier.test.ts`

### Modify
- `packages/pt-control/src/application/services/ios-execution-service.ts` — usar SetupGuard
- `apps/pt-cli/src/commands/lab/lift.ts` — eliminar `dismissInitialDialog` local
- `packages/pt-runtime/src/handlers/config.ts` — eliminar filter patterns (si no se usa)
- `packages/pt-runtime/src/templates/ios-exec-handlers-template.ts` — eliminar lógica de setup (será manejada en TypeScript)

---

## Success Criteria

1. Un solo lugar donde se decide cómo responder al setup dialog
2. Verificación explícita de que el dismiss funcionó
3. Comandos específicos por tipo de dispositivo (router/switch/pc)
4. Fail-fast con error claro si no se puede dismiss
5. Tests que cubren el happy path y casos de error
