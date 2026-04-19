# IOS Session Guard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar el manejo del Initial Configuration Dialog de IOS con arquitectura clean code — detección inteligente, automática, y extensible por tipo de dispositivo.

**Architecture:** Arquitectura hexagonal con ports/adapters. `IosSetupGuard` como core logic, `PromptClassifier` para detección de patrones, `IosCommandStrategy` como port para comandos por tipo de dispositivo. Todo en `packages/pt-control/src/domain/ios/session/`.

**Tech Stack:** TypeScript puro, Bun test runner, arquitectura hexagonal con FileBridgePort como infraestructura.

---

## File Structure

```
packages/pt-control/src/domain/ios/session/
├── index.ts                    # Exports públicos
├── prompt-classifier.ts       # Clasificación de prompts IOS
├── ios-commands.ts            # Strategies por tipo dispositivo  
├── setup-guard.ts            # Core logic - ensureReady()
├── setup-guard.test.ts       # Tests unitarios
└── prompt-classifier.test.ts # Tests unitarios
```

---

## Task 1: PromptClassifier

**Files:**
- Create: `packages/pt-control/src/domain/ios/session/prompt-classifier.ts`
- Test: `packages/pt-control/src/domain/ios/session/prompt-classifier.test.ts`

- [ ] **Step 1: Escribir test para PromptClassifier**

```typescript
import { test, expect, describe } from "bun:test";
import { PromptClassifier, IosPromptState } from "./prompt-classifier";

describe("PromptClassifier", () => {
  const classifier = new PromptClassifier();

  describe("isSetupDialog", () => {
    test("detecta Would you like to enter the initial configuration dialog", () => {
      const output = "Would you like to enter the initial configuration dialog? [yes/no]:";
      expect(classifier.isSetupDialog(output)).toBe(true);
    });

    test("detecta initial configuration dialog sin Would", () => {
      const output = " --- Initial configuration dialog ---";
      expect(classifier.isSetupDialog(output)).toBe(true);
    });

    test("no detecta falso positivo en output normal", () => {
      const output = "Router#show ip int brief";
      expect(classifier.isSetupDialog(output)).toBe(false);
    });
  });

  describe("isPressReturn", () => {
    test("detecta Press RETURN to get started", () => {
      const output = "Press RETURN to get started!";
      expect(classifier.isPressReturn(output)).toBe(true);
    });
  });

  describe("isNormalPrompt", () => {
    test("detecta prompt # normal", () => {
      expect(classifier.isNormalPrompt("Router#")).toBe(true);
    });

    test("detecta prompt > normal", () => {
      expect(classifier.isNormalPrompt("Router>")).toBe(true);
    });

    test("detecta prompt (config)#", () => {
      expect(classifier.isNormalPrompt("Router(config)#")).toBe(true);
    });
  });

  describe("classify", () => {
    test("devuelve múltiples estados si hay varios patrones", () => {
      const output = "Router#show ip int brief";
      const states = classifier.classify(output);
      expect(states).toContain(IosPromptState.NORMAL);
    });
  });
});
```

- [ ] **Step 2: Run test para verificar que falla**

Run: `bun test packages/pt-control/src/domain/ios/session/prompt-classifier.test.ts`
Expected: FAIL — file not found

- [ ] **Step 3: Implementar PromptClassifier mínimo**

