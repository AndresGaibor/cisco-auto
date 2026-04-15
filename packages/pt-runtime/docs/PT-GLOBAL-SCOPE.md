# PT 9.0.0.0810 - Global Scope & Hidden APIs

> Documented: 2026-04-15
> Source: Live extraction from PT console
> Status: ✅ 70 globals documented, all APIs typed with params

---

## Confirmed Globals (Summary)

| Global | Type | Description |
|---|---|---|
| `ipc` | object | PT IPC entry point — central API hub |
| `dprint(msg)` | function | Log to PT Activity Log (arity 0) |
| `_ScriptModule` | object | Script module instance — file ops, IPC, timing, debug |
| `_Parser` | function | Low-level IPC parser (arity 2) |
| `$ipc` | function | IPC function wrapper (arity 0) |
| `$ipcObject` | function | Raw IPC object accessor |
| `console` | object | Console with `log` available |
| `this` | object | Global object (use instead of `self`) |
| `self` | **undefined** | NOT available — use `this` |
| `globalThis` | **undefined** | NOT available |
| `fm` | **undefined** | NOT auto-created — use `ipc.systemFileManager()` |

---

## All 70 Globals

```
$_                       (known PT internals)
$WEB_VIEW_USE_JSON_SERIALIZE
$createHttpServer        HTTP server factory ✅
$createTcpServer         TCP server factory ✅
$createTcpSocket         TCP socket factory ✅
$createUdpSocket         UDP socket factory ✅
$createWebSocket         WebSocket factory ✅
$getData                 Data storage GET ✅
$putData                 Data storage PUT ✅
$removeData              Data storage DELETE ✅
$se / $sec / $secexists  Security/events system ✅
$secreg / $secunreg      Security registration ✅
$seev                    Security events ✅
$wvc / $wvca             WebView callbacks ✅
$ipc                     IPC function (arity 0)
$ipcObject               Raw IPC object accessor
AssessmentModel          Assessment/tracking model ✅ (45 methods)
Base64                   Base64 encoding/decoding ✅
JsSimulationTimer        Simulation timer ⚠️ (IPC args error)
MD5 / md51               MD5 hashing (object, not function) ⚠️
SE_CACHE                 Script engine cache ✅
SM_TR / SM_TRANSLATE     Translation system ✅
_Network / _NetAccess     Network low-level ✅ (19 methods)
_IPC / _IpcBase          IPC base classes ✅
_WebViewManager          WebView manager ✅
_Parser                  IPC parser (arity 2)
_ScriptModule            Script module instance ✅
concatenateArrayBuffers  ArrayBuffer utility ✅
deleteResource           Resource deletion ⚠️ (needs typed args)
guid                     GUID generator ✅
hex / md51 / rhex        MD5 internal helpers ✅
scriptEngine             Script engine access ✅
setInterval / clearInterval
setSimulationInterval    Simulation-aware interval
setSimulationTimeout     Simulation-aware timeout
clearSimulationInterval
clearSimulationTimeout
utf8Str2ArrayBuffer      UTF-8 encode ✅
arrayBuffer2Utf8Str       UTF-8 decode ⚠️ (garbage bytes)
webViewEvaluateCall      WebView code execution ⚠️ (fails)
webViewEvaluateCallAsync WebView async execution
webViewManager           Object (no enumerable properties)
```

---

## Data Storage (`$putData` / `$getData` / `$removeData`)

Persistent key-value storage scoped to the current script session.

```javascript
// Store a string value
$putData(key: string, value: string): void
$getData(key: string): string
$removeData(key: string): void

// Example
$putData("sessionId", "abc123");
var id = $getData("sessionId");  // → "abc123"
$removeData("sessionId");
$getData("sessionId");           // → "" (empty after delete)

// NOTE: Only strings — objects become "[object Object]"
$putData("obj", {nested: true});  // → "[object Object]"
$getData("obj");                  // → "[object Object]"
```

---

## Base64 Encoding

Encode/decode binary data as ASCII strings.

```javascript
// Encode a string to base64
Base64.encode(str: string): string
// Example
Base64.encode("hello");  // → "aGVsbG8="

// Decode base64 back to string
Base64.decode(str: string): string
// Example
Base64.decode("aGVsbG8=");  // → "hello"
```

