# Plan de Implementación: Mejoras de iOS y Contexto/Inteligencia

**Fecha:** 2026-04-09
**Basado en:** `.sisyphus/drafts/ios-context-improvements-design.md`
**Orden:** A → B → C

---

## Requirements Summary

Implementar tres áreas de mejora para cisco-auto:

1. **Área A: Parser iOS Declarativo** - Schemas Zod para validación dinámica, generadores de comandos, parsers de output, y comandos CLI.

2. **Área B: SQLite Memory** - Persistencia de dispositivos, historial, topología y preferencias entre sesiones.

3. **Área C: Pipeline con Transacciones** - Sistema de transacciones con rollback automático y logging de auditoría.

**Principio Clave:** Todo dinámico desde CLI/YAML. Los archivos TypeScript son infraestructura reutilizable, no configuraciones hardcodeadas.

---

## Acceptance Criteria

### Área A: Parser iOS Declarativo

- [ ] `pt config ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0" --dry-run` genera comandos IOS correctos
- [ ] `pt config ospf --file configs/ospf.yaml --dry-run` parsea YAML y genera comandos
- [ ] Validación de inputs: error detallado cuando process-id está fuera de rango
- [ ] Validación de inputs: error detallado cuando network tiene formato inválido
- [ ] Rollback commands generados para cada comando de configuración
- [ ] `pt show run --device R1 --parse` extrae hostname, interfaces, OSPF a JSON estructurado
- [ ] `pt config eigrp --apply` funciona con mismo patrón que OSPF
- [ ] `pt config acl --apply` funciona con mismo patrón que OSPF
- [ ] `pt config vlan --apply` funciona con mismo patrón que OSPF

### Área B: SQLite Memory

- [ ] `pt devices list` muestra dispositivos guardados en SQLite
- [ ] `pt devices add R1 --ip 10.0.0.1` persiste dispositivo en BD
- [ ] `pt history search "ospf"` busca en historial de comandos
- [ ] `pt history failed --device R1` muestra comandos fallidos
- [ ] `pt topology show` muestra topología descubierta
- [ ] `pt config set default_router 2911` guarda preferencia
- [ ] `pt config get default_router` recupera preferencia
- [ ] Base de datos persiste entre sesiones (archivo `.cisco-auto/memory.db`)
- [ ] Sesiones de trabajo registradas con inicio/fin

### Área C: Pipeline con Transacciones

- [ ] `pt config ospf --apply` ejecuta transacción completa
- [ ] Rollback automático cuando comando falla
- [ ] Audit log registra cada comando con timestamp, dispositivo, success/failure
- [ ] `pt audit tail --lines 50` muestra últimas operaciones
- [ ] `pt audit export --format json --output audit.json` exporta auditoría
- [ ] Transacción fallida muestra comandos de rollback ejecutados
- [ ] Logs en formato JSON Lines en `.cisco-auto/audit.log`

---

## Implementation Steps

### Wave 1: Área A - Schema System (Foundation)

- [x] **Task 1: Crear estructura de directorios para schemas**
- **File:** `packages/ios-domain/src/schemas/`
- **What:** Crear directorios `schemas/routing/`, `schemas/security/`, `schemas/switching/`, `schemas/services/`
- **Why:** Organizar schemas por categoría de configuración
- **Verify:** Directorios existen con estructura correcta

- [x] **Task 2: Implementar schema OSPF**
- **File:** `packages/ios-domain/src/schemas/routing/ospf.ts`
- **What:** Implementar `OspfConfigSchema` con validación de processId, routerId, networks, passiveInterfaces, areas
- **Why:** Validar inputs de configuración OSPF desde CLI/YAML
- **Verify:** `OspfConfigSchema.parse()` valida configs válidas y rechaza inválidas
- **Test:** Validar con configs de ejemplo

- [x] **Task 3: Implementar schema EIGRP**
- **File:** `packages/ios-domain/src/schemas/routing/eigrp.ts`
- **What:** Implementar `EigrpConfigSchema` con validación de AS, networks, passiveInterfaces
- **Why:** Validar inputs de configuración EIGRP
- **Verify:** `EigrpConfigSchema.parse()` funciona correctamente
- **Test:** Reusar patrón de OSPF

