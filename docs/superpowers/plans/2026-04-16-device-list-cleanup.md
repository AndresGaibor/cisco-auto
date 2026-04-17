# Device List Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducir el ruido de `pt device list` y ocultar puertos vacíos en la vista normal sin perder la salida completa de `--verbose`.

**Architecture:** La normalización de datos sigue en `apps/pt-cli/src/application/device-list.ts`; el filtrado de presentación vive en `apps/pt-cli/src/commands/device/list.ts`. Se extrae una helper pura para decidir qué puertos se renderizan según `verbose`, de modo que los tests puedan cubrir el comportamiento sin depender de PT.

**Tech Stack:** Bun, TypeScript, `bun:test`, CLI `commander`.

---

### Task 1: Extraer selección de puertos

**Files:**
- Modify: `apps/pt-cli/src/commands/device/list.ts:128-289`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "bun:test";
import { selectPortsForDisplay } from "../commands/device/list.js";

test("verbose devuelve todos los puertos", () => {
  const ports = [{ name: "A" }, { name: "B" }];
  expect(selectPortsForDisplay(ports as any, true)).toHaveLength(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/device-list.test.ts`
Expected: FAIL because `selectPortsForDisplay` is not exported yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function selectPortsForDisplay(ports: ListedPort[], verbose: boolean): ListedPort[] {
  const interestingPorts = ports.filter((p) => p.ipAddress || p.status === "up" || p.connection);
  return verbose ? ports : interestingPorts.slice(0, 8);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/device-list.test.ts`
Expected: PASS.

### Task 2: Cover normal and mobile behavior

**Files:**
- Modify: `apps/pt-cli/src/__tests__/device-list.test.ts:1-180`
- Modify: `apps/pt-cli/src/commands/device/list.ts:257-288`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "bun:test";
import { selectPortsForDisplay } from "../commands/device/list.js";

test("normal solo devuelve puertos interesantes y respeta el limite", () => {
  const ports = Array.from({ length: 10 }, (_, i) => ({
    name: `P${i}`,
    status: i === 0 ? ("up" as const) : undefined,
  }));

  expect(selectPortsForDisplay(ports as any, false)).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/device-list.test.ts`
Expected: FAIL until the helper is used by the renderer and exported.

- [ ] **Step 3: Write minimal implementation**

```ts
const portsToShow = selectPortsForDisplay(ports, options.verbose);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/device-list.test.ts`
Expected: PASS.

### Task 3: Verify CLI output

**Files:**
- Test: `apps/pt-cli/src/__tests__/device-list.test.ts`

- [ ] **Step 1: Add a regression around empty mobile ports**

```ts
test("dispositivos sin puertos utiles no muestran bloque vacio", () => {
  const ports: any[] = [];
  expect(selectPortsForDisplay(ports, false)).toHaveLength(0);
});
```

- [ ] **Step 2: Run the focused test suite**

Run: `bun test src/__tests__/device-list.test.ts`
Expected: PASS.

- [ ] **Step 3: Run the real command**

Run: `bun run pt device list`
Expected: salida limpia con el bloque de puertos limitado en vista normal y completa con `--verbose`.