---

## GUID Generator

Generate UUID v4 strings — useful for unique identifiers.

```javascript
// Returns a random UUID v4 string
guid(): string

// Example
guid();  // → "a7b1f527-7e8b-3d3e-b262-73cc4dcad73e"
guid();  // → "1a778aad-095a-3bbd-8ce2-95288c2d9507"
```

---

## scriptEngine

Evaluate arbitrary JS code and call global functions by name.

```javascript
// Evaluate a string as JS code and return the result
scriptEngine.evaluate(code: string): any
// Example
scriptEngine.evaluate("1 + 2");        // → 3
scriptEngine.evaluate("dprint('hi')");  // → executes dprint

// Call a global function with arguments
scriptEngine.evaluateCall(fnName: string, args: Array): any
// Example
scriptEngine.evaluateCall("dprint", ["test"]);  // → undefined (dprint runs)
```

---

## MD5 (⚠️ Object, Not Function)

MD5 hash computation. Must instantiate with `new`.

```javascript
// Create an MD5 instance
var md = new MD5();

// Append string data to hash
md.append(str: string): void
// Example
md.append("hello");

// Reset the hash state
md.reset(): void

// Get raw hash as ArrayBuffer
md.getHash(): ArrayBuffer

// Convert ArrayBuffer to hex string
md.toHex(arrayBuffer: ArrayBuffer): string
// Example
var hash = md.getHash();
var hex = md.toHex(hash);  // → "5d41402abc4b2a76b9719d911017c592"

// Get hex string directly
md.toHexString(): string

// Properties on instance:
md.hash        // ArrayBuffer — current hash state
md.hashBinary  // ArrayBuffer — binary representation
md.ArrayBuffer // ArrayBuffer constructor reference

// NOTE: MD5("string") direct call FAILS with TypeError
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

## Security System (`$se*`)

PT internal security and event system. For PT-internal IPC use.

```javascript
// Returns undefined — no args version fails
$se(): undefined
// With event name string — fails
$se("PTNetwork");  // → ReferenceError

// Security call — 2 string args — fails in script context
$sec(className: string, methodName: string): undefined

// Check if a PT system event exists
$secexists(eventName: string): boolean
// Example
$secexists("PTNetwork");  // → false

// Register a custom event handler — returns UUID on success
$secreg(eventName: string, handler: function): string
// Example
var uuid = $secreg("myEvent", function() { dprint("fired!"); });

// Unregister a custom event
$secunreg(eventName: string): undefined

// Fire a registered event (or set a value on it)
$seev(eventName: string, value?: any): undefined
// Example
$seev("myEvent");            // fires handler
$seev("myEvent", "myValue"); // sets value

// NOTE: $seev silently returns OK after unregister (no action)
// NOTE: $secexists returns false for custom events (only checks PT system)
```

---

## _IpcBase

IPC base class — internal PT IPC infrastructure.

```javascript
typeof _IpcBase  // → "function" (arity 0)
_IpcBase()       // → undefined (constructor requires arguments)
```

---

## _NetAccess

Low-level HTTP/TCP/UDP/WebSocket API — mirrors the `$create*` globals but via HTTP methods.

```javascript
typeof _NetAccess  // → "object"

// HTTP request methods — all return void, use httpDone callback
_NetAccess.httpGet(url: string, headers?: object): void
_NetAccess.httpPost(url: string, headers?: object): void
_NetAccess.httpPostBody(url: string, body: string, headers?: object): void
_NetAccess.httpPostMultiPart(url: string, parts: object, headers?: object): void
_NetAccess.httpPut(url: string, headers?: object): void
_NetAccess.httpPutBody(url: string, body: string, headers?: object): void
_NetAccess.httpPutMultiPart(url: string, parts: object, headers?: object): void
_NetAccess.httpDelete(url: string, headers?: object): void

// HTTP request management
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

---

## AssessmentModel

Assessment and tracking model — manages lab assessments, scoring, instructions, PDU tracking, and device configuration retrieval. **Cannot be instantiated** — use the global directly.

