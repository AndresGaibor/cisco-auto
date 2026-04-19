# PT-Safe Build - Fase 6

> Validación obligatoria para asegurar que el código generado es seguro para ejecutar dentro del Script Engine de Packet Tracer.

## 1. Validación ES5-Safe

Qt Script (el motor JavaScript de PT) soporta **ECMAScript 5** con extensiones de Qt. Toda sintaxis posterior a ES5 debe ser rechazada en tiempo de build.

### 1.1 Patrones prohibidos

```javascript
// ❌ IMPORT/EXPORT (ES6 modules)
import { something } from './module';
export const x = 1;

// ✅ Alternativa PT-safe
var something = require('./module');
var x = 1;
```

```javascript
// ❌ CLASS (ES6)
class MyClass {
  constructor() {}
}

// ✅ Alternativa PT-safe
function MyClass() {}
MyClass.prototype.constructor = function() {};
```

```javascript
// ❌ LET/CONST (ES6)
let x = 1;
const y = 2;

// ✅ Alternativa PT-safe
var x = 1;
var y = 2;
```

```javascript
// ❌ ARROW FUNCTIONS (ES6)
const fn = (x) => x * 2;
array.map((x) => x + 1);

// ✅ Alternativa PT-safe
var fn = function(x) { return x * 2; };
array.map(function(x) { return x + 1; });
```

```javascript
// ❌ TEMPLATE LITERALS (ES6)
var str = `Hello ${name}`;

// ✅ Alternativa PT-safe
var str = 'Hello ' + name;
```

```javascript
// ❌ ASYNC/AWAIT (ES8)
async function fetchData() {
  var result = await fetch(url);
}

// ✅ Alternativa PT-safe
function fetchData() {
  return fetch(url).then(function(result) {
    // handler
  });
}
```

```javascript
// ❌ GENERATORS (ES6)
function* gen() {
  yield 1;
}

// ❌ PT no soporta yield
```

```javascript
// ❌ OPTIONAL CHAINING (ES11)
var x = obj?.foo?.bar;

// ❌ PT no soporta ?
```

```javascript
// ❌ NULLISH COALESCING (ES11)
var x = obj.value ?? 'default';

// ❌ PT no soporta ??
```

```javascript
// ❌ PROMISE, MAP, SET (ES6)
var promise = new Promise(resolve => resolve(1));
var map = new Map();
var set = new Set();

// ✅ Alternativa PT-safe
// - Para async, usar callbacks
// - Para Map/Set, usar objetos plain o arrays
```

### 1.2 Regex de detección de patrones prohibidos

```javascript
// Patrones a detectar en lint/build gate

const ES6_PATTERNS = [
  /\bimport\s*\{/,           // import { x }
  /\bexport\s*(default|const|let|class|function)/,  // export const, export class
  /\blet\s+/,                // let variable
  /\bconst\s+/,              // const variable
  /=>\s*[{(]/,               // arrow functions
  /`[^`]*\$\{[^}]+\}[^`]*`/, // template literals
  /\basync\s+(function|\()/i, // async function
  /\bawait\s+/,              // await
  /\bclass\s+\w+/,           // class declaration
  /\byield\s+/,              // yield
  /\?\.[a-z]/i,              // optional chaining
  /\?\?/,                    // nullish coalescing
  /\bnew\s+(Promise|Map|Set)\b/, // new Promise/Map/Set
  /\bSymbol\b/,              // Symbol
  /\bWeakMap\b/,             // WeakMap
  /\bWeakSet\b/,             // WeakSet
];

// En build gate: si cualquier patrón matchea, REJECT con error
```

## 2. Validación PT-Safe

### 2.1 Node.js globals prohibidos

```javascript
// ❌ GLOBALS NODE.JS (no existen en Qt Script)
process        // No existe
Buffer         // No existe
require        // Solo si es require de CommonJS (PT usa su propio require)
module         // No existe
exports        // No existe
__dirname      // No existe
__filename     // No existe
global         // No existe
```

