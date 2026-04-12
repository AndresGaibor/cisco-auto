# Lecciones Aprendidas - PT Control Runtime

## Bugs Fixes Implementados

### Bug 1: Error detection en output histórico

**Problema**: El código verificaba errores (`% Invalid`, `% Incomplete`, `% Unknown`) en TODO el output del terminal (`output`), no solo en el output del comando actual.

**Síntoma**: Comandos IOS que deberían funcionar fallaban con `ok=false` porque el output histórico contenía errores de comandos anteriores.

**Causa raíz**: 
- `output = fullOutput` sobrescribía el valor en cada iteración
- Al final del loop, `output` solo contenía el último `newData`, no el output acumulado
- El check de errores usaba `output` en vez del output real del comando

**Fix**: Crear variable separada `commandOutput` que acumula el output del comando actual:

```javascript
var commandOutput = "";
// En cada iteración:
if (newData.length > 0) {
  engine.processEvent({ type: 'outputWritten', data: newData });
  commandOutput += newData;  // Acumular, no sobrescribir
  preLen = fullOutput.length;
  output = fullOutput;
}
// Verificar errores en commandOutput, no en output
var hasErrorInCommandOutput = commandOutput.indexOf("% Invalid") >= 0 ...
```

**Archivo**: `packages/pt-runtime/src/templates/ios-config-handlers-template.ts`

---

### Bug 2: Detección de submodes de configuración

**Problema**: El router se quedaba atascado en submodes como `(dhcp-config)`, `(config-if)`, etc. La función `ensureConfigMode` no podía entrar a modo config porque estos submodes no permiten `configure terminal`.

**Síntoma**: 
- Comandos como `ip dhcp pool VLAN10` dejaban el router en `(dhcp-config)#`
- Intentos subsecuentes de configurar fallaban porque el router estaba atascado
- El prompt `R1(dhcp-config)#` contiene `(config` entonces la función pensaba que ya estaba en config mode

**Causa raíz**: 
- `currentPrompt.indexOf('(config)')` retorna true para `(dhcp-config)`
- Pero `(dhcp-config)` es un submode que NO es el modo config normal
- Desde `(dhcp-config)` no se puede ejecutar `configure terminal`

**Fix**: Función `isConfigSubmode()` que detecta patrones específicos:

```javascript
function isConfigSubmode(prompt) {
  var p = String(prompt || '');
  // Match (dhcp-config), (vlan-config), (config-if), etc.
  // pero NO plain (config) que es el modo normal
  return /\([a-zA-Z0-9\-]+-config\)/.test(p) || 
         /\(config-[a-zA-Z0-9\-]+\)/.test(p);
}
```

Y usar esta función en `ensurePrivilegedExec` y `ensureConfigMode` para detectar y salir de cualquier submode antes de intentar entrar a config.

---

### Bug 3: Verificación de stillInConfigMode incorrecta

**Problema**: Después de ejecutar un comando como `ip dhcp pool VLAN10`, el router entra al submode `dhcp-config`. El check `currentPrompt.indexOf("(config") >= 0` retornaba false porque `(dhcp-config)` no contiene la cadena literal `"(config"`.

**Síntoma**: `stillInConfig=false` aunque el comando succeeded y el router está en `dhcp-config`.

**Fix**: Usar `isConfigSubmode()` junto con el check original:

```javascript
var stillInConfigMode = isConfigSubmode(currentPrompt) || 
                        currentPrompt.indexOf("(config") >= 0;
```

---

### Bug 4: Variables no actualizadas después de `end`

**Problema**: En `ensureConfigMode`, después de enviar `end` para salir de un submode, el código usaba variables `state` y `currentPrompt` obtenidas ANTES del `end`.

**Fix**: Obtener新鲜的 valores después de cada operación:

```javascript
// Después de enviar 'end':
for (var exitAttempt = 0; exitAttempt < 10; exitAttempt++) {
  var exitPrompt = term.getPrompt ? term.getPrompt() : '';
  if (exitPrompt.indexOf('#') >= 0 && exitPrompt.indexOf('(') < 0) {
    currentPrompt = exitPrompt;  // Actualizar
    engine.processEvent({ type: 'modeChanged', newMode: 'priv-exec' });
    break;
  }
}
```

---

## Arquitectura del Runtime

### Flujo de handleConfigIos

1. **Detectar modo inicial**: Leer prompt del terminal
2. **ensurePrivilegedExec**: Si no está en priv-exec, entrar
3. **ensureConfigMode**: Si no está en config mode (o submodes), entrar
4. **Ejecutar comandos**: Para cada comando:
   - Enviar comando
   - Esperar a que termine (detectar prompt回来)
   - Verificar que no hay errores en el output
   - Verificar que aún estamos en un modo de configuración
5. **Guardar**: Si `save !== false`, ejecutar `write memory`

### submodes Detectados

El regex `isConfigSubmode` detecta:
- `(dhcp-config)` - modo pool DHCP
- `(vlan-config)` - modo configuración VLAN
- `(config-if)` - modo interfaz
- `(config-line)` - modo línea
- Cualquier submode de configuración

