# CLI Agent Skill — Guía Operativa

## Propósito

`pt` es la CLI principal para controlar Cisco Packet Tracer en tiempo real. La CLI está registrada en `apps/pt-cli/src/index.ts` y expone **19 comandos raíz**.

**Regla fundamental para agentes**: la CLI es la interfaz preferida. No leas `pt-dev/` directamente. No asumas que todo está perfectamente implementado.

---

## Fuente de Verdad

### Jerarquía de confiabilidad

| Fuente | Confiabilidad | Notas |
|--------|---|---|
| `apps/pt-cli/src/index.ts` | ⭐⭐⭐⭐⭐ | Árbol real de comandos registrados |
| `apps/pt-cli/src/commands/command-catalog.ts` | ⭐⭐⭐⭐⭐ | Metadata de madurez por comando |
| `apps/pt-cli/src/commands/help.ts` | ⭐⭐⭐ | Ayuda visible pero manual, sujeta a drift |
| `apps/pt-cli/src/commands/completion.ts` | ⭐⭐ | Scripts desactualizados, NO usar como fuente de comandos |
| `~/pt-dev/` | ⭐ | Solo para deployment, no para operación |

**Si hay conflicto**: siempre privilegia `index.ts` sobre `help.ts` o `completion.ts`.

---

## Reglas Operativas Obligatorias para Agentes

1. **No leas `pt-dev` directamente**
   - Los archivos en `pt-dev/` están generados y no reflejan siempre el estado actual
   - Usa siempre la CLI (`pt <comando>`) como interfaz

### Regla de acceso al sistema
- La CLI y los agentes deben acceder al estado operativo de Packet Tracer mediante PTController (paquete `@cisco-auto/pt-control`) y `file-bridge`.
- No deben leer `pt-dev/` directamente salvo casos legacy explícitos que estén marcados para migración.
- Heartbeat y snapshots deben consultarse a través del bridge/control (ej.: `controller.getHeartbeatHealth()`, `controller.getSystemContext()`); no parsear `heartbeat.json` o `state.json` manualmente desde la CLI o agentes.
- El `file-bridge` es la autoridad de contexto operativo: la CLI pide contexto al controller/bridge, nunca asume lectura directa de `pt-dev`.

### Legacy todavía presente (migración progresiva)
Las siguientes áreas aún tienen lecturas o comportamientos legacy y están planificadas para migración en fases posteriores:
- Parte de `logs`
- Parte de `results`
- Algunas comprobaciones históricas del comando `doctor`
- Herramientas internas que aún usan `readState()` de forma directa
(Estos casos deben documentarse y marcarse con TODOs en el código hasta su migración completa.)

2. **No asumas que help refleja todo perfectamente**
   - `help.ts` es manual y puede tener drift
   - Si hay duda entre help y index.ts, confía en index.ts

3. **Completion NO es fuente de verdad**
   - `completion.ts` lista comandos viejos como `parse`, `config`, `deploy`, `init`, etc.
   - Esos comandos **no existen** en la CLI real
   - NO uses completion para descubrir qué comandos están disponibles

4. **Después de cambios topológicos, verifica**
   - Después de `device add/remove/move` o `link add/remove`, ejecuta:
     ```
     pt device list
     pt link list
     ```

5. **Después de `config-ios`, valida sin confiar ciegamente en "ok"**
   - `config-ios` puede reportar "ok" pero la configuración puede no haber sido aplicada completamente
   - Verifica con `pt show ip-int-brief`, `pt show vlan`, etc.

---

## Capacidades por Estado de Madurez

### Stable (Se puede usar en autonomía sin verificación adicional)

| Comando | Resumen |
|---------|---------|
| `build` | Build y deploy de archivos a ~/pt-dev/ |
| `help` | Ayuda enriquecida para comandos |
| `history list` | Listar las últimas ejecuciones |
| `history show <id>` | Mostrar detalle de una ejecución |
| `history last` | Mostrar la última ejecución |
| `history explain <id>` | Explica error de una sesión fallida |
| `logs tail` | Últimos eventos del log |
| `logs errors` | Errores recientes |
| `results list` | Visor de resultados |
| `results show <id>` | Detalle de resultado |
| `results last` | Último resultado |
| `device list` | Lista dispositivos (lectura segura) |
| `doctor` | Diagnóstico del sistema PT |

### Partial (Funciona pero requiere verificación posterior)

