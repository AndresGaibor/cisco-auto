# PT IPC API Reference

> Documented: 2026-04-14
> Source: `src/pt-api/pt-api-registry.ts`, `src/pt-api/pt-events.ts`, `src/pt/terminal/terminal-events.ts`

## Global Scope

PT Script Engine exposes these globals (available in all scripts):

```typescript
declare const ipc: PTIpc;       // Inter-process communication
declare const fm: PTFileManager; // File operations
declare const dprint: (msg: string) => void; // PT logging
declare const self: PTGlobalScope; // Global object (use instead of globalThis)
```

## PTDevice

Represents a device in the Packet Tracer simulation.

```typescript
interface PTDevice {
  // Device identity
  getName(): string;
  getDeviceType(): number;  // See PT_DEVICE_TYPE_CONSTANTS

  // Network
  getProcess(name: string): unknown | null;
  getPort(portName: string): PTPort | null;
  getPortCount(): number;
  getPortAt(index: number): PTPort | null;

  // Configuration
  getConfig(): string;
  getRunningConfig(): string;
}
```

## PTPort

Represents a network interface on a device.

```typescript
interface PTPort {
  getName(): string;
  getPortType(): number;
  getIP(): string | null;
  getSubnetMask(): string | null;
  getInterfaceName(): string;
  getPhysicalAddress(): string;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
}
```

## PTNetwork

Network operations for the simulation.

```typescript
interface PTNetwork {
  connectDevice(source: PTDevice, sourcePort: string, target: PTDevice, targetPort: string): void;
  disconnectDevice(device: PTDevice, port: string): void;
  connectDeviceByID(sourceID: string, sourcePort: string, targetID: string, targetPort: string): void;
  getDeviceCount(): number;
  getDeviceAt(index: number): PTDevice | null;
  getDeviceByName(name: string): PTDevice | null;
}
```

## PTFileManager

File system operations within PT.

```typescript
interface PTFileManager {
  // File operations (mirrors POSIX)
  readFile(path: string): string;
  writeFile(path: string, content: string): void;
  exists(path: string): boolean;
  mkdir(path: string): void;
  readdir(path: string): string[];
  unlink(path: string): void;

  // PT-specific paths
  getWorkDir(): string;        // PT working directory
  resolvePath(rel: string): string;
}
```

## PTCommandLine

TerminalLine API for IOS device interaction.

```typescript
interface PTCommandLine {
  /** Attaches to a device's console */
  attach(deviceName: string): boolean;
  /** Detaches from current session */
  detach(): void;
  /** Checks if attached */
  isAttached(): boolean;

  /** Execute a command (async, resolves on commandEnded event) */
  enterCommand(cmd: string): void;  // Returns void — use events for result

  /** Continue pager (--More--) */
  continuePager(): void;

  /** Check if More prompt is displayed */
  isMoreDisplayed(): boolean;
}
```

## Terminal Events

Events fired by PT TerminalLine during command execution:

```typescript
type PTTerminalEventName =
  | "commandStarted"    // Command began execution
  | "outputWritten"     // Output data accumulated
  | "commandEnded"       // Command finished with status
  | "modeChanged"        // IOS mode changed (exec/config/etc)
  | "promptChanged"      // Prompt text updated
  | "moreDisplayed"      // --More-- pager activated
  | "connectionLost"     // Connection to device lost
  | "connectionRestored" // Connection re-established
  | "deviceAdded"        // New device added to simulation
  | "deviceRemoved";     // Device removed from simulation

interface PTCommandStartedArgs {
  command: string;
  device: string;
}

interface PTCommandEndedArgs {
  command: string;
  device: string;
  status: number;         // 0 = OK, non-zero = error
  durationMs: number;
}

interface PTModeChangedArgs {
  device: string;
  mode: string;            // "exec" | "config" | "config-if" | etc.
  previousMode: string;
}

interface PTOutputWrittenArgs {
  device: string;
  output: string;
}
```

## Event Registration

```typescript
// In terminal-engine.ts
terminal.on("commandEnded", (args: PTCommandEndedArgs) => {
  // Handle command completion
});

terminal.on("outputWritten", (args: PTOutputWrittenArgs) => {
  // Accumulate output
});

terminal.on("modeChanged", (args: PTModeChangedArgs) => {
  // Track IOS mode changes for prompt parsing
});
```

## PT Device Type Constants

```typescript
const PT_DEVICE_TYPE = {
  ROUTER:  0,
  SWITCH:  1,
  HUB:     2,
  REPEATER: 2,
  BRIDGE:  3,
  AP:      4,   // Access Point
  RT:      5,   // Router (alias?)
  PC:      8,
  SERVER:  9,
  PRINTER: 10,
  IPPhone: 11,
};
```

## PT Cable Type Constants

```typescript
const PT_CABLE_TYPE = {
  COPPER_STRAIGHT: 0,
  COPPER_CROSS:    1,
  SERIAL:          3,
  FIBER:           4,
  ROLLOVER:        5,
  DCE:             6,
  DTE:             7,
  USB:             8,
};
```

## Process Types

For server processes (DHCP, DNS, NTP, SSH, etc.):

```typescript
// Get a process from a device
const device = network.getDeviceByName("SERVER1");
const dhcp = device.getProcess("DHCPServerMainProcess");
if (dhcp && dhcp.isEnabled()) {
  // ...
}
```

## Runtime API (injected into runtime.js)

The kernel injects this `api` object when calling `dispatch(payload, api)`:

```typescript
interface RuntimeApi {
  executeCommand(device: string, cmd: string): Promise<CommandResult>;
  getJobState(type: string, id: string): KernelJobState;
  dprint(msg: string): void;
}
```

## PT-Safe Global Pattern

Use `self` instead of `globalThis` for QTScript compatibility:

```typescript
// WRONG — globalThis not defined in PT
(globalThis as any).ipc

// CORRECT — self is the global object in QTScript
(self as any).ipc
// Fallback for cross-environment
(typeof self !== "undefined" ? self : this).ipc
```

## See Also

- `docs/ARCHITECTURE.md` — main.js vs runtime.js boundary
- `src/pt/terminal/terminal-engine.ts` — Single authority for PT event handling
- `src/pt-api/pt-api-registry.ts` — Full PT API registry