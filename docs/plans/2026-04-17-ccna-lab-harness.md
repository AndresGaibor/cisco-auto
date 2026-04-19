# CCNA Lab Harness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete lab harness for CCNA scenarios (1-8), with XML device inspection, improved pt-runtime, pt-control, and CLI lab commands.

**Architecture:** Three-layer approach: pt-runtime (inspection/XML extraction) → pt-control (orchestration/harness) → pt-cli (commands/reporting). XML parsing for device state via `serializeToXml()` and `activityTreeToXml()`.

**Tech Stack:** Bun, TypeScript, Packet Tracer IPC, CLI Commander, NDJSON logging

---

## Task 1: XML Device Parser

**Files:**
- Create: `packages/pt-runtime/src/utils/device-xml-parser.ts`
- Create: `packages/pt-runtime/src/__tests__/device-xml-parser.test.ts`
- Modify: `packages/pt-runtime/src/handlers/inspect.ts` (add XML enrichment)
- Modify: `packages/pt-runtime/src/handlers/runtime-handlers.ts` (register handlers)

**Step 1: Write the XML parser**

```typescript
// packages/pt-runtime/src/utils/device-xml-parser.ts

export interface ParsedDeviceXml {
  hostname?: string;
  model?: string;
  typeId?: number;
  power?: boolean;
  ports: XmlPort[];
  modules: XmlModule[];
  config?: string;
}

export interface XmlPort {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  macAddress?: string;
  status?: string;
  protocol?: string;
  vlan?: number;
  mode?: string;
  description?: string;
  bandwidth?: string;
  delay?: string;
  duplex?: string;
  speed?: string;
  encapsulation?: string;
  trunkVlan?: number;
}

export interface XmlModule {
  slot: string;
  model?: string;
  type?: string;
  ports: string[];
}

export function parseDeviceXml(xml: string): ParsedDeviceXml {
  // parse hostname from <hostname>...</hostname>
  // parse model from <model>...</model> or typeId
  // parse ports from <port> elements
  // parse modules from <module> elements
  // parse config from <config> or <running-config>
}

export function extractRunningConfig(xml: string): string {
  // extract config section from XML
}

export function extractVlanTable(xml: string): XmlVlan[] {
  // parse VLANs from XML
}

export function extractInterfaceList(xml: string): XmlPort[] {
  // parse interfaces from XML
}
```

**Step 2: Write failing tests**

Create XML samples for router, switch, PC. Test parsing of hostname, ports, modules, config. Test malformed XML handling.

**Step 3: Implement parser**

Minimal implementation that makes tests pass.

**Step 4: Run tests**

```bash
bun test ./packages/pt-runtime/src/__tests__/device-xml-parser.test.ts
```

**Step 5: Commit**

---

## Task 2: Enrich inspect/snapshot with XML

**Files:**
- Modify: `packages/pt-runtime/src/handlers/inspect.ts`
- Modify: `packages/pt-runtime/src/handlers/runtime-handlers.ts`

**Step 1: Modify handleInspect to include XML when includeXml=true**

When `payload.includeXml === true`, call `device.serializeToXml()` and parse it, adding `xmlParsed` field to result.

**Step 2: Modify handleSnapshot to include XML summaries**

Add `xmlSummaries` map to snapshot with parsed device XML.

**Step 3: Run tests**

```bash
bun test ./packages/pt-runtime/src/__tests__/device-xml-parser.test.ts
bun run typecheck 2>&1 | grep pt-runtime
```

**Step 4: Deploy**

```bash
cd packages/pt-runtime && bun run deploy
```

---

## Task 3: pt-control LabService

**Files:**
- Create: `packages/pt-control/src/application/services/lab-service.ts`
- Create: `packages/pt-control/src/__tests__/lab-service.test.ts`
- Modify: `packages/pt-control/src/controller/index.ts` (add labService)

**Step 1: Write LabService**

```typescript
// packages/pt-control/src/application/services/lab-service.ts

export interface LabScenario {
  id: string;
  name: string;
  setup: () => Promise<void>;
  action: () => Promise<void>;
  verify: () => Promise<LabVerification>;
  cleanup: () => Promise<void>;
}

export interface LabVerification {
  ok: boolean;
  checks: LabCheck[];
  evidence: Record<string, unknown>;
  errors: string[];
}

export interface LabCheck {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  message?: string;
}

export class LabService {
  constructor(
    private bridge: FileBridgePort,
    private topologyCache: TopologyCache,
    private deviceService: DeviceService,
    private iosService: IosService,
  ) {}

  async runScenario(scenario: LabScenario): Promise<LabVerification> {
    // setup → action → verify → cleanup
    // always cleanup even on failure
  }

  async inspectDeviceXml(name: string): Promise<ParsedDeviceXml> {
    // use deepInspect or evaluate to get serializeToXml
  }

  async getSnapshot(): Promise<TopologySnapshot> {
    // get current snapshot
  }
}
```

**Step 2: Write tests with mocks**

**Step 3: Add to PTController**