```javascript
typeof AssessmentModel  // → "object"

// --- Assessment Items ---
AssessmentModel.getAssessmentItemValue(itemId: string): any
AssessmentModel.peakAssessmentItemID(): string
AssessmentModel.getAssessmentNodeChildrenAsList(nodeId: string): Array
AssessmentModel.include(path: string): void
AssessmentModel.isAssessmentItemCorrect(itemId: string): boolean
AssessmentModel.setAssessmentItemFeedback(itemId: string, feedback: string): void
AssessmentModel.refreshAssessmentItemsView(): void

// --- Timer ---
AssessmentModel.getTimeElapsed(): number      // seconds since start
AssessmentModel.getCountDownTime(): number    // remaining countdown seconds

// --- Data Store (script-scoped) ---
AssessmentModel.addScriptDataStore(id: string, data: object): void
AssessmentModel.removeScriptDataStore(id: string): void
AssessmentModel.getScriptDataStore(id: string): object
AssessmentModel.getScriptDataStoreIDs(): Array

// --- Instructions (HTML content shown in assessment panel) ---
AssessmentModel.setInstruction(html: string): void
AssessmentModel.evaluateInstructionsJavaScript(): void
AssessmentModel.getInstructionsHTML(): string

// --- Connectivity / PDU ---
AssessmentModel.getConnectivityTestCount(): number
AssessmentModel.getLastConnectivityTestResultsAt(index: number): object
AssessmentModel.getPDUStatus(pduId: string): string
AssessmentModel.firePDU(pduId: string): void
AssessmentModel.startPeriodicPDU(pduId: string, intervalMs: number): void
AssessmentModel.stopPeriodicPDU(pduId: string): void
AssessmentModel.getPDUCount(): number

// --- Scoring ---
AssessmentModel.getTotalItemCountByComponent(component: string): number
AssessmentModel.getCorrectItemCountByComponent(component: string): number
AssessmentModel.getPointsByComponent(component: string): number

// --- Config retrieval ---
AssessmentModel.getRunningConfig(deviceId: string): string
AssessmentModel.getStartupConfig(deviceId: string): string
AssessmentModel.evaluateVariable(expression: string): any

// --- Utilities ---
AssessmentModel.fromBase64(str: string): string
AssessmentModel.toBase64(str: string): string
AssessmentModel.isInNetwork(): boolean
AssessmentModel.printDebug(msg: string): void
AssessmentModel.clearDebug(): void
AssessmentModel.regularExpressionHasMatch(pattern: string, text: string): boolean

// --- WebView ---
AssessmentModel.getWebViewManager(): WebViewManager
AssessmentModel.setUseCache(useCache: boolean): void
AssessmentModel.isUsingCache(): boolean

// --- Events ---
AssessmentModel.objectNameChanged(handler: (name: string) => void): void

// Examples
AssessmentModel.getTimeElapsed();                        // → seconds elapsed
AssessmentModel.getRunningConfig("R1");                 // → IOS config string
AssessmentModel.isAssessmentItemCorrect("q1");          // → true/false
AssessmentModel.startPeriodicPDU("pdu1", 5000);         // fire every 5s
AssessmentModel.regularExpressionHasMatch("\\d+", "abc123");  // → true
```

---

## Translation (`SM_TR` / `SM_TRANSLATE`)

Translation system for localized strings. Currently **unconfigured** — returns input unchanged.

```javascript
SM_TRANSLATE(str: string, locale?: string): string
SM_TR: string

// Examples
SM_TRANSLATE("hello");       // → "hello" (no-op)
SM_TRANSLATE("hello", "en"); // → "en" (no-op)
```

---

## ArrayBuffer Utilities

UTF-8 encoding and Buffer concatenation.

```javascript
// Encode string to UTF-8 ArrayBuffer
utf8Str2ArrayBuffer(str: string): ArrayBuffer
// Example
utf8Str2ArrayBuffer("abc").byteLength;  // → 3
utf8Str2ArrayBuffer("hello");            // bytes: 104,101,108,108,111

// Decode UTF-8 ArrayBuffer to string ⚠️
arrayBuffer2Utf8Str(buffer: ArrayBuffer): string
// NOTE: Returns garbage bytes in tests — encoding issue

// Concatenate two ArrayBuffers
concatenateArrayBuffers(a: ArrayBuffer, b: ArrayBuffer): ArrayBuffer
// Example
var combined = concatenateArrayBuffers(utf8Str2ArrayBuffer("hello"),
                                       utf8Str2ArrayBuffer("world"));
// combined.byteLength → 10
```