```typescript
export enum IosPromptState {
  NORMAL = "normal",
  SETUP_DIALOG = "setup_dialog",
  PRESS_RETURN = "press_return",
  PASSWORD = "password",
  CONFIRM = "confirm",
  AWAITING_INPUT = "awaiting_input",
}

export class PromptClassifier {
  private readonly setupDialogPatterns = [
    /Would you like to enter the initial configuration dialog\?/i,
    /initial configuration dialog/i,
  ];

  private readonly pressReturnPatterns = [
    /Press RETURN to get started/i,
  ];

  private readonly normalPromptPatterns = [
    /^[^#\)>]+[#\>]/,
    /\(config[^\)]*\)#\s*$/,
    /#\s*$/,
    />\s*$/,
  ];

  isSetupDialog(output: string): boolean {
    return this.setupDialogPatterns.some(p => p.test(output));
  }

  isPressReturn(output: string): boolean {
    return this.pressReturnPatterns.some(p => p.test(output));
  }

  isNormalPrompt(output: string): boolean {
    return this.normalPromptPatterns.some(p => p.test(output));
  }

  classify(output: string): IosPromptState[] {
    const states: IosPromptState[] = [];
    if (this.isSetupDialog(output)) states.push(IosPromptState.SETUP_DIALOG);
    if (this.isPressReturn(output)) states.push(IosPromptState.PRESS_RETURN);
    if (this.isNormalPrompt(output)) states.push(IosPromptState.NORMAL);
    return states;
  }

  needsSetupDismiss(output: string): boolean {
    return this.isSetupDialog(output);
  }
}
```

- [ ] **Step 4: Run test para verificar que pasa**

Run: `bun test packages/pt-control/src/domain/ios/session/prompt-classifier.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pt-control/src/domain/ios/session/prompt-classifier.ts packages/pt-control/src/domain/ios/session/prompt-classifier.test.ts
git commit -m "feat(ios-session): add PromptClassifier para detectar setup dialog"
```

---

## Task 2: IosCommandStrategy (Port)

**Files:**
- Create: `packages/pt-control/src/domain/ios/session/ios-commands.ts`
- Test: `packages/pt-control/src/domain/ios/session/ios-commands.test.ts`

- [ ] **Step 1: Escribir test para strategies**

```typescript
import { test, expect, describe } from "bun:test";
import { 
  IosCommandStrategy, 
  RouterStrategy, 
  SwitchStrategy, 
  PcStrategy,
  getStrategy,
  IosDeviceType 
} from "./ios-commands";

describe("IosCommandStrategy", () => {
  describe("RouterStrategy", () => {
    const strategy = new RouterStrategy();
    
    test("deviceType es router", () => {
      expect(strategy.deviceType).toBe("router");
    });

    test("dismissSetupCommand devuelve 'no'", () => {
      expect(strategy.dismissSetupCommand()).toBe("no");
    });

    test("pressReturnCommand devuelve ''", () => {
      expect(strategy.pressReturnCommand()).toBe("");
    });
  });

  describe("SwitchStrategy", () => {
    const strategy = new SwitchStrategy();
    
    test("deviceType es switch", () => {
      expect(strategy.deviceType).toBe("switch");
    });

    test("dismissSetupCommand devuelve 'no'", () => {
      expect(strategy.dismissSetupCommand()).toBe("no");
    });
  });

  describe("PcStrategy", () => {
    const strategy = new PcStrategy();
    
    test("deviceType es pc", () => {
      expect(strategy.deviceType).toBe("pc");
    });

    test("PC no tiene setup dialog - devuelve null", () => {
      expect(strategy.dismissSetupCommand()).toBeNull();
    });
  });

  describe("getStrategy", () => {
    test("devuelve RouterStrategy para 'router'", () => {
      expect(getStrategy("router")).toBeInstanceOf(RouterStrategy);
    });

    test("devuelve SwitchStrategy para 'switch'", () => {
      expect(getStrategy("switch")).toBeInstanceOf(SwitchStrategy);
    });

    test("devuelve PcStrategy para 'pc'", () => {
      expect(getStrategy("pc")).toBeInstanceOf(PcStrategy);
    });
  });
});
```

- [ ] **Step 2: Run test para verificar que falla**

Run: `bun test packages/pt-control/src/domain/ios/session/ios-commands.test.ts`
Expected: FAIL — file not found

- [ ] **Step 3: Implementar ios-commands.ts**

