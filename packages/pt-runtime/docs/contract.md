# PT Runtime Contract Baseline

> Generated: 2026-04-12
> Purpose: Document current contract before migration

## Input Payloads (Supported Types)

### Device Commands
- `addDevice` - Add device to topology
- `removeDevice` - Remove device
- `renameDevice` - Rename device
- `listDevices` - List all devices
- `moveDevice` - Move device on canvas

### Link Commands
- `addLink` - Add link between devices
- `removeLink` - Remove link

### IOS Commands
- `configIos` - Configure IOS device (commands array, ensurePrivileged, etc)
- `execIos` - Execute single IOS command
- `pollDeferred` - Poll deferred job status
- `inspect` - Snapshot/inspect operations

### Canvas Commands
- `setDeviceLocation` - Move device on canvas

### Host Configuration
- `configHost` - Configure device IP, mask, gateway, DNS, DHCP

## Output Results

### Success
```json
{
  "ok": true,
  "raw": "...",
  "status": 0,
  "parsed": {...},
  "session": {
    "mode": "...",
    "prompt": "...",
    "paging": bool,
    "awaitingConfirm": bool
  }
}
```

### Error
```json
{
  "ok": false,
  "error": "...",
  "code": "...",
  "raw": "...",
  "session": {...}
}
```

### Deferred
```json
{
  "ok": true,
  "deferred": true,
  "ticket": "job_N",
  "job": {
    "id": "...",
    "kind": "ios-session",
    "version": 1,
    "device": "...",
    "plan": [...],
    "options": {...},
    "payload": {...}
  }
}
```

## PT Terminal Events (Consumed)
- `commandStarted` - When command begins execution
- `outputWritten` - Incremental output
- `commandEnded` - Command completed with status
- `modeChanged` - IOS mode transition
- `promptChanged` - Prompt update
- `moreDisplayed` - Pager active/inactive

## DeferredStep Types
- `ensure-mode` - Transition to IOS mode (value: mode name like "priv-exec", "config")
- `command` - Execute IOS command (value: command string)
- `confirm` - Confirm dialog (write memory) - value: "y" or "n"
- `expect-prompt` - Wait for specific prompt
- `save-config` - write memory
- `delay` - Wait N ms
- `close-session` - End session

## Key Interfaces

### RuntimeResult (discriminated union)
```typescript
type RuntimeResult = RuntimeErrorResult | RuntimeSuccessResult | RuntimeDeferredResult;
```

### RuntimeErrorResult
```typescript
interface RuntimeErrorResult {
  ok: false;
  error: string;
  code?: string;
  raw?: string;
  source?: "terminal" | "synthetic" | "unknown";
  session?: SessionStateSnapshot;
}
```

### RuntimeSuccessResult
```typescript
interface RuntimeSuccessResult {
  ok: true;
  raw?: string;
  status?: number;
  source?: "terminal" | "synthetic";
  parsed?: Record<string, unknown>;
  parseError?: string;
  session?: SessionStateSnapshot;
}
```

### RuntimeDeferredResult
```typescript
interface RuntimeDeferredResult {
  ok: true;
  deferred: true;
  ticket: string;
  job: DeferredJobPlan;
}
```

### DeferredJobPlan
```typescript
interface DeferredJobPlan {
  id: string;
  kind: "ios-session";
  version: number;
  device: string;
  plan: DeferredStep[];
  options: DeferredJobOptions;
  payload: Record<string, unknown>;
}
```

### SessionStateSnapshot
```typescript
interface SessionStateSnapshot {
  mode: string;
  prompt: string;
  paging: boolean;
  awaitingConfirm: boolean;
}
```

### DeviceRef
```typescript
interface DeviceRef {
  name: string;
  hasTerminal: boolean;
  getTerminal(): PTCommandLine | null;
  getNetwork(): PTNetwork;
}
```

### RuntimeApi (injected by main into runtime)
```typescript
interface RuntimeApi {
  getDeviceByName(name: string): DeviceRef | null;
  listDevices(): string[];
  querySessionState(deviceName: string): SessionStateSnapshot | null;
  getWorkspace(): unknown;
  now(): number;
  safeJsonClone<T>(data: T): T;
  normalizePortName(name: string): string;
  dprint(msg: string): void;
  ipc: unknown;
}
```

## Commands that pt-control depends on

### Payload types supported by runtime dispatcher:
| Type | Handler | Description |
|------|---------|-------------|
| `configHost` | `handleConfigHost` | Configure device network settings (IP, DHCP, etc.) |
| `configIos` | `handleConfigIos` | Execute IOS config commands (deferred) |
| `execIos` | `handleExecIos` | Execute single IOS command (deferred) |
| `__pollDeferred` | `handleDeferredPoll` | Poll deferred job status |
| `__ping` | `handlePing` | Check if runtime is alive |

### Device operations (pure handlers):
| Type | Handler | Description |
|------|---------|-------------|
| `addDevice` | `handleAddDevice` | Add new device to canvas |
| `removeDevice` | `handleRemoveDevice` | Remove device from canvas |
| `listDevices` | `handleListDevices` | List all devices |
| `renameDevice` | `handleRenameDevice` | Rename device |
| `moveDevice` | `handleMoveDevice` | Move device on canvas |

## Deferred Job Execution Flow

1. **Runtime handler creates job** via `createIosJob()` or builds `DeferredJobPlan`
2. **Main kernel executes plan** by processing each `DeferredStep`:
   - `ensure-mode`: Transition to IOS mode
   - `command`: Execute command, wait for completion
   - `confirm`: Answer yes/no prompts
   - `save-config`: write memory after config
   - `close-session`: End session
3. **Runtime polls job status** via `__pollDeferred` with ticket
4. **Poll returns in-progress or completed** result

## Parsers (built-in for show commands)
- `show ip interface brief` - Returns `{ entries: [...] }`
- `show vlan brief` - Returns `{ entries: [...] }`

## Output Sanitization
Runtime sanitizes terminal output before returning:
- Strips command echo
- Removes `--More--` prompts
- Removes initial config dialog prompts
- Removes % Please answer prompts
- Strips prompt lines