### Detección de Modo desde Prompt

```javascript
function inferModeFromPrompt(prompt) {
  var p = String(prompt || '');
  p = p.trim();
  if (p.indexOf('(config') >= 0) return 'config';
  if (p.indexOf('#') >= 0) return 'priv-exec';
  if (p.indexOf('>') >= 0) return 'user-exec';
  return '';
}
```

**Importante**: `indexOf` es más confiable que regex para estas detecciones.

---

## Estado del Lab DHCP (Abril 2026)

### Topología Configurada

```
                    ┌─────────────────┐
                    │     R1          │
                    │   2911 Router   │
                    │                 │
                    │ Gi0/0.10 ─┬────┼───── Gi0/0.20 ── Gi0/0.30
                    │ 192.168.10.1     │  192.168.20.1     │ 192.168.30.1
                    └──────┬──────────┴──────────┬─────────┘
                           │                     │
                      Gi0/1 (trunk)       Gi0/2 (trunk)
                           │                     │
                    ┌──────▼────────────────────▼──────────┐
                    │              SW1                      │
                    │         2960-24TT Switch              │
                    │                                        │
                    │ Fa0/1,2 (VLAN10)                       │
                    │ Fa0/3,4 (VLAN20)                       │
                    │ Fa0/5,6 (VLAN30)                       │
                    └────────────────────────────────────────┘
```

### R1 (Router 2911) - Configurado ✅
```
hostname R1
!
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.0
 no shutdown
!
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
!
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
!
interface GigabitEthernet0/0.30
 encapsulation dot1Q 30
 ip address 192.168.30.1 255.255.255.0
!
ip dhcp excluded-address 192.168.10.1 192.168.10.10
ip dhcp excluded-address 192.168.20.1 192.168.20.10
ip dhcp excluded-address 192.168.30.1 192.168.30.10
!
ip dhcp pool VLAN10
 network 192.168.10.0 255.255.255.0
 default-router 192.168.10.1
!
ip dhcp pool VLAN20
 network 192.168.20.0 255.255.255.0
 default-router 192.168.20.1
!
ip dhcp pool VLAN30
 network 192.168.30.0 255.255.255.0
 default-router 192.168.30.1
```

### SW1 (Switch 2960-24TT) - Configurado ✅
```
hostname SW1-TEST
!
vlan 10,20,30,40,50,60
!
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
!
interface FastEthernet0/2
 switchport mode access
 switchport access vlan 10
!
interface FastEthernet0/3
 switchport mode access
 switchport access vlan 20
!
interface FastEthernet0/4
 switchport mode access
 switchport access vlan 20
!
interface FastEthernet0/5
 switchport mode access
 switchport access vlan 30
!
interface FastEthernet0/6
 switchport mode access
 switchport access vlan 30
!
interface GigabitEthernet0/1
 switchport mode trunk
!
interface GigabitEthernet0/2
 switchport mode trunk
```

### PCs - Pendiente Verificación Manual
| PC  | VLAN | Pool DHCP    | Gateway       |
|-----|------|--------------|---------------|
| PC1 | 10   | 192.168.10.x | 192.168.10.1 |
| PC2 | 10   | 192.168.10.x | 192.168.10.1 |
| PC3 | 20   | 192.168.20.x | 192.168.20.1 |
| PC4 | 20   | 192.168.20.x | 192.168.20.1 |
| PC5 | 30   | 192.168.30.x | 192.168.30.1 |
| PC6 | 30   | 192.168.30.x | 192.168.30.1 |

### Verificación Manual Requerida
1. Abrir Packet Tracer
2. En cada PC: Desktop → IP Configuration → DHCP
3. Verificar que obtienen IP del pool correspondiente
4. Hacer ping entre PCs de diferentes VLANs (debería fallar sin router)
5. Hacer ping al gateway (debería funcionar)

---

## Notas de Implementación

### Por qué `indexOf` en vez de regex

El template string de JavaScript puede corromper regex con backslashes. Por ejemplo:
```javascript
// En el template:
/\(config[^\)]*\)#\s*$/

// Se convierte a:
/(config[^)]*)#s*$/
```

Los backslashes se pierden. Por eso se usa `indexOf()` que es más robusto.

### Timing Issues

Los comandos IOS necesitan tiempo entre ellos. Si se envían demasiado rápido:
- El router puede no haber terminado de procesar el comando anterior
- El prompt puede no estar listo

**Solución**: Pausas de 3-5 segundos entre comandos cuando hay errores.

### Hot Reload

El runtime se recarga automáticamente cuando cambia `runtime.js` (verificado por mtime). Para forzar recarga:
```bash
touch ~/pt-dev/runtime.js
```

---

## Archivos Modificados

1. `packages/pt-runtime/src/templates/ios-config-handlers-template.ts`
   - Función `isConfigSubmode()` agregada
   - Función `ensurePrivilegedExec()` mejorada
   - Función `ensureConfigMode()` mejorada
   - Loop de comandos usa `commandOutput` para acumular output

2. `packages/pt-runtime/src/templates/main-kernel-assembly.ts`
   - Hot reload automático basado en mtime