---

## SE_CACHE

Script engine cache for ID registration and lookup.

```javascript
typeof SE_CACHE  // → "object"

// Properties
SE_CACHE.idCache    // object — registered IDs (keys: UUIDs from $secreg calls)
SE_CACHE.register   // function — register an ID
SE_CACHE.unregister // function — unregister an ID
SE_CACHE.unregisterId // function — unregister by ID
SE_CACHE.get        // function — retrieve by ID

// Examples
var keys = Object.keys(SE_CACHE.idCache);  // → UUIDs from $secreg
SE_CACHE.get("someId");                     // → cached value or undefined
```

---

## JsSimulationTimer ⚠️

Simulation-aware timer factory. **IPC ERROR on instantiation** — requires typed arguments not accessible from QTScript.

```javascript
typeof JsSimulationTimer  // → "function"
JsSimulationTimer.length  // → 5 (5 args required)

// Example — FAILS with IPC error
new JsSimulationTimer();
// → "IPC Call ERROR: Simulation - Invalid arguments for IPC call 'createTimer'"
```

---

## deleteResource ⚠️

Delete a resource by path. **Requires typed arguments** — plain strings cause C++ type error.

```javascript
typeof deleteResource  // → "function"
deleteResource.length  // → 4

// NOTE: Passing string args causes:
// "TypeError: Passing incompatible arguments to C++ functions from JavaScript is not allowed."
```

---

## MD5 Internals

Low-level MD5 algorithm helpers — exposed but intended for internal MD5 class use.

```javascript
typeof hex       // → "function"
typeof md51      // → "function"
typeof rhex      // → "function"
typeof add32     // → "function"
typeof cmn       // → "function"
```

Use the `MD5` class via `new MD5()` instead.

---

## WebView APIs

```javascript
// webViewEvaluateCall — FAILS (PT internal API not exposed to QTScript)
typeof webViewEvaluateCall         // → "function"
webViewEvaluateCall();
// → TypeError: Property 'evaluateJavaScript' of object is not a function

typeof webViewEvaluateCallAsync    // → "function"

// $wvc / $wvca — WebView callbacks
typeof $wvc   // → "function" (arity 1)
typeof $wvca  // → "function" (arity 1)

// _WebViewManager
typeof _WebViewManager  // → "function"

// webViewManager — object with no enumerable properties
typeof webViewManager  // → "object"
```

---

## ipc Direct Methods

Central IPC API for PT subsystems.

```javascript
// --- Event Registration ---
// Register/unregister event handlers on a context object
ipc.registerEvent(event: string, context: object, handler: function): void
ipc.unregisterEvent(event: string, context: object, handler: function): void
ipc.registerDelegate(event: string, context: object, handler: function): void
ipc.unregisterDelegate(event: string, context: object, handler: function): void
ipc.registerObjectEvent(event: string, context: object, handler: function): void
ipc.unregisterObjectEvent(event: string, context: object, handler: function): void

// Example
ipc.registerEvent("deviceAdded", someContext, function(device) {
  dprint("Device added: " + device);
});

// --- Object Identity ---
// Get or create UUID for any PT object
ipc.getObjectByUuid(uuid: string): object | null
ipc.getObjectUuid(obj: object): string

// Example
var uuid = ipc.getObjectUuid(someDevice);  // → "a7b1f527-..."
var obj = ipc.getObjectByUuid(uuid);        // → the object or null

// --- Sub-Managers ---
ipc.network(): PTNetwork              // Network topology access
ipc.appWindow(): PTAppWindow         // Application window control
ipc.systemFileManager(): PTFileManager  // Full file operations
ipc.simulation(): PTSimulation        // Simulation control
ipc.hardwareFactory(): PTHardwareFactory  // Hardware abstraction
ipc.ipcManager(): PTIpcManager        // IPC internals
ipc.multiUserManager(): PTMultiUserManager  // Multi-user session
ipc.userAppManager(): PTUserAppManager    // User application management

// Example
var fm = ipc.systemFileManager();
fm.getFileContents("/path/to/file");
fm.fileExists("/path/to/file");
```

