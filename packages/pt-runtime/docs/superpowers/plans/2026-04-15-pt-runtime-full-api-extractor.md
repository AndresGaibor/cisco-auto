# PT Runtime Full API Extractor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un extractor en Packet Tracer que vuelque la API real completa y jerárquica a consola, JSON y TXT, cubriendo clases, métodos, atributos, objetos hijos, módulos, procesos, puertos, eventos y serialización.

**Architecture:** Un script principal de PT hará la introspección profunda con `try/catch` por objeto y recorrerá la jerarquía por capas: runtime global, dispositivo, puerto, proceso, módulo y serialización. El resultado se emitirá en dos archivos complementarios, uno JSON estructurado para postprocesamiento y uno TXT legible para consulta rápida, con un resumen breve en consola.

**Tech Stack:** Packet Tracer QTScript ES5, `ipc`, `network`, `appWindow`, `systemFileManager`/`fm` si está disponible, `dprint()`/`print()`, salida `JSON` + `TXT`.

---

### Task 1: Definir contrato de salida y ruta de archivos

**Files:**
- Create: `packages/pt-runtime/scripts/pt-full-api-dump.js`
- Modify: `packages/pt-runtime/docs/PT-API-COMPLETE.md`
- Modify: `packages/pt-runtime/docs/PT-API.md`

- [ ] **Step 1: Define the output contract in code comments and constants**

```javascript
var CONFIG = {
  maxDepth: 8,
  maxDevices: 200,
  maxPortsPerDevice: 64,
  maxMethodsPerObject: 500,
  maxPropsPerObject: 500,
  outputBaseName: "pt-full-api-dump",
  writeJson: true,
  writeText: true,
  writeConsoleSummary: true
};
```

- [ ] **Step 2: Add an output schema block**

```javascript
var schemaExample = {
  kind: "device",
  name: "Router0",
  className: "Router",
  model: "2911",
  typeId: 0,
  uuid: "{...}",
  path: "devices[0]",
  props: [],
  methods: [],
  children: [],
  events: [],
  notes: []
};
```

- [ ] **Step 3: Document the new extractor in the runtime docs**

Add a short note in `PT-API-COMPLETE.md` and `PT-API.md` that the extractor emits JSON + TXT and is intended as the source of truth for missing runtime details.

- [ ] **Step 4: Verify the plan-level file paths are correct**

Confirm the script lives under `packages/pt-runtime/scripts/` so it can be pasted into PT or copied into `~/pt-dev/`.

### Task 2: Build safe reflection helpers

**Files:**
- Create: `packages/pt-runtime/scripts/pt-full-api-dump.js`

- [ ] **Step 1: Add defensive helpers for stringification and invocation**

```javascript
function safeString(value) {
  try { return String(value); } catch (e) { return "[unprintable]"; }
}

function safeCall(fn, fallback) {
  try { return fn(); } catch (e) { return fallback; }
}

function isFunction(v) {
  return typeof v === "function";
}

function isObject(v) {
  return v && typeof v === "object";
}
```

- [ ] **Step 2: Add helper functions to list own keys without crashing**

```javascript
function collectKeys(obj) {
  var keys = [];
  for (var key in obj) {
    try {
      keys.push(key);
    } catch (e) {}
  }
  return keys;
}
```

- [ ] **Step 3: Add helper functions to classify values**

```javascript
function describeValue(value) {
  if (value === null) return { type: "null", value: null };
  if (typeof value === "undefined") return { type: "undefined", value: undefined };
  if (typeof value === "function") return { type: "function", value: "[function]" };
  if (Array.isArray(value)) return { type: "array", value: value.length };
  if (typeof value === "object") return { type: "object", value: safeString(value) };
  return { type: typeof value, value: value };
}
```

- [ ] **Step 4: Verify helpers do not depend on prototype inspection**

Keep `Object.getPrototypeOf()` optional and wrapped in `try/catch` only for deeper analysis.

### Task 3: Extract runtime globals and core API objects

**Files:**
- Create: `packages/pt-runtime/scripts/pt-full-api-dump.js`