### 2.2 Dependencias no PT-Safe

- **fs, path, os, child_process** — No disponibles en Qt Script
- **crypto, stream, zlib** — No disponibles
- **Any npm package** — No resuelto por PT

### 2.3 Referencias no resueltas

```javascript
// ❌ Referencia a símbolo no definido
var x = SOME_UNDEFINED_GLOBAL;

// ✅ Verificar que todos los globals usados estén definidos
if (typeof SOME_UNDEFINED_GLOBAL !== 'undefined') {
  // safe access
}
```

### 2.4 Orden de símbolos

PT inlinea assets en el Script Engine. El orden de definición importa:

```javascript
// ❌ Orden problemático
var b = a;        // a referenced before definition
var a = 'value';

// ✅ Orden correcto
var a = 'value';
var b = a;
```

## 3. Gate de Build Obligatorio

**Este NO es un warning — es un gate de build.**

```
┌─────────────────────────────────────────────────────────┐
│  SI el código contiene cualquier patrón prohibido,       │
│  el build DEBE fallar con error explícito.               │
│  NO se permite --force ni ignorable por config.          │
└─────────────────────────────────────────────────────────┘
```

### 3.1 Implementación del gate

```javascript
// En build/validate-pt-safe.js

function validatePTSafe(code, filename) {
  var errors = [];

  // 1. Detectar patrones ES6+
  ES6_PATTERNS.forEach(function(pattern) {
    var match = pattern.test(code);
    if (match) {
      errors.push({
        type: 'ES6_FEATURE',
        pattern: pattern.toString(),
        file: filename
      });
    }
  });

  // 2. Detectar Node globals
  NODE_GLOBALS.forEach(function(global) {
    var pattern = new RegExp('\\b' + global + '\\b');
    if (pattern.test(code)) {
      errors.push({
        type: 'NODE_GLOBAL',
        global: global,
        file: filename
      });
    }
  });

  // 3. Si hay errores, THROW (no warn, no continue)
  if (errors.length > 0) {
    throw new Error('PT-Safe validation failed:\n' +
      JSON.stringify(errors, null, 2));
  }

  return true;
}
```

### 3.2 Integración en build pipeline

```javascript
// En el generator o bundler
function buildForPT(source) {
  var code = transpile(source);  // Si se usa transpilación
  validatePTSafe(code, source.filename);
  inlineAssets(code);
  return code;
}
```

## 4. Checklist de validación PT-Safe

```
□ Sin import/export
□ Sin class
□ Sin let/const
□ Sin arrow functions
□ Sin template literals
□ Sin async/await
□ Sin generators
□ Sin optional chaining (?.)
□ Sin nullish coalescing (??)
□ Sin Promise/Map/Set
□ Sin process/Buffer/module/exports
□ Sin require de CommonJS (solo require de PT)
□ Sin referencias a globals undefined
□ Sin orden de símbolos que rompa inline
```

## 5. Testing del validator

```javascript
// Test: asegurar que patterns prohibidos son detectados

var testCases = [
  { code: 'let x = 1', shouldFail: true },
  { code: 'const y = 2', shouldFail: true },
  { code: '(x) => x * 2', shouldFail: true },
  { code: 'var x = `hello ${name}`', shouldFail: true },
  { code: 'class Foo {}', shouldFail: true },
  { code: 'async function f() {}', shouldFail: true },
  { code: 'var x = obj?.foo', shouldFail: true },
  { code: 'var x = a ?? "default"', shouldFail: true },
  { code: 'var x = process.env.NODE_ENV', shouldFail: true },
  { code: 'var x = 1', shouldFail: false },
  { code: 'function foo() { return 1; }', shouldFail: false },
];

testCases.forEach(function(tc) {
  try {
    validatePTSafe(tc.code, 'test.js');
    if (tc.shouldFail) {
      throw new Error('Should have failed: ' + tc.code);
    }
  } catch (e) {
    if (!tc.shouldFail) {
      throw new Error('Should not have failed: ' + tc.code);
    }
  }
});
```