- [x] **Task 4: Implementar schema BGP**
- **File:** `packages/ios-domain/src/schemas/routing/bgp.ts`
- **What:** Implementar `BgpConfigSchema` con validación de AS, neighbors, networks
- **Why:** Validar inputs de configuración BGP
- **Verify:** `BgpConfigSchema.parse()` funciona correctamente

#### Task 5: Implementar schema Static Route
- **File:** `packages/ios-domain/src/schemas/routing/static-route.ts`
- **What:** Implementar `StaticRouteSchema` con validación de destination, mask, nextHop, interface
- **Why:** Validar inputs de rutas estáticas

- [x] **Task 6: Implementar schema ACL**
- **File:** `packages/ios-domain/src/schemas/security/acl.ts`
- **What:** Implementar `AclConfigSchema` con validación de name, standard/extended, rules (permit/deny)
- **Why:** Validar inputs de ACLs

- [x] **Task 7: Implementar schema NAT**
- **File:** `packages/ios-domain/src/schemas/security/nat.ts`
- **What:** Implementar `NatConfigSchema` con validación de type (static/dynamic/pat), inside/outside interfaces
- **Why:** Validar inputs de NAT

- [x] **Task 8: Implementar schema VLAN**
- **File:** `packages/ios-domain/src/schemas/switching/vlan.ts`
- **What:** Implementar `VlanConfigSchema` con validación de id, name, state
- **Why:** Validar inputs de VLANs

- [x] **Task 9: Implementar schema Interface**
- **File:** `packages/ios-domain/src/schemas/interface.ts`
- **What:** Implementar `InterfaceConfigSchema` con validación de name, ip, mask, description, shutdown state
- **Why:** Validar inputs de configuración de interfaces

- [x] **Task 10: Implementar schema DHCP**
- **File:** `packages/ios-domain/src/schemas/services/dhcp.ts`
- **What:** Implementar `DhcpConfigSchema` con validación de pool name, network, default-router, dns-server
- **Why:** Validar inputs de DHCP pools

- [x] **Task 11: Crear barrel exports para schemas**
- **Files:** `packages/ios-domain/src/schemas/routing/index.ts`, `packages/ios-domain/src/schemas/security/index.ts`, `packages/ios-domain/src/schemas/switching/index.ts`, `packages/ios-domain/src/schemas/services/index.ts`, `packages/ios-domain/src/schemas/index.ts`
- **What:** Exportar todos los schemas desde puntos de entrada por categoría y un barrel general
- **Why:** Facilitar imports en otros módulos

#### Task 12: Integrar con sistema de configuración CLI
- **File:** `packages/ios-domain/src/generators/types.ts`
- **What:** Definir `GeneratedCommand` interface con text, mode, rollback fields
- **Why:** Contrato común para todos los generadores

#### Task 13: Implementar generador OSPF
- **File:** `packages/ios-domain/src/generators/ospf-generator.ts`
- **What:** Implementar `generateOspfCommands(config: OspfConfig): GeneratedCommand[]`
- **Why:** Generar comandos IOS para cualquier config OSPF válida
- **Verify:** Comandos generados son válidos para IOS
- **Test:** Generar comandos para config de ejemplo y comparar con output esperado

#### Task 14: Implementar generador EIGRP
- **File:** `packages/ios-domain/src/generators/eigrp-generator.ts`
- **What:** Implementar `generateEigrpCommands(config: EigrpConfig): GeneratedCommand[]`
- **Why:** Generar comandos IOS para EIGRP

#### Task 15: Implementar generador BGP
- **File:** `packages/ios-domain/src/generators/bgp-generator.ts`
- **What:** Implementar `generateBgpCommands(config: BgpConfig): GeneratedCommand[]`
- **Why:** Generar comandos IOS para BGP

#### Task 16: Implementar generador Static Route
- **File:** `packages/ios-domain/src/generators/static-route-generator.ts`
- **What:** Implementar `generateStaticRouteCommands(config: StaticRouteConfig): GeneratedCommand[]`
- **Why:** Generar comandos para rutas estáticas

#### Task 17: Implementar generador ACL
- **File:** `packages/ios-domain/src/generators/acl-generator.ts`
- **What:** Implementar `generateAclCommands(config: AclConfig): GeneratedCommand[]`
- **Why:** Generar comandos para ACLs

