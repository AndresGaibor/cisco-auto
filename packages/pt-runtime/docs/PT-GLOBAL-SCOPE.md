# PT 9.0.0.0810 - Global Scope & Hidden APIs

> Documented: 2026-04-15
> Source: Live extraction from PT console
> Status: 🔴 MAJOR FINDINGS — 40+ undocumented globals discovered

---

## Global Scope (PT 9.0)

### Confirmed Globals

| Global | Type | Description |
|---|---|---|
| `ipc` | object | PT IPC entry point |
| `dprint(msg)` | function | Logging to PT Activity Log (arity: 0) |
| `_ScriptModule` | object | Script module instance |
| `_Parser` | function (arity 2) | Low-level IPC parser |
| `$ipc` | function (arity 0) | IPC function |
| `$ipcObject` | function | Raw IPC object accessor |
| `console` | object | Console (log available) |
| `this` | object | Global object (use as fallback for `self`) |
| `self` | **undefined** | NOT available in PT 9.0 |
| `globalThis` | **undefined** | NOT available |
| `fm` | **undefined** | NOT auto-created — must use `ipc.systemFileManager()` |

### All 70 Globals

```
$_                  (known PT internals)
$WEB_VIEW_USE_JSON_SERIALIZE
$createHttpServer          ← HTTP server factory ✅ TESTED
$createTcpServer          ← TCP server factory ✅ TESTED
$createTcpSocket           ← TCP socket factory ✅ TESTED
$createUdpSocket           ← UDP socket factory ✅ TESTED
$createWebSocket           ← WebSocket factory ✅ TESTED
$getData                   ← Data storage GET ✅ TESTED
$putData                   ← Data storage PUT ✅ TESTED
$removeData                ← Data storage DELETE ✅ TESTED
$se / $sec / $secexists    ← Security/events system (not tested)
$secreg / $secunreg        ← Security registration
$seev                      ← Security events
$wvc / $wvca               ← WebView management
$ipc                       ← IPC function (arity 0)
$ipcObject                 ← Raw IPC object accessor
AssessmentModel            ← Assessment/tracking model (not tested)
Base64                     ← Base64 encoding/decoding ✅ TESTED
JsSimulationTimer          ← Simulation timer
MD5 / md51*                ← MD5 hashing (object, not function) ⚠️
SE_CACHE                   ← Script engine cache
SM_TR / SM_TRANSLATE       ← Translation system
_Network / _NetAccess      ← Network low-level
_IPC / _IpcBase            ← IPC base classes
_WebViewManager            ← WebView manager
_Parser                    ← IPC parser (arity 2)
_ScriptModule              ← Script module instance ✅ TESTED
concatenateArrayBuffers    ← ArrayBuffer utility
deleteResource             ← Resource deletion
guid                       ← GUID generator ✅ TESTED
hex* / md51* / rhex        ← MD5 internal helpers
scriptEngine               ← Script engine access ✅ TESTED
setInterval / clearInterval
setSimulationInterval       ← Simulation-aware interval
setSimulationTimeout        ← Simulation-aware timeout
clearSimulationInterval
clearSimulationTimeout
utf8Str2ArrayBuffer / arrayBuffer2Utf8Str
webViewEvaluateCall / webViewEvaluateCallAsync
webViewManager
```

---

## ✅ CONFIRMED APIs (TESTED)

### Data Storage (`$putData` / `$getData` / `$removeData`)

```javascript
$putData(key: string, value: string): void
$getData(key: string): string
$removeData(key: string): void

// Example
$putData("testKey", "testValue");
$getData("testKey")     // → "testValue"
$removeData("testKey")
$getData("testKey")     // → "" (empty string after delete)

// NOTE: Objects are stored as "[object Object]" - only strings work
$putData("objTest", {nested: true})  // → "[object Object]"
```

---

### Base64 Encoding

```javascript
Base64.encode(str: string): string   // → "aGVsbG8="
Base64.decode(str: string): string   // → "hello"
```

---

### GUID Generator

```javascript
guid(): string  // → "a7b1f527-7e8b-3d3e-b262-73cc4dcad73e" (UUID v4)
```

---

### scriptEngine

