# 📦 PT Control V2 - Modelos de Dispositivos Soportados

## Catálogo Oficial de Modelos

Esta documentación lista todos los modelos de dispositivos **VERIFICADOS** en Packet Tracer 9.0.0 con PT Control V2.

---

## ⚠️ IMPORTANTE: Catálogo vs Realidad

La fuente activa de modelos Packet Tracer verificados está en `packages/pt-runtime/src/verified-models.ts` y/o en los catálogos públicos exportados por los paquetes activos. No existe `packages/core/src/catalog/` en el workspace actual.

**Ejemplo crítico:**
- Catálogo: `2960-24TT-L` ❌ NO funciona en PT
- Verificado: `2960-24TT` ✅ SÍ funciona en PT

**Este documento usa SOLO modelos verificados empíricamente en PT 9.0.0.**

---

## 🎯 Modelos por Categoría

### **Routers** (deviceType: 0) ✅

| Modelo Exacto | Alias | Puertos Típicos | Estado | Notas |
|--------------|-------|-----------------|--------|-------|
| `2811` | - | 3x FE, 4x HWIC | ✅ VERIFICADO | **Recomendado para labs** |
| `2911` | - | 3x GE, 3x EHWIC | ✅ VERIFICADO | **Recomendado para labs** |
| `1841` | - | 2x FE, 2x HWIC | ✅ VERIFICADO | Router modular básico |
| `1941` | - | 3x GE, 2x EHWIC | ✅ VERIFICADO | Reemplazo de 1841 |
| `2901` | - | 3x GE, 3x EHWIC | ✅ VERIFICADO | Similar a 2911 |
| `4331` | - | 3x GE, 3x NIM | ✅ VERIFICADO | Router de alto rendimiento |

**Ejemplo de uso:**
```typescript
bridge.sendCommand("addDevice", {
  model: "2911",  // o "2811", "1841", "1941"
  name: "R1",
  x: 100,
  y: 100
});
```

---

### **Switches** (deviceType: 1) ⚠️

| Modelo Exacto | Alias | Puertos | Capas | Estado | Notas |
|--------------|-------|---------|-------|--------|-------|
| `2960-24TT` | `2960`, `2960-24` | 24x FE + 2x GE | L2 | ✅ VERIFICADO | **Recomendado** |
| `2960-24TC` | `2960-24tc` | 24x FE + 2x GE T/RJ45 | L2 | ✅ VERIFICADO | Combo ports |
| `3560-24PS` | `3560`, `3560-24` | 24x FE + 4x SFP | L3 | ❌ NO VERIFICADO | Puede no existir en tu PT |
| `2950-24` | `2950` | 24x FE | L2 | ✅ VERIFICADO | Switch legacy |

**Ejemplo de uso:**
```typescript
// ✅ CORRECTO - Modelo verificado
bridge.sendCommand("addDevice", {
  model: "2960-24TT",  // o alias "2960"
  name: "SW1",
  x: 150,
  y: 250
});

// ❌ INCORRECTO - NO usa modelo verificado de Packet Tracer
bridge.sendCommand("addDevice", {
  model: "2960-24TT-L"  // NO funciona en PT
});
```

**⚠️ Importante:**
- Usar `2960-24TT` (sin la "L" final)
- El sistema auto-mapea `2960` → `2960-24TT`
- `3560-24PS` puede no estar disponible en todas las versiones de PT

---

### **Wireless** (deviceType: 6) ⚠️

| Modelo Exacto | Alias | Tipo | Estado | Notas |
|--------------|-------|------|--------|-------|
| `WRT300N` | `wrt300n`, `wireless`, `wr` | Wireless Router | ❌ NO VERIFICADO | Puede no existir en tu PT |
| `AccessPoint-PT` | `ap`, `accesspoint` | Access Point | ✅ VERIFICADO | AP básico |

**Ejemplo de uso:**
```typescript
// Access Point (verificado)
bridge.sendCommand("addDevice", {
  model: "AccessPoint-PT",  // o "ap"
  name: "AP1",
  x: 300,
  y: 100
});

// Wireless Router (puede no funcionar)
bridge.sendCommand("addDevice", {
  model: "WRT300N",  // o "wireless"
  name: "WR1",
  x: 450,
  y: 150
});
```

---

### **End Devices** (deviceType: 3, 4, 5, 8) ✅

| Modelo Exacto | Alias | deviceType | Estado | Notas |
|--------------|-------|------------|--------|-------|
| `PC-PT` | `pc` | 3 (pc) | ✅ VERIFICADO | PC básico |
| `Laptop-PT` | `laptop` | 3 (pc) | ✅ VERIFICADO | Laptop con wireless |
| `Server-PT` | `server` | 4 (server) | ✅ VERIFICADO | Server básico |
| `Printer-PT` | `printer` | 5 (printer) | ✅ VERIFICADO | Impresora de red |