#### Task 18: Implementar generador NAT
- **File:** `packages/ios-domain/src/generators/nat-generator.ts`
- **What:** Implementar `generateNatCommands(config: NatConfig): GeneratedCommand[]`
- **Why:** Generar comandos para NAT

#### Task 19: Implementar generador VLAN
- **File:** `packages/ios-domain/src/generators/vlan-generator.ts`
- **What:** Implementar `generateVlanCommands(config: VlanConfig): GeneratedCommand[]`
- **Why:** Generar comandos para VLANs

#### Task 20: Implementar generador Interface
- **File:** `packages/ios-domain/src/generators/interface-generator.ts`
- **What:** Implementar `generateInterfaceCommands(config: InterfaceConfig): GeneratedCommand[]`
- **Why:** Generar comandos para interfaces

#### Task 21: Implementar generador DHCP
- **File:** `packages/ios-domain/src/generators/dhcp-generator.ts`
- **What:** Implementar `generateDhcpCommands(config: DhcpConfig): GeneratedCommand[]`
- **Why:** Generar comandos para DHCP

#### Task 22: Implementar registry de generadores
- **File:** `packages/ios-domain/src/generators/registry.ts`
- **What:** Implementar `getGenerator(type: string): CommandGenerator` que devuelve el generador correcto
- **Why:** Soportar `pt config apply` con detección automática de tipo

#### Task 23: Crear barrel exports para generadores
- **File:** `packages/ios-domain/src/generators/index.ts`
- **What:** Exportar todos los generadores desde un punto de entrada único
- **Why:** Facilitar imports

---

### Wave 3: Área A - Output Parsers

#### Task 24: Implementar parser `show running-config`
- **File:** `packages/ios-domain/src/parsers/show-run.ts`
- **What:** Implementar `parseShowRun(output: string): ParsedConfig`
- **Why:** Extraer estructura de configuración actual del dispositivo
- **Verify:** Parser extrae hostname, interfaces, OSPF, EIGRP, ACLs, VLANs correctamente
- **Test:** Usar outputs reales de routers como fixtures

#### Task 25: Implementar parser `show ip interface brief`
- **File:** `packages/ios-domain/src/parsers/show-interface.ts`
- **What:** Implementar `parseShowIpInterfaceBrief(output: string): InterfaceInfo[]`
- **Why:** Extraer información de interfaces

#### Task 26: Implementar parser `show ip route`
- **File:** `packages/ios-domain/src/parsers/show-route.ts`
- **What:** Implementar `parseShowIpRoute(output: string): RouteEntry[]`
- **Why:** Extraer tabla de enrutamiento

#### Task 27: Implementar parser `show vlan`
- **File:** `packages/ios-domain/src/parsers/show-vlan.ts`
- **What:** Implementar `parseShowVlan(output: string): VlanInfo[]`
- **Why:** Extraer VLANs configuradas

#### Task 28: Implementar parser `show version`
- **File:** `packages/ios-domain/src/parsers/show-version.ts`
- **What:** Implementar `parseShowVersion(output: string): VersionInfo`
- **Why:** Extraer información del dispositivo (modelo, IOS version, hostname)

#### Task 29: Implementar parser `show cdp neighbors`
- **File:** `packages/ios-domain/src/parsers/show-cdp.ts`
- **What:** Implementar `parseShowCdpNeighbors(output: string): CdpNeighbor[]`
- **Why:** Extraer topología descubierta

#### Task 30: Crear barrel exports para parsers
- **File:** `packages/ios-domain/src/parsers/index.ts`
- **What:** Exportar todos los parsers desde un punto de entrada único
- **Why:** Facilitar imports

---

### Wave 4: Área B - SQLite Memory

#### Task 31: Implementar schema de base de datos
- **File:** `packages/core/src/memory/schema.ts`
- **What:** Implementar `createTables()` con SQL para devices, topology, preferences, sessions y audit_log
 - **Why:** Crear estructura de persistencia
 - **Verify:** Tablas creadas correctamente con índices y constraints

#### Task 32: Implementar DeviceMemory
- **File:** `packages/core/src/memory/devices.ts`
- **What:** Implementar `registerDevice()`, `getDevice()`, `getRecentDevices()`, `updateLastConnected()`
- **Why:** Persistir dispositivos conocidos