```typescript
export type IosDeviceType = "router" | "switch" | "pc";

export interface IosCommandStrategy {
  readonly deviceType: IosDeviceType;
  readonly supportedCommands: string[];
  dismissSetupCommand(): string | null;
  pressReturnCommand(): string;
  confirmationCommand(): string;
}

export class RouterStrategy implements IosCommandStrategy {
  readonly deviceType: IosDeviceType = "router";
  readonly supportedCommands = ["show", "config", "interface", "router", "acl", "vlan", "spanning-tree", "etherchannel"];

  dismissSetupCommand(): string {
    return "no";
  }

  pressReturnCommand(): string {
    return "";
  }

  confirmationCommand(): string {
    return "y";
  }
}

export class SwitchStrategy implements IosCommandStrategy {
  readonly deviceType: IosDeviceType = "switch";
  readonly supportedCommands = ["show", "config", "interface", "vlan", "spanning-tree", "etherchannel", "port-security"];

  dismissSetupCommand(): string {
    return "no";
  }

  pressReturnCommand(): string {
    return "";
  }

  confirmationCommand(): string {
    return "y";
  }
}

export class PcStrategy implements IosCommandStrategy {
  readonly deviceType: IosDeviceType = "pc";
  readonly supportedCommands = ["ipconfig", "ping", "tracert", "arp", "netstat"];

  dismissSetupCommand(): string | null {
    return null;
  }

  pressReturnCommand(): string {
    return "";
  }

  confirmationCommand(): string {
    return "y";
  }
}

export interface IosCommandStrategies {
  router: IosCommandStrategy;
  switch: IosCommandStrategy;
  pc: IosCommandStrategy;
}

export function getStrategy(deviceType: IosDeviceType): IosCommandStrategy {
  switch (deviceType) {
    case "router":
      return new RouterStrategy();
    case "switch":
      return new SwitchStrategy();
    case "pc":
      return new PcStrategy();
  }
}
```

- [ ] **Step 4: Run test para verificar que pasa**

Run: `bun test packages/pt-control/src/domain/ios/session/ios-commands.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pt-control/src/domain/ios/session/ios-commands.ts packages/pt-control/src/domain/ios/session/ios-commands.test.ts
git commit -m "feat(ios-session): add IosCommandStrategy port para comandos por dispositivo"
```

---

## Task 3: IosSetupGuard (Core Logic)

**Files:**
- Create: `packages/pt-control/src/domain/ios/session/setup-guard.ts`
- Create: `packages/pt-control/src/domain/ios/session/setup-guard.test.ts`
- Modify: `packages/pt-control/src/application/services/ios-execution-service.ts`

- [ ] **Step 1: Escribir test para SetupGuard con mock del bridge**

```typescript
import { test, expect, describe, beforeEach, vi } from "bun:test";
import { IosSetupGuard } from "./setup-guard";
import type { FileBridgePort } from "../../ports/file-bridge.port.js";
import type { BridgeResultEnvelope } from "@cisco-auto/file-bridge";
import { IosDeviceType } from "./ios-commands";

describe("IosSetupGuard", () => {
  let mockBridge: FileBridgePort;
  let setupGuard: IosSetupGuard;
  let mockSendCommandAndWait: any;

  beforeEach(() => {
    mockSendCommandAndWait = vi.fn();
    mockBridge = {
      sendCommandAndWait: mockSendCommandAndWait,
    } as any;
    setupGuard = new IosSetupGuard(mockBridge);
  });

  describe("ensureReady", () => {
    test("si output es normal, no envía comandos", async () => {
      mockSendCommandAndWait.mockResolvedValue({
        ok: true,
        value: { raw: "Router#", parsed: {} },
      });

      const result = await setupGuard.ensureReady("R1", IosDeviceType.ROUTER);
      
      expect(result.wasActive).toBe(false);
      expect(result.dismissed).toBe(false);
      expect(mockSendCommandAndWait).not.toHaveBeenCalled();
    });

    test("si setup dialog está activo, envía 'no' y espera", async () => {
      mockSendCommandAndWait
        .mockResolvedValueOnce({
          ok: true,
          value: { raw: "Would you like to enter the initial configuration dialog? [yes/no]:", parsed: {} },
        })
        .mockResolvedValueOnce({
          ok: true,
          value: { raw: "Router#", parsed: {} },
        });

      const result = await setupGuard.ensureReady("R1", IosDeviceType.ROUTER);
      
      expect(result.wasActive).toBe(true);
      expect(result.dismissed).toBe(true);
      expect(mockSendCommandAndWait).toHaveBeenCalledTimes(2);
    });
  });
});
```

