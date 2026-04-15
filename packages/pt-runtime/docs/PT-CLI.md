# PT 9.0 — CLI, IOS & Terminal Reference

> Documented: 2026-04-15
> Source: Live extraction + TypeScript source analysis
> Status: ✅ Complete — all terminal events, boot detection, device support cataloged

---

## PTCommandLine Interface

Access via `device.getCommandLine()` on any device with CLI support.

```javascript
var cli = device.getCommandLine();

// Core methods
cli.enterCommand(cmd: string): void           // async — fires events
cli.getPrompt(): string                        // current prompt "R1>" or "R1#"
cli.getMode(): string                          // ⚠️ unreliable — use prompt parsing instead
cli.getCommandInput(): string                  // current input buffer
cli.enterChar(charCode: number, modifier: number): void  // 32=space, 13=enter

// Event registration (3-argument style)
cli.registerEvent(eventName: string, context: object, handler: function): void
cli.unregisterEvent(eventName: string, context: object, handler: function): void
```

> **NOTE:** `enterCommand` returns `void` in TypeScript. In raw QtScript (PT console), it can return synchronously as `{first: status, second: output}`. The TypeScript interface reflects the event-driven reality.

---

## Terminal Events (10 Types)

All events use 3-argument handler: `handler(source, args, context)`.

```javascript
cli.registerEvent("commandStarted", null, function(src, args) {
  // args.inputCommand — the command entered
  // args.completeCommand — full command with arguments
  // args.inputMode — current IOS mode
  // args.processedCommand — processed command string
});

cli.registerEvent("outputWritten", null, function(src, args) {
  // args.newOutput — newly written output string
  // args.isDebug — boolean, debug output flag
});

cli.registerEvent("commandEnded", null, function(src, args) {
  // args.status — number: 0=OK, 1=AMBIGUOUS, 2=INVALID, 3=INCOMPLETE, 4=NOT_IMPLEMENTED
});

cli.registerEvent("modeChanged", null, function(src, args) {
  // args.newMode — string like "privileged-exec"
});

cli.registerEvent("promptChanged", null, function(src, args) {
  // args.newPrompt — string like "R1#"
});

cli.registerEvent("moreDisplayed", null, function(src, args) {
  // args.active — boolean: true=--More-- shown, false=dismissed
});

cli.registerEvent("directiveSent", null, function(src, args) {
  // directive (--More-- dismiss) was sent
});

cli.registerEvent("commandSelectedFromHistory", null, function(src, args) {});
cli.registerEvent("commandAutoCompleted", null, function(src, args) {});
cli.registerEvent("cursorPositionChanged", null, function(src, args) {});
```

### Event Firing Order (per command)

1. `commandStarted` — when command begins processing
2. `outputWritten` — repeatedly as output arrives (primary event)
3. `moreDisplayed` — if output exceeds page size
4. `commandEnded` — when IOS finishes processing

---

## IosMode — Valid Session Modes

```javascript
"unknown"           // 0 — initial state, no prompt yet
"rommon"            // 1 — ROMMON mode (boot loader)
"user-exec"         // 2 — Router> (unprivileged, user mode)
"privileged-exec"    // 3 — Router# (enable mode, highest)
"config"            // 4 — (config) mode
"config-if"         // 5 — (config-if) interface mode
"config-line"       // 5 — (config-line) line mode
"config-router"     // 5 — (config-router) router mode
"config-vlan"        // 5 — (config-vlan) VLAN mode
"config-subif"       // 5 — (config-subif) subinterface mode
"paging"            // 6 — awaiting Space to continue (--More--)
"awaiting-confirm"  // 6 — awaiting yes/no confirmation
"awaiting-password"  // 6 — awaiting password input
```

Mode hierarchy (lower = less privileged):
```
unknown(0) < rommon(1) < user-exec(2) < privileged-exec(3) < config(4) < config-if/line/router/vlan/subif(5) < paging/awaiting-confirm(6)
```

---

## Boot Detection — Correct Pattern

### ❌ WRONG — Don't poll `cli.getOutput()`

PT caches the output buffer. Polling `cli.getOutput()` for `"Router>"` or `"Press RETURN"` **does not work reliably**.

```javascript
// ❌ DOES NOT WORK
function waitForIOS(cli, timeout) {
  var start = new Date().getTime();
  while (new Date().getTime() - start < timeout) {
    var output = cli.getOutput();
    if (output.indexOf("Router>") >= 0) return true;
  }
  return false;
}
```

### ✅ CORRECT — Event-based boot detection