#### Task 33: Implementar CommandHistory
- **Status:** Legacy histórico; reemplazado por `audit_log` y eliminado del export público
- **What:** Implementación previa de historial de comandos ejecutados
- **Why:** Referencia histórica para la migración

#### Task 34: Implementar TopologyMemory
- **File:** `packages/core/src/memory/topology.ts`
- **What:** Implementar `recordNeighbor()`, `getDeviceNeighbors()`, `getTopology()`, `clearTopology()`
- **Why:** Persistir topología descubierta

#### Task 35: Implementar PreferencesStore
- **File:** `packages/core/src/memory/preferences.ts`
- **What:** Implementar `set()`, `get()`, `setDefaultDevice()`, `getDefaultDevice()`
- **Why:** Persistir preferencias del usuario

#### Task 36: Implementar MemoryStore facade
- **File:** `packages/core/src/memory/index.ts`
- **What:** Implementar `MemoryStore` class que agrupa DeviceMemory, TopologyMemory, PreferencesStore y AuditMemory
 - **Why:** API unificada para memoria
 - **Verify:** `getMemory()` singleton funciona correctamente

#### Task 37: Integrar MemoryStore con ExecutionContext
- **File:** `packages/core/src/context/index.ts`
- **What:** Agregar propiedad `memory: MemoryStore` a ExecutionContext
- **Why:** Disponer de memoria en contexto de ejecución

---

### Wave 5: Área C - Transaction System

#### Task 38: Implementar Transaction class
- **File:** `packages/ios-domain/src/session/transaction.ts`
- **What:** Implementar `Transaction` class con `add()`, `addBatch()`, `execute()`, `rollback()`, `getLog()`
- **Why:** Ejecutar comandos con rollback automático
- **Verify:** Transacción exitosa registra todos los pasos
- **Test:** Transacción fallida ejecuta rollback en orden inverso

#### Task 39: Implementar TransactionBuilder
- **File:** `packages/ios-domain/src/session/transaction-builder.ts`
- **What:** Implementar `TransactionBuilder` con métodos fluidos: `configure()`, `interface()`, `ospf()`, `eigrp()`, `acl()`, `vlan()`, `build()`
- **Why:** API ergonómica para construir transacciones
- **Verify:** Builder genera transacciones correctas

#### Task 40: Implementar AuditLogger
- **File:** `packages/ios-domain/src/session/audit-log.ts`
- **What:** Implementar `AuditLogger` con `log()`, `logTransaction()`, `getSessionLogs()`, `getDeviceLogs()`, `getFailedLogs()`, `export()`
- **Why:** Registrar operaciones para auditoría
- **Verify:** Logs en formato JSON Lines
- **Test:** Export a JSON/CSV/Markdown funciona

---

### Wave 6: CLI Commands - Config

#### Task 41: Implementar parser de argumentos CLI
- **File:** `apps/pt-cli/src/utils/cli-parser.ts`
- **What:** Implementar helpers para parsear flags repeatable (`--network`, `--passive-interface`)
- **Why:** Soportar múltiples valores en un flag

#### Task 42: Implementar parser de archivos YAML/JSON
- **File:** `apps/pt-cli/src/utils/config-parser.ts`
- **What:** Implementar `parseConfigFile(path: string): Config` para YAML y JSON
- **Why:** Soportar configuración desde archivos

#### Task 43: Implementar comando `pt config ospf`
- **File:** `apps/pt-cli/src/commands/config-ospf.ts`
- **What:** Implementar comando con flags `--device`, `--process-id`, `--router-id`, `--network`, `--passive-interface`, `--file`, `--apply`, `--dry-run`
- **Why:** Configurar OSPF desde CLI
- **Verify:** `pt config ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0" --dry-run` muestra comandos
- **Test:** `pt config ospf --apply` ejecuta y registra en memoria

#### Task 44: Implementar comando `pt config eigrp`
- **File:** `apps/pt-cli/src/commands/config-eigrp.ts`
- **What:** Implementar comando con flags `--device`, `--as`, `--network`, `--file`, `--apply`, `--dry-run`
- **Why:** Configurar EIGRP desde CLI