| Comando | Resumen | Restricción |
|---------|---------|---|
| `device add` | Agrega dispositivo | Verificar con `device list` |
| `device remove` | Elimina dispositivo | Verificar con `device list` |
| `device move` | Mueve dispositivo | Verificar con `device list` |
| `device get` | Info de dispositivo | Puede estar desactualizada |
| `show` | Ejecuta show IOS | Valida manualmente en PT |
| `config-host` | Configura IP | Verificar con `show ip-int-brief` |
| `config-ios` | Ejecuta config IOS | NO confiar ciegamente en "ok" |
| `link add` | Agrega enlace | Verificar con `link list` |
| `link remove` | Elimina enlace | Verificar con `link list` |
| `link list` | Lista enlaces | Lectura segura |
| `vlan` | Gestión VLAN | Verificar con `show vlan` |
| `etherchannel` | Agrupa interfaces | Verificar configuración |
| `routing` | Routing OSPF/EIGRP | Verificar con `show ip-route` |
| `acl` | Access Control Lists | Verificar con `show` |
| `stp` | Spanning Tree | Verificar en PT |
| `services` | DHCP/NTP/Syslog | Verificar en PT |
| `topology` | Análisis topología | Análisis parcial |
| `logs` | Visor de logs | Lectura segura |

### Experimental (NO usar en autonomía sin supervaloración)

| Comando | Estado | Razón |
|---------|--------|-------|
| `history rerun <id>` | **Experimental** | Requiere implementación adicional, NO completo |
| `completion` | **Experimental** | Scripts desactualizados, no refleja CLI real |

---

## Política de Autonomía

### ✅ Permitido en autonomía básica (sin validación)

Usar estos comandos sin necesidad de verificación posterior:

```
pt device list                # Listar dispositivos
pt history list               # Listar ejecuciones
pt history show <id>          # Ver detalles de ejecución
pt history last               # Última ejecución
pt logs errors                # Errores recientes
pt logs tail                   # Últimos eventos
pt doctor                      # Diagnóstico del sistema
pt results list/show/last      # Visor de resultados
```

### ⚠️ Permitido con validación posterior

Usar estos comandos pero **siempre validar** después:

```
pt device add <name> <type>   # → validar con: pt device list
pt device remove <name>       # → validar con: pt device list
pt device move <name> ...     # → validar con: pt device list
pt link add ...               # → validar con: pt link list
pt link remove ...            # → validar con: pt link list
pt config-ios <device> ...    # → validar con: pt show, o revisar logs
pt show <comando>             # Puede ser desactualizado, revisar en PT
```

### ❌ NO permitido en autonomía ciega

Estos comandos **jamás** deben ejecutarse sin intervención humana:

```
pt history rerun <id>         # Experimental, requiere implementación
pt completion <shell>         # Scripts desactualizados
pt config-ios <device> ...    # Sin validación triple
```

---

## Fuentes de Verdad y Auxiliares

### Fuente principal
- **`apps/pt-cli/src/index.ts`**: registra exactamente 19 comandos raíz (build, device, show, config-host, vlan, etherchannel, link, config-ios, routing, acl, stp, services, results, logs, help, history, doctor, completion, topology)

### Fuentes auxiliares
- **`command-catalog.ts`**: metadata de madurez (stable/partial/experimental)
- **`help.ts`**: ayuda visible, pero manual
- **`completion.ts`**: completion scripts, pero desactualizados
- **`history.ts`**: implementación de `history rerun` con nota "requiere implementación adicional"

### Qué NO es fuente de verdad
- `completion.ts` — lista comandos viejos que no existen (`parse`, `config`, `deploy`, `init`, etc.)
- `help.ts` — puede listar comandos que no están registrados
- `~/pt-dev/` — solo para deployment, no para lógica


---

## Contexto Operativo en Fase 2

### Ciclo de vida automático del Controller

A partir de **Fase 2**, `runCommand()` gestiona automáticamente el ciclo de vida del `PTController`:

```ts
// Fase 2: ciclo de vida automático
try {
  await controller.start();      // Inicia bridge y topologyCache
  runtimeContext = await inspectCommandContext(controller);
  result = await execute(ctx);
} finally {
  await controller.stop();        // Limpia recursos
}
```

**Impacto para agentes:**
- No necesitas llamar manualmente a `controller.start()`/`stop()`
- El bridge se inicia automáticamente
- La topología virtual se materializa automáticamente
- Warnings contextuales se inyectan en resultados

### CommandRuntimeContext

Cada resultado incluye contexto operativo:

```ts
interface CommandRuntimeContext {
  bridgeReady: boolean;              // ¿Bridge conectado a PT?
  topologyMaterialized: boolean;     // ¿Topología cargada en memoria?
  deviceCount: number;               // Cantidad de dispositivos
  linkCount: number;                 // Cantidad de enlaces
  warnings: string[];                // Avisos contextuales
}
```

### Historial con Contexto

Los logs ahora incluyen `contextSummary`:

```bash
pt device list
# → historial guarda: { bridgeReady, topologyMaterialized, deviceCount, linkCount, warnings }
```