**Method 1: `doneBooting` event (recommended)**
```javascript
var state = { bootDone: false };
dev.registerEvent("doneBooting", state, function(src, args) {
  state.bootDone = true;
});
// Poll state.bootDone or wait for it in your loop
```

**Method 2: `isBooting()` polling (fallback)**
```javascript
if (!dev.isBooting()) {
  // Boot complete — IOS is ready for commands
}
```

**Method 3: IOS validation with `enterCommand`**
```javascript
// In QtScript sync mode:
var res = dev.enterCommand("show version", "user");
// res.first = 0 → IOS ready
// res.second = "Cisco IOS Software, Version..."
```

### Initial dialog dismiss (newly created routers)

```javascript
var cli = dev.getCommandLine();
cli.enterChar(13, 0);       // Enter to wake up the device
cli.enterCommand("no");      // Dismiss "Would you like to enter the initial configuration dialog?"
```

---

## TerminalEngine — Runtime Command Execution

Internal runtime wrapper (not directly callable from QtScript). Use `device.getCommandLine()` directly in scripts.

```javascript
// Key TerminalEngine methods (used internally by runtime)
executeCommand(device, command, options?): Promise<TerminalResult>
continuePager(device)   // sends space (char 32) to dismiss --More--
confirmPrompt(device)   // sends enter (char 13) for yes/no prompts
getSession(device)      // returns TerminalSessionState snapshot
getMode(device)         // current IosMode
isBusy(device)          // true if command in progress
```

### ExecuteOptions

```javascript
{
  timeout?: number,          // ms before command times out (default: commandTimeoutMs)
  expectedPrompt?: string,  // halt until this prompt appears
  stopOnError?: boolean,    // abort if status !== 0
  ensureMode?: IosMode       // escalate to this mode before running command
}
```

### TerminalResult

```javascript
{
  ok: boolean,              // true if status === 0
  output: string,           // all accumulated output
  status: number,           // 0=OK, 1=AMBIGUOUS, 2=INVALID, 3=INCOMPLETE, 4=NOT_IMPLEMENTED
  session: TerminalSessionState,
  mode: IosMode
}
```

### TerminalSessionState

```javascript
{
  device: string,
  mode: string,              // "unknown" until promptChanged fires
  prompt: string,           // "" until promptChanged fires
  paging: boolean,          // true when --More-- is displayed
  awaitingConfirm: boolean,  // true when yes/no prompt active
  awaitingPassword: boolean,
  lastOutputAt: number,    // timestamp of last output
  busyJobId: string | null, // active job ID if command running
  healthy: boolean          // session health
}
```

---

## Command Execution Examples

### Basic command (QtScript)

```javascript
var cli = dev.getCommandLine();
cli.enterCommand("show version");
cli.enterCommand("show ip interface brief");

// Wait for output accumulation
var output = cli.getOutput();
var prompt = cli.getPrompt();
```

### Configure an interface (QtScript)

```javascript
var cli = dev.getCommandLine();

cli.enterCommand("enable");
cli.enterCommand("configure terminal");
cli.enterCommand("interface GigabitEthernet0/0");
cli.enterCommand("ip address 192.168.1.1 255.255.255.0");
cli.enterCommand("no shutdown");
cli.enterCommand("end");
cli.enterCommand("show ip interface brief");

// Verify via API
var port = dev.getPortAt(0);
port.getIpAddress();    // "192.168.1.1"
port.getSubnetMask();   // "255.255.255.0"
```

### Dismiss paging (--More--) in scripts

```javascript
// Send space to continue
cli.enterChar(32, 0);  // charCode=32 is space

// Send enter to accept default
cli.enterChar(13, 0);  // charCode=13 is enter
```

---

## CLI Support by Device Type

| Device | CLI? | ClassName | Type IDs | Notes |
|--------|------|-----------|----------|-------|
| Router | ✅ YES | Router, MLS | 0, 16 | Full IOS CLI, getProcess(), getRootModule() |
| Switch | ✅ YES | CiscoDevice | 1, 3, 12, 41, 44 | Full IOS CLI |
| PC | ✅ YES | Pc | 8, 10, 18, 19, 20, 21, 22, 24, 50, 54, 55 | Has enterCommand() |
| Server | ✅ YES | Server | 9, 49 | CLI + DHCP/DNS/HTTP processes |
| WirelessRouter | ✅ YES | WirelessRouter | 11, 29, 30, 32, 48 | IOS-like CLI + NAT methods |
| Cloud | ❌ NO | Cloud | 2 | Serial/modem/coaxial only |
| Hub/Repeater | ❌ NO | Device | 4, 5 | Generic, no CLI |
| AccessPoint | ❌ NO | Device | 7 | No CLI |
| ASA | ❌ NO | ASA | 27 | Bookmark/webvpn only |
| MCU/SBC | ❌ NO | MCU, SBC | 36, 37 | IoT programming, analog/digital |
| IoT | ❌ NO | MCUComponent | 39, 51 | 78 IoT models |