```javascript
scriptEngine.evaluate(code: string)       // → result of eval
scriptEngine.evaluateCall(fnName: string, args: array)  // → call function

// Examples
scriptEngine.evaluate("1 + 2")          // → 3
scriptEngine.evaluateCall("dprint", ["test"])  // → calls dprint("test")
```

---

### MD5 (⚠️ Object not Function)

```javascript
typeof MD5  // → "object" (not a function — use with `new`)

var md = new MD5();
md.append(str: string): void
md.reset(): void
md.getHash(): ArrayBuffer
md.toHex(arrayBuffer: ArrayBuffer): string
md.toHexString(): string

// Properties on instance:
md.hash        // → ArrayBuffer
md.hashBinary  // → ArrayBuffer
md.ArrayBuffer // → ArrayBuffer constructor ref

// NOTE: MD5("string") direct call FAILS

// NOTE: MD5("string") direct call FAILS with:
// "TypeError: Property 'reset' of object [object Object] is not a function"
```

---

## Network Server APIs

See `docs/PT-NETWORK-SERVERS.md` for full details.

| Factory | Returns | Key Methods |
|---|---|---|
| `$createHttpServer()` | HTTP server | `start()`, `stop()`, `addRouteHandler()`, `addWebSocketRouteHandler()` |
| `$createTcpServer()` | TCP server | `listen(port)`, `newConnection` event, `nextPendingConnection()` |
| `$createTcpSocket()` | TCP client | `connect(host,port)`, `sendData()`, `dataReceived` event |
| `$createUdpSocket()` | UDP socket | `begin(port)`, `sendData()`, `dataReceived` event |
| `$createWebSocket()` | WebSocket client | `connect(url)`, `sendData()`, `sendBinaryData()`, `dataReceived` event |

All factories accept **0 arguments**.

---

## Security System ($se*)

```javascript
$se()                         // → undefined (no args)
$se("PTNetwork")              // → undefined (ReferenceError: PTNetwork not defined)
$sec("class", "method")       // → undefined (fails: "Cannot call method of undefined")
$secexists("PTNetwork")       // → false (PT events not registered here)
$secreg("evt", fn)            // → UUID string on success ✅
$secunreg("evt")             // → undefined
$seev("evt")                  // → undefined (ReferenceError if not registered)
$seev("evt", "value")         // → undefined

// After $secunreg, $seev silently returns OK (no error, no action)
```

**Key findings:**
- `$secreg` registers a handler, returns UUID, but `$secexists` returns `false` for custom events
- `$seev` fires handlers via ReferenceError (handler name not in scope) — events are string identifiers
- `$secexists` only checks PT system security events, NOT custom registered events
- After `$secunreg`, `$seev` silently does nothing (no error thrown)
- `$sec` and `$se` are for PT internal IPC/security, not for script use

---

---

## _IpcBase

```javascript
typeof _IpcBase              // → "function" (arity 0)
_IpcBase()                   // → undefined (constructor needs args)
```

---

## _NetAccess

```javascript
typeof _NetAccess            // → "object" ✅

// HTTP methods
_NetAccess.httpGet(url: string, headers?: object): void
_NetAccess.httpPost(url: string, headers?: object): void
_NetAccess.httpPostBody(url: string, body: string, headers?: object): void
_NetAccess.httpPostMultiPart(url: string, parts: object, headers?: object): void
_NetAccess.httpPut(url: string, headers?: object): void
_NetAccess.httpPutBody(url: string, body: string, headers?: object): void
_NetAccess.httpPutMultiPart(url: string, parts: object, headers?: object): void
_NetAccess.httpDelete(url: string, headers?: object): void
_NetAccess.httpCreateRequest(method: string, url: string): object
_NetAccess.httpCreateMultiPartRequest(): object
_NetAccess.httpStop(requestId: string): void

// Server factories (same as $create* globals)
_NetAccess.createTcpSocket(): TcpSocket
_NetAccess.createTcpServer(): TcpServer
_NetAccess.createUdpSocket(): UdpSocket
_NetAccess.createHttpServer(): HttpServer
_NetAccess.createWebSocket(): WebSocket

// Events
_NetAccess.httpDone(handler: (requestId: string, data: string) => void): void
_NetAccess.objectNameChanged(handler: (name: string) => void): void
```