### requiresContext en Catálogo

El `command-catalog.ts` ahora marca qué comandos requieren contexto operativo:

```ts
device: {
  id: 'device',
  requiresContext: true,   // Requiere bridge + topología
  requiresPT: true,
  requiresVerification: true,
}
```

**Comandos que requieren contexto** (requiresContext: true):
- device, link, show, config-ios, config-host
- routing, acl, stp, services, topology, vlan, etherchannel

**Comandos que NO requieren contexto** (requiresContext: false):
- build, results, logs, help, history, doctor, completion

---


---
## Estado operativo y contexto persistente (Fase 3)

- La CLI ahora mantiene un archivo de estado persistido (pt status) que resume: heartbeat, bridge, topología y warnings.
- Antes de tomar decisiones críticas, el agente debe ejecutar `pt status` para conocer la salud del sistema.
- El contexto se actualiza automáticamente al ejecutar comandos vía `runCommand()`; no confíes en ausencia de advertencias.
- Si `topology.health` es `desynced` o `stale`, el agente debe avisar incertidumbre y sugerir verificación manual.
- Si `heartbeat` es `missing`, `stale` u `unknown`, no asumir control confiable de Packet Tracer; ejecutar `pt doctor`.

## Playbook de Troubleshooting

Si algo falla o da resultado inesperado:

### 1. Usa `pt doctor` primero
```bash
pt doctor
pt doctor --verbose
```
Verifica directorios, archivos de runtime, heartbeat, estado de PT.

### 2. Revisa logs de la sesión
```bash
pt logs errors                    # Errores recientes
pt logs tail 50                   # Últimos 50 eventos
pt history list --failed          # Ejecuciones fallidas
pt history show <session-id>      # Detalle completo
```

### 3. Si `config-ios` falla silenciosamente
```bash
# No confíes en "ok"
pt config-ios R1 interface ...
# Valida inmediatamente
pt show ip-int-brief R1
```

### 4. Si `device add/remove` parece no funcionar
```bash
# Verifica siempre
pt device list
```

### 5. Si `link add` no aparece
```bash
# Valida
pt link list
```

### 6. Si necesitas contexto operativo completo
```bash
pt device list
pt link list
pt show ip-int-brief <device>
pt show vlan <switch>
pt topology analyze
```

---

## Qué NO debe hacer un agente autónomo

❌ **Prohibido sin intervención humana:**

1. **No borres dispositivos, enlaces o configuraciones** sin validación triple
2. **No uses `history rerun`** — está marcado como experimental
3. **No toques `pt-dev/` directamente** — siempre usa la CLI
4. **No asegures éxito de `config-ios`** sin validación con `show` posteriores
5. **No uses `completion` como fuente de comandos** — está desactualizado
6. **No asumas que `help` refleja el árbol completo** — usa `index.ts` como verdad
7. **No cambies la topología sin verification loop**:
   ```
   cambio → validación → si_ok_continúa else_rollback
   ```

---

## Comandos Reales Registrados en index.ts

Estos son **exactamente** los 19 comandos que existen:

1. **build** — Build y deploy a ~/pt-dev/
2. **device** — Gestión de dispositivos (list, add, remove, move, get, interactive)
3. **show** — Ejecuta comandos show
4. **config-host** — Configura IP de dispositivo
5. **vlan** — Gestión de VLANs
6. **etherchannel** — EtherChannel
7. **link** — Gestión de enlaces
8. **config-ios** — Comandos IOS
9. **routing** — Protocolos de routing
10. **acl** — Access Control Lists
11. **stp** — Spanning Tree Protocol
12. **services** — Servicios (DHCP, NTP, Syslog)
13. **results** — Visor de resultados
14. **logs** — Visor de logs
15. **help** — Ayuda enriquecida
16. **history** — Historial de ejecuciones
17. **doctor** — Diagnóstico del sistema
18. **completion** — Scripts de completion
19. **topology** — Análisis y visualización de topología

**NOTA:** `lab` no está registrado como comando raíz en la CLI actual. Los subcomandos de `lab` (parse, validate, create, list, interactive, pipeline) no son accesibles desde la CLI.

---

## Resumen Ejecutivo

| Aspecto | Regla |
|--------|-------|
| **Fuente de verdad** | `index.ts` siempre |
| **Usar sin validación** | `device list`, `history list/show`, `doctor`, `logs errors` |
| **Usar con validación** | `device add/remove/move`, `config-ios`, `link add/remove`, `show` |
| **Nunca usar autónomamente** | `history rerun`, `completion` |
| **After config changes** | Validar con `show`, `device list`, `link list` |
| **PT no responde** | Ejecutar `pt doctor` primero |
