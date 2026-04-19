# Packet Tracer IPC API — Complete Reference

> **Purpose**: Document every PT Script Module API object, when to use it, how it fits in this repo, and PT-safe code examples.
>
> **Core principle**: Use the **direct API** when Packet Tracer exposes an object and method. Use **IOS/TerminalLine** only when PT doesn't expose sufficient surface. Use **events** for verification and synchronization. Use **textual CLI** as a complement, not as the foundation.

---

## Table of Contents

1. [Mental Model: How to Think the PT API](#1-mental-model-how-to-think-the-pt-api)
2. [Network, Device, LogicalWorkspace](#2-api-base-network-device-and-logicalworkspace)
3. [Port APIs: HostPort, SwitchPort, RouterPort](#3-api-of-ports-where-you-have-the-most-lost-value)
4. [VLANs, SVIs, and L2/L3 Control: VlanManager](#4-vlans-svis-and-l2l3-control-vlanmanager)
5. [DHCP Server: DhcpServerProcess and DhcpPool](#5-dhcp-server-real-dhcpserverprocess-and-dhcppool)
6. [Server-PT Services](#6-services-of-the-server-pt-that-you-are-missing)
7. [Routing, ACLs, STP, and Control Processes](#7-routing-acls-stp-and-other-control-processes)
8. [TerminalLine: Correct IOS Session Usage](#8-terminalline-how-to-use-the-ios-part-properly)
9. [Events: registerEvent, lifecycle, observability](#9-events-the-most-underused-part)
10. [Script Module and System API](#10-script-module-api-and-local-system)
11. [Integration Map for This Repo](#11-how-to-land-it-in-this-repo)
12. [Implementation Order](#12-correct-order-of-implementation)
13. [Summary: What You're Most Missing](#13-straight-summary)

---

## 1. Mental Model: How to Think the PT API

Packet Tracer doesn't just expose a terminal IOS. It exposes an **IPC API oriented to objects** for Script Modules, where you can obtain objects like `Network`, `Device`, `HostPort`, `VlanManager`, `DhcpServerProcess`, `DhcpPool`, `LogicalWorkspace`, `TerminalLine`, register events with `registerEvent`, and execute lifecycle logic in `main()` and `cleanUp()`.

**The practical consequence**:

| Approach | When to use |
|----------|-------------|
| **Direct API** | When PT already gives you an object and a method |
| **IOS/TerminalLine** | Only when PT doesn't expose a sufficient surface |
| **Events** | For verification and synchronization |
| **Textual CLI** | As a complement, not as the foundation of everything |

In this repo, that means moving from:

- `configHost`
- `configIos`
- `execIos`
- `snapshot`

To something richer, for example:

- `configDhcpServer`
- `inspectDhcpServer`
- `ensureVlans`
- `configVlanInterfaces`
- `configSwitchport`
- `inspectServices`
- `watchEvents`
- `execIosSession` based on events.

---

## 2. API Base: Network, Device, and LogicalWorkspace

### 2.1 `Network`: the real topology inventory

`Network` is the entry point to the topology. It lets you retrieve devices and links by name or index, and count how many there are. This is the correct base for `device list`, `device get`, `topology snapshot`, and any state inspection.

**Key methods**:

- `getDeviceCount(): number`
- `getDevice(name: string): Device`
- `getDeviceAt(index: number): Device`

**PT-safe example**:

```javascript
function getNet() {
  return ipc.network();
}

function listDevices() {
  var net = getNet();
  var out = [];
  var i, dev;

  for (i = 0; i < net.getDeviceCount(); i++) {
    dev = net.getDeviceAt(i);
    if (!dev) continue;
    out.push({
      name: String(dev.getName()),
      model: String(dev.getModel()),
      power: !!dev.getPower()
    });
  }

  return { ok: true, value: out };
}
```

**How to leverage it in this repo**:

- `pt device list`
- `pt device get <name>`
- `pt topology snapshot`
- `pt topology links`
- `pt topology verify` to detect missing or duplicate devices.

### 2.2 `Device`: much more than name/model

`Device` exposes `getPort`, `getPortAt`, `getPortCount`, `getProcess`, `moveToLocation`, `moveToLocationCentered`, `serializeToXml`, `addCustomVar`, and more. `getProcess(string)` is especially important because it's the gateway to internal services and processes of the equipment. `moveToLocation` exists officially and returns `bool`, so it's the correct way to move equipment on the canvas.

**Key methods**:

- `getPort(portName: string): Port`
- `getPortAt(index: number): Port`
- `getPortCount(): number`
- `getProcess(processName: string): Process | undefined`
- `moveToLocation(x: number, y: number): bool`
- `moveToLocationCentered(x: number, y: number): bool`
- `serializeToXml(): string`
- `addCustomVar(key: string, value: any): void`
- `getName(): string`
- `getModel(): string`
- `getPower(): bool`

**PT-safe example — move device**:

```javascript
function handleMoveDevice(payload) {
  var dev = ipc.network().getDevice(payload.name);
  var ok, x, y;

  if (!dev) return { ok: false, error: "Device not found: " + payload.name };

  x = Math.round(payload.x);
  y = Math.round(payload.y);

  ok = false;
  if (typeof dev.moveToLocation === "function") {
    ok = !!dev.moveToLocation(x, y);
  }

  return {
    ok: ok,
    value: ok ? { name: payload.name, x: x, y: y } : undefined,
    error: ok ? undefined : "Packet Tracer rejected move"
  };
}
```

**How to leverage `Device` better**:

- `getProcess()` for DHCP server, DNS, VLAN, routing, STP, ACL, SSH, NTP, etc.
- `serializeToXml()` for debugging when there's no clear getter.
- `addCustomVar()` to mark equipment managed by this tool.

### 2.3 `LogicalWorkspace`: visual topology, notes, clusters, and events

`LogicalWorkspace` isn't only for `createLink()`. It also exposes `addDevice`, `addCluster`, `addNote`, `addTextPopup`, `autoConnectDevices`, `centerOn`, and events like `clusterAdded`, `canvasNoteAdded`, and `linkCreated`. The public signature of `createLink` is `createLink(QString, string, QString, string, CONNECT_TYPES)`.

**Key methods**:

- `createLink(deviceA: QString, portA: string, deviceB: QString, portB: string, type: CONNECT_TYPES): Link`
- `addDevice(x, y, model: string): Device`
- `addCluster(x, y, label: string): Cluster`
- `addNote(x, y, scale: number, text: string): Note`
- `addTextPopup(x, y, scale: number, type: number, text: string): TextPopup`
- `autoConnectDevices(deviceA: string, deviceB: string): void`
- `centerOn(x, y): void`

**Use cases**:

- Create labs with automatic annotations;
- Group by zones or VLANs;
- Highlight topology to the user;
- Generate visual documentation from the runtime.

**Example**:

```javascript
function annotateLab() {
  var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
  lw.addNote(100, 100, 1.0, "DHCP Server Zone");
  lw.addTextPopup(250, 120, 1.0, 0, "VLAN 10/20/30");
  return { ok: true };
}
```

---

## 3. API of Ports: Where You Have the Most Lost Value

Previous investigation already showed that the `PTPort` abstraction is incomplete for DHCP and host verification. That's correct: the real API of `HostPort` does bring getters and setters that aren't being properly exposed today.

### 3.1 `HostPort`: PCs, servers, and IP clients

`HostPort` gives you control of IP, mask, gateway, DNS, DHCP client, IPv6, MTU, and several interface states. In particular:

- `setDefaultGateway(ip: string): void`
- `setDhcpClientFlag(bool: boolean): void`
- `isDhcpClientOn(): boolean`
- `setIpv6Enabled(bool: boolean): void`
- Plus IP and mask reading.

**What's missing today**:

- Verify DHCP client for real;
- Activate IPv6;
- Configure link-local/manual;
- Work with DHCPv6/SLAAC as the port exposes;
- Read real port state for troubleshooting.

**PT-safe example — corrected `configHost`**:

```javascript
function handleConfigHost(payload) {
  var dev = ipc.network().getDevice(payload.device);
  var port;

  if (!dev) return { ok: false, error: "Device not found: " + payload.device };

  port = dev.getPortAt(0);
  if (!port) return { ok: false, error: "No ports on device" };

  if (payload.dhcp === true) {
    if (typeof port.setDhcpClientFlag === "function") {
      port.setDhcpClientFlag(true);
    } else {
      return { ok: false, error: "DHCP client API not available" };
    }

    return {
      ok: true,
      value: {
        device: payload.device,
        dhcp: typeof port.isDhcpClientOn === "function" ? !!port.isDhcpClientOn() : true,
        ip: safeCall(port, "getIpAddress"),
        mask: safeCall(port, "getSubnetMask"),
        gateway: safeCall(port, "getDefaultGateway")
      }
    };
  }

  if (payload.ip && payload.mask) {
    port.setIpSubnetMask(payload.ip, payload.mask);
  }
  if (payload.gateway) {
    port.setDefaultGateway(payload.gateway);
  }
  if (payload.dns && typeof port.setDnsServerIp === "function") {
    port.setDnsServerIp(payload.dns);
  }
  if (typeof port.setDhcpClientFlag === "function") {
    port.setDhcpClientFlag(false);
  }

  return {
    ok: true,
    value: {
      device: payload.device,
      dhcp: typeof port.isDhcpClientOn === "function" ? !!port.isDhcpClientOn() : false,
      ip: safeCall(port, "getIpAddress"),
      mask: safeCall(port, "getSubnetMask"),
      gateway: safeCall(port, "getDefaultGateway")
    }
  };
}

function safeCall(obj, fn) {
  try {
    if (obj && typeof obj[fn] === "function") return String(obj[fn]());
  } catch (e) {}
  return undefined;
}
```

This fixes exactly the problem described: today `config-host --dhcp` returns success, but doesn't verify.

### 3.2 `SwitchPort`: real access/trunk and L2

The public list shows `SwitchPort` as a dedicated class to "handle and manipulate switch ports". You also have `PortSecurity` as a separate class for port security.

Although we don't open here the full member reference of `SwitchPort`, its mere official existence tells you that not all L2 should go through textual CLI. For your design, that suggests creating a `configSwitchport` handler and an `inspectSwitchport` that first test the direct API, and only if some model doesn't support it sufficiently, fall back to IOS.

**Suggested payload shape**:

```json
{
  "device": "SW1",
  "port": "GigabitEthernet0/1",
  "mode": "trunk",
  "accessVlan": null,
  "allowedVlans": ["10", "20", "30"],
  "nativeVlan": 99,
  "portSecurity": {
    "enabled": true,
    "maxMac": 2
  }
}
```

### 3.3 `RouterPort` and `RoutedSwitchPort`

The `RouterPort` class exists in the public API, and `VlanManager.getVlanInt(vlanID)` returns precisely a `RouterPort`. This is crucial because it lets you configure SVI/VLAN interfaces without depending on CLI for the IP/mask part.

**Conceptual example**:

```javascript
function configSvi(vlanMgr, vlanId, ip, mask) {
  var svi = vlanMgr.getVlanInt(vlanId);
  if (!svi) return { ok: false, error: "SVI not found for VLAN " + vlanId };

  svi.setIpSubnetMask(ip, mask);

  return {
    ok: true,
    value: {
      vlanId: vlanId,
      ip: String(svi.getIpAddress()),
      mask: String(svi.getSubnetMask())
    }
  };
}
```

---

## 4. VLANs, SVIs, and L2/L3 Control: VlanManager

`VlanManager` "holds and manipulates VLANs on routers and switches". It officially exposes `addVlan(int, string)` and `getVlanInt(int)`, which returns a `RouterPort`. This gives you an API-first route to create VLANs and SVIs.

### What you can do with `VlanManager`

- Create VLANs by ID and name;
- Count VLANs;
- Retrieve VLAN interfaces;
- Assign IP to SVIs using the returned `RouterPort`;
- Verify that the VLAN exists before configuring ports or DHCP.

**Handler example**:

```javascript
function handleEnsureVlans(payload) {
  var dev = ipc.network().getDevice(payload.device);
  var vlanMgr;
  var i, item, ok;

  if (!dev) return { ok: false, error: "Device not found: " + payload.device };

  vlanMgr = dev.getProcess("VlanManager");
  if (!vlanMgr) return { ok: false, error: "VlanManager not available" };

  for (i = 0; i < payload.vlans.length; i++) {
    item = payload.vlans[i];
    ok = vlanMgr.addVlan(item.id, item.name || ("VLAN" + item.id));
    if (!ok) {
      return { ok: false, error: "Failed to add VLAN " + item.id };
    }
  }

  return { ok: true };
}
```

**Suggested payload**:

```json
{
  "device": "MLS1",
  "vlans": [
    { "id": 10, "name": "USERS10" },
    { "id": 20, "name": "USERS20" },
    { "id": 30, "name": "SERVERS30" }
  ]
}
```

**Where to use it in this repo**:

- `ensure-vlans`
- `config-vlan-interfaces`
- `lab-apply l2`
- `inspect-vlans`.

---

## 5. DHCP Server Real: DhcpServerProcess and DhcpPool

This is one of the biggest gaps in the project.

The public API exposes `DhcpServerProcess` to manipulate the DHCP service and `DhcpPool` to manipulate pools. `DhcpServerProcess` has `addNewPool(...)`; `DhcpPool` has `setDefaultRouter(ip)`. In the official list, their related structures also appear, so the support isn't "accidental" — it's a real part of the API.

### What you should automate here

- Turn DHCP server on/off;
- Create a pool per VLAN/subnet;
- Configure gateway per pool;
- Configure DNS per pool;
- Define start/end ranges;
- Read leases and current state.

**Conceptual example — `configDhcpServer`**:

```javascript
function handleConfigDhcpServer(payload) {
  var dev = ipc.network().getDevice(payload.device);
  var mainProc, dhcpProc, i, p;

  if (!dev) return { ok: false, error: "Device not found: " + payload.device };

  mainProc = dev.getProcess("DhcpServerMainProcess");
  if (!mainProc) {
    return { ok: false, error: "DhcpServerMainProcess not available" };
  }

  dhcpProc = mainProc.getDhcpServerProcessByPortName(payload.port);
  if (!dhcpProc) {
    return { ok: false, error: "No DHCP server process for port " + payload.port };
  }

  dhcpProc.setEnable(!!payload.enabled);

  for (i = 0; i < payload.pools.length; i++) {
    p = payload.pools[i];

    dhcpProc.addNewPool(
      p.name,
      p.startIp,
      p.defaultRouter,
      p.dns,
      p.mask,
      p.maxUsers,
      p.network,
      p.endIp
    );
  }

  return { ok: true };
}
```

**Suggested payload**:

```json
{
  "device": "Server0",
  "port": "FastEthernet0",
  "enabled": true,
  "pools": [
    {
      "name": "VLAN10",
      "network": "192.168.10.0",
      "mask": "255.255.255.0",
      "defaultRouter": "192.168.10.1",
      "dns": "8.8.8.8",
      "startIp": "192.168.10.11",
      "endIp": "192.168.10.254",
      "maxUsers": 244
    }
  ]
}
```

This fits perfectly with what was requested about **pools per VLAN**. Today the project doesn't have a dedicated handler for this and that's why you end up trying to resolve too much via `configIos` or `configHost`.

### `inspectDhcpServer`

You also need a mirror handler to read back:

- Whether the service is enabled;
- How many pools there are;
- What gateway each pool has;
- What range each one has;
- Active leases.

---

## 6. Services of the Server-PT That You Are Missing

The public class list shows several services you can control or inspect from PT without passing everything through IOS:

| Service | Class | Use cases |
|---------|-------|-----------|
| DNS | `DnsServerProcess` | `config-dns-server`, `dns add-a-record`, `dns add-cname`, `dns inspect`, `dns verify` |
| TFTP | `TftpServer` | `enable-tftp`, `tftp inspect`, `backup-config-to-tftp` |
| RADIUS | `RadiusServerProcess` | `config-radius-server`, `inspect-radius` |
| TACACS | `TacacsServerProcess` | `config-tacacs-server`, `inspect-tacacs` |
| Syslog | `SyslogServer` | Labs for logging without depending only on the GUI |
| NTP | `NtpServerProcess` | Automate an NTP server in PT for topologies where time matters |
| SSH | `SshServerProcess` | Automate hosts/servers that must expose SSH or inspect service availability |
| ACS | `AcsServerProcess` | AAA and centralized authentication labs |

Client-side classes also exist: `RadiusClientProcess`, `TacacsClientProcess`. This opens the door to AAA labs and centralized authentication.

---

## 7. Routing, ACLs, STP, and Other Control Processes

The public list shows network processes that aren't being leveraged today:

| Process | Class | Use cases |
|---------|-------|-----------|
| Static Routing | `RoutingProcess` | `route add static`, `route inspect`, `route verify` |
| OSPF | `OspfProcess` | OSPF process control without depending solely on textual CLI |
| ACLs (IPv4) | `AclProcess` | Structured inspection or even creation, instead of depending only on the IOS parser |
| ACLs (IPv6) | `Aclv6Process` | IPv6 ACL inspection/creation |
| STP (main) | `StpMainProcess` | `inspect-stp` with real process data |
| STP (per-instance) | `StpProcess` | Per-instance STP data |

Other processes like RIP/EIGRP/AAA also exist depending on the model.

### 7.1 `RoutingProcess`

`RoutingProcess` "handles and manipulates the static routing". This means part of the static route configuration could be done by object, not necessarily by CLI.

### 7.2 `OspfProcess`

`OspfProcess` exists as an individual OSPF process. Not saying to migrate all OSPF tomorrow, but PT does have a richer layer than just textual "router ospf …".

### 7.3 `AclProcess`

`AclProcess` exists to handle ACLs. Ideally you can use it for structured inspection or even creation, instead of depending only on the IOS parser.

### 7.4 `StpProcess`

`StpMainProcess` and `StpProcess` exist officially. For your tool this opens an `inspect-stp` command with real process data.

---

## 8. TerminalLine: How to Use the IOS Part Properly

This part is being used, but incorrectly. Officially:

- `enterCommand(string)` returns `void`;
- `commandEnded(string, CommandStatus)` gives you the end of the command and the status;
- The status can be OK, ambiguous, invalid, incomplete, or not implemented.

This matches your own previous finding: the current IOS layer in the project is based on a false assumption and can produce false positives.

### How a correct IOS session should look

**Don't do this**:

```javascript
var response = term.enterCommand("show run");
// assume response brings output
```

**Do this**:

1. Register temporary listeners;
2. Accumulate output with `outputWritten`;
3. Close the result in `commandEnded`;
4. If there's pagination, send `enterChar(32, 0)` or equivalent.

**PT-safe example**:

```javascript
function executeIosCommandAsync(term, cmd, done) {
  var buffer = [];
  var state = { finished: false };

  function onOutput(src, args) {
    if (args && args.output !== undefined) {
      buffer.push(String(args.output));
    }
  }

  function onEnded(src, args) {
    if (state.finished) return;
    state.finished = true;

    done({
      ok: args.status === 0,
      status: args.status,
      command: cmd,
      output: buffer.join("")
    });
  }

  term.registerEvent("outputWritten", null, onOutput);
  term.registerEvent("commandEnded", null, onEnded);
  term.enterCommand(cmd);
}
```

And an `ensureConfigMode` should chain:

- `enable`
- validate prompt/mode
- `configure terminal`
- validate prompt/mode.

---

## 9. Events: The Most Underused Part

The Script Modules guide explicitly shows that you can register events with `registerEvent`, for example `ipChanged` and `powerChanged`, and also receive inter-process messages with `messageReceived`. Additionally, PT calls `main()` on start and `cleanUp()` on stop.

This is huge for your design.

### What you should do with events

Instead of blind polling for everything, you can:

- Listen to `ipChanged` on host ports;
- Listen to `powerChanged`;
- Listen to workspace events like `linkCreated`;
- Listen to VLAN/STP events if the process exposes them;
- Emit your own NDJSON log of PT events.

**Example**:

```javascript
var RUNTIME_EVENTS = [];

function attachPortObservers(port, portName) {
  function onIpChanged(src, args) {
    dprint("[event] ipChanged " + portName);
  }

  function onPowerChanged(src, args) {
    dprint("[event] powerChanged " + portName);
  }

  port.registerEvent("ipChanged", null, onIpChanged);
  port.registerEvent("powerChanged", null, onPowerChanged);

  RUNTIME_EVENTS.push({ obj: port, evt: "ipChanged", fn: onIpChanged });
  RUNTIME_EVENTS.push({ obj: port, evt: "powerChanged", fn: onPowerChanged });
}
```

With this you can build `watch-events`, `audit-topology`, or triggers for automatic verification.

---

## 10. Script Module API and Local System

The public list also includes:

| Class | Purpose |
|-------|---------|
| `SystemFileManager` | File operations within the Script Module context |
| `SystemFileWatcher` | Watch for file changes |
| `AppWindow` | Access to the PT application window |
| `RealtimeToolbar` | Realtime simulation toolbar control |
| `RackView` | Rack view manipulation |
| Other UI and system objects | |

### 10.1 More native integration with PT

Instead of depending only on external files and flat polling, you could use more integration inside the Script Module for observability and internal tooling. The official guide also makes it clear that the Script Engine is persistent and that callbacks must live there.

### 10.2 Improve your `main.js`

Today, according to your own context, the deployed runtime still runs with an "ultra simple" `main.js` that polls `command.json`, reloads `runtime.js`, and writes results. That works, but it's underusing the persistent nature of the Script Module.

---

## 11. How to Land It in This Repo

### 11.1 New PT-side handlers

In `packages/pt-runtime/src/templates/device-handlers-template.ts` add:

| Handler | Purpose |
|---------|---------|
| `handleConfigDhcpServer` | Configure DHCP server, pools, ranges |
| `handleInspectDhcpServer` | Read DHCP server state, pools, leases |
| `handleEnsureVlans` | Create/verify VLANs via VlanManager |
| `handleConfigVlanInterfaces` | Configure SVI IP/mask via RouterPort |
| `handleConfigSwitchport` | Configure access/trunk, native VLAN, port security |
| `handleInspectServices` | Inspect DNS, TFTP, NTP, SSH, RADIUS services |
| `handleListPorts` | List all ports with full state |
| `handleWatchEvents` | Subscribe to PT topology events |
| `handleExecIosSession` | Event-based IOS command execution |

### 11.2 In `inspect-handlers-template.ts`

Add:

- Real DHCP client reading from `HostPort.isDhcpClientOn()`;
- IP/gateway/mask reading from host ports;
- DHCP pool and lease inspection;
- VLAN and SVI inspection;
- Service inspection like DNS/TFTP/NTP/SSH when the process exists.

### 11.3 In `types`

Enrich `DeviceState` and `PortState` with:

```ts
type DeviceServiceState = {
  dhcpServer?: {
    enabled: boolean;
    pools: DhcpPoolState[];
  };
  dnsServer?: {
    enabled: boolean;
    records?: number;
  };
  sshServer?: {
    enabled: boolean;
  };
  ntpServer?: {
    enabled: boolean;
  };
};

type PortState = {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  defaultGateway?: string;
  dhcp?: boolean;
  ipv6Enabled?: boolean;
  isPortUp?: boolean;
  isProtocolUp?: boolean;
  accessVlan?: number;
  trunkAllowedVlans?: string[];
};
```

This aligns with the fact that today your schema already expects `dhcp` but the runtime isn't populating it correctly.

### 11.4 In `pt-cli`

Add commands like:

```bash
bun run pt host dhcp PC1
bun run pt host static PC1 --ip 192.168.10.10 --mask 255.255.255.0 --gateway 192.168.10.1
bun run pt dhcp-server apply Server0 --file dhcp-vlans.json
bun run pt dhcp-server inspect Server0
bun run pt vlan ensure MLS1 --file vlans.json
bun run pt svi apply MLS1 --file svis.json
bun run pt switchport apply SW1 --file switchports.json
bun run pt services inspect Server0
bun run pt events watch
bun run pt ios exec R1 "show ip int brief"
```

---

## 12. Correct Order of Implementation

Don't try to add everything at once.

### Phase 1 — Fix Host Configuration

Correct `configHost` and `inspect` with real `HostPort`. This resolves DHCP client, IP, gateway, and verification.

**Files to touch**:
- `packages/pt-runtime/src/templates/device-handlers-template.ts`
- `packages/pt-runtime/src/templates/inspect-handlers-template.ts`

### Phase 2 — DHCP Server

Implement `configDhcpServer` and `inspectDhcpServer`. This gives you pools per VLAN and leases.

**Files to touch**:
- `packages/pt-runtime/src/templates/device-handlers-template.ts` (new handler)
- `packages/pt-runtime/src/types.ts` (new types)

### Phase 3 — VLANs and SVIs

Implement `ensureVlans` and `configVlanInterfaces` with `VlanManager`.

**Files to touch**:
- `packages/pt-runtime/src/templates/device-handlers-template.ts` (new handler)
- `packages/pt-runtime/src/types.ts` (VlanState type)

### Phase 4 — Switch Ports

Make `configSwitchport` and, if needed, mix direct API with IOS fallback for trunk/access where the model requires it.

**Files to touch**:
- `packages/pt-runtime/src/templates/device-handlers-template.ts` (new handler)
- `packages/pt-runtime/src/templates/inspect-handlers-template.ts`

### Phase 5 — IOS Session Rewrite

Rewrite `execIos/configIos` on `TerminalLine` events. This is the biggest reliability fix.

**Files to touch**:
- `packages/pt-runtime/src/templates/ios-session-template.ts` (new file)
- All handlers that currently use `enterCommand` as if it returned output.

### Phase 6 — Extra Services

Add DNS, TFTP, NTP, SSH, Syslog, AAA.

**Files to touch**:
- `packages/pt-runtime/src/templates/inspect-handlers-template.ts`
- `packages/pt-runtime/src/templates/device-handlers-template.ts` (new handlers)

---

## 13. Straight Summary

What you're **most missing** in PT, ordered by impact:

| Priority | API Surface | What it unlocks |
|----------|-------------|-----------------|
| 1 | `HostPort` complete for IP/DHCP/IPv6 clients | Correct host config, DHCP verification, IPv6 |
| 2 | `DhcpServerProcess` + `DhcpPool` | Pools per VLAN, leases, gateway per pool |
| 3 | `VlanManager` | VLANs and SVIs via API-first |
| 4 | `SwitchPort` + `PortSecurity` | Real L2: access/trunk/native, port security |
| 5 | `TerminalLine` used correctly with events | Reliable IOS sessions, no false positives |
| 6 | Server services: DNS, TFTP, SSH, Syslog, NTP, RADIUS/TACACS | Full server labs |
| 7 | Script Module events and lifecycle | Observability and robust control |

---

## References

All API class references come from the official Cisco Packet Tracer Extensions API documentation:

- [TerminalLine](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_terminal_line.html)
- [Class List (full)](https://tutorials.ptnetacad.net/help/default/IpcAPI/annotated.html)
- [Network](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_network.html)
- [Device](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_device.html)
- [LogicalWorkspace](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_logical_workspace-members.html)
- [HostPort](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_host_port.html)
- [VlanManager](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_vlan_manager.html)
- [DhcpServerProcess](https://tutorials.ptnetacad.net/help/default/IpcAPI/class_dhcp_server_process.html)
- [Script Modules](https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm)
