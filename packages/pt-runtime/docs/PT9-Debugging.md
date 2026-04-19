# PT 9.0 Scripting API Debugging Notes

> Documented: 2026-04-15
> PT Version: 9.0.0.0810
> Status: ✅ UPDATED — `ipc.systemFileManager()` and `_ScriptModule` file ops work

---

## Finding: `ipc.systemFileManager()` DOES Exist

The earlier "undefined" conclusion came from running code inside `main.js` context. Fresh console tests show:

```javascript
typeof ipc.systemFileManager()  // → "object" (26 methods available)
typeof fm                       // → "undefined" (global fm not auto-created)
```

`fm` is NOT a global. Access it via `ipc.systemFileManager()`. Global `fm` only exists if your script creates it.

---

## What Works (PT 9.0.0.0810)

| Global | Type | Description |
|---|---|---|
| `dprint(msg)` | function | Logging to PT Activity Log |
| `ipc` | object | PT IPC API entry point |
| `ipc.network()` | object | Network inventory API |
| `ipc.appWindow()` | object | Window/app control API |
| `ipc.systemFileManager()` | object | **File operations (26 methods)** |
| `ipc.simulation()` | object | Simulation mode control |
| `ipc.hardwareFactory()` | object | Device/cable type resolution |
| `_ScriptModule` | object | Module instance — has file ops |
| `_ScriptModule.getFileContents(path)` | function | **Read file from disk** |
| `_ScriptModule.writeTextToFile(path, content)` | function | **Write file to disk** |
| `_ScriptModule.getFileModificationTime(path)` | function | File mtime |
| `_ScriptModule.copySrcFileToDestFile(src, dest)` | function | Copy file |
| `_ScriptModule.getIpcApi()` | function | Returns ipc |
| `_ScriptModule.getFileSize(path)` | function | File size check |

---

## What Does NOT Exist

| Global | Why |
|---|---|
| `globalThis` | Not defined — use `this` |
| `self` | `typeof self === "undefined"` in PT 9.0 |
| `fm` (global) | NOT auto-created — must call `ipc.systemFileManager()` |
| `$ipc` as function | Requires arguments in PT 9.0 — not usable as simple IPC shortcut |
| `_Parser.ipcCall` | Returns `undefined` — can't do raw IPC calls |
| `hardwareFactory.getDeviceType()` | Returns `undefined` — can't use for type resolution |
| `LogicalWorkspace.getRectData` | Returns `undefined` — only `getRectItemData` works |
| `Device.getX()` / `Device.getY()` | Returns `undefined` — no direct canvas coordinates |

---

## Hot Reload: Dual File Access (runtime-loader.ts)

Two paths for hot reload — runtime-loader tries both:

```javascript
// Path 1: ipc.systemFileManager() (primary)
var fm = ipc.systemFileManager();
fm.getFileContents("/path/to/runtime.js");  // ✅ Works

// Path 2: _ScriptModule (fallback — always available in script context)
_ScriptModule.getFileContents("/path/to/runtime.js");  // ✅ Works
```

runtime-loader.ts checks:
```javascript
const useFm = typeof fm !== "undefined" && fm !== null;
const useScriptModule = typeof _ScriptModule !== "undefined" && _ScriptModule !== null;

// getFileContents() tries fm first, falls back to _ScriptModule
```

---

## Debug: Paste Code in PT Console

```javascript
// Quick diagnosis
typeof ipc                           // → "object"
typeof ipc.systemFileManager         // → "function"
typeof ipc.systemFileManager()        // → "object" or "undefined"
typeof _ScriptModule                  // → "object"
typeof _ScriptModule.getFileContents   // → "function"

// Read runtime.js via _ScriptModule
var rt = _ScriptModule.getFileContents("/Users/andresgaibor/pt-dev/runtime.js");
rt.length  // → 14965 (confirmed readable)
```

---

## Method Signature Issues Found

| Call | Problem | Fix |
|---|---|---|
| `ipc.getObjectUuid(device)` | "Invalid arguments" — needs 2 args | Use `device.getObjectUuid()` directly |
| `fm.getFileWatcher(path)` | "Invalid arguments" — needs 2 args | `fm.getFileWatcher(path, handler)` |
| `$ipc()` | "Insufficient arguments" | Don't call as function |
| `_ScriptModule.getIpcApiAsync()` | "Insufficient arguments" | Needs args in PT 9.0 |
| `_ScriptModule.addScriptFile(path)` | "Insufficient arguments" | Needs 2 args |
| `_ScriptModule.getOpenFileName()` | "Insufficient arguments" | Requires args |

---

## Device Processes Found (via getProcess)

Router16 confirmed with live processes:
- `NtpServerProcess` — object with _parser
- `AclProcess` — object with _parser
- `RoutingProcess` — object with _parser

---

## PT_DEBUG Flag — Control Debug Log Output

By default, `dprint()` output is sent ONLY to the PT Activity Log (`native dprint`) and the NDJSON log file (`logs/pt-debug.current.ndjson`). The PT Debug window (which shows `appWindow.writeToPT` output) is silent.

### Enable PT Debug Window Output

In the PT Console, set the debug flag:

```javascript
self.PT_DEBUG = 1   // Enable PT Debug window output
self.PT_DEBUG = 0   // Disable PT Debug window output
```

### What Gets Logged

When `PT_DEBUG=1`, `dprint()` calls will write to the PT Debug window in addition to the Activity Log. This includes:

- `[kernel]` — Kernel lifecycle, dispatch, command queue
- `[loader]` — Runtime.js loading and hot reload
- `[queue-claim]` — Command claim operations
- `[KERNEL-IIFE]` — Kernel bootstrap sanity checks
- `[main]` — Script module entry point logging

### Default Behavior (PT_DEBUG not set or falsy)

```javascript
// In PT Console, default is silent:
self.PT_DEBUG   // → undefined (falsy)
```

Without `PT_DEBUG=1`, you only get:
1. **Activity Log** — native `dprint()` output (always on)
2. **Terminal logs** — `bun run pt log --live` from the CLI

---

## See Also

- `docs/PT-API-COMPLETE.md` — 1348-line comprehensive test results
- `docs/PT-API.md` — Interface method reference
- `docs/ARCHITECTURE.md` — main.js vs runtime.js boundary
- `src/pt/kernel/runtime-loader.ts` — Hot reload with dual file access
- `docs/pt-api-complete-test.js` — Full API interrogation script
- `docs/pt-scriptmodule-test.js` — _ScriptModule file ops test
