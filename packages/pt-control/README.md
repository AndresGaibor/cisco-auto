# @cisco-auto/pt-control

Control Packet Tracer in real-time from TypeScript/Bun CLI.

## Features

- ✅ **Real-time control** of Packet Tracer from command line
- ✅ **FileWatcher-based bridge** (no network required)
- ✅ **Complete IPC API access** (devices, links, configuration)
- ✅ **Event streaming** (logs, errors, telemetry)
- ✅ **TypeScript types** with Zod validation
- ✅ **Hot reload** runtime code

## Architecture

```
CLI (TypeScript/Bun)
  ↓ writes files
~/pt-dev/
  ├── runtime.js      ← Runtime code
  ├── command.json    ← Commands
  └── events.ndjson   ← Events from PT
  ↑ reads files
PT Script Module (JavaScript)
  ↓ IPC calls
Packet Tracer Core
```

## Installation

### 1. Install PT Script Module

See [pt-extension/README.md](../../pt-extension/README.md) for detailed instructions.

Quick steps:
1. Open Packet Tracer
2. Go to **Extensions > Scripting > New PT Script Module**
3. Add `pt-extension/main.js` as main script
4. Save and restart PT

### 2. Install CLI

```bash
bun install
```

### 3. Setup dev directory

```bash
mkdir -p ~/pt-dev
cp pt-extension/runtime.js ~/pt-dev/runtime.js
```

## Usage

### Basic Commands

```bash
# List devices
bun run pt device list

# Add a router
bun run pt device add R1 2911 100 100

# Add a switch
bun run pt device add S1 2960-24TT 300 100

# Create a link
bun run pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight

# Configure host IP
bun run pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1

# Configure IOS device
bun run pt config ios R1 "conf t" "hostname R1" "int g0/0" "ip address 1.1.1.1 255.0.0.0" "no shut"

# Get topology snapshot
bun run pt snapshot

# Inspect device
bun run pt inspect R1
```

### Help

```bash
bun run pt help
```

## API Usage

### TypeScript/JavaScript

```typescript
import { FileBridge } from "@cisco-auto/pt-control/bridge";
import type { CommandPayload, PTEvent } from "@cisco-auto/pt-control/types";

// Create bridge
const bridge = new FileBridge({
  devDir: "~/pt-dev",
});

// Listen to events
bridge.onEvent((event: PTEvent) => {
  console.log("PT Event:", event);
});

// Start bridge
await bridge.start();

// Send commands
const id = await bridge.sendCommand({
  kind: "addDevice",
  name: "R1",
  model: "2911",
  x: 100,
  y: 100,
});

// Wait for result
const result = await bridge.waitForResult(id);
console.log("Result:", result);

// Stop bridge
await bridge.stop();
```

## Command Reference

### Device Management

#### `device add <name> <model> [x] [y]`

Add a device to the topology.

**Arguments:**
- `name`: Device name (e.g., "R1")
- `model`: Device model (e.g., "2911", "2960-24TT", "PC")
- `x`: X coordinate (default: 100)
- `y`: Y coordinate (default: 100)

**Example:**
```bash
bun run pt device add R1 2911 100 100
```

#### `device remove <name>`

Remove a device from the topology.

**Example:**
```bash
bun run pt device remove R1
```

#### `device list`

List all devices in the topology.

**Example:**
```bash
bun run pt device list
```

### Link Management

#### `link add <dev1:port1> <dev2:port2> [type]`

Create a link between two devices.

**Arguments:**
- `dev1:port1`: First device and port (e.g., "R1:GigabitEthernet0/0")
- `dev2:port2`: Second device and port (e.g., "S1:GigabitEthernet0/1")
- `type`: Cable type (default: "auto")
  - Options: straight, cross, fiber, serial, console, etc.

**Example:**
```bash
bun run pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight
```

### Configuration

#### `config host <name> <ip> [mask] [gateway] [dns]`

Configure a host (PC) network settings.

**Arguments:**
- `name`: Device name
- `ip`: IP address
- `mask`: Subnet mask (default: 255.255.255.0)
- `gateway`: Default gateway (optional)
- `dns`: DNS server (optional)

**Example:**
```bash
bun run pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1 8.8.8.8
```

#### `config ios <name> <cmd1> [cmd2] [...]`

Configure an IOS device (router/switch).

**Arguments:**
- `name`: Device name
- `cmd1, cmd2, ...`: IOS commands

**Example:**
```bash
bun run pt config ios R1 "conf t" "hostname R1" "int g0/0" "ip address 1.1.1.1 255.0.0.0" "no shut" "end"
```

### Inspection

#### `snapshot`

Get a complete snapshot of the current topology.

**Example:**
```bash
bun run pt snapshot
```

#### `inspect <device>`

Get detailed information about a specific device.

**Example:**
```bash
bun run pt inspect R1
```

## Event Types

Events are written to `~/pt-dev/events.ndjson` in NDJSON format.

### Event Schema

```typescript
type PTEvent =
  | { type: "init"; ts: number }
  | { type: "runtime-loaded"; ts: number }
  | { type: "log"; ts: number; level: string; message: string }
  | { type: "result"; ts: number; id: string; ok: boolean; value: unknown }
  | { type: "error"; ts: number; id?: string; message: string; stack?: string }
  | { type: "cmdlog"; ts: number; device: string; command: string }
  | { type: "device-added"; ts: number; name: string; model: string }
  | { type: "link-created"; ts: number; dev1: string; dev2: string };
```

## Testing

Run the test suite:

```bash
bun run test
```

This will:
1. Initialize the bridge
2. Create test devices
3. Create links
4. Configure devices
5. Get snapshots

## Troubleshooting

### PT module not responding

1. Check if PT is running
2. Open **Extensions > Scripting > Debug**
3. Look for "PT Control Module initialized" message
4. Check for errors in debug console

### Commands not executing

1. Verify `~/pt-dev/runtime.js` exists
2. Check `~/pt-dev/events.ndjson` for errors
3. Ensure PT has file system permissions

### FileWatcher not triggering

1. Verify PT has security privileges enabled
2. Check if directory `~/pt-dev` is writable
3. Try restarting PT module

## Advanced Usage

### Custom Runtime

You can create a custom runtime with additional functionality:

```javascript
// custom-runtime.js
(function(payload, ipc, dprint) {
  // Your custom logic here
  // Access to full PT IPC API
  
  return {
    ok: true,
    result: "Custom result"
  };
})(payload, ipc, dprint);
```

Load it:
```bash
cp custom-runtime.js ~/pt-dev/runtime.js
```

### Hot Reload

The runtime is automatically reloaded when you modify `~/pt-dev/runtime.js`.

### Custom Dev Directory

Set the `PT_DEV_DIR` environment variable:

```bash
export PT_DEV_DIR=/custom/path
bun run pt device list
```

## API Documentation

See [API_REFERENCE.md](../../docs/API_REFERENCE.md) for complete API documentation.

## License

MIT