**Note:** `httpDone` is the completion callback for async HTTP requests.

---

## AssessmentModel

```javascript
typeof AssessmentModel  // → "object" (not a class, cannot use `new`)

// Assessment methods
AssessmentModel.getAssessmentItemValue(itemId: string): any
AssessmentModel.peakAssessmentItemID(): string
AssessmentModel.getAssessmentNodeChildrenAsList(nodeId: string): Array
AssessmentModel.include(path: string): void
AssessmentModel.isAssessmentItemCorrect(itemId: string): boolean
AssessmentModel.setAssessmentItemFeedback(itemId: string, feedback: string): void
AssessmentModel.refreshAssessmentItemsView(): void

// Timer
AssessmentModel.getTimeElapsed(): number
AssessmentModel.getCountDownTime(): number

// Data store
AssessmentModel.addScriptDataStore(id: string, data: object): void
AssessmentModel.removeScriptDataStore(id: string): void
AssessmentModel.getScriptDataStore(id: string): object
AssessmentModel.getScriptDataStoreIDs(): Array

// Instructions
AssessmentModel.setInstruction(html: string): void
AssessmentModel.evaluateInstructionsJavaScript(): void
AssessmentModel.getInstructionsHTML(): string

// Connectivity
AssessmentModel.getConnectivityTestCount(): number
AssessmentModel.getLastConnectivityTestResultsAt(index: number): object
AssessmentModel.getPDUStatus(pduId: string): string
AssessmentModel.firePDU(pduId: string): void
AssessmentModel.startPeriodicPDU(pduId: string, intervalMs: number): void
AssessmentModel.stopPeriodicPDU(pduId: string): void
AssessmentModel.getPDUCount(): number

// Scoring
AssessmentModel.getTotalItemCountByComponent(component: string): number
AssessmentModel.getCorrectItemCountByComponent(component: string): number
AssessmentModel.getPointsByComponent(component: string): number

// Utils
AssessmentModel.fromBase64(str: string): string
AssessmentModel.toBase64(str: string): string
AssessmentModel.isInNetwork(): boolean
AssessmentModel.printDebug(msg: string): void
AssessmentModel.clearDebug(): void
AssessmentModel.regularExpressionHasMatch(pattern: string, text: string): boolean
AssessmentModel.getRunningConfig(deviceId: string): string
AssessmentModel.getStartupConfig(deviceId: string): string
AssessmentModel.evaluateVariable(expression: string): any

// WebView
AssessmentModel.getWebViewManager(): WebViewManager
AssessmentModel.setUseCache(useCache: boolean): void
AssessmentModel.isUsingCache(): boolean

// Events
AssessmentModel.objectNameChanged(handler: (name: string) => void): void
```

---

## scriptEngine

```javascript
scriptEngine.evaluate(code: string)       // → result of eval ✅ WORKS
scriptEngine.evaluateCall(fnName, args)   // → call function ✅ WORKS

// Examples
scriptEngine.evaluate("1 + 2")            // → 3
scriptEngine.evaluateCall("dprint", ["test"])  // → undefined (dprint runs)
```

---

## webViewManager

```javascript
typeof webViewManager        // → "object"
Object.keys(webViewManager)  // → [] (no enumerable properties)
```

Has no accessible methods — object exists but unusable from console.

---

## Translation (SM_TR / SM_TRANSLATE)

```javascript
SM_TRANSLATE(str: string, locale?: string): string
SM_TR: string
```

Returns the input unchanged — translation system present but unconfigured.

---

## ArrayBuffer Utilities

```javascript
utf8Str2ArrayBuffer(str: string): ArrayBuffer
arrayBuffer2Utf8Str(buffer: ArrayBuffer): string
concatenateArrayBuffers(a: ArrayBuffer, b: ArrayBuffer): ArrayBuffer
```

---

## deleteResource

```javascript
typeof deleteResource   // → "function"
deleteResource.length  // → 4  (4 args required)
```

---

## SE_CACHE

```javascript
typeof SE_CACHE         // → "object"
SE_CACHE.keys           // → idCache, register, unregister, unregisterId, get
```

Script engine cache — methods for ID registration and lookup.