#### Task 45: Implementar comando `pt config bgp`
- **File:** `apps/pt-cli/src/commands/config-bgp.ts`
- **What:** Implementar comando con flags para BGP
- **Why:** Configurar BGP desde CLI

#### Task 46: Implementar comando `pt config acl`
- **File:** `apps/pt-cli/src/commands/config-acl.ts`
- **What:** Implementar comando con flags `--device`, `--name`, `--rule`, `--file`, `--apply`, `--dry-run`
- **Why:** Configurar ACLs desde CLI

#### Task 47: Implementar comando `pt config vlan`
- **File:** `apps/pt-cli/src/commands/config-vlan.ts`
- **What:** Implementar comando con flags `--device`, `--id`, `--name`, `--file`, `--apply`, `--dry-run`
- **Why:** Configurar VLANs desde CLI

#### Task 48: Implementar comando `pt config interface`
- **File:** `apps/pt-cli/src/commands/config-interface.ts`
- **What:** Implementar comando con flags `--device`, `--name`, `--ip`, `--mask`, `--no-shutdown`, `--file`, `--apply`, `--dry-run`
- **Why:** Configurar interfaces desde CLI

#### Task 49: Implementar comando `pt config apply`
- **File:** `apps/pt-cli/src/commands/config-apply.ts`
- **What:** Implementar comando que detecta tipo de config desde `type` field en YAML/JSON
- **Why:** Aplicar cualquier configuración desde archivo
- **Verify:** `pt config apply configs/ospf.yaml --dry-run` funciona

#### Task 50: Registrar todos los comandos config
- **File:** `apps/pt-cli/src/commands/index.ts`
- **What:** Importar y registrar todos los comandos config en el programa principal
- **Why:** Hacer comandos disponibles desde CLI

---

### Wave 7: CLI Commands - Memory

#### Task 51: Implementar comando `pt devices list`
- **File:** `apps/pt-cli/src/commands/devices-list.ts`
- **What:** Listar dispositivos guardados en SQLite
- **Why:** Ver dispositivos conocidos
- **Verify:** `pt devices list` muestra tabla con dispositivos

#### Task 52: Implementar comando `pt devices add`
- **File:** `apps/pt-cli/src/commands/devices-add.ts`
- **What:** Registrar dispositivo con `--ip`, `--model`, `--type`
- **Why:** Guardar dispositivo manualmente
- **Verify:** `pt devices add R1 --ip 10.0.0.1` persiste en BD

#### Task 53: Implementar comando `pt history search`
- **File:** `apps/pt-cli/src/commands/history-search.ts`
- **What:** Buscar en historial de comandos
- **Why:** Encontrar comandos ejecutados anteriormente
- **Verify:** `pt history search "ospf"` muestra resultados

#### Task 54: Implementar comando `pt history failed`
- **File:** `apps/pt-cli/src/commands/history-failed.ts`
- **What:** Mostrar comandos fallidos
- **Why:** Debug de errores
- **Verify:** `pt history failed --device R1` muestra errores

#### Task 55: Implementar comando `pt topology show`
- **File:** `apps/pt-cli/src/commands/topology-show.ts`
- **What:** Mostrar topología descubierta
- **Why:** Ver relaciones entre dispositivos
- **Verify:** `pt topology show` muestra grafo o tabla

#### Task 56: Implementar comando `pt config set/get`
- **File:** `apps/pt-cli/src/commands/config-prefs.ts`
- **What:** Guardar y recuperar preferencias
- **Why:** Persistir configuraciones default
- **Verify:** `pt config set default_router 2911` y `pt config get default_router` funcionan

---

### Wave 8: CLI Commands - Audit

#### Task 57: Implementar comando `pt audit tail`
- **File:** `apps/pt-cli/src/commands/audit-tail.ts`
- **What:** Mostrar últimas N operaciones del audit log
- **Why:** Ver actividad reciente
- **Verify:** `pt audit tail --lines 50` muestra últimas 50 entradas

#### Task 58: Implementar comando `pt audit export`
- **File:** `apps/pt-cli/src/commands/audit-export.ts`
- **What:** Exportar auditoría a JSON/CSV/Markdown
- **Why:** Generar reportes de auditoría
- **Verify:** `pt audit export --format json --output audit.json` crea archivo