- [ ] **Step 1: Build the runtime root record**

```javascript
var dump = {
  meta: {
    generatedAt: new Date().toISOString(),
    version: null,
    platform: "Packet Tracer"
  },
  globals: {},
  objects: [],
  errors: []
};
```

- [ ] **Step 2: Capture `ipc`, `net`, `appWindow`, `fm`, and optional managers**

```javascript
function captureGlobalObjects() {
  var net = null;
  var appWindow = null;
  var fm = null;
  var globals = {};

  globals.ipc = typeof ipc !== "undefined" ? introspectObject(ipc, "ipc", 0) : null;
  if (ipc && isFunction(ipc.network)) net = safeCall(function() { return ipc.network(); }, null);
  if (ipc && isFunction(ipc.appWindow)) appWindow = safeCall(function() { return ipc.appWindow(); }, null);
  if (ipc && isFunction(ipc.systemFileManager)) fm = safeCall(function() { return ipc.systemFileManager(); }, null);

  return { globals: globals, net: net, appWindow: appWindow, fm: fm };
}
```

- [ ] **Step 3: Capture a short console summary**

Print counts for globals discovered, devices found, and objects inspected.

- [ ] **Step 4: Verify the capture does not assume any single global exists**

The script must still produce a partial dump if `fm` or `appWindow` is unavailable.

### Task 4: Introspect objects deeply and recursively

**Files:**
- Create: `packages/pt-runtime/scripts/pt-full-api-dump.js`

- [ ] **Step 1: Implement object introspection**

```javascript
function introspectObject(obj, label, depth, seen) {
  var record = {
    label: label,
    className: null,
    kind: null,
    methods: [],
    props: [],
    children: [],
    notes: []
  };
  if (!obj || depth > CONFIG.maxDepth) return record;
  if (!seen) seen = {};

  var uuid = safeCall(function() { return obj.getObjectUuid ? obj.getObjectUuid() : null; }, null);
  var seenKey = uuid || label;
  if (seen[seenKey]) return record;
  seen[seenKey] = true;

  record.className = safeCall(function() { return obj.getClassName ? obj.getClassName() : null; }, null);
  record.kind = typeof obj;
  return record;
}
```

- [ ] **Step 2: Collect properties, getters, setters, and function-valued members**

Separate results into:
- `methods` for callable members
- `props` for scalar values
- `children` for nested objects

- [ ] **Step 3: Add recursive child traversal for known hierarchies**

Traverse in this order:
- device ports
- device process objects
- root modules and module children
- CLI object
- app/window sub-objects when available

- [ ] **Step 4: Record notes for empty or suspicious surfaces**

Example notes:
- no CLI available
- no processes exposed
- `serializeToXml` present
- getter threw IPC error

### Task 5: Enumerate devices, ports, processes, and modules

**Files:**
- Create: `packages/pt-runtime/scripts/pt-full-api-dump.js`

- [ ] **Step 1: Iterate all devices from `net.getDeviceCount()`**

```javascript
for (var i = 0; i < deviceCount; i++) {
  var device = safeCall(function() { return net.getDeviceAt(i); }, null);
  if (device) {
    dump.objects.push(introspectDevice(device, i));
  }
}
```

- [ ] **Step 2: For each device, extract ports**

Capture for each port:
- `getName()`
- `getClassName()`
- `getIpAddress()` / `getSubnetMask()` when available
- `isPortUp()` / `isProtocolUp()` when available
- port-specific methods and enumerable properties

- [ ] **Step 3: For each device, extract processes**

Use `getProcess()` and, where available, object-specific process getters such as:
- `getDhcpServerProcessByPortName()`
- `getGoosePublisherProcessByPortName()`
- `getGooseSubscriberProcessByPortName()`
- `getProfinetProcessByPortName()`
- `getSvPublisherProcessByPortName()`
- `getSvSubscriberProcessByPortName()`

- [ ] **Step 4: For modular devices, extract `getRootModule()` trees**