---

## MD5 Internals

```javascript
typeof hex    // → "function"
typeof md51   // → "function"
typeof rhex   // → "function"
typeof add32  // → "function"
typeof cmn    // → "function"
```

Low-level MD5 algorithm helpers. Use `MD5` class via `new MD5()` instead.

---

## WebView APIs ($wvc / $wvca / webViewEvaluateCall)

```javascript
typeof $wvc              // → "function" (arity 1)
typeof $wvca             // → "function" (arity 1)
typeof webViewEvaluateCall         // → "function" (arity 0) ⚠️ FAILS
typeof webViewEvaluateCallAsync    // → "function"

// webViewEvaluateCall() ERROR:
// "TypeError: Property 'evaluateJavaScript' of object [object Object] is not a function"
```

**webViewEvaluateCall fails** — PT internal API not exposed to QTScript.

---

## JsSimulationTimer

```javascript
typeof JsSimulationTimer  // → "function"
```

Exists as function. Not tested in depth.

---

## _WebViewManager

```javascript
typeof _WebViewManager   // → "function"
```

---

## $WEB_VIEW_USE_JSON_SERIALIZE

Not tested — flag for WebView JSON serialization.

---

## Script Engine Helpers

`_escapeString`, `_getCallString`, `_getDebugArgs` — not tested.

---

## REMAINING UNTESTED

| Global | Description |
|---|---|
| `_IpcBase` | IPC base class — arity 0, returns undefined |
| `_NetAccess` | ✅ 19 methods: HTTP (httpGet/httpPost/etc), TCP/UDP/WebSocket factories |
| `AssessmentModel` | ✅ 45 methods — assessment/tracking model, has evaluation, PDU, config |
| `$se` | Security — arity 0, no args, returns undefined |
| `$sec` | Security — arity 2, class+method, internal use |
| `$seev` | Security events — fires registered handlers (ReferenceError) |
| `JsSimulationTimer` | ⚠️ arity 5 — IPC ERROR "Invalid arguments for createTimer" |
| `deleteResource` | ⚠️ 4 args — C++ type error on strings, requires typed args |
| `$WEB_VIEW_USE_JSON_SERIALIZE` | WebView flag |
| `_escapeString`, `_getCallString`, `_getDebugArgs` | Script engine helpers |
| `webViewManager` | Object with no enumerable properties |

---

## ipc Direct Methods

```javascript
// Event registration
ipc.registerEvent(event: string, context: object, handler: function): void
ipc.unregisterEvent(event: string, context: object, handler: function): void
ipc.registerDelegate(event: string, context: object, handler: function): void
ipc.unregisterDelegate(event: string, context: object, handler: function): void
ipc.registerObjectEvent(event: string, context: object, handler: function): void
ipc.unregisterObjectEvent(event: string, context: object, handler: function): void

// Object identity
ipc.getObjectByUuid(uuid: string): object | null
ipc.getObjectUuid(obj: object): string

// Sub-managers
ipc.network(): PTNetwork
ipc.appWindow(): PTAppWindow
ipc.systemFileManager(): PTFileManager
ipc.simulation(): PTSimulation
ipc.hardwareFactory(): PTHardwareFactory
ipc.ipcManager(): PTIpcManager
ipc.multiUserManager(): PTMultiUserManager
ipc.userAppManager(): PTUserAppManager
```

---

## Notes

- `this` in global scope is the global object (not `self`)
- `self` is `undefined` in PT 9.0 — do NOT use as fallback
- `$ipc` has arity 0 but requires arguments to call
- All network server creators (`$createHttpServer`, etc.) have arity 0 — no args required
- Data storage only handles strings — objects get stringified to `[object Object]`
- MD5 requires `new MD5()` then `.append(str)` then `.getHash()` + `.toHex()`
- `_ScriptModule.getIpcApi()` requires arguments — use `ipc` global directly

---

## See Also

- `docs/PT-NETWORK-SERVERS.md` — Full network server API details
- `docs/PT-API-COMPLETE.md` — PT IPC API (ipc.network, ipc.appWindow, etc.)
- `docs/PT9-Debugging.md` — Debugging approach
- `src/pt-api/pt-api-registry.ts` — Type definitions