---

## PTFileManager

File system operations via `ipc.systemFileManager()`. Note: methods are **not enumerable** from QTScript (can't enumerate with `Object.keys()`), but all are callable directly.

```javascript
var fm = ipc.systemFileManager();

// --- Basic Operations ---
fm.getFileContents(path: string): string
fm.getFileBinaryContents?(path: string): Uint8Array
fm.writePlainTextToFile(path: string, content: string): void
fm.writeBinaryToFile?(path: string, content: Uint8Array): void
fm.writeTextToFile?(path: string, content: string): void
fm.fileExists(path: string): string | boolean
fm.directoryExists(path: string): boolean
fm.makeDirectory(path: string): boolean
fm.getFileModificationTime(path: string): number
fm.getFilesInDirectory(path: string): string[]
fm.removeFile(path: string): boolean
fm.removeDirectory?(path: string): boolean
fm.moveSrcFileToDestFile(src: string, dest: string): boolean
fm.copySrcFileToDestFile?(src: string, dest: string): boolean

// --- File Info ---
fm.getFileSize?(path: string): number
fm.getFileCheckSum?(path: string): string
fm.getFilePermissions?(path: string): string
fm.setFilePermissions?(path: string, permissions: string): boolean

// --- Encryption ---
fm.getEncryptedFileContents?(path: string): string
fm.getEncryptedFileBinaryContents?(path: string): Uint8Array
fm.encrypt?(content: string): string
fm.encryptBinary?(content: Uint8Array): Uint8Array
fm.encryptFile?(src: string, dest: string): boolean
fm.decrypt?(content: string): string
fm.decryptBinary?(content: Uint8Array): Uint8Array
fm.decryptFile?(src: string, dest: string): boolean

// --- Compression ---
fm.zipDirectory?(srcDir: string, destFile: string): boolean
fm.zipDirectoryTo?(srcDir: string, destFile: string): boolean
fm.zipDirectoryWithPassword?(srcDir: string, destFile: string, password: string): boolean
fm.zipDirectoryToWithPassword?(srcDir: string, destFile: string, password: string): boolean
fm.unzipFile?(zipFile: string): boolean
fm.unzipFileTo?(zipFile: string, destDir: string): boolean
fm.unzipFileWithPassword?(zipFile: string, password: string): boolean
fm.unzipFileToWithPassword?(zipFile: string, destDir: string, password: string): boolean

// --- Path Utilities ---
fm.getAbsolutePath?(path: string): string
fm.getRelativePath?(path: string, base: string): string
fm.isAbsolutePath?(path: string): boolean
fm.isRelativePath?(path: string): boolean
fm.convertToNativeSeparators?(path: string): string
fm.convertFromNativeSeparators?(path: string): string

// --- File Watcher (for hot reload) ---
fm.getFileWatcher?(path: string): PTFileWatcher | null

// --- Dialogs ---
fm.getOpenFileName?(filter?: string): string | null
fm.getOpenFileNames?(filter?: string): string[]
fm.getSaveFileName?(defaultName?: string): string | null
fm.getSelectedDirectory?(): string | null

// --- System ---
fm.getClassName?(): string
fm.getObjectUuid?(): string

// Examples
fm.fileExists("/Users/andresgaibor/pt-dev/runtime.js");  // → true
fm.getFileContents("/path/to/file");                     // → string
fm.writePlainTextToFile("/tmp/test.txt", "hello");      // → void
fm.getFilesInDirectory("/Users/andresgaibor/pt-dev");    // → string[]
fm.getFileModificationTime("/path");                     // → Unix timestamp
fm.getFileCheckSum("/path");                            // → SHA1 hash
```

---

## _ScriptModule

Script module instance with 49 methods — file ops, IPC, timing, dialogs, script management.

See `docs/pt-scriptmodule-deep.js` for the full test script.

### Key Methods

```javascript
// --- File Operations ---
_ScriptModule.getFileContents(path: string): string
_ScriptModule.getFileSize(path: string): number
_ScriptModule.getFileModificationTime(path: string): number
_ScriptModule.getFileCheckSum(path: string): string
_ScriptModule.writeTextToFile(path: string, content: string): void
_ScriptModule.copySrcFileToDestFile(src: string, dest: string): boolean

// Examples
var content = _ScriptModule.getFileContents("/Users/andresgaibor/pt-dev/runtime.js");
// → file contents string
_ScriptModule.getFileSize("/path/to/file");   // → byte count
_ScriptModule.getFileModificationTime("/path");  // → Unix timestamp
_ScriptModule.getFileCheckSum("/path");       // → SHA1 hash

// --- IPC ---
_ScriptModule.getIpcApi(): ipc               // → same as global `ipc`
_ScriptModule.getIpcApiAsync(arg1: any, arg2: any): Promise
_ScriptModule.ipcCall(className: string, method: string, args: Array): any
_ScriptModule.ipcObjectCall(className: string, method: string, args: Array): any
_ScriptModule.ipcSingleCall(className: string, method: string, args: Array): any
_ScriptModule.scriptCall(className: string, method: string, args: Array): any

// Example
_ScriptModule.ipcCall("PTNetwork", "getDeviceCount", []);

// --- Timing ---
_ScriptModule.setTimeout(fn: function, ms: number): number
_ScriptModule.setInterval(fn: function, ms: number): number
_ScriptModule.clearTimeout(id: number): void
_ScriptModule.clearInterval(id: number): void

// --- Debug ---
_ScriptModule.debug(msg: string): void
_ScriptModule.debugTrace(msg: string): void
_ScriptModule.debugLogged(handler: function): void
_ScriptModule.debugCleared(handler: function): void
_ScriptModule.getDebugLog(): string
_ScriptModule.clearDebug(): void
_ScriptModule.enableErrorOpen(enabled: boolean): void

// --- Dialog ---
_ScriptModule.getOpenFileName(filters?: any): string
_ScriptModule.getSaveFileName(filters?: any): string

// --- Script Management ---
_ScriptModule.addScriptFile(path: string, content: string): void
_ScriptModule.removeAllScripts(): void
_ScriptModule.addInterface(name: string, interfaceObj: object): void
_ScriptModule.removeAllInterfaces(): void

// --- Data Store ---
_ScriptModule.addScriptDataStore(id: string, data: object): void
_ScriptModule.getScriptDataStore(id: string): object
_ScriptModule.hasScriptDataStore(id: string): boolean
_ScriptModule.getScriptDataStoreIdList(): Array
_ScriptModule.removeScriptDataStore(id: string): void
_ScriptModule.removeAllScriptDataStores(): void

// --- Translation ---
_ScriptModule.translate(str: string): string
_ScriptModule.loadTranslator(locale: string): void

// --- Events ---
_ScriptModule.objectNameChanged(handler: function): void
_ScriptModule.starting(handler: function): void
_ScriptModule.started(handler: function): void
_ScriptModule.stopped(handler: function): void
_ScriptModule.registerIpcEventByID(event: string, handler: function): void
_ScriptModule.unregisterIpcEventByID(event: string): void
_ScriptModule.unregisterAllIpcEvents(): void

// --- Lifecycle ---
_ScriptModule.reset(): void
_ScriptModule.cleanUp(): void
```

Full 49-key enumeration available in `docs/pt-scriptmodule-deep.js`.

---

## Notes

- `this` in global scope = global object (use instead of `self`)
- `self` and `globalThis` are `undefined` in PT 9.0
- `$ipc` has arity 0 but requires arguments to call
- Data storage only handles strings — objects become `[object Object]`
- MD5 requires `new MD5()` → `.append(str)` → `.getHash()` + `.toHex()`
- `_ScriptModule.getIpcApi()` returns the same as global `ipc` — use `ipc` directly
- `ipc.systemFileManager()` methods are not enumerable (Object.keys returns empty) but all 50+ methods are callable directly
- UTF-8 decode via `arrayBuffer2Utf8Str` returns garbage bytes — encoding issue

---

## See Also

- `docs/PT-NETWORK-SERVERS.md` — Full HTTP/TCP/UDP/WebSocket API
- `docs/PT-API-COMPLETE.md` — PT IPC API (ipc.network, ipc.appWindow, etc.)
- `docs/PT9-Debugging.md` — Debugging approach
- `src/pt-api/pt-api-registry.ts` — Type definitions
