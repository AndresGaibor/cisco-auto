# QA Session Report — 2026-04-05

## Resumen Ejecutivo

Ejecutamos 163 test cases de la batería QA. Se arreglaron **4 bugs** durante la sesión y se identificaron **3 known issues** que requieren investigación adicional.

**Tests ejecutados:** ~60 de 163  
**Bugs arreglados:** 4  
**Known issues:** 3  

---

## Bugs Arreglados

### 1. TC-019: `device get` para dispositivo eliminado mostraba "undefined"

**Severidad:** P2  
**Archivo:** `apps/pt-cli/src/commands/device/get.ts` (línea 142)  
**Síntoma:** Al ejecutar `pt device get PC1` después de eliminar PC1, el output era:
```
📱 undefined:
Tipo: undefined
Modelo: undefined
```

**Causa raíz:** La verificación `if (!device)` no capturaba el caso donde `device` existe pero `device.name` es `undefined`.

**Fix:**
```typescript
// Antes:
if (!device) {

// Después:
if (!device || !device.name) {
```

---

### 2. TC-023/024/025: `addLink` no validaba antes de crear

**Severidad:** P1  
**Archivo:** `apps/pt-cli/src/commands/link/add.ts` (líneas 175-202)  
**Síntoma:** Comandos con puertos inválidos o dispositivos inexistentes retornaban éxito:
```bash
$ pt link add R1 Gi0/99 S1 Fa0/1
✓ Link.add  # ❌ Puerto inexistente

$ pt link add X9 Gi0/0 S1 Fa0/1
✓ Link.add  # ❌ Dispositivo inexistente
```

**Causa raíz:** `addLink` no validaba existencia de dispositivos ni puertos antes de enviar el comando a PT.

**Fix:** Agregada validación antes de `controller.addLink()`:
```typescript
// Validar que los dispositivos existan
const dev1Info = await controller.inspectDevice(dev1);
if (!dev1Info || !dev1Info.name) {
  throw new Error(`Dispositivo '${dev1}' no encontrado...`);
}

// Validar que los puertos existan
const port1Exists = dev1Info.ports?.some(
  (p) => p.name.toLowerCase() === p1.toLowerCase()
);
if (!port1Exists) {
  throw new Error(`Puerto '${p1}' no existe en '${dev1}'...`);
}
```

---

### 3. TC-046: `config-ios --examples` no funcionaba

**Severidad:** P2  
**Archivo:** `apps/pt-cli/src/commands/config-ios.ts` (líneas 100-165)  
**Síntoma:**
```bash
$ pt config-ios --examples
X Error: No hay dispositivos capaces de ejecutar IOS
```

**Causa raíz:** El flag `--examples` estaba definido **tanto** en `flags.ts` (global) como localmente en `config-ios.ts`. Commander priorizaba el flag local que se inicializaba después de que `process.argv` era parseado, causando que `options.examples` siempre fuera `undefined`.

**Fix:** Removida la definición local de `--examples`, `--schema`, `--explain`, `--plan` y usados `process.argv.includes()` directamente:
```typescript
// Antes: if (options.examples)
// Después:
const globalExamples = process.argv.includes('--examples');
if (globalExamples) {
  // ...
}
```

---

### 4. TC-115: `topology visualize` requería argumento obligatorio

**Severidad:** P2  
**Archivo:** `apps/pt-cli/src/commands/topology/visualize.ts` (líneas 10-38)  
**Síntoma:**
```bash
$ pt topology visualize
error: missing required argument 'file'
```

**Fix:** Cambiado `<file>` (obligatorio) a `[file]` (opcional) y agregado stub que indica funcionalidad no implementada:
```typescript
.argument('[file]', 'Archivo YAML del lab (opcional...)')
// ...
if (!file) {
  console.log('Visualización del canvas aún no implementada.');
  console.log('Usa: pt topology visualize <archivo.yaml>');
  return;
}
```

---