### Accessing CLI

```javascript
var net = ipc.network();
var dev = net.getDevice("Router0");
var cli = dev.getCommandLine();  // PTCommandLine | null

if (cli === null) {
  // Device has no CLI
}
```

---

## RouterPort vs SwitchPort

Router ports (routers, MLS, wireless routers) have 132 methods — includes IP, NAT, routing.

Switch ports (switches) have 66 methods — includes VLAN, Port Security, Trunk.

| Category | RouterPort | SwitchPort |
|----------|-----------|------------|
| Total methods | 132 | 66 |
| IP Address (get/set) | ✅ | ❌ |
| NAT | ✅ | ❌ |
| OSPF/EIGRP | ✅ | ❌ |
| VLAN | ❌ | ✅ |
| Port Security | ❌ | ✅ |
| Trunk | ❌ | ✅ |
| `getIpAddress()` | ✅ | ❌ |
| `getSubnetMask()` | ✅ | ❌ |
| `setIpSubnetMask()` | ✅ | ❌ (Invalid) |
| `setAccessVlan()` | ❌ (Invalid) | ✅ |
| `getVoipVlanId()` | ❌ | ✅ |
| `isPortUp()` | ✅ | ✅ |

### Get port reference

```javascript
// By index (0-based)
var port0 = router.getPortAt(0);  // first port

// By name
var port = router.getPort("FastEthernet0/0");

// Iterate all ports
for (var i = 0; i < router.getPortCount(); i++) {
  var p = router.getPortAt(i);
  dprint(p.getName() + ": " + p.getIpAddress());
}
```

---

## Prompt Parsing Utilities

```javascript
// Parse prompt string to IosMode
parsePrompt("R1#")           // → "privileged-exec"
parsePrompt("R1>")           // → "user-exec"
parsePrompt("R1(config-if)#") // → "config-if"
parsePrompt("R1%")            // → "unknown" (error prompt)
parsePrompt("Password:")      // → "awaiting-password"
parsePrompt("[confirm]")      // → "awaiting-confirm"

// Check if mode allows command execution
canExecuteCommand("user-exec")         // → true
canExecuteCommand("privileged-exec")    // → true
canExecuteCommand("config")            // → true
canExecuteCommand("rommon")             // → false

// Detect confirmation prompts
isConfirmPrompt("[confirm]")  // → true

// Detect error output
isErrorOutput("% Invalid command")  // → true
```

---

## Command Status Codes

```javascript
0  // OK — command succeeded
1  // AMBIGUOUS — command is ambiguous
2  // INVALID — command not valid in current mode
3  // INCOMPLETE — command missing arguments
4  // NOT_IMPLEMENTED — command not implemented on this device
```

---

## Common IOS Mode Transitions

```
ROMMON > boot                  → user-exec
user-exec > enable            → privileged-exec
user-exec > enable > conf t   → config
config > interface id          → config-if
config > line console 0       → config-line
config > router ospf 1         → config-router
config > vlan 10              → config-vlan
config > interface id.id        → config-subif
privileged-exec > exit          → user-exec
```

---

## Device Processes (getProcess)

Routers and switches expose processes via `device.getProcess(name)`:

```javascript
var dhcp = router.getProcess("DhcpServerMainProcess");
var ospf = router.getProcess("OspfProcess");
var acl = router.getProcess("AclProcess");

// Known processes:
DhcpServerProcess, DhcpServerMainProcess,
VlanManager, RoutingProcess, StpMainProcess,
AclProcess, Aclv6Process,
DnsServerProcess, NtpServerProcess,
SshServerProcess, RadiusServerProcess,
SyslogServerProcess, OspfProcess
```

---

## See Also

- `docs/PT-API-COMPLETE.md` — Full API dump with device enumeration
- `docs/PT-GLOBAL-SCOPE.md` — Global scope, _ScriptModule, ipc, $create* factories
- `docs/PT-NETWORK-SERVERS.md` — HTTP/TCP/UDP/WebSocket server APIs
- `src/pt-api/pt-api-registry.ts` — TypeScript type definitions
- `src/pt/terminal/terminal-engine.ts` — TerminalEngine implementation
- `src/value-objects/session-mode.ts` — IosMode validation
- `src/pt/terminal/prompt-parser.ts` — Prompt parsing utilities