**Ejemplo de uso:**
```typescript
// PC
bridge.sendCommand("addDevice", {
  model: "PC-PT",  // o "pc"
  name: "PC1",
  x: 50,
  y: 400
});

// Server
bridge.sendCommand("addDevice", {
  model: "Server-PT",  // o "server"
  name: "SRV1",
  x: 250,
  y: 400
});
```

---

### **Cloud** (deviceType: 7) ✅

| Modelo Exacto | Alias | Estado | Notas |
|--------------|-------|--------|-------|
| `Cloud-PT` | `cloud` | ✅ VERIFICADO | Nube para conectar a Internet |

---

## 🔄 Mapeo de Alias (Auto-Generated)

El sistema incluye un mapeo automático generado desde `generate-model-map.ts`:

```typescript
var PT_MODEL_MAP = {
  // Switches
  "2960": "2960-24TT",      // ✅ Verificado
  "2960-24": "2960-24TT",
  "2960-24tt": "2960-24TT",
  "2960-24tc": "2960-24TC",
  "3560": "3560-24PS",      // ⚠️ Puede no funcionar
  "3560-24": "3560-24PS",
  
  // Wireless
  "wrt300n": "WRT300N",     // ⚠️ Puede no funcionar
  "wireless": "WRT300N",
  "wr": "WRT300N",
  
  // Routers
  "2811": "2811",           // ✅ Verificado
  "2911": "2911",           // ✅ Verificado
  "1841": "1841",
  "1941": "1941",
  
  // End devices
  "pc": "PC-PT",            // ✅ Verificado
  "laptop": "Laptop-PT",
  "server": "Server-PT",
  "printer": "Printer-PT",
  "cloud": "Cloud-PT",
  "ap": "AccessPoint-PT"
};
```

---

## ❌ Errores Comunes

### 1. "Invalid arguments for IPC call addDevice"

**Causa:** Usar modelo no verificado en PT.

**Solución:** Usar modelos verificados:
```typescript
// ❌ INCORRECTO - Modelo que NO funciona en PT
model: "2960-24TT-L"  // No existe en PT

// ✅ CORRECTO - Modelo verificado en PT 9.0.0
model: "2960-24TT"    // Sin la "L" final
```

### 2. "Failed to add device for model"

**Causa:** Modelo no disponible en tu versión de PT.

**Solución:** Verificar modelos disponibles en tu PT:
```bash
# Listar dispositivos en tu PT
bun run pt device list

# O usar el script de topología
bun run scripts/topologia-apply.ts
```

---

## 📋 Lista Completa de Modelos Verificados

### ✅ Confirmados en PT 9.0.0:

```
Routers:
  1841, 1941, 2811, 2901, 2911, 4331

Switches:
  2950-24, 2950T-24
  2960-24TT, 2960-24TC
  3650-24PS

Wireless:
  AccessPoint-PT

End Devices:
  PC-PT, Laptop-PT, Server-PT, Printer-PT

Cloud:
  Cloud-PT
```

### ⚠️ Pueden NO estar disponibles:

```
Switches:
  3560-24PS  (puede no existir en PT 9.0.0)

Wireless:
  WRT300N    (puede no existir en PT 9.0.0)
```

---

## 🔧 Agregar Nuevos Modelos Verificados

Si descubres modelos que funcionan en tu PT, agrégalos a:

`packages/pt-runtime/src/scripts/generate-model-map.ts`

```typescript
const VERIFIED_PT_MODELS: Record<string, string> = {
  // Agregar aquí modelos verificados
  'nuevo-modelo': 'Nuevo-Modelo',
  // ...
};
```

Luego regenerar:
```bash
cd packages/pt-runtime
bun run generate
cp ../generated/runtime.js /Users/andresgaibor/pt-dev/runtime.js
```

---

## 🔗 Documentos Relacionados

- [PT_CONTROL_ARCHITECTURE.md](./PT_CONTROL_ARCHITECTURE.md) - Arquitectura del sistema
- [PT_CONTROL_HANDLERS.md](./PT_CONTROL_HANDLERS.md) - Referencia de handlers
- [PT_CONTROL_TROUBLESHOOTING.md](./PT_CONTROL_TROUBLESHOOTING.md) - Troubleshooting
- [MEJORAS_REPORT.md](./MEJORAS_REPORT.md) - Reporte de mejoras implementadas