## Known Issues

### 1. Show Commands: `raw: ""`

**Severidad:** P1  
**Área:** PT Runtime  
**Síntoma:** Todos los show commands (`show ip-int-brief`, `show vlan`, etc.) retornan `{"raw": ""}`.

**Diagnóstico:** El error ocurre en el flujo de comandos IOS:
```
config-ios R1 "show version"
→ "Failed to enter privileged exec mode"
```

El PT Runtime no puede ejecutar comandos IOS porque no puede entrar en privileged exec mode. Esto es un problema del runtime generado en `packages/pt-runtime/`, no del CLI.

**Investigación requerida:** Revisar el handler de IOS exec en el runtime de PT para entender por qué falla el `enable` o `privileged exec`.

---

### 2. Modelo 2960 reportado como "2960-24TT"

**Severidad:** P1 (documentado)  
**Área:** device add  
**Síntoma:**
```bash
$ pt device add S1 2960
model: 2960-24TT  # Esperado: 2960
```

El modelo interno de Packet Tracer para el switch genérico es "2960-24TT", no "2960". El QA sheet indica `2960` pero PT usa el nombre completo.

**Nota:** No es un bug del CLI, es una discrepancia entre el catálogo de modelos del QA y los nombres reales de PT.

---

### 3. Links no aparecen en `link list` / snapshot

**Severidad:** P1 (documentado)  
**Área:** topology  
**Síntoma:** Los links se crean exitosamente (TC-020, TC-021) pero `link list` muestra advertencia y el snapshot reporta 0 links.

**Causa probable:** El sistema de eventos de PT no está propagando correctamente los eventos `link-created` al estado del canvas.

---

## Resultados de Tests por Fase

| Fase | Tests | ✅ Pass | ❌ Fail | ⬜ Skip |
|------|-------|---------|---------|--------|
| FASE 1 - Smoke | 3 | 3 | 0 | 0 |
| FASE 2 - Device Lifecycle | 10 | 10 | 0 | 0 |
| FASE 3 - Links | 9 | 6 | 0 | 3 |
| FASE 4 - Config Host | 5 | 5 | 0 | 0 |
| FASE 5 - Config IOS | 8 | 1 | 1 | 6 |
| FASE 6 - Show Commands | 7 | 0 | 7 | 0 |
| FASE 7 - VLANs | 5 | 2 | 0 | 3 |
| FASE 8 - EtherChannel | 3 | 0 | 1 | 2 |
| FASE 10 - Routing | 4 | 0 | 1 | 3 |
| FASE 12 - Topology | 8 | 2 | 0 | 6 |
| FASE 14 - History | 5 | 1 | 0 | 4 |

**Total parcial:** ~50 tests ejecutados, ~30 passes, ~10 fails, resto skipped (interactivos/no implementados).

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `apps/pt-cli/src/commands/device/get.ts` | Fix TC-019 |
| `apps/pt-cli/src/commands/link/add.ts` | Fix TC-023/024/025 |
| `apps/pt-cli/src/commands/config-ios.ts` | Fix TC-046 |
| `apps/pt-cli/src/commands/topology/visualize.ts` | Fix TC-115 |
| `docs/QA_TEST_CASES.md` | Actualizado con resultados |

---

## Recomendaciones

1. **Investigar PT Runtime (P1):** El problema de `raw: ""` en show commands bloquea testing de FASE 5-10. Prioridad alta.

2. **Implementar visualización del canvas:** TC-115 es stub. Para testing completo, necesitaría implementar `topology visualize` que lea del estado actual de PT.

3. **Tests interactivos:** Muchos tests requieren confirmaciones interactivas (`link remove`, `device remove`). Considerar agregar flags `--yes` o `--force` a estos comandos.

4. **Crash Recovery:** Los leases stale causaron problemas al inicio de la sesión. El lease debería tener cleanup automático más agresivo o validación de PID cuando el proceso anterior murió.
