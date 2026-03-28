# PT Control - Real-time Packet Tracer Control

Control Cisco Packet Tracer in real-time from TypeScript/Bun CLI.

## 🚀 Quick Start

### Prerequisites

- **Cisco Packet Tracer** (tested on 8.x+)
- **Bun** runtime

### 1. Install PT Script Module

1. Open Packet Tracer
2. Go to **Extensions > Scripting > New PT Script Module**
3. Configure:
   - Module ID: `pt-control-module`
   - Startup Mode: **On Startup**
   - Security Privileges: Check **File System**
4. Add `pt-extension/main.js`:
   - Click **Add File**
   - Select `pt-extension/main.js`
   - Mark as **main script**
5. **Save Module**
6. **Restart Packet Tracer**

### 2. Verify Installation

1. Open **Extensions > Scripting > Debug**
2. Look for:
   ```
   === PT Control Module Starting ===
   [OK] PT Control Module initialized
   [INFO] Watching: ~/pt-dev
   ```

### 3. Setup CLI

```bash
# Install dependencies
bun install

# Setup dev directory and copy runtime
mkdir -p ~/pt-dev
cp pt-extension/runtime.js ~/pt-dev/runtime.js

# Test the CLI
bun run pt device list
```

## 📖 Usage

### Device Management

```bash
# List all devices
bun run pt device list

# Add a router
bun run pt device add R1 2911 100 100

# Add a switch
bun run pt device add S1 2960-24TT 300 100

# Add a PC
bun run pt device add PC1 PC 500 100

# Remove a device
bun run pt device remove R1
```

### Link Management

```bash
# Create a link between router and switch
bun run pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight

# Create a crossover link
bun run pt link add R1:GigabitEthernet0/1 R2:GigabitEthernet0/1 cross

# Auto-detect cable type
bun run pt link add R1:Serial0/0/0 R2:Serial0/0/0 serial
```

### Configuration

```bash
# Configure PC IP
bun run pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1

# Configure router
bun run pt config ios R1 \
  "conf t" \
  "hostname R1" \
  "int g0/0" \
  "ip address 192.168.1.1 255.255.255.0" \
  "no shut" \
  "end"

# Configure switch
bun run pt config ios S1 \
  "conf t" \
  "hostname S1" \
  "vlan 10" \
  "name Management" \
  "end"
```

### Inspection

```bash
# Get topology snapshot
bun run pt snapshot

# Inspect specific device
bun run pt inspect R1

# Show help
bun run pt help
```

## 🧪 Testing

Run the automated test suite:

```bash
bun run pt:test
```

This will:
1. Create test devices (router, switch)
2. Create links between them
3. Get snapshots
4. Inspect devices
5. Clean up

## 📁 Project Structure

```
cisco-auto/
├── packages/pt-control/          # PT Control package
│   ├── src/
│   │   ├── bridge/              # Bridge implementation
│   │   │   └── file-bridge.ts   # FileWatcher-based bridge
│   │   ├── cli/                 # CLI commands
│   │   │   └── index.ts         # Main CLI entry
│   │   ├── types/               # TypeScript types
│   │   └── constants/           # PT constants (cable types, etc)
│   ├── test.ts                  # Test suite
│   └── README.md                # Detailed package docs
│
├── pt-extension/                 # PT Script Module
│   ├── main.js                  # Module entry point
│   ├── runtime.js               # Default runtime
│   └── README.md                # Installation instructions
│
└── docs/
    └── PT_CONTROL_RESEARCH.md   # Complete API documentation
```

## 🔧 How It Works

### Architecture

```
┌─────────────────────┐
│  CLI (TypeScript)   │
│  bun run pt ...     │
└──────────┬──────────┘
           │ writes
           ▼
┌─────────────────────┐
│   ~/pt-dev/      │
│  ├─ runtime.js      │ ← Runtime code (hot-reload)
│  ├─ command.json    │ ← Commands to PT
│  └─ events.ndjson   │ ← Events from PT
└──────────┬──────────┘
           │ watches (FileWatcher)
           ▼
┌─────────────────────┐
│  PT Script Module   │
│  (JavaScript)       │
└──────────┬──────────┘
           │ IPC calls
           ▼
┌─────────────────────┐
│  Packet Tracer      │
│  Core Engine        │
└─────────────────────┘
```

### Flow

1. **CLI** writes command to `~/pt-dev/command.json`
2. **PT Module** detects file change via FileWatcher
3. **PT Module** loads and executes runtime with command payload
4. **Runtime** calls PT IPC API (LogicalWorkspace, Network, etc)
5. **PT Module** writes result to `~/pt-dev/events.ndjson`
6. **CLI** reads result from events file

### Why FileWatcher?

- ✅ No network required (no HTTP server, no ports)
- ✅ No security prompts from PT
- ✅ Simple and reliable
- ✅ Works without PTBuilder dependency
- ✅ Direct access to full PT IPC API

## 🎯 Supported Operations

### Device Operations
- ✅ Add device (any model)
- ✅ Remove device
- ✅ List devices
- ✅ Rename device
- ✅ Move device
- ✅ Power on/off
- ✅ Add modules

### Link Operations
- ✅ Create link (all cable types)
- ✅ Remove link
- ✅ Auto-connect devices

### Configuration
- ✅ Configure host IP/mask/gateway/DNS
- ✅ Configure IOS devices (routers/switches)
- ✅ Execute CLI commands
- ✅ Apply multi-line configurations

### Inspection
- ✅ Get topology snapshot
- ✅ Inspect device details
- ✅ List ports and IPs
- ✅ Get device XML

### Telemetry
- ✅ Real-time event streaming
- ✅ Command logging
- ✅ Error tracking
- ✅ Debug output

## 🔌 API Usage

Use the bridge programmatically in your TypeScript code:

```typescript
import { FileBridge } from "@cisco-auto/pt-control/bridge";

const bridge = new FileBridge({ devDir: "~/pt-dev" });

// Listen to events
bridge.onEvent((event) => {
  console.log("PT Event:", event);
});

await bridge.start();

// Send command
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

await bridge.stop();
```

## 🐛 Troubleshooting

### Module not loading
- Check **Extensions > Scripting > Configure PT Script Modules**
- Ensure module is enabled and set to **On Startup**
- Restart Packet Tracer

### Commands not executing
1. Verify PT module is running:
   - Open **Extensions > Scripting > Debug**
   - Look for "PT Control Module initialized"
2. Check runtime exists:
   ```bash
   ls -la ~/pt-dev/runtime.js
   ```
3. Check for errors:
   ```bash
   tail -f ~/pt-dev/events.ndjson
   ```

### FileWatcher not triggering
- Ensure PT has **File System** security privilege
- Check `~/pt-dev` is writable
- Try creating/editing files manually to test

## 📚 Documentation

- [PT Control Package README](packages/pt-control/README.md) - Detailed usage
- [PT Extension README](pt-extension/README.md) - Installation guide
- [PT Control Research](docs/PT_CONTROL_RESEARCH.md) - Complete API reference

## 🎓 Examples

See test suite for complete examples:
```bash
cat packages/pt-control/test.ts
```

## 📝 Notes

- **No MCP required**: This is a direct CLI tool, not an MCP server
- **No PTBuilder required**: Uses official PT IPC API directly
- **Hot reload**: Runtime code reloads automatically
- **Type-safe**: Full TypeScript support with Zod validation

## 📄 License

MIT

---

**Ready to control Packet Tracer from the command line? Install the module and start automating!** 🚀