- [ ] **Step 2: Run test para verificar que falla**

Run: `bun test packages/pt-control/src/domain/ios/session/setup-guard.test.ts`
Expected: FAIL — file not found

- [ ] **Step 3: Implementar SetupGuard**

```typescript
import type { FileBridgePort } from "../../../ports/file-bridge.port.js";
import type { BridgeResultEnvelope } from "@cisco-auto/file-bridge";
import { PromptClassifier, IosPromptState } from "./prompt-classifier.js";
import { IosCommandStrategy, IosDeviceType, getStrategy } from "./ios-commands.js";

export interface SetupGuardOptions {
  maxWaitMs?: number;
  maxAttempts?: number;
}

export interface SetupDetectionResult {
  wasActive: boolean;
  dismissed: boolean;
  attempts: number;
  finalState: IosPromptState;
  durationMs: number;
}

export class IosSetupGuard {
  private readonly classifier = new PromptClassifier();
  private readonly strategies = { router: getStrategy("router"), switch: getStrategy("switch"), pc: getStrategy("pc") };
  private readonly maxWaitMs: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly bridge: FileBridgePort,
    options?: SetupGuardOptions,
  ) {
    this.maxWaitMs = options?.maxWaitMs ?? 5000;
    this.maxAttempts = options?.maxAttempts ?? 20;
  }

  async ensureReady(device: string, deviceType: IosDeviceType = "router"): Promise<SetupDetectionResult> {
    const startTime = Date.now();
    const strategy = this.strategies[deviceType];
    let attempts = 0;

    const initialOutput = await this.readOutput(device);
    const initialStates = this.classifier.classify(initialOutput);

    if (!initialStates.includes(IosPromptState.SETUP_DIALOG) && !initialStates.includes(IosPromptState.PRESS_RETURN)) {
      return {
        wasActive: false,
        dismissed: false,
        attempts: 0,
        finalState: this.classifier.classify(initialOutput)[0] ?? IosPromptState.NORMAL,
        durationMs: Date.now() - startTime,
      };
    }

    if (initialStates.includes(IosPromptState.SETUP_DIALOG)) {
      const dismissCmd = strategy.dismissSetupCommand();
      if (dismissCmd !== null) {
        await this.sendCommand(device, dismissCmd);
        attempts++;
        await this.waitForDismiss(device, startTime);
      }
    }

    if (initialStates.includes(IosPromptState.PRESS_RETURN)) {
      await this.sendCommand(device, strategy.pressReturnCommand());
      attempts++;
      await this.waitForDismiss(device, startTime);
    }

    const finalOutput = await this.readOutput(device);
    const finalStates = this.classifier.classify(finalOutput);

    return {
      wasActive: true,
      dismissed: !finalStates.includes(IosPromptState.SETUP_DIALOG) && !finalStates.includes(IosPromptState.PRESS_RETURN),
      attempts,
      finalState: finalStates[0] ?? IosPromptState.NORMAL,
      durationMs: Date.now() - startTime,
    };
  }

  private async readOutput(device: string): Promise<string> {
    const result = await this.bridge.sendCommandAndWait<any>("execInteractive", {
      device,
      command: "",
      options: { timeout: 2000, parse: false, ensurePrivileged: false },
    });
    return result.value?.raw ?? "";
  }

  private async sendCommand(device: string, command: string): Promise<void> {
    await this.bridge.sendCommandAndWait("execInteractive", {
      device,
      command,
      options: { timeout: 3000, parse: false, ensurePrivileged: false },
    });
  }

  private async waitForDismiss(device: string, startTime: number): Promise<void> {
    let attempt = 0;
    while (attempt < this.maxAttempts && (Date.now() - startTime) < this.maxWaitMs) {
      const output = await this.readOutput(device);
      if (!this.classifier.isSetupDialog(output) && !this.classifier.isPressReturn(output)) {
        return;
      }
      attempt++;
    }
  }
}
```

