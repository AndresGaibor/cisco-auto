# 🧪 PT HACKING COOKBOOK: Técnicas de Bypass
Este documento detalla cómo saltar los bloqueos de seguridad de Cisco en Packet Tracer 9.0.

## 1. El Bypass de Serialización (Siphon-Over-String)
**Problema:** PT bloquea el envío de Arrays u Objetos anidados por IPC.
**Solución:** Convertir todo a un String plano con delimitadores únicos.
```javascript
// Dentro del eval de PT
var out = ["Router0:::192.168.1.1", "PC0:::192.168.1.10"];
return out.join("|||"); // Devuelve un string seguro
```

## 2. El Wizard Breaker (IOS Escape)
**Problema:** Los equipos nuevos se bloquean en el diálogo "yes/no".
**Solución:** Forzar un `enterCommand("")` (Enter) o enviar `"no"` antes de cualquier configuración.
```javascript
cli.enterCommand("no");
cli.enterCommand(""); // Para asegurar el prompt Router>
```

## 3. El Backdoor de Evaluación Nativa (`__evaluate`)
**Problema:** `deepInspect` está limitado por la estructura de `ipc`.
**Solución:** Usar el comando de backdoor que inyecta código directamente en el motor global.
- **Root Acceso:** `ipc.network()`
- **System Acceso:** `AssessmentModel`, `Simulation`

## 4. El "Grito de C++" (`dprint` Debugging)
**Problema:** Errores `[object Object]` que ocultan la causa real.
**Solución:** Usar `dprint()` para que el Kernel escriba el error directamente en el **Activity Log** visual de Packet Tracer.
```javascript
try { ... } catch(e) { dprint("FATAL: " + e); }
```

## 5. El Ataque Rosetta (Diccionario)
**Problema:** Los métodos no son enumerables (invisibles para `Object.keys`).
**Solución:** Cargar la lista de 18k nombres y probarlos uno por uno contra el objeto.
