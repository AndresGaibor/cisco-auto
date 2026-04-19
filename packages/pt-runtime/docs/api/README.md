# Packet Tracer API Documentation

## Overview

This section documents the **official Packet Tracer IPC API** — the object-oriented surface that PT exposes to Script Modules. This is distinct from the textual IOS CLI and should be the primary mechanism for automation wherever possible.

## Design Principle

> **Use the direct API when PT gives you an object and method. Use IOS/TerminalLine only when PT doesn't expose sufficient surface. Use events for verification and synchronization. Use textual CLI as a complement, not as the foundation.**

## Documents

| Document | Purpose |
|----------|---------|
| [Complete API Reference](./COMPLETE_API_REFERENCE.md) | Full reference of all PT API objects, when to use them, PT-safe code examples, and how they map to this repo |

## How This Relates to Existing Docs

- [`PT_CAPABILITIES_PRD.md`](../PT_CAPABILITIES_PRD.md) — Product requirements for PT capabilities; the API reference provides the technical foundation for those requirements.
- [`PT_CONTROL_ARCHITECTURE.md`](../PT_CONTROL_ARCHITECTURE.md) — Architecture for PT control; the API reference documents the actual objects that architecture manipulates.
- [`PT_CONTROL_MODELS.md`](../PT_CONTROL_MODELS.md) — Device model support; the API reference shows which `Device.getProcess()` calls work for which models.
- [`architecture/OVERVIEW.md`](../architecture/OVERVIEW.md) — General architecture overview; the API reference is the technical detail layer beneath it.

## Quick Map: API Surface → Repo Handlers

| PT API Class | Current Handler | Proposed Handler |
|-------------|-----------------|------------------|
| `HostPort` | `configHost` (incomplete) | `configHost` (fixed), `inspectHostPort` |
| `DhcpServerProcess` | _(none)_ | `configDhcpServer`, `inspectDhcpServer` |
| `DhcpPool` | _(none)_ | part of `configDhcpServer` |
| `VlanManager` | _(partial via IOS)_ | `ensureVlans`, `configVlanInterfaces` |
| `SwitchPort` | _(via IOS CLI)_ | `configSwitchport`, `inspectSwitchport` |
| `TerminalLine` | `execIos`, `configIos` (broken) | `execIosSession` (event-based) |
| `Network` + `Device` | `snapshot` | `device list`, `device get`, `topology verify` |
| `LogicalWorkspace` | `createLink` only | `annotateLab`, `addCluster`, `autoConnect` |
| `DnsServerProcess` | _(none)_ | `configDnsServer`, `inspectDnsServer` |
| `RoutingProcess` | _(via IOS CLI)_ | `route add static`, `route inspect` |
| `AclProcess` | _(via IOS CLI)_ | `acl inspect`, `acl verify` |
| `StpMainProcess` | _(none)_ | `inspect-stp` |

## Implementation Phases

See [Complete API Reference → Phase Order](./COMPLETE_API_REFERENCE.md#12-correct-order-of-implementation) for the recommended implementation sequence:

1. **Phase 1** — Fix Host configuration (`HostPort`)
2. **Phase 2** — DHCP Server (`DhcpServerProcess` + `DhcpPool`)
3. **Phase 3** — VLANs and SVIs (`VlanManager`)
4. **Phase 4** — Switch ports (`SwitchPort` + IOS fallback)
5. **Phase 5** — IOS session rewrite (`TerminalLine` events)
6. **Phase 6** — Extra services (DNS, TFTP, NTP, SSH, Syslog, AAA)