- [ ] **Step 4: Run test para verificar que pasa**

Run: `bun test packages/pt-control/src/domain/ios/session/setup-guard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pt-control/src/domain/ios/session/setup-guard.ts packages/pt-control/src/domain/ios/session/setup-guard.test.ts
git commit -m "feat(ios-session): add IosSetupGuard con ensureReady automático"
```

---

## Task 4: Integrar SetupGuard en IosExecutionService

**Files:**
- Modify: `packages/pt-control/src/application/services/ios-execution-service.ts`
- Modify: `packages/pt-control/src/application/services/ios-service.ts`

- [ ] **Step 1: Leer ios-execution-service.ts actual**

Run: `cat packages/pt-control/src/application/services/ios-execution-service.ts | head -50`

- [ ] **Step 2: Modificar execInteractive para usar SetupGuard**

Reemplazar la lógica de detección de setup patterns (líneas 165-183) con llamada a SetupGuard:

```typescript
// En execInteractive, ANTES de enviar el comando:
const setupResult = await this.setupGuard.ensureReady(device, this.deviceType ?? "router");
if (setupResult.wasActive) {
  console.warn(`[ios-execution] Setup dialog detectado y dismissed para ${device}`);
}
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/pt-control/src/application/services/ios-execution-service.ts
git commit -m "refactor(ios-session): integrar IosSetupGuard en execInteractive"
```

---

## Task 5: index.ts exports

**Files:**
- Create: `packages/pt-control/src/domain/ios/session/index.ts`

- [ ] **Step 1: Crear index.ts**

```typescript
export { IosSetupGuard, type SetupGuardOptions, type SetupDetectionResult } from "./setup-guard.js";
export { PromptClassifier, type IosPromptState } from "./prompt-classifier.js";
export { 
  type IosCommandStrategy, 
  type IosDeviceType,
  RouterStrategy,
  SwitchStrategy,
  PcStrategy,
  getStrategy,
} from "./ios-commands.js";
```

- [ ] **Step 2: Commit**

```bash
git add packages/pt-control/src/domain/ios/session/index.ts
git commit -m "feat(ios-session): export pública del módulo session"
```

---

## Task 6: Cleanup - Eliminar lógica duplicada

**Files:**
- Modify: `apps/pt-cli/src/commands/lab/lift.ts` (eliminar dismissInitialDialog local)
- Modify: `packages/pt-runtime/src/templates/ios-exec-handlers-template.ts` (comentariar lógica de setup)

- [ ] **Step 1: Revisar lift.ts para ver uso de dismissInitialDialog**

Run: `grep -n "dismissInitialDialog" apps/pt-cli/src/commands/lab/lift.ts`

- [ ] **Step 2: En lift.ts, eliminar función dismissInitialDialog local y sus llamados**

La función `dismissInitialDialog` en lift.ts:304-316 ya no será necesaria porque `IosExecutionService.execInteractive` ahora maneja el setup automáticamente.

- [ ] **Step 3: Commit**

```bash
git add apps/pt-cli/src/commands/lab/lift.ts
git commit -m "refactor(ios-session): eliminar dismissInitialDialog local (ahora en SetupGuard)"
```

---

## Verification Commands

Después de cada task:
```bash
bun test packages/pt-control/src/domain/ios/session/
bun run typecheck
```

Al final:
```bash
bun test packages/pt-control/src/domain/ios/session/
bun run typecheck
# Verificar que ios-exec-setup-regression.test.ts sigue pasando
bun test packages/pt-runtime/src/__tests__/ios-exec-setup-regression.test.ts
```

---

## Success Criteria Check

- [ ] Un solo lugar donde se decide cómo responder al setup dialog (`SetupGuard`)
- [ ] Verificación explícita de que el dismiss funcionó (`SetupDetectionResult.dismissed`)
- [ ] Comandos específicos por tipo de dispositivo (`IosCommandStrategy`)
- [ ] Fail-fast con error claro si no se puede dismiss (throw en `ensureReady`)
- [ ] Tests cubriendo happy path y casos de error