#### Task 59: Implementar comando `pt audit failed`
- **File:** `apps/pt-cli/src/commands/audit-failed.ts`
- **What:** Mostrar operaciones fallidas con filtros
- **Why:** Análisis de errores
- **Verify:** `pt audit failed --since "2026-04-01"` funciona

---

### Wave 9: CLI Commands - Show

#### Task 60: Implementar comando `pt show run --parse`
- **File:** `apps/pt-cli/src/commands/show-run.ts`
- **What:** Parsear `show running-config` y mostrar JSON estructurado
- **Why:** Ver configuración actual en formato estructurado
- **Verify:** `pt show run --device R1 --parse` devuelve JSON válido

#### Task 61: Implementar comando `pt show ip route`
- **File:** `apps/pt-cli/src/commands/show-route.ts`
- **What:** Parsear `show ip route` y mostrar tabla de rutas
- **Why:** Ver tabla de enrutamiento formateada

#### Task 62: Implementar comando `pt show vlan`
- **File:** `apps/pt-cli/src/commands/show-vlan.ts`
- **What:** Parsear `show vlan` y mostrar VLANs
- **Why:** Ver VLANs configuradas

#### Task 63: Implementar comando `pt show cdp neighbors --save-topology`
- **File:** `apps/pt-cli/src/commands/show-cdp.ts`
- **What:** Parsear CDP y guardar en SQLite
- **Why:** Descubrir y persistir topología
- **Verify:** `pt show cdp neighbors --device R1 --save-topology` guarda relaciones

---

### Wave 10: Integration & Tests

#### Task 64: Integrar Transaction con Memory
- **File:** `packages/ios-domain/src/session/integration.ts`
- **What:** Conectar Transaction.execute() con MemoryStore para logging automático
- **Why:** Persistir cada paso de transacción
- **Verify:** Transacción exitosa guarda entries en command_history

#### Task 65: Integrar AuditLogger con Memory
- **File:** `packages/ios-domain/src/session/audit-integration.ts`
- **What:** Conectar AuditLogger con MemoryStore para sincronizar
- **Why:** Tener backup de audit en SQLite

#### Task 66: Tests unitarios para schemas
- **File:** `packages/ios-domain/src/schemas/*.test.ts`
- **What:** Tests para validación de cada schema
- **Why:** Asegurar validación correcta
- **Test:** Configs válidas pasan, configs inválidas fallan con error descriptivo

#### Task 67: Tests unitarios para generadores
- **File:** `packages/ios-domain/src/generators/*.test.ts`
- **What:** Tests para generación de comandos
- **Why:** Asegurar comandos IOS correctos
- **Test:** Output generado coincide con comandos esperados

#### Task 68: Tests unitarios para parsers
- **File:** `packages/ios-domain/src/parsers/*.test.ts`
- **What:** Tests para parsing de outputs
- **Why:** Asegurar extracción correcta
- **Test:** Fixture outputs se parsean correctamente

#### Task 69: Tests de integración para CLI
- **File:** `apps/pt-cli/tests/integration/*.test.ts`
- **What:** Tests end-to-end para comandos CLI
- **Why:** Asegurar flujo completo funciona
- **Test:** Comandos ejecutan con flags correctos

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Rollback falla en algunos comandos | Media | Alto | Detectar comandos irreversibles y advertir antes de ejecutar |
| Parsing de outputs incompleto | Media | Medio | Usar fixtures de outputs reales como tests; fallback a regex genérico|
| Base de datos SQLite corrupta | Baja | Alto | Usar WAL mode; backups automáticos; detección de corrupción |
| Concurrencia en SQLite | Media | Bajo | Usar transacciones SQLite; locks apropiados |
| Comandos CLI inconsistentes | Baja | Medio | Seguir patrón establecido en comandos existentes |

---

## Verification Steps

### Wave 1-3 (Área A)
```bash
# Verificar schemas
bun test packages/ios-domain/src/schemas/

# Verificar generadores
bun test packages/ios-domain/src/generators/

# Verificar parsers
bun test packages/ios-domain/src/parsers/
```

### Wave 4 (Área B)
```bash
# Verificar memoria
bun test packages/core/src/memory/

# Verificar persistencia
pt devices list
pt history search "test"
pt topology show
```

