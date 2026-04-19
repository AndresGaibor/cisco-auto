# Kernel Hardening - Fase 6

> Definición del rol y alcance de `main.js` como kernel mínimo del sistema.

## 1. Propósito

`main.js` debe actuar exclusivamente como:

- **Bootstrap**: Carga inicial del runtime en el Script Engine de PT
- **Loop/Dispatch**: Ciclo de polling y distribución de comandos
- **Lifecycle Manager**: Gestión del ciclo de vida del módulo
- **Runtime Loader**: Carga y hot-reload del runtime.js
- **Cleanup Manager**: Orquestación de limpieza al shutdown
- **Bridge Point**: Punto de conexión entre PT y el sistema de archivos (cola de comandos/resultados)

## 2. Por qué debe ser mínimo

Packet Tracer ejecuta el módulo JavaScript dentro de un **Script Engine persistente** (Qt Script). Esta característica implica:

- Los callbacks registrados dentro del script viven dentro del engine y no se garbage collectan hasta stop/stop del módulo
- Los cambios a scripts pueden no aplicarse limpiamente hasta un stop/start completo del módulo
- La documentación oficial indica que el Script Engine tiene lifecycle atado al start/stop del módulo

**Referencia:** [PT Script Modules Documentation](https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm)

Esta arquitectura significa que cualquier lógica adicional en main.js:
- Aumenta la superficie de riesgo de memoria
- Hace el hot reload menos predecible
- Complica el debugging de lifecycle

## 3. Responsabilidades exactas de main.js

```
┌─────────────────────────────────────────────────────────┐
│                      main.js                             │
│  (Kernel mínimo, raramente modificado)                   │
├─────────────────────────────────────────────────────────┤
│  • init()                                               │
│    - Configurar estado inicial mínimo                    │
│    - Registrar cleanup handlers                          │
│                                                         │
│  • main()                                               │
│    - Bootstrapping del runtime.js                       │
│    - Runtime loading con validación de checksum         │
│                                                         │
│  • cleanUp()                                            │
│    - Detener timers de polling                          │
│    - Desconectar listeners                              │
│    - Cerrar watchers                                    │
│    - Soltar recursos                                    │
│    - Limpiar estado in-flight                           │
│                                                         │
│  • dispatch loop (setInterval 500ms)                     │
│    - Poll de comandos desde filesystem                   │
│    - Distribución al runtime via _ptDispatch()          │
│    - Escritura de resultados                            │
│                                                         │
│  • Runtime loading                                       │
│    - require('runtime.js') con cache busting            │
│    - Detección de cambios de mtime                      │
│    - Fallback a runtime en memoria si falla             │
│                                                         │
│  • Heartbeat/Snapshot schedule                           │
│    - Timer de heartbeat (si está habilitado)            │
│    - Snapshot periódico (si está habilitado)            │
└─────────────────────────────────────────────────────────┘
```

**Estado global permitido en main.js:**
- `ipc` (objeto de comunicación PT)
- `n` (Network, acceso al modelo de red)
- `w` (LogicalWorkspace)
- `_runtime` (referencia al runtime cargado)
- `_pollingTimer` (timer de dispatch)
- `_cleanupHandlers` (array de handlers de cleanup)

## 4. Qué NO debe contener main.js

| Prohibido | Razón |
|-----------|-------|
| Workflows (VLAN, DHCP, routing) | Pertenecen a pt-control, no al kernel |
| Semántica IOS de alto nivel | Parser IOS vive en ios-domain/kernel |
| Lógica de verificación | Verification pertenece a pt-control |
| Hacks directos a PT | Omni adapters van en runtime, no en kernel |
| Parsers complejos | Kernel no hace parsing de output |
| Policy/fallback logic | Decision logic va en pt-control |
| Manejo de errores de negocio | Solo errores de lifecycle, no de dominio |
| Estado de sesión de terminal | Terminal state vive en runtime |
| Acceso a archivos del host | Solo a través de primitives definidos |

## 5. Regla central

```
┌────────────────────────────────────────────────────────────┐
│  main.js debe ser un kernel PEQUEÑO, PREDECIBLE y         │
│  RARAMENTE MODIFICADO después de la fase de estabilización │
└────────────────────────────────────────────────────────────┘
```

**Criterio de éxito:** Si necesitas modificar main.js para agregar una feature, la feature pertenece a otro lugar (runtime o pt-control).

## 6. Hot reload como conveniencia

El hot reload de runtime.js (detección de mtime) es una **conveniencia de desarrollo**, no la base de consistencia del sistema.

**Implicaciones:**
- El lifecycle real del Script Module sigue siendo start/stop
- Hot reload puede tener edge cases en estado en memoria
- Para producción, se recomienda stop/start completo
- El kernel no debe depende de hot reload para su correctness

## 7. Métricas de calidad del kernel

| Métrica | Target |
|---------|--------|
| Líneas de código | < 200 |
| Estado global | < 10 variables |
| Funciones públicas | < 10 |
| Dependencias externas | 0 (solo PT globals) |
| Cyclomatic complexity | < 10 |