Capture each module node recursively with:
- slot count
- slot types
- child module count
- child module records
- `addModuleAt` availability

- [ ] **Step 5: Record `serializeToXml()` output when available**

Store either the full XML or a safe truncated preview if the payload is too large for the console/text output.

### Task 6: Write both JSON and TXT outputs

**Files:**
- Create: `packages/pt-runtime/scripts/pt-full-api-dump.js`

- [ ] **Step 1: Build a JSON serializer**

```javascript
function toJsonFile(data) {
  return JSON.stringify(data, null, 2);
}
```

- [ ] **Step 2: Build a TXT renderer**

Render a readable tree like:
- runtime globals
- devices
- device children
- ports
- processes
- modules
- notes/errors

- [ ] **Step 3: Write both files if file manager exists**

Use `fm` or the available file API to write:
- `pt-full-api-dump.json`
- `pt-full-api-dump.txt`

- [ ] **Step 4: Fallback to console-only mode if file writing is unavailable**

Still print the summary and keep the full JSON object in a global variable for manual copy if needed.

### Task 7: Add dedupe, limits, and safety guards

**Files:**
- Create: `packages/pt-runtime/scripts/pt-full-api-dump.js`

- [ ] **Step 1: Add seen-object tracking**

Deduplicate by `uuid` first, then by `label + className`.

- [ ] **Step 2: Add depth and count caps**

Respect `maxDepth`, `maxDevices`, `maxPortsPerDevice`, `maxMethodsPerObject`, and `maxPropsPerObject`.

- [ ] **Step 3: Prevent getter storms**

Skip getters that are clearly expensive or recursive if they already caused an error once.

- [ ] **Step 4: Record errors without aborting the dump**

Every exception should become an entry in `dump.errors` with:
- object path
- member name
- error string

### Task 8: Validate against current documentation gaps

**Files:**
- Modify: `packages/pt-runtime/docs/PT-API-COMPLETE.md`
- Modify: `packages/pt-runtime/docs/PT-API.md`

- [ ] **Step 1: Compare extractor output to docs**

Use the new dump to find missing or incomplete sections in the docs.

- [ ] **Step 2: Add a short “coverage note” section**

Note that the extractor is the source of truth for future API additions.

- [ ] **Step 3: Add any confirmed missing surfaces**

Only document items confirmed by the dump, not assumptions.

- [ ] **Step 4: Keep documentation changes minimal**

Avoid large reformatting; add only the missing data.

### Task 9: Verification and smoke test

**Files:**
- Create: `packages/pt-runtime/scripts/pt-full-api-dump.js`
- Modify: `packages/pt-runtime/docs/PT-API-COMPLETE.md`
- Modify: `packages/pt-runtime/docs/PT-API.md`

- [ ] **Step 1: Run the script in PT on a known lab**

Verify the console shows:
- runtime globals discovered
- device count
- output file names
- total errors encountered

- [ ] **Step 2: Confirm both JSON and TXT files are written**

Expected files:
- `pt-full-api-dump.json`
- `pt-full-api-dump.txt`

- [ ] **Step 3: Inspect the JSON structure**

Verify it contains at least:
- `meta`
- `globals`
- `objects`
- `errors`

- [ ] **Step 4: Inspect the TXT tree**

Confirm it is readable and includes at least one device with ports, processes, and module info.

- [ ] **Step 5: Update docs with any confirmed gaps discovered in testing**

Only patch sections that the dump proves are incomplete.

## Self-Review Checklist

- [x] Scope is focused on one extractor system that can stand alone.
- [x] File paths are exact and match repository conventions.
- [x] Each task is bite-sized and actionable.
- [x] Output format is explicit for both JSON and TXT.
- [x] Safety constraints are included for PT runtime quirks.
- [x] Verification is included and produces evidence before claims.

## Notes

- This plan intentionally prefers completeness over tiny abstractions.
- The extractor is allowed to stay in one script if that keeps PT-side execution simpler.
- If `fm` is unavailable in the PT runtime, the implementation should still produce a console summary and an in-memory JSON object.