### Wave 5 (Área C)
```bash
# Verificar transacciones
bun test packages/ios-domain/src/session/transaction.test.ts

# Verificar auditoría
pt audit tail --lines 10
pt audit export --format json --output test-audit.json
```

### Wave 6-9 (CLI)
```bash
# Verificar comandos config
pt config ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0" --dry-run
pt config apply configs/test.yaml --dry-run

# Verificar comandos memory
pt devices add TEST --ip 10.0.0.1
pt history search "test"

# Verificar comandos audit
pt audit tail
pt audit failed

# Verificar comandos show
pt show run --device TEST --parse
```

### Wave 10 (Integration)
```bash
# Tests completos
bun test
bun test:integration
```

---

## Archivos Afectados

### Nuevos Archivos (Infraestructura)

| Archivo | Propósito | Wave |
|---------|-----------|------|
| `packages/ios-domain/src/schemas/routing/ospf.ts` | Schema OSPF | 1 |
| `packages/ios-domain/src/schemas/routing/eigrp.ts` | Schema EIGRP | 1 |
| `packages/ios-domain/src/schemas/routing/bgp.ts` | Schema BGP | 1 |
| `packages/ios-domain/src/schemas/routing/static-route.ts` | Schema Static Route | 1 |
| `packages/ios-domain/src/schemas/security/acl.ts` | Schema ACL | 1 |
| `packages/ios-domain/src/schemas/security/nat.ts` | Schema NAT | 1 |
| `packages/ios-domain/src/schemas/switching/vlan.ts` | Schema VLAN | 1 |
| `packages/ios-domain/src/schemas/interface.ts` | Schema Interface | 1 |
| `packages/ios-domain/src/schemas/services/dhcp.ts` | Schema DHCP | 1 |
| `packages/ios-domain/src/generators/*.ts` | Generadores | 2 |
| `packages/ios-domain/src/parsers/*.ts` | Parsers | 3 |
| `packages/core/src/memory/schema.ts` | Schema SQLite | 4 |
| `packages/core/src/memory/devices.ts` | DeviceMemory | 4 |
| `packages/core/src/memory/audit.ts` | AuditMemory | 4 |
| `packages/core/src/memory/topology.ts` | TopologyMemory | 4 |
| `packages/core/src/memory/preferences.ts` | PreferencesStore | 4 |
| `packages/core/src/memory/index.ts` | MemoryStore | 4 |
| `packages/ios-domain/src/session/transaction.ts` | Transaction | 5 |
| `packages/ios-domain/src/session/transaction-builder.ts` | TransactionBuilder | 5 |
| `packages/ios-domain/src/session/audit-log.ts` | AuditLogger | 5 |
| `apps/pt-cli/src/commands/config-*.ts` | Comandos config | 6 |
| `apps/pt-cli/src/commands/devices-*.ts` | Comandos devices | 7 |
| `apps/pt-cli/src/commands/history-*.ts` | Comandos history | 7 |
| `apps/pt-cli/src/commands/topology-*.ts` | Comandos topology | 7 |
| `apps/pt-cli/src/commands/audit-*.ts` | Comandos audit | 8 |
| `apps/pt-cli/src/commands/show-*.ts` | Comandos show | 9 |

### Archivos Modificados

| Archivo | Cambio | Wave |
|---------|--------|------|
| `packages/ios-domain/src/index.ts` | Exportar nuevos schemas/generators/parsers | 1-3 |
| `packages/core/src/context/index.ts` | Integrar MemoryStore | 4 |
| `apps/pt-cli/src/index.ts` | Registrar nuevos comandos | 6-9 |

---

## Timeline Estimate

| Wave | Tasks | Est. Time |
|------|-------|-----------|
| 1 | 11 | 1-2 días |
| 2 | 12 | 1-2 días |
| 3 | 7 | 1 día |
| 4 | 7 | 1 día |
| 5 | 3 | 0.5 días |
| 6 | 8 | 1 día |
| 7 | 6 | 0.5 días |
| 8 | 3 | 0.5 días |
| 9 | 4 | 0.5 días |
| 10 | 6 | 1 día |
| **Total** | **69** | **8-10 días** |
