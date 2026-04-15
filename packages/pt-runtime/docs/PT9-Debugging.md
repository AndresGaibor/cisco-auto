# PT 9.0 Scripting API Debugging Notes

> Documented: 2026-04-14
> PT Version: 9.0.0.0810

## Finding: `ipc.systemFileManager` Does NOT Exist

PT 9.0.0.0810 only exposes `ipc.network()`, not `ipc.systemFileManager()`.
The filesystem API (`fm`) is not available in this version.

### What Works

| Global | Type | Description |
|---|---|---|
| `dprint(msg)` | function | Logging to PT Activity Log console |
| `ipc` | object | PT IPC API entry point |
| `ipc.network()` | function | Returns Network object |
| `self` / `this` | object | Global scope (no `globalThis`) |

### What Does NOT Exist

- `ipc.systemFileManager` — **undefined**
- `fm` (file manager) — **not available**
- `window`, `fetch`, `XMLHttpRequest`, `require`, `importScripts` — all undefined
- `process`, `globalThis` — undefined

### Available Network API

```javascript
var net = ipc.network();
net.getDevice(name)     // → PTDevice | null
net.getDeviceCount()    // → number
net.getDeviceAt(index)   // → PTDevice | null
```

### Debug Approach: Paste Code in PT Console

When debugging PT scripting issues:

1. Open PT Activity Log console
2. Paste code snippets to test globals
3. Check `typeof ipc`, `typeof fm`, `typeof dprint`
4. Test `ipc.network()` and inspect returned objects

Example debug session:
```
> typeof ipc
→ function

> typeof fm
→ undefined

> Object.keys(ipc)
→ ["_parser"]

> ipc.network().getDeviceCount
→ function() { [native code] }
```

## Implication for Build Architecture

Since `fm` is not available, `main.js` **cannot load external files** (`catalog.js`, `runtime.js`) at runtime.

**Solution:** Embed `catalog.js` and `runtime.js` code inline inside `main.js` at build time.

- `main()` no longer calls `_ptLoadModule()`
- All code is present in the single `main.js` file
- Deploy is now a single file copy, not three

## Architecture Change for PT 9.0+

| Aspect | Before (fm available) | After (PT 9.0, no fm) |
|---|---|---|
| Loading | `_ptLoadModule()` reads files via `fm` | Code embedded inline at build |
| Files on disk | 3 files: main.js + runtime.js + catalog.js | 1 file: main.js with all embedded |
| Hot reload | mtime detection → reload runtime.js | Not possible (no filesystem) |
| `catalog.js` | Separate file on disk | String constant in main.js |
| `runtime.js` | Separate file on disk | String constant in main.js |

## Debugging Checklist for Future PT Versions

When testing a new PT version:

1. `typeof ipc` — should return `function` or `object`
2. `typeof dprint` — should return `function`
3. `typeof ipc.systemFileManager` — if undefined, use embedded approach
4. `typeof ipc.network()` — verify network access
5. `Object.keys(self || {})` — check available globals

## See Also

- `docs/ARCHITECTURE.md` — main.js vs runtime.js boundary
- `src/build/render-main-v2.ts` — build script that embeds modules inline
- `src/index.ts` — RuntimeGenerator with `generate()`, `build()`, `deploy()`