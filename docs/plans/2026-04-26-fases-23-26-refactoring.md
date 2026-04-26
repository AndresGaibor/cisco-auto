# Fases 23-26 Refactoring Implementation Plan

> **For Claude:** Use subagent-driven-development para implementar las tareas una por una.

**Goal:** Dividir archivos grandes en módulos mantenibles (file-bridge-v2, lint-rule-engine, capability-registry)

**Architecture:** 
- Fase 23: Completar estructura v2/ para file-bridge
- Fase 25: Dividir rule-registry.ts (~1534 líneas) en reglas por categoría
- Fase 26: Ya está completo (verificar)

**Tech Stack:** TypeScript, Bun test

---

## Fase 23: file-bridge-v2.ts (~789 líneas)

**Estado Actual:** Módulos base ya existen en v2/, faltan algunos modules especializadas.

**Archivos Existentes:**
packages/file-bridge/src/v2/
- bridge-lifecycle.ts ✅
- command-processor.ts ✅
- crash-recovery.ts ✅
- diagnostics.ts ✅
- garbage-collector.ts ✅
- lease-manager.ts ✅
- monitoring-service.ts ✅

**Archivos a Crear:**
- v2/queue-reader.ts - Extraer lógica de lectura de cola de comandos
- v2/result-reader.ts - Extraer lógica de lectura de resultados

**Tarea 23.1: Crear queue-reader.ts**

**Archivos:**
- Crear: `packages/file-bridge/src/v2/queue-reader.ts`

**Step 1: Escribir el test**

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { QueueReader } from "./queue-reader.js";

describe("QueueReader", () => {
  it("debe leer comandos pendientes de la cola", () => {
    // Test básico
  });
});
```

**Step 2: Implementar queue-reader.ts**

```typescript
/**
 *QueueReader - Lee comandos pendientes de la cola
 */
import { listJsonFiles } from "../shared/fs-atomic.js";
import { BridgePathLayout, parseCommandFileName } from "../shared/path-layout.js";

export class QueueReader {
  constructor(private readonly paths: BridgePathLayout) {}

  getPendingCommands(): Array<{ seq: number; type: string; id: string }> {
    const files = listJsonFiles(this.paths.commandsDir());
    return files
      .map(f => parseCommandFileName(f))
      .filter(Boolean)
      .map(p => ({
        seq: p.seq,
        type: p.type,
        id: this.paths.commandIdFromSeq(p.seq)
      }));
  }
}
```

**Step 3: Verificar que compila**

Run: `cd packages/file-bridge && bun run typecheck`

---

**Tarea 23.2: Crear result-reader.ts**

**Archivos:**
- Crear: `packages/file-bridge/src/v2/result-reader.ts`

**Step 1: Escribir el test**

```typescript
import { describe, it, expect } from "bun:test";
import { ResultReader } from "./result-reader.js";