```typescript
// in PTController constructor
this.labService = new LabService(
  this.bridge,
  this.topologyCache,
  this.deviceService,
  this.iosService,
);
```

**Step 4: Run tests**

```bash
bun test ./packages/pt-control/src/__tests__/lab-service.test.ts
```

---

## Task 4: CLI Lab Commands

**Files:**
- Create: `apps/pt-cli/src/commands/lab/index.ts`
- Create: `apps/pt-cli/src/commands/lab/run.ts`
- Create: `apps/pt-cli/src/commands/lab/inspect.ts`
- Create: `apps/pt-cli/src/commands/lab/verify.ts`
- Create: `apps/pt-cli/src/commands/lab/types.ts`
- Create: `apps/pt-cli/src/__tests__/commands/lab.test.ts`
- Modify: `apps/pt-cli/src/program.ts`

**Step 1: Create lab command structure**

```typescript
// apps/pt-cli/src/commands/lab/types.ts
export interface LabCheckResult {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
}

export interface LabRunResult {
  scenarioId: string;
  scenarioName: string;
  ok: boolean;
  checks: LabCheckResult[];
  durationMs: number;
  errors: string[];
}
```

**Step 2: Create lab/run.ts**

```typescript
// pt lab run <scenario-id>
// Loads scenario, runs setup→action→verify→cleanup, prints result
export function createLabRunCommand(): Command {
  return new Command("run")
    .description("Run a CCNA lab scenario")
    .argument("<scenario>", "Scenario ID (e.g. lan-minimal, gateway-misconfig)")
    .option("--json", "Output as JSON")
    .action(async (scenarioId, options) => {
      // load scenario, run via PTController.labService
      // print styled result with checks
    });
}
```

**Step 3: Create lab/inspect.ts**

```typescript
// pt lab inspect <device> [--xml]
export function createLabInspectCommand(): Command {
  return new Command("inspect")
    .description("Inspect a device with XML details")
    .argument("<device>", "Device name")
    .option("--xml", "Include full XML parsed output")
    .option("--json", "Output as JSON")
    .action(async (device, options) => {
      // use PTController.inspectDevice(device, true)
      // print styled output
    });
}
```

**Step 4: Create lab/index.ts (registry)**

```typescript
export function createLabCommand(): Command {
  const cmd = new Command("lab")
    .description("Run and verify CCNA lab scenarios");
  cmd.addCommand(createLabRunCommand());
  cmd.addCommand(createLabInspectCommand());
  return cmd;
}
```

**Step 5: Register in program.ts**

```typescript
// Add to the command registry
program.addCommand(createLabCommand());
```

**Step 6: Write tests**

Test help, unknown scenario, json output, error when PT not running.

**Step 7: Run tests**

```bash
bun test ./apps/pt-cli/src/__tests__/commands/lab.test.ts
```

---

## Task 5: CCNA Scenarios 1-8

**Files:**
- Create: `apps/pt-cli/src/lab/scenarios/index.ts`
- Create: `apps/pt-cli/src/lab/scenarios/fundamentals.ts`
- Create: `apps/pt-cli/src/lab/scenarios/types.ts`
- Create: `apps/pt-cli/src/lab/verifier.ts`
- Create: `apps/pt-cli/src/__tests__/lab/scenarios.test.ts`

**Scenarios:**

1. `lan-minimal` - 2 PCs + 1 switch, verify connectivity
2. `arp-learning` - 3 PCs + 1 switch, verify ARP table
3. `router-between-nets` - 2 LANs via router, verify routing
4. `gateway-misconfig` - Wrong gateway, detect failure
5. `mask-misconfig` - Wrong mask, detect failure
6. `ip-duplicate` - Duplicate IP, detect conflict
7. `switch-documented` - Named switch with descriptions
8. `subnetting-basic` - Two LANs with /26 subnetting

**Step 1: Define scenario types**

```typescript
export interface Scenario {
  id: string;
  name: string;
  description: string;
  devices: DeviceSpec[];
  links: LinkSpec[];
  config?: DeviceConfig[];
  verify: LabVerificationFn;
}
```

**Step 2: Implement scenarios 1-8**

Each scenario has:
- `setup()`: add devices, add links, config
- `verify()`: check device state, connectivity, ARP, routing tables
- `cleanup()`: clear canvas

**Step 3: Write tests**

Test scenario registry, unknown scenario, fixture loading.

---

## Task 6: Integration Tests with PT

**Step 1: Run all scenarios manually**

```bash
bun run pt lab run lan-minimal
bun run pt lab run arp-learning
# ... etc
```

**Step 2: Fix issues found**

Document and fix runtime, control, or CLI issues discovered.

---

## Verification Commands

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# All tests
bun test

# Deploy runtime
cd packages/pt-runtime && bun run deploy

# Run specific tests
bun test ./packages/pt-runtime/src/__tests__/device-xml-parser.test.ts
bun test ./packages/pt-control/src/__tests__/lab-service.test.ts
bun test ./apps/pt-cli/src/__tests__/commands/lab.test.ts
```