describe("ResultReader", () => {
  it("debe leer resultado por ID", () => {
    // Test
  });
});
```

**Step 2: Implementar result-reader.ts**

```typescript
/**
 * ResultReader - Lee resultados de comandos
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BridgePathLayout } from "../shared/path-layout.js";
import type { BridgeResultEnvelope } from "@cisco-auto/types";

export class ResultReader {
  constructor(private readonly paths: BridgePathLayout) {}

  readResult<T = unknown>(cmdId: string): BridgeResultEnvelope<T> | null {
    const path = this.paths.resultFilePath(cmdId);
    try {
      return JSON.parse(readFileSync(path, "utf8")) as BridgeResultEnvelope<T>;
    } catch {
      return null;
    }
  }
}
```

---

## Fase 25: lint-rule-engine (~1611 líneas)

**Estado Actual:** rules/ está vacío, rule-registry.ts tiene 1534 líneas TODO en un solo archivo.

**Reglas por Grupo:**
- basic-rules.ts (12 reglas): ipDuplicate, subnetNoGateway, accessPortVlanMissing, trunkVlanNotAllowed, nativeVlanMismatch, subinterfaceEncaps, dhcpPoolSubnetMismatch, dhcpHelperMissing, aclNotApplied, staticRouteNoReach, orphanLink, portConflict
- switching-rules.ts (4 reglas): stpPortfastMissing, stpBpduGuardMissing, etherChannelNotFormed, unusedPortNotShutdown
- routing-rules.ts (4 reglas): ospfDeadIntervalMismatch, ospfAuthMissing, eigrpAsMismatch, eigrpPassiveInterfaceWrong
- dhcp-rules.ts (3 reglas): dhcpExcludedAddressesMissing, dhcpPoolExhausted, dhcpFallbackMissing
- security-rules.ts (5 reglas): managementPortNoAcl, nativeVlan1OnTrunk, cdpEnabledUntrusted, sshNotConfigured, passwordInPlainText
- ipv6-rules.ts (4 reglas): ipv6LinkLocalNotConfigured, ipv6SlaacNoRa, ipv6DhcpRelayMissing, ipv6RoutingEnabledButNotConfigured
- hsrp-rules.ts (4 reglas): hsrpPriorityNotConfigured, hsrpPreemptNotEnabled, hsrpAuthMissing, hsrpTrackNotConfigured
- wireless-rules.ts (4 reglas): wlcControllerIpInconsistent, apJoinFailure, ssidNotEnabled, wirelessRrmNotConfigured

**Tarea 25.1: Crear basic-rules.ts**

**Archivos:**
- Crear: `packages/pt-control/src/pt/topology/lint/rules/basic-rules.ts`
- Modificar: `packages/pt-control/src/pt/topology/lint/rule-registry.ts`

**Step 1: Copiar funciones de-basic desde rule-registry.ts**

Copiar las 12 funciones de Basic/L2 rules desde rule-registry.ts a basic-rules.ts.

**Step 2: Actualizar rule-registry.ts para importar**

```typescript
// rule-registry.ts
import { createBasicRules } from './rules/basic-rules.js';

export function buildRuleRegistry(): LintRule[] {
  return [
    ...createBasicRules(),
    // ... resto de reglas
  ];
}
```

---

**Tarea 25.2: Crear switching-rules.ts (4 reglas)**

Copiar stpPortfastMissing, stpBpduGuardMissing, etherChannelNotFormed, unusedPortNotShutdown como funciones export.

---

**Tarea 25.3: Crear routing-rules.ts (4 reglas)**

Copiar ospfDeadIntervalMismatch, ospfAuthMissing, eigrpAsMismatch, eigrpPassiveInterfaceWrong.

---

**Tarea 25.4: Crear dhcp-rules.ts (3 reglas)**

Copiar dhcpExcludedAddressesMissing, dhcpPoolExhausted, dhcpFallbackMissing.

---

**Tarea 25.5: Crear security-rules.ts (5 reglas)**

Copiar managementPortNoAcl, nativeVlan1OnTrunk, cdpEnabledUntrusted, sshNotConfigured, passwordInPlainText.

---

**Tarea 25.6: Crear ipv6-rules.ts (4 reglas)**

Copiar ipv6LinkLocalNotConfigured, ipv6SlaacNoRa, ipv6DhcpRelayMissing, ipv6RoutingEnabledButNotConfigured.

---

**Tarea 25.7: Crear hsrp-rules.ts (4 reglas)**

Copiar hsrpPriorityNotConfigured, hsrpPreemptNotEnabled, hsrpAuthMissing, hsrpTrackNotConfigured.

---

**Tarea 25.8: Crear wireless-rules.ts (4 reglas)**

Copiar wlcControllerIpInconsistent, apJoinFailure, ssidNotEnabled, wirelessRrmNotConfigured.

---

**Tarea 25.9: Verificar rule-registry.ts reduzido**

Run: `wc -l packages/pt-control/src/pt/topology/lint/rule-registry.ts`

Esperado: <250 linhas

---

## Fase 26: capability-registry

**Estado:** ✅ COMPLETO (barrel file de 22 líneas)

**Verificación:**

Run: `ls -la packages/pt-control/src/omni/registry/`

Expected: capability-types.ts, capability-risk.ts, physical-capabilities.ts, etc.

No requiere trabajo adicional.

---

## Verificación Final

**Run tests:**

```bash
cd packages/file-bridge && bun test
cd packages/pt-control && bun test
```

**Expected:** Todos los tests pasan

---

## Execution

Two execution options:

1. **Subagent-Driven (this session)** - Dispatch subagent per task, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans

Which approach?