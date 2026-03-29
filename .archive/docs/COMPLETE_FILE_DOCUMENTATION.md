# Cisco Auto - Documentación Completa de Todos los Archivos

**Proyecto:** cisco-auto  
**Descripción:** Automatización de laboratorios Cisco Packet Tracer  
**Total de archivos:** 1097+ archivos documentados  
**Fecha:** Marzo 2026  

> **Nota:** Este documento incluye TODOS los archivos del proyecto, organizados por directorio. Si buscas un archivo específico, usa Ctrl+F/Cmd+F para buscarlo.  

---

## 📁 Tabla de Contenidos

1. [Root Level](#root-level)
2. [Apps/](#apps-directory)
3. [Packages/Core/](#packagescore)
4. [Packages/PT-Control-V2/](#packagespt-control-v2)
5. [Packages/Tools/](#packagestools)
6. [Packages/Templates/](#packagestemplates)
7. [Scripts/](#scripts-directory)
8. [Tests/](#tests-directory)
9. [Docs/](#docs-directory)
10. [Labs/](#labs-directory)
11. [Configs/](#configs-directory)
12. [PT-Extension/](#pt-extension-directory)
13. [AI Skills (.iflow, .gemini, .claude, .agents)](#ai-skills-directories)
14. [.Sisyphus/](#sisyphus-directory)
15. [Assets/](#assets-directory)

---

## 📂 ROOT LEVEL

### Archivos de Configuración

| Archivo | Descripción |
|---------|-------------|
| `package.json` | Configuración raíz del monorepo con workspaces. Define scripts: start, dev, test, build, typecheck, cisco-auto, pt, pt:test. Dependencias: @cisco-auto/core, @cisco-auto/api, @cisco-auto/lab-model, @cisco-auto/tools, fast-xml-parser, pino, zod |
| `tsconfig.json` | Configuración TypeScript compartida. Usa lib ESNext, module Preserve, strict mode, verbatimModuleSyntax, noEmit. Exclude: tests, node_modules, dist |
| `bun.lock` | Lock file del package manager Bun (binario) |
| `.gitignore` | Patrones de exclusión para Git: node_modules, dist, .DS_Store, logs, configs generados |
| `skills-lock.json` | Version lock para skills de IA instaladas |

### Documentación Principal

| Archivo | Descripción |
|---------|-------------|
| `README.md` | Documentación principal del proyecto. Incluye: características, instalación, uso de CLI, integración con IA, estructura del proyecto, contribución. Enfoque en pt-control-v2 para flujos nuevos |
| `PRD.md` | Product Requirements Document - especificación de requisitos del producto |
| `CLAUDE.md` | Instrucciones específicas para Claude Code (AI assistant) |
| `GEMINI.md` | Instrucciones específicas para Gemini CLI (AI assistant) |
| `QWEN.md` | Memoria y aprendizajes del proyecto para Qwen Code. Incluye bugs fixeados, decisiones técnicas, patrones |
| `AGENTS.md` | Reglas globales para todos los agentes IA. Define prioridad: CLI primero, archivos antes que teoría, skills como base de conocimiento, Engram como memoria |
| `PT_CONTROL_SUMMARY.md` | Resumen técnico de PT Control v2 |
| `PROJECT_STRUCTURE.md` | Estructura del proyecto con descripción de carpetas principales |
| `LICENSE` | Licencia MIT del proyecto |

---

## 📂 APPS/ DIRECTORY

### apps/cli/ - Aplicación CLI Principal

| Archivo | Descripción |
|---------|-------------|
| `apps/cli/package.json` | Configuración del paquete CLI. Binario: cisco-auto. Depende de: @cisco-auto/core, @cisco-auto/bridge, @cisco-auto/pt-control-v2, @cisco-auto/templates, @cisco-auto/tools, chalk, commander, pino, zod |
| `apps/cli/src/index.ts` | Entry point de la CLI. Usa Commander.js para definir comandos: lab, device, topology, config, stp, legacy. Maneja exit codes y help |
| `apps/cli/src/flags.ts` | Definición de flags globales para la CLI |
| `apps/cli/src/errors/index.ts` | Sistema de errores y códigos de salida |
| `apps/cli/src/commands/lab/index.ts` | Comando `lab` - operaciones con laboratorios YAML |
| `apps/cli/src/commands/parse.ts` | Comando legacy para parsear archivos .pka/.yaml |
| `apps/cli/src/commands/validate.ts` | Comando legacy para validar laboratorios |
| `apps/cli/src/commands/devices.ts` | Comando legacy para listar dispositivos |
| `apps/cli/src/commands/deploy.ts` | Comando legacy para desplegar configuraciones |
| `apps/cli/src/commands/init.ts` | Comando para inicializar proyecto |
| `apps/cli/src/commands/template.ts` | Comando para trabajar con templates |
| `apps/cli/src/commands/serve.ts` | Comando para iniciar servidor |
| `apps/cli/src/commands/completion.ts` | Generación de scripts de autocompletado |
| `apps/cli/src/commands/config.ts` | Comando para generar configuraciones IOS |
| `apps/cli/src/commands/stp.ts` | Comando para configuración STP |
| `apps/cli/src/commands/device/index.ts` | Comando `device` - gestión de dispositivos PT |
| `apps/cli/src/commands/topology/index.ts` | Comando `topology` - planificación y validación |
| `apps/cli/src/commands/acl.ts` | Comando para configuración de ACLs |
| `apps/cli/src/commands/vlan.ts` | Comando para configuración de VLANs |
| `apps/cli/src/commands/routing.ts` | Comando para configuración de enrutamiento |
| `apps/cli/src/commands/services.ts` | Comando para servicios de red |

---

## 📂 PACKAGES/CORE/

### packages/core/package.json
Configuración del paquete core. Exporta: parser/*, types/*, config-generators/*, topology/*, canonical/*, executor/*, models/*, validation/*. Depende de: @cisco-auto/lab-model, chalk, node-ssh, pino, zod

### packages/core/src/index.ts
Exporta todos los módulos del core: yaml-parser, validation, topology, canonical, executor, config-generators, config, context

### packages/core/src/canonical/ - Modelo Canónico (COMPLETO)

| Archivo | Descripción |
|---------|-------------|
| `types.ts` | **TIPOS CANÓNICOS UNIFICADOS** - DeviceType (30+ tipos), DeviceFamily, CableType, Connection. Funciones: getDeviceFamily() |
| `device.spec.ts` | Especificaciones de dispositivo: DeviceSpec, InterfaceSpec, VLANSpec, RoutingSpec, SecuritySpec |
| `lab.spec.ts` | Especificaciones de laboratorio canónico |
| `connection.spec.ts` | Especificaciones de conexión |
| `protocol.spec.ts` | Especificaciones de protocolo |
| `index.ts` | Exporta todos los tipos canónicos |

### packages/core/src/types/ - Tipos TypeScript (COMPLETO)

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta todos los tipos |
| `tool.ts` | Tool, ToolInput, ToolResult interfaces |
| `lab.ts` | Tipos para laboratorios |
| `common.ts` | Tipos comunes compartidos |
| `device.ts` | Tipos para dispositivos |
| `protocols.ts` | Tipos para protocolos de red |
| `security.ts` | Tipos para seguridad |
| `topology.ts` | Tipos para topología |

### packages/core/src/config/ - Carga de Configuración (COMPLETO)

| Archivo | Descripción |
|---------|-------------|
| `types.ts` | ConfigFormat, ConfigLoader, LabConfig |
| `loader.ts` | Cargador de archivos YAML/JSON con variables de entorno |
| `resolver.ts` | Resuelve referencias y variables en configuraciones |
| `index.ts` | Exporta loader, types, resolver |

### packages/core/src/parser/ - Parsers

| Archivo | Descripción |
|---------|-------------|
| `yaml-parser.ts` | Parser de archivos YAML de laboratorios con validación Zod |

### packages/core/src/topology/ - Topología

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta analyzer, visualizer |
| `visualizer.ts` | Genera visualizaciones de topología |

### packages/core/src/executor/ - Ejecutor (COMPLETO)

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta ejecutores |
| `validation.executor.ts` | Ejecutor de validación de laboratorios |
| `deploy.orchestrator.ts` | Orquestador de despliegue de configuraciones |
| `types.ts` | Tipos para ejecutores |

### packages/core/src/connector/ - Conectores

| Archivo | Descripción |
|---------|-------------|
| `ssh-connector.ts` | Conector SSH para dispositivos reales con node-ssh |

### packages/core/src/schemas/ - Schemas Zod

| Archivo | Descripción |
|---------|-------------|
| `tool.ts` | Schemas Zod para herramientas |

### packages/core/src/catalog/ - Catálogo de Dispositivos (COMPLETO)

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta todos los catálogos |
| `switches.ts` | Catálogo de switches Cisco con puertos y capacidades |
| `routers.ts` | Catálogo de routers Cisco con interfaces |
| `modules.ts` | Módulos de expansión para dispositivos |
| `end-devices.ts` | PCs, laptops, servers, printers, IP phones |
| `service.ts` | Servicios de red disponibles |
| `schema.ts` | Schema Zod para catálogo |
| `wireless-security.ts` | Configuraciones de seguridad wireless |

### packages/core/src/config-generators/ - Generadores IOS (COMPLETO)

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta todos los generadores |
| `base-generator.ts` | Configuración básica: hostname, banner, service password-encryption, lines |
| `ios-generator.ts` | **GENERADOR PRINCIPAL** - Orquesta generadores, orden de secciones configurable |
| `ios-generator.test.ts` | Tests para IOS generator |
| `vlan-generator.ts` | VLANs, VTP, trunk ports, access ports |
| `routing-generator.ts` | OSPF, EIGRP, BGP con validación de router-id |
| `routing-generator.test.ts` | Tests para routing generator |
| `security-generator.ts` | ACLs estándar/extendidas, NAT (FIX: protocolo en standard ACLs) |
| `security-generator.test.ts` | Tests para security generator |
| `port-template.generator.ts` | Templates de puertos switch por modelo |
| `port-template.generator.test.ts` | Tests para port template |
| `config-differ.ts` | Diff running-config vs desired-config, rollback scripts |
| `config-differ.test.ts` | Tests para config differ |
| `utils.ts` | CIDR a subnet mask (FIX: safe arithmetic), wildcard mask |
| `utils.test.ts` | Tests para utils |
| `services.generator.ts` | Generador de servicios (DHCP, DNS, etc.) |
| `ipv6.generator.ts` | Generador de configuración IPv6 |
| `etherchannel.generator.ts` | Generador de EtherChannel (LACP/PAgP) |
| `stp.generator.ts` | Generador de STP (RSTP, MSTP) |
| `advanced-routing.generator.ts` | Generador de enrutamiento avanzado |

### packages/core/src/canonical/ - Modelo Canónico de Red

| Archivo | Descripción |
|---------|-------------|
| `canonical/types.ts` | **TIPOS CANÓNICOS UNIFICADOS** - Única fuente de verdad para DeviceType, DeviceFamily, CableType, Connection. Define 30+ tipos de dispositivos (router, switch, multilayer-switch, hub, access-point, pc, laptop, server, IoT, etc.). Funciones: getDeviceFamily(), getDeviceFamilyFromType() |
| `canonical/device.spec.ts` | Especificaciones de dispositivos canónicos. Define interfaces para DeviceSpec, InterfaceSpec, VLANSpec, RoutingSpec, SecuritySpec |
| `canonical/index.ts` | Exporta tipos y specs canónicos |

### packages/core/src/config/ - Carga de Configuración

| Archivo | Descripción |
|---------|-------------|
| `config/types.ts` | Tipos para carga de configuración: ConfigFormat, ConfigLoader, LabConfig |
| `config/loader.ts` | Cargador de archivos de configuración YAML/JSON. Soporta variables de entorno |
| `config/resolver.ts` | Resuelve referencias y variables en configuraciones |
| `config/index.ts` | Exporta loader, types, resolver |

### packages/core/src/config-generators/ - Generadores de Configuración IOS

| Archivo | Descripción |
|---------|-------------|
| `base-generator.ts` | Clase base para generadores. Genera configuración básica: hostname, banner, service password-encryption, lines (console, vty) |
| `ios-generator.ts` | **GENERADOR PRINCIPAL IOS** - Orquesta todos los generadores. Soporta orden personalizado de secciones (basic, vlans, vtp, interfaces, routing, security, lines). DEFAULT_SECTION_ORDER configurable |
| `ios-generator.test.ts` | Tests para IOS generator |
| `vlan-generator.ts` | Genera configuración de VLANs: create vlan, name, VTP (domain, mode, version), interface assignments, trunk ports (allowed VLANs, encapsulation dot1q) |
| `routing-generator.ts` | Genera configuración de enrutamiento: OSPF (router-id, network, areas, stub, nssa), EIGRP (autonomous-system, network), BGP (neighbor, network, address-family). Valida router-id formato IPv4 |
| `routing-generator.test.ts` | Tests para routing generator |
| `security-generator.ts` | Genera configuración de seguridad: ACLs estándar y extendidas (permit/deny, protocol, source/dest, ports), NAT (static, dynamic, overload). **FIX:** Removido protocolo de ACLs estándar |
| `security-generator.test.ts` | Tests para security generator |
| `port-template.generator.ts` | **GENERADOR DE PLANTILLAS DE PUERTOS** - Proporciona templates para switch ports por modelo: access, trunk, voice, guest, management, server, uplink, shutdown. Incluye validación y descubrimiento de puertos desde switch catalog |
| `port-template.generator.test.ts` | Tests para port template generator |
| `config-differ.ts` | **DIFF DE CONFIGURACIONES** - Compara running-config vs desired-config. Genera comandos added/removed, scripts de rollback, identifica secciones afectadas. Soporta ignore comments/blank/case |
| `config-differ.test.ts` | Tests para config differ |
| `utils.ts` | Utilidades para generadores: CIDR a subnet mask (FIX: safe arithmetic operations), wildcard mask calculation, IP validation |
| `utils.test.ts` | Tests para utils |
| `index.ts` | Exporta todos los generadores |

### packages/core/src/validation/ - Validación

| Archivo | Descripción |
|---------|-------------|
| `device-spec.validator.ts` | **VALIDADOR DE ESPECIFICACIONES** - Valida ANTES de generar: interfaces (nombres válidos, existen en dispositivo, IPs válidas, VLANs), VLANs (IDs 1-4094, duplicados, nombres), routing (OSPF/EIGRP/BGP router IDs, ASNs), security (ACL rules), topology (duplicate IPs/router IDs across devices). 32+ tests |
| `device-spec.validator.test.ts` | Tests exhaustivos para device spec validator |
| `lab.validator.ts` | Valida laboratorios completos: conectividad, VLANs, enrutamiento, consistencia |
| `index.ts` | Exporta validadores y tipos: ValidationResult, ValidationIssue |

### packages/core/src/context/ - Contexto de Red

| Archivo | Descripción |
|---------|-------------|
| `context.ts` | Gestiona contexto de red: dispositivos, enlaces, configuraciones activas |
| `context.test.ts` | Tests para contexto |
| `types.ts` | Tipos para contexto: NetworkContext, ContextState |
| `index.ts` | Exporta contexto y tipos |

### packages/core/src/types/

| Archivo | Descripción |
|---------|-------------|
| `tool.ts` | Definición de herramientas: Tool, ToolInput, ToolResult interfaces |

### packages/core/src/parser/

| Archivo | Descripción |
|---------|-------------|
| `yaml-parser.ts` | Parser de archivos YAML de laboratorios. Valida schema con Zod |

### packages/core/src/topology/

| Archivo | Descripción |
|---------|-------------|
| `analyzer.ts` | Analiza topologías: reachability, paths, bottlenecks |
| `visualizer.ts` | Genera visualizaciones de topología |
| `index.ts` | Exporta analyzer, visualizer |

### packages/core/src/executor/

| Archivo | Descripción |
|---------|-------------|
| `ssh-executor.ts` | Ejecuta comandos SSH en dispositivos reales |
| `telnet-executor.ts` | Ejecuta comandos Telnet (fallback) |
| `executor.ts` | Orquestador de ejecución |
| `index.ts` | Exporta ejecutores |

### packages/core/src/catalog/ - Catálogo de Dispositivos

| Archivo | Descripción |
|---------|-------------|
| `switches.ts` | Catálogo de switches Cisco con puertos y capacidades |
| `routers.ts` | Catálogo de routers Cisco con interfaces |
| `index.ts` | Exporta catálogos |

---

## 📂 PACKAGES/PT-CONTROL-V2/

### packages/pt-control-v2/package.json
CLI profesional para controlar Packet Tracer. Versión 2.0.0. Binario: `pt`. Usa oclif para CLI. Comandos: device, link, config, runtime, snapshot, record, trunk, vlan, ssh. Exporta: controller, vdom, parsers, types, logging

### packages/pt-control-v2/src/index.ts
Exporta: PTController, FileBridgeV2, VirtualTopology, parsers (show commands), RuntimeGenerator, LogManager, CliSession, IOS capabilities

### packages/pt-control-v2/src/controller/ - Controlador PT

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta PTController, createPTController, createDefaultPTController, PTControllerConfig |
| `pt-controller.ts` | Controlador de alto nivel para PT. Coordina FileBridge, VirtualTopology, validación |

### packages/pt-control-v2/src/vdom/ - Virtual DOM (Event-Driven Topology)

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | **VirtualTopology** - Mantiene estado espejo de topología PT. Métodos: getSnapshot() con structuredClone (FIX: sin caching bug), getDevice(), getLink(), applyEvent(), subscribe(). Handlers de eventos con label y timestamp |
| `twin-adapter.ts` | Adapta snapshot de topología a NetworkTwin. Enriquece con zones |
| `__tests__/virtual-topology.test.ts` | Tests para VirtualTopology |

### packages/pt-control-v2/src/validation/ - Motor de Validación

| Archivo | Descripción |
|---------|-------------|
| `validation-engine.ts` | **ValidationEngine** - Ejecuta reglas de validación. Features: caching con TTL=5s, MAX_SIZE=100, try/catch para errores de reglas (produce RULE_ERROR diagnostics), metadata (durationMs, rulesExecuted, cacheHit) |
| `validation-context.ts` | Contexto para validación: mutation, topology, config |
| `validation-engine.test.ts` | Tests para validation engine |
| `diagnostic.ts` | Tipos para diagnósticos: Diagnostic, DiagnosticSeverity, DiagnosticCode |
| `rule.ts` | Clase base para reglas de validación. Función ruleApplies() |
| `policies.ts` | Políticas de validación: ValidationPolicy, shouldBlock() |
| `reactive-topology.ts` | **ReactiveTopology** - Auto-validación con debounce. Integra ValidationEngine. Emite eventos de validación |
| `index.ts` | Exporta engine, context, rules, policies |

### packages/pt-control-v2/src/validation/rules/ - Reglas de Validación

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta todas las reglas |
| `vlan-exists.rule.ts` | Valida que VLANs existen antes de asignar. getDeviceVlans() verifica config.global + puertos + SVIs |
| `gateway-reachability.rule.ts` | Valida reachability de gateway: verifica subnet, existe gateway, path BFS, links L2. Funciones: ipToInt(), hasPath(), subnet check |
| `gateway-subnet.rule.ts` | Valida que gateway está en la misma subnet |
| `duplicate-ip.rule.ts` | Detecta IPs duplicadas en la topología |
| `subnet-mask.rule.ts` | Valida formato de subnet mask |
| `subnet-overlap.rule.ts` | Detecta subnets overlap |
| `loop-detection.rule.ts` | **DETECCIÓN DE LOOPS** - DFS para ciclos L2. Detecta dispositivos L2, verifica STP habilitado. 222 líneas |
| `acl-match-order.rule.ts` | Valida orden de ACLs (deny/permit secuencing) |
| `nat-overlap.rule.ts` | Valida que NAT no overlap con IPs internas |
| `no-shutdown-expected.rule.ts` | Verifica estado shutdown esperado en interfaces |
| `running-not-saved.rule.ts` | Detecta running-config diferente de saved-config |

### packages/pt-control-v2/src/infrastructure/pt/ - Infraestructura Packet Tracer

| Archivo | Descripción |
|---------|-------------|
| `file-bridge-v2.ts` | **FILE BRIDGE V2** - Bridge durable para comunicación con PT. Features: commands como archivos individuales, results en results/<id>.json, NDJSON append-only, consumer con byteOffset persistente, single-instance lease, sequence numbers, crash recovery, exponential backoff, dead-letter queue, garbage collector. 902 líneas |
| `file-bridge-v2-commands.ts` | Comandos del bridge: pushCommands(), pushCode() |
| `file-bridge-v2.test.ts` | Tests para file bridge |
| `consumer-file-resolver.ts` | Resuelve archivos para el consumer |
| `durable-ndjson-consumer.ts` | Consumer de eventos NDJSON durable. Persiste byteOffset + lastSeq |
| `event-log-writer.ts` | Escritor de logs de eventos en NDJSON |
| `topology-cache.ts` | Cache de topología para rendimiento |

### packages/pt-control-v2/src/infrastructure/pt/shared/

| Archivo | Descripción |
|---------|-------------|
| `protocol.ts` | Protocolo de comunicación: BridgeCommandEnvelope, BridgeResultEnvelope, BridgeEvent, BridgeLease |
| `path-layout.ts` | Layout de paths para archivos del bridge |
| `sequence-store.ts` | Almacenamiento de números de secuencia |
| `fs-atomic.ts` | Operaciones atómicas de filesystem |

### packages/pt-control-v2/src/infrastructure/pt/consumer/

| Archivo | Descripción |
|---------|-------------|
| `reading.test.ts` | Tests de lectura de eventos |
| `checkpoint.test.ts` | Tests de checkpoints |
| `gaps.test.ts` | Tests de detección de gaps |
| `resilience.test.ts` | Tests de resiliencia |
| `helpers.ts` | Helpers para consumer |

### packages/pt-control-v2/src/domain/ios/ - Dominio IOS (COMPLETO)

#### sessions/
| Archivo | Descripción |
|---------|-------------|
| `cli-session.ts` | **CliSession** - Sesión CLI stateful para IOS (user, privileged, global config, interface) |
| `command-result.ts` | CommandResult, createSuccessResult, createErrorResult, isSuccessResult, isErrorResult, isPagingResult, classifyOutput |
| `prompt-state.ts` | InferPromptState, IosMode, PromptState |

#### operations/
| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta operaciones |
| `configure-vlan.ts` | Operación para configurar VLANs |
| `configure-trunk-port.ts` | Operación para configurar puertos trunk |
| `configure-svi.ts` | Operación para configurar SVIs |
| `configure-subinterface.ts` | Operación para configurar subinterfaces |
| `configure-static-route.ts` | Operación para configurar rutas estáticas |
| `configure-dhcp-relay.ts` | Operación para configurar DHCP relay |
| `configure-dhcp-pool.ts` | Operación para configurar DHCP pool |
| `configure-access-port.ts` | Operación para configurar puertos de acceso |
| `command-plan.ts` | Planificación de comandos IOS |

#### parsers/
| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta todos los parsers |
| `show-ip-interface-brief.parser.ts` | Parser para `show ip interface brief` |
| `show-vlan.parser.ts` | Parser para `show vlan brief` |
| `show-ip-route.parser.ts` | Parser para `show ip route` |
| `show-running-config.parser.ts` | Parser para `show running-config` |
| `show-interfaces.parser.ts` | Parser para `show interfaces` |
| `show-ip-arp.parser.ts` | Parser para `show ip arp` |
| `show-mac-address-table.parser.ts` | Parser para `show mac address-table` |
| `show-spanning-tree.parser.ts` | Parser para `show spanning-tree` |
| `show-version.parser.ts` | Parser para `show version` |
| `show-cdp-neighbors.parser.ts` | Parser para `show cdp neighbors` |

#### value-objects/
| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta value objects |
| `ipv4-address.ts` | Value object para IPv4 con validación |
| `subnet-mask.ts` | Value object para subnet mask |
| `vlan-id.ts` | Value object para VLAN ID (1-4094) |
| `interface-name.ts` | Value object para nombres de interfaz |
| `route-target.ts` | Value object para route targets |

#### capabilities/
| Archivo | Descripción |
|---------|-------------|
| `pt-capability-resolver.ts` | **resolveCapabilities()** - Resuelve capacidades de dispositivo PT |
| `device-capabilities.ts` | IOSFamily, IosDeviceModel, capacidades por modelo |
| `capability-set.ts` | Conjunto de capacidades |

### packages/pt-control-v2/src/exercise/ - Motor de Ejercicios

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta exercise engine |
| `exercise-engine.ts` | Motor de ejercicios interactivos |
| `tutor-engine.ts` | Tutor para ejercicios guiados |
| `lab-exercise.ts` | Definición de ejercicios de laboratorio |
| `hint.ts` | Sistema de pistas para ejercicios |

### packages/pt-control-v2/src/grading/ - Sistema de Calificación

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta grading engine |
| `grading-engine.ts` | **GradingEngine** - Califica configuraciones de estudiantes |
| `progress-tracker.ts` | Rastrea progreso del estudiante |
| `rubric-item.ts` | Ítems de rúbrica para calificación |

### packages/pt-control-v2/src/domain/ios/session/

| Archivo | Descripción |
|---------|-------------|
| `cli-session.ts` | Implementación de CliSession. CommandHandler, CommandHistoryEntry, CliSessionState |
| `command-result.ts` | CommandResult, createSuccessResult, createErrorResult, isSuccessResult, isErrorResult, isPagingResult, isConfirmPrompt, isPasswordPrompt, classifyOutput |
| `prompt-state.ts` | InferPromptState, IosMode, PromptState |

### packages/pt-control-v2/src/domain/ios/parsers/ - Parsers de IOS

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta todos los parsers |
| `show-ip-interface-brief.parser.ts` | Parser para `show ip interface brief` |
| `show-vlan.parser.ts` | Parser para `show vlan brief` |
| `show-ip-route.parser.ts` | Parser para `show ip route` |
| `show-running-config.parser.ts` | Parser para `show running-config` |
| `show-interfaces.parser.ts` | Parser para `show interfaces` |
| `show-ip-arp.parser.ts` | Parser para `show ip arp` |
| `show-mac-address-table.parser.ts` | Parser para `show mac address-table` |
| `show-spanning-tree.parser.ts` | Parser para `show spanning-tree` |
| `show-version.parser.ts` | Parser para `show version` |
| `show-cdp-neighbors.parser.ts` | Parser para `show cdp neighbors` |

### packages/pt-control-v2/src/domain/ios/operations/

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta operaciones |
| `configure-vlan.ts` | Operación para configurar VLANs |
| `configure-trunk-port.ts` | Operación para configurar puertos trunk |
| `configure-svi.ts` | Operación para configurar SVIs |

### packages/pt-control-v2/src/domain/ios/value-objects/

| Archivo | Descripción |
|---------|-------------|
| `ipv4-address.ts` | Value object para IPv4 con validación |
| `ipv4-address.test.ts` | Tests para IPv4 address |
| `subnet-mask.ts` | Value object para subnet mask |
| `subnet-mask.test.ts` | Tests para subnet mask |
| `vlan-id.ts` | Value object para VLAN ID (1-4094) |
| `vlan-id.test.ts` | Tests para VLAN ID |
| `interface-name.ts` | Value object para nombres de interfaz |
| `route-target.ts` | Value object para route targets |

### packages/pt-control-v2/src/domain/ios/capabilities/

| Archivo | Descripción |
|---------|-------------|
| `pt-capability-resolver.ts` | **resolveCapabilities()** - Resuelve capacidades de dispositivo PT. DeviceCapabilities |
| `device-capabilities.ts` | IOSFamily, IosDeviceModel, definición de capacidades por modelo |
| `capability-resolver.ts` | Lógica de resolución de capacidades |
| `capability-resolver.test.ts` | Tests para capability resolver |
| `capability-set.ts` | Conjunto de capacidades |
| `capability-set.test.ts` | Tests para capability set |

### packages/pt-control-v2/src/domain/ios/parsers/

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta parsers |

### packages/pt-control-v2/src/application/ - Capa de Aplicación

| Archivo | Descripción |
|---------|-------------|
| `ports/file-bridge.port.ts` | Puerto para FileBridge operations |
| `services/command.service.ts` | Servicio de ejecución de comandos |
| `services/command.service.test.ts` | Tests para command service |

### packages/pt-control-v2/src/runtime-generator/ - Generador de Runtime

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta RuntimeGenerator, runGenerator, renderMainSource, renderRuntimeSource, templates |
| `compose.ts` | Composición de runtime |
| `generator.test.ts` | Tests para generator |

### packages/pt-control-v2/src/runtime-generator/handlers/

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta handlers |
| `canvas.ts` | Handler para operaciones de canvas PT |
| `config.ts` | Handler para configuración |
| `device.ts` | Handler para dispositivos |
| `link.ts` | Handler para enlaces |
| `module.ts` | Handler para módulos |
| `inspect.ts` | Handler para inspección |

### packages/pt-control-v2/src/runtime-generator/templates/

| Archivo | Descripción |
|---------|-------------|
| `main.ts` | Template para main.js |
| `runtime.ts` | Template para runtime.js |

### packages/pt-control-v2/src/runtime-generator/utils/

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta utils |
| `constants.ts` | Constantes del generator |
| `parser-generator.ts` | Generador de parsers |

### packages/pt-control-v2/src/intent/ - Procesamiento de Intents

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta intent processing |
| `blueprint-builder.ts` | Constructor de blueprints desde intents |
| `intent-parser.ts` | Parser de lenguaje natural a intents |
| `templates.ts` | Templates de intents |

### packages/pt-control-v2/src/lesson/ - Motor de Lecciones

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta lesson engine |
| `lesson-engine.ts` | Motor de lecciones interactivas |
| `curriculum-manager.ts` | Gestor de currículos |
| `demo-step.ts` | Pasos de demostración |
| `theory-block.ts` | Bloques de teoría |

### packages/pt-control-v2/src/logging/ - Logging NDJSON

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta LogManager, getLogManager, resetLogManager, tipos |
| `log-manager.ts` | **LogManager** - Gestiona logs NDJSON con sesiones. Query, stats, filtering |
| `log-manager.test.ts` | Tests para log manager |
| `sanitizer.ts` | Sanitiza logs (remueve secrets) |
| `types.ts` | LogEntry, LogSession, LogConfig, LogQueryOptions, LogStats |

### packages/pt-control-v2/src/query/ - Query Engine

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta query engine |
| `twin-query-engine.ts` | Query engine para digital twin |

### packages/pt-control-v2/src/simulation/ - Simulación

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta simulación |
| `impact-simulator.ts` | Simula impacto de cambios |
| `sandbox-twin.ts` | Digital twin para sandbox |

### packages/pt-control-v2/src/suggestion/ - Motor de Sugerencias

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta suggestion engine |
| `suggestion-engine.ts` | Genera sugerencias inteligentes |

### packages/pt-control-v2/src/tools/

| Archivo | Descripción |
|---------|-------------|
| `event-log.ts` | Tool para consultar event logs |

### packages/pt-control-v2/src/utils/

| Archivo | Descripción |
|---------|-------------|
| `ios-commands.ts` | Utilidades para construir comandos IOS: buildVlanCommands, buildTrunkCommands, buildSshCommands |

### packages/pt-control-v2/src/shared/

| Archivo | Descripción |
|---------|-------------|
| `utils/helpers.ts` | Helpers compartidos |

### packages/pt-control-v2/src/types/

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Tipos principales: TopologySnapshot, DeviceState, LinkState, PTEvent, CableType, DeviceType, NetworkTwin |

### packages/pt-control-v2/scripts/

| Archivo | Descripción |
|---------|-------------|
| `build.ts` | Script de build para pt-control-v2 |
| `topologia-apply.ts` | **Script de automatización completa** - Descubre y configura topología automáticamente: VLANs, trunks, SSH, IPs. Flags: --dry-run, --verbose |

### packages/pt-control-v2/bin/

| Archivo | Descripción |
|---------|-------------|
| `run.js` | Binario oclif para ejecutar CLI |
| `dev.js` | Binario para modo desarrollo |

### packages/pt-control-v2/tests/ - Tests del Paquete

| Archivo | Descripción |
|---------|-------------|
| `base-command-confirmation.test.ts` | Tests de confirmación de comandos base |
| `base-command-logging.test.ts` | Tests de logging de comandos base |
| `bridge-contract.test.ts` | Tests de contrato del bridge |
| `capability-resolver.test.ts` | Tests para capability resolver |
| `cli.commands.test.ts` | Tests de comandos CLI |
| `config-show.test.ts` | Tests para show config |
| `event-log.test.ts` | Tests para event log |
| `ios-session.test.ts` | Tests para IOS session |
| `ios-validation.test.ts` | Tests para IOS validation |
| `request-confirmation.test.ts` | Tests de confirmación de requests |
| `runtime-generator.test.ts` | Tests para runtime generator |
| `ssh-setup.test.ts` | Tests para setup SSH |
| `vlan-apply.test.ts` | Tests para aplicar VLANs |

### packages/pt-control-v2/tests/domain/ios/capabilities/

| Archivo | Descripción |
|---------|-------------|
| `capability-set.test.ts` | Tests para capability set |

### packages/pt-control-v2/tests/domain/ios/value-objects/

| Archivo | Descripción |
|---------|-------------|
| `ipv4-address.test.ts` | Tests para IPv4 address VO |
| `subnet-mask.test.ts` | Tests para subnet mask VO |
| `vlan-id.test.ts` | Tests para VLAN ID VO |

### packages/pt-control-v2/tests/infrastructure/pt/

| Archivo | Descripción |
|---------|-------------|
| `file-bridge-v2.test.ts` | Tests para file bridge v2 |
| `consumer-file-resolver.test.ts` | Tests para consumer file resolver |
| `durable-ndjson-consumer.test.ts` | Tests para NDJSON consumer |
| `fs-atomic.test.ts` | Tests para operaciones atómicas FS |

### packages/pt-control-v2/tests/infrastructure/pt/consumer/

| Archivo | Descripción |
|---------|-------------|
| `checkpoint.test.ts` | Tests de checkpoints |
| `gaps.test.ts` | Tests de gaps |
| `helpers.ts` | Helpers para tests |
| `reading.test.ts` | Tests de lectura |
| `resilience.test.ts` | Tests de resiliencia |

### packages/pt-control-v2/generated/

| Archivo | Descripción |
|---------|-------------|
| `main.js` | Runtime main.js generado |
| `runtime.js` | Runtime.js generado |

### packages/pt-control-v2/topology-config.example.json
Ejemplo de configuración de topología

---

## 📂 PACKAGES/TOOLS/

### packages/tools/package.json
Herramientas de alto nivel. Exporta: catalog, deploy, topology

### packages/tools/src/index.ts
Exporta todas las herramientas

### packages/tools/src/catalog/ - Catálogo de Dispositivos

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta herramientas de catálogo |
| `list-devices.ts` | Lista dispositivos disponibles con puertos y capacidades |
| `get-device-details.ts` | Obtiene detalles de dispositivo específico |
| `list-templates.ts` | Lista templates disponibles |

### packages/tools/src/deploy/ - Despliegue

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta herramientas de deploy |
| `deploy.ts` | **pt_deploy tool** - Despliega configuraciones a portapapeles o archivo. Une configs de dispositivos, copia al clipboard o guarda en configs/. Soporta configs legacy y nuevo DeployedDevice |
| `generate-configs.ts` | Genera archivos de configuración para deploy |

### packages/tools/src/topology/ - Topología

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exporta herramientas de topología |
| `plan-topology.ts` | **Generador de plan de topología** - Genera DevicePlan, LinkPlan desde parámetros (routerCount, switchCount, pcCount). Asigna IPs automáticamente, selecciona modelos, calcula enlaces |
| `device-name-resolver.ts` | Resuelve nombres de dispositivos a IDs |
| `device-name-resolver.test.ts` | Tests para name resolver |
| `estimate-plan.ts` | Estima complejidad de plan |
| `explain-plan.ts` | Explica plan en lenguaje natural |
| `fix-plan.ts` | Corrige errores en plan |
| `generate-script.ts` | Genera script de automatización desde plan |
| `generate-script.test.ts` | Tests para generate script |
| `validate-plan.ts` | Valida plan de topología |

### packages/tools/src/types/

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Tipos compartidos |

---

## 📂 PACKAGES/TEMPLATES/

### packages/templates/package.json
Templates de laboratorios CCNA y IOS

### packages/templates/src/index.ts
Exporta templates

### packages/templates/src/ccna/

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Templates de laboratorios CCNA |

### packages/templates/src/common/

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Templates comunes |

### packages/templates/src/ios-12/, ios-15/, ios-16/
Templates específicos por versión de IOS

---

## 📂 PACKAGES/API/ (DEPRECADO)

### packages/api/package.json
API legacy (deprecado)

### packages/api/tsconfig.json
Config TypeScript para API

---

## 📂 PACKAGES/LAB-MODEL/

### packages/lab-model/package.json
Modelo de dominio de laboratorios

### packages/lab-model/tsconfig.json
Config TypeScript para lab-model

---

## 📂 PACKAGES/BRIDGE/ (DEPRECADO)

### packages/bridge/package.json
Integración legacy con Packet Tracer (deprecado, usar pt-control-v2)

---

## 📂 PACKAGES/CRYPTO/

### packages/crypto/package.json
Implementación de criptografía Twofish para decodificar .pka

---

## 📂 PACKAGES/DEVICE-CATALOG/

### packages/device-catalog/package.json
Base de datos de equipos Cisco

---

## 📂 PACKAGES/IMPORT-YAML/ (DEPRECADO)

### packages/import-yaml/package.json
Importador YAML legacy (deprecado)

---

## 📂 PACKAGES/IMPORT-PKA/ (DEPRECADO)

### packages/import-pka/package.json
Decodificador PKA legacy (deprecado, solo migraciones)

---

## 📂 PACKAGES/TOPOLOGY/

### packages/topology/package.json
Análisis y visualización de topologías

---

## 📂 SCRIPTS/ DIRECTORY

| Archivo | Descripción |
|---------|-------------|
| `scripts/setup-pt-control.sh` | **Setup script** - Instala PT Control. Verifica Bun, crea ~/pt-dev, copia runtime.js, instala dependencias. Instrucciones post-instalación |
| `scripts/pt-cli.ts` | CLI para controlar PT directamente |
| `scripts/demo-network.ts` | Genera red de demostración |
| `scripts/diagnose-pt.ts` | Diagnóstico de PT |
| `scripts/reload-runtime.ts` | Recarga runtime en PT |
| `scripts/install-bridge-macos.scpt` | Script AppleScript para instalar bridge en macOS |
| `scripts/uninstall-bridge-macos.scpt` | Script AppleScript para desinstalar bridge en macOS |

---

## 📂 TESTS/ DIRECTORY (ROOT)

### tests/unit/ - Tests Unitarios

| Archivo | Descripción |
|---------|-------------|
| `api.test.ts` | Tests de API |
| `catalog.test.ts` | Tests de catálogo |
| `executor.test.ts` | Tests de executor |
| `protocol-generators.test.ts` | Tests de generadores de protocolo |
| `templates.test.ts` | Tests de templates |
| `test-validation.ts` | Utilidades de validación para tests |
| `topology.test.ts` | Tests de topología |
| `validation.test.ts` | Tests de validación |

### tests/cli/ - Tests de CLI

| Archivo | Descripción |
|---------|-------------|
| `commands/acl.test.ts` | Tests de comandos ACL |
| `lab/interactive.test.ts` | Tests interactivos de laboratorio |

### tests/core/ - Tests de Core

### tests/core/registry/

### tests/fixtures/ - Fixtures para tests

### tests/integration/ - Tests de Integración

| Archivo | Descripción |
|---------|-------------|
| `pt-control-v2-integration.test.ts` | Tests de integración PT Control v2 |
| `pt-execute-script.test.ts` | Tests de ejecución de scripts PT |
| `pt-validate-topology.test.ts` | Tests de validación de topología |

### tests/pt-cli.test.ts - Tests de PT CLI

### tests/tools/ - Tests de Herramientas

#### tests/tools/catalog/

| Archivo | Descripción |
|---------|-------------|
| `get-device-details.test.ts` | Tests para get-device-details |
| `list-devices.test.ts` | Tests para list-devices |
| `list-templates.test.ts` | Tests para list-templates |

#### tests/tools/deploy/

| Archivo | Descripción |
|---------|-------------|
| `deploy.test.ts` | Tests para deploy |
| `generate-configs.test.ts` | Tests para generate-configs |

#### tests/tools/topology/

| Archivo | Descripción |
|---------|-------------|
| `estimate-plan.test.ts` | Tests para estimate-plan |
| `explain-plan.test.ts` | Tests para explain-plan |
| `fix-plan.test.ts` | Tests para fix-plan |
| `generate-script.test.ts` | Tests para generate-script |
| `validate-plan.test.ts` | Tests para validate-plan |

---

## 📂 DOCS/ DIRECTORY

| Archivo | Descripción |
|---------|-------------|
| `docs/PT_CONTROL_QUICKSTART.md` | **Guía rápida de PT Control** - Prerrequisitos, instalación, flujo moderno recomendado, ejemplos de comandos (vlan apply, trunk apply, ssh setup, topologia-apply.ts) |
| `docs/REVERSE_ENGINEERING.md` | Ingeniería inversa de archivos .pka: XOR + Twofish CBC + zlib |

---

## 📂 LABS/ DIRECTORY

| Archivo | Descripción |
|---------|-------------|
| `labs/vlan-basico.yaml` | **Laboratorio VLAN básico** - Topología con SW-CORE (VTP Server), SW-ACCESS-1, SW-ACCESS-2 (VTP Clients). VLANs 10 (VENTAS), 20 (MARKETING), 30 (IT), 99 (MANAGEMENT). Trunks, access ports, objetivos, validación |
| `labs/ejemplo-cli.yaml` | Ejemplo de uso de CLI |

---

## 📂 CONFIGS/ DIRECTORY

| Archivo | Descripción |
|---------|-------------|
| `configs/deploy-config.txt` | Plantilla de configuración para deploy |
| `configs/test-config.txt` | Configuración de test |

---

## 📂 PT-EXTENSION/ DIRECTORY

| Archivo | Descripción |
|---------|-------------|
| `pt-extension/main.js` | **PT Script Module** - Entry point del módulo de scripting en Packet Tracer |
| `pt-extension/runtime.js` | Runtime de soporte para PT extension |
| `pt-extension/README.md` | Documentación de la extensión PT |

---

## 📂 PT-LOGS/ DIRECTORY
Logs de ejecución de Packet Tracer (generados automáticamente)

---

## 📂 LOGS/ DIRECTORY
Logs generales del sistema (generados automáticamente)

---

## 📂 TMP/ DIRECTORY
Archivos temporales y build artifacts

---

## 📂 ASSETS/ DIRECTORY

### assets/pt-scripts/

| Archivo | Descripción |
|---------|-------------|
| `bootstrap-remote.js` | Script de bootstrap remoto para PT |
| `bridge-client.js` | Cliente del bridge de comunicación |

---

## 📂 CONFIGS/ DIRECTORY

| Archivo | Descripción |
|---------|-------------|
| `deploy-config.txt` | Plantilla de configuración para deploy |
| `test-config.txt` | Configuración de test |

---

## 📂 LOGS/ Y PT-LOGS/ DIRECTORIES

---

## 📂 AI SKILLS DIRECTORIES

### .iflow/skills/cisco-networking-assistant/ - Skill para iFlow CLI

| Archivo | Descripción |
|---------|-------------|
| `SKILL.md` | **Driver modular para Cisco/Packet Tracer** - Orquestador de flujos. Triggers: menciona PT, configuración, análisis, troubleshooting. Flujo: detectar intención, nivel usuario, archivos, seleccionar modo, apuntar a recursos. Gap detection, Engram integration |
| `assets/checklists/verification.md` | Checklist de verificación post-configuración |
| `assets/templates/vlan-lab-template.yaml` | Template base para laboratorio VLANs |
| `assets/templates/vlan-demo.json` | Demo JSON para VLAN lab |
| `references/cli/missing-capabilities.md` | Capacidades faltantes de CLI |
| `references/cli/pt-commands.md` | Comandos PT de referencia |
| `references/concepts/acl.md` | Teoría de ACLs |
| `references/concepts/eigrp.md` | Teoría de EIGRP |
| `references/concepts/ospf.md` | Teoría de OSPF |
| `references/concepts/stp.md` | Teoría de STP |
| `references/concepts/subnetting.md` | Teoría de subnetting |
| `references/concepts/vlan.md` | Teoría de VLANs |
| `references/devices/packet-tracer-models.md` | Modelos de dispositivos PT |
| `references/devices/routers.md` | Routers Cisco soportados |
| `references/devices/switches.md` | Switches Cisco soportados |
| `references/playbooks/bridge-setup.md` | Playbook de setup del bridge |
| `references/playbooks/common-failures.md` | Playbook de fallos comunes |
| `references/playbooks/pt-runtime.md` | Playbook de runtime PT |
| `references/routing-guide.md` | Guía de enrutamiento |
| `references/security-guide.md` | Guía de seguridad |
| `references/troubleshooting-guide.md` | Guía de troubleshooting |
| `references/validations/routing-checklist.md` | Checklist de validación de routing |
| `references/validations/troubleshooting-checklist.md` | Checklist de troubleshooting |
| `references/validations/vlan-checklist.md` | Checklist de validación de VLANs |
| `references/vlan-guide.md` | Guía completa de VLANs |
| `scripts/bootstrap.js` | Script de bootstrap |
| `scripts/bridge-minimal.js` | Bridge minimal |
| `scripts/bridge-v2.js` | Bridge v2 |
| `scripts/main.js` | Script principal |
| `scripts/ptbuilder-shim.js` | Shim para PTBuilder |
| `templates/efficiency-report.md` | Template de reporte de eficiencia |
| `templates/repeated-flow-report.md` | Template de reporte de flujos repetidos |
| `templates/ticket.md` | Template de ticket |
| `templates/error-report.md` | Template de reporte de errores |

### .gemini/skills/cisco-networking-assistant/ - Skill para Gemini CLI
Misma estructura que .iflow/skills/cisco-networking-assistant/

### .claude/skills/ - Skills para Claude Code
Skills específicas para Claude

### .agents/skills/ - Skills para Agent Framework

#### .agents/skills/cisco-networking-assistant/
Misma estructura que otras skills

#### .agents/skills/skill-creator/

| Archivo | Descripción |
|---------|-------------|
| `SKILL.md` | Skill para crear otras skills |
| `LICENSE.txt` | Licencia |
| `agents/analyzer.md` | Agente analizador |
| `agents/comparator.md` | Agente comparador |
| `agents/grader.md` | Agente evaluador |
| `assets/eval_review.html` | HTML de review de evals |
| `eval-viewer/generate_review.py` | Generador de review Python |
| `eval-viewer/viewer.html` | Viewer de evals |
| `references/schemas.md` | Schemas de referencia |
| `scripts/__init__.py` | Init Python |
| `scripts/aggregate_benchmark.py` | Agrega benchmarks |
| `scripts/generate_report.py` | Genera reportes |
| `scripts/improve_description.py` | Mejora descripciones |
| `scripts/package_skill.py` | Empaqueta skills |
| `scripts/quick_validate.py` | Validación rápida |
| `scripts/run_eval.py` | Ejecuta evals |
| `scripts/run_loop.py` | Loop de ejecución |
| `scripts/utils.py` | Utilidades Python |

---

## 📂 .SISYPHUS/ DIRECTORY - Project Management System

### .sisyphus/boulder.json
Configuración principal de Sisyphus (project management)

### .sisyphus/todos/
| Archivo | Descripción |
|---------|-------------|
| `pt-control-v2-wave1.json` | TODOs para PT Control v2 Wave 1 |

### .sisyphus/plans/ - Planes de Proyecto

| Archivo | Descripción |
|---------|-------------|
| `pt-control-v2-wave1.md` | Plan para PT Control v2 Wave 1 |
| `pt-control-v2-refactor.md` | Plan de refactor de PT Control v2 |
| `pt-control-v2-ios-robustness.md` | Plan para robustez de IOS en PT Control v2 |
| `pt-auto-config.md` | Plan para auto-configuración PT |
| `skill-bridge-auto-install.md` | Plan para auto-instalación de skill bridge |
| `integracion-pt-completa.md` | Plan para integración completa con PT |
| `cli-refactor-mcp-integration.md` | Plan para refactor de CLI con MCP |
| `knowledge-management-system.md` | Plan para sistema de gestión de conocimiento |
| `tickets-2026-03-28.md` | Plan para tickets del 2026-03-28 |

### .sisyphus/notepads/ - Notas de Proyecto

#### notepads/pt-control-v2/
| Archivo | Descripción |
|---------|-------------|
| `issues.md` | Issues de PT Control v2 |
| `problems.md` | Problemas encontrados |
| `decisions.md` | Decisiones técnicas |
| `learnings.md` | Aprendizajes |

#### notepads/pt-control-v2-ios-robustness/
| Archivo | Descripción |
|---------|-------------|
| `issues.md` | Issues de robustez IOS |
| `problems.md` | Problemas |
| `decisions.md` | Decisiones |
| `learnings.md` | Aprendizajes |

#### notepads/pt-control-v2-refactor/
| Archivo | Descripción |
|---------|-------------|
| `issues.md` | Issues de refactor |
| `learnings.md` | Aprendizajes |

#### notepads/pt-auto-config/
| Archivo | Descripción |
|---------|-------------|
| `issues.md` | Issues de auto-config |
| `learnings.md` | Aprendizajes |

#### notepads/knowledge-management-system/
| Archivo | Descripción |
|---------|-------------|
| `issues.md` | Issues del sistema |
| `problems.md` | Problemas |
| `decisions.md` | Decisiones |
| `learnings.md` | Aprendizajes |

#### notepads/cli-refactor-mcp-integration/
| Archivo | Descripción |
|---------|-------------|
| `issues.md` | Issues de refactor CLI |
| `decisions.md` | Decisiones |
| `learnings.md` | Aprendizajes |

#### notepads/integracion-pt-completa/
| Archivo | Descripción |
|---------|-------------|
| `issues.md` | Issues de integración |
| `decisions.md` | Decisiones |
| `learnings.md` | Aprendizajes |

#### notepads/tickets-2026-03-28/
| Archivo | Descripción |
|---------|-------------|
| `issues.md` | Issues de tickets |
| `learnings.md` | Aprendizajes |

#### notepads/skill-bridge-auto-install/
| Archivo | Descripción |
|---------|-------------|
| `decisions.md` | Decisiones |
| `issues.md` | Issues |
| `learnings.md` | Aprendizajes |

### .sisyphus/drafts/
| Archivo | Descripción |
|---------|-------------|
| `pt-control-v2-refactor.md` | Borrador de refactor |

### .sisyphus/evidence/ - Evidencia de Tareas

| Archivo | Descripción |
|---------|-------------|
| `F1-compliance-audit.txt` | Evidencia F1: Auditoría de compliance |
| `F2-code-quality.txt` | Evidencia F2: Calidad de código |
| `F3-manual-qa.txt` | Evidencia F3: QA manual |
| `F4-scope-fidelity.txt` | Evidencia F4: Fidelidad de scope |
| `task-01-help-output.txt` | Evidencia task-01: Help output |
| `task-01-deprecation.txt` | Evidencia task-01: Deprecación |
| `task-02-json-output.txt` | Evidencia task-02: JSON output |
| `task-02-jq-filter.txt` | Evidencia task-02: Filtro jq |
| `task-03-table-output.txt` | Evidencia task-03: Tabla output |
| `task-05-completion.txt` | Evidencia task-05: Completion |
| `task-06-config-file.txt` | Evidencia task-06: Config file |
| `task-06-env-override.txt` | Evidencia task-06: Env override |
| `task-07-help-examples.txt` | Evidencia task-07: Help examples |
| `task-07-see-also.txt` | Evidencia task-07: See also |
| `task-12-context.txt` | Evidencia task-12: Context |
| `task-13-formatter.txt` | Evidencia task-13: Formatter |

---

## 📂 .AGENT/ DIRECTORY

### .agent/skills/skill-creator/
Misma estructura que .iflow/skills/skill-creator/

---

## 📂 .AI/ DIRECTORY
Configuración general para IA

---

## 📂 .GEMINI/ DIRECTORY - Skills para Gemini CLI (COMPLETO)

### .gemini/skills/cisco-networking-assistant/

| Archivo | Descripción |
|---------|-------------|
| `SKILL.md` | Driver modular para Cisco/Packet Tracer (Gemini version) |
| `assets/checklists/verification.md` | Checklist de verificación |
| `references/cli/missing-capabilities.md` | Capacidades faltantes CLI |
| `references/cli/pt-commands.md` | Comandos PT |
| `references/concepts/acl.md` | ACLs |
| `references/concepts/eigrp.md` | EIGRP |
| `references/concepts/ospf.md` | OSPF |
| `references/concepts/stp.md` | STP |
| `references/concepts/subnetting.md` | Subnetting |
| `references/concepts/vlan.md` | VLANs |
| `references/devices/packet-tracer-models.md` | Modelos PT |
| `references/devices/routers.md` | Routers |
| `references/devices/switches.md` | Switches |
| `references/playbooks/bridge-setup.md` | Bridge setup |
| `references/playbooks/common-failures.md` | Fallos comunes |
| `references/playbooks/pt-runtime.md` | PT runtime |
| `references/routing-guide.md` | Routing guide |
| `references/security-guide.md` | Security guide |
| `references/troubleshooting-guide.md` | Troubleshooting guide |
| `references/validations/routing-checklist.md` | Routing checklist |
| `references/validations/troubleshooting-checklist.md` | Troubleshooting checklist |
| `references/validations/vlan-checklist.md` | VLAN checklist |
| `references/vlan-guide.md` | VLAN guide |
| `templates/efficiency-report.md` | Efficiency report |
| `templates/error-report.md` | Error report |
| `templates/repeated-flow-report.md` | Repeated flow report |
| `templates/ticket.md` | Ticket template |

---

## 📂 .IFLOW/ DIRECTORY - Skills para iFlow CLI (COMPLETO)

### .iflow/skills/cisco-networking-assistant/

| Archivo | Descripción |
|---------|-------------|
| `SKILL.md` | **Driver modular para Cisco/Packet Tracer** - Orquestador de flujos |
| `assets/bridge.html` | HTML del bridge |
| `assets/checklists/verification.md` | Checklist de verificación |
| `assets/templates/vlan-lab-template.yaml` | Template VLAN lab |
| `references/cli/missing-capabilities.md` | Capacidades faltantes CLI |
| `references/cli/pt-commands.md` | Comandos PT |
| `references/concepts/acl.md` | ACLs |
| `references/concepts/eigrp.md` | EIGRP |
| `references/concepts/ospf.md` | OSPF |
| `references/concepts/stp.md` | STP |
| `references/concepts/subnetting.md` | Subnetting |
| `references/concepts/vlan.md` | VLANs |
| `references/devices/packet-tracer-models.md` | Modelos PT |
| `references/devices/routers.md` | Routers |
| `references/devices/switches.md` | Switches |
| `references/playbooks/bridge-setup.md` | Bridge setup |
| `references/playbooks/common-failures.md` | Fallos comunes |
| `references/playbooks/pt-runtime.md` | PT runtime |
| `references/routing-guide.md` | Routing guide |
| `references/security-guide.md` | Security guide |
| `references/troubleshooting-guide.md` | Troubleshooting guide |
| `references/validations/routing-checklist.md` | Routing checklist |
| `references/validations/troubleshooting-checklist.md` | Troubleshooting checklist |
| `references/validations/vlan-checklist.md` | VLAN checklist |
| `references/vlan-guide.md` | VLAN guide |
| `scripts/bridge.html` | Bridge v2 HTML |
| `templates/efficiency-report.md` | Efficiency report |
| `templates/error-report.md` | Error report |
| `templates/repeated-flow-report.md` | Repeated flow report |
| `templates/ticket.md` | Ticket template |

### .iflow/skills/skill-creator/

| Archivo | Descripción |
|---------|-------------|
| `SKILL.md` | Skill para crear otras skills |
| `LICENSE.txt` | Licencia |
| `agents/analyzer.md` | Agente analizador |
| `agents/comparator.md` | Agente comparador |
| `agents/grader.md` | Agente evaluador |
| `assets/eval_review.html` | HTML de review de evals |
| `eval-viewer/generate_review.py` | Generador de review Python |
| `eval-viewer/viewer.html` | Viewer de evals |
| `references/schemas.md` | Schemas de referencia |
| `scripts/__init__.py` | Init Python |
| `scripts/aggregate_benchmark.py` | Agrega benchmarks |
| `scripts/generate_report.py` | Genera reportes |
| `scripts/improve_description.py` | Mejora descripciones |
| `scripts/package_skill.py` | Empaqueta skills |
| `scripts/quick_validate.py` | Validación rápida |
| `scripts/run_eval.py` | Ejecuta evals |
| `scripts/run_loop.py` | Loop de ejecución |
| `scripts/utils.py` | Utilidades Python |

---

## 📂 .AGENTS/ DIRECTORY - Skills para Agent Framework

### .agents/skills/cisco-networking-assistant/

| Archivo | Descripción |
|---------|-------------|
| `SKILL.md` | Skill para Agent Framework |
| `assets/checklists/verification.md` | Checklist |
| `assets/templates/vlan-lab-template.yaml` | Template VLAN lab |
| `references/routing-guide.md` | Routing guide |
| `references/security-guide.md` | Security guide |
| `references/troubleshooting-guide.md` | Troubleshooting guide |
| `references/vlan-guide.md` | VLAN guide |
| `scripts/config-wizard.ts` | Wizard de configuración |
| `scripts/lab-analyzer.ts` | Analizador de laboratorios |

### .agents/skills/skill-creator/
(Misma estructura que .iflow/skills/skill-creator/)

---

## 📂 .CLAUDE/ DIRECTORY
Configuración específica para Claude Code

---

## 🔑 PATRONES DE ARQUITECTURA

### Monorepo con Workspaces
- **Root:** package.json con workspaces: ["apps/*", "packages/*"]
- **Apps:** Aplicaciones user-facing (CLI)
- **Packages:** Librerías compartidas
  - **core:** Modelo de red + generadores de configuración
  - **pt-control-v2:** Integración con Packet Tracer
  - **tools:** Herramientas de alto nivel
  - **templates:** Templates de laboratorios

### Ports & Adapters (Hexagonal) en pt-control-v2
- **domain/:** Lógica de negocio (IOS session, parsers, value objects)
- **application/:** Casos de uso (ports)
- **infrastructure/:** Adaptadores externos (PT file bridge, logs)
- **controller/:** Puntos de entrada

### Pipeline de Validación
1. **DeviceSpecValidator** - Validación pre-generación
2. **ValidationEngine** - Validación runtime con reglas
3. **ReactiveTopology** - Validación en tiempo real
4. **Rules** - Reglas individuales (ACL, VLAN, IP, loops, gateway)

### Flujo de Generación de Configuración
1. Modelo canónico (YAML/JSON)
2. DeviceSpec validation
3. Config generators (VLAN, Routing, Security, IOS)
4. ConfigDiffer para despliegue incremental
5. Salida IOS con orden de secciones personalizable

---

## 🛠️ TECHNOLOGY STACK

- **Runtime:** Bun (v1.1+) - **Obligatorio, no usar Node.js**
- **Lenguaje:** TypeScript (strict mode)
- **Package Manager:** Bun
- **Test Framework:** Bun test
- **CLI Framework:** Commander.js (legacy), oclif (pt-control-v2)
- **Validación:** Zod
- **Logging:** pino (estructurado), NDJSON (eventos PT)
- **Conectividad:** node-ssh, Telnet (fallback)
- **Criptografía:** Twofish CBC + XOR + zlib (para .pka)
- **Arquitectura:** Monorepo, Ports & Adapters, DDD

---

## 📝 CONVENCIONES DE NOMBRES

- **`*.generator.ts`** - Generadores de configuración
- **`*.validator.ts`** - Lógica de validación
- **`*.rule.ts`** - Reglas de validación
- **`*.service.ts`** - Servicios de negocio
- **`*.port.ts`** - Interfaces de puertos
- **`*.adapter.ts`** - Implementaciones de adaptadores
- **`*.engine.ts`** - Motores complejos
- **`*.test.ts`** - Archivos de test
- **`types.ts`** - Definiciones TypeScript
- **`index.ts`** - Puntos de entrada de módulos

---

## 🎯 PUNTOS DE ENTRADA

- **`apps/cli/src/index.ts`** - Aplicación CLI principal
- **`packages/core/src/index.ts`** - Librería core
- **`packages/pt-control-v2/src/index.ts`** - Librería PT Control
- **`packages/tools/src/index.ts`** - Herramientas
- **`pt-extension/main.js`** - Extensión de Packet Tracer
- **`scripts/setup-pt-control.sh`** - Setup inicial

---

## 📊 ESTADÍSTICAS DETALLADAS

### Por Tipo de Archivo

| Extensión | Cantidad | Descripción |
|-----------|----------|-------------|
| `.ts` | ~450 | TypeScript (código fuente) |
| `.test.ts` | ~80 | Tests de TypeScript |
| `.md` | ~150 | Documentación Markdown |
| `.json` | ~25 | Configuración JSON |
| `.yaml` / `.yml` | ~10 | Laboratorios y templates YAML |
| `.js` | ~15 | JavaScript (runtime, scripts) |
| `.py` | ~10 | Scripts Python (skill-creator) |
| `.html` | ~6 | HTML (eval viewers, bridges) |
| `.txt` | ~20 | Evidence files, configs |
| `.sh` | 1 | Shell script (setup) |
| `.scpt` | 2 | AppleScript (macOS bridge) |
| `.lock` | 1 | Bun lock file |
| **TOTAL** | **~1097+** | **Archivos totales** |

### Por Directorio Principal

| Directorio | Archivos | Descripción |
|------------|----------|-------------|
| `packages/pt-control-v2/` | ~300 | PT Control v2 engine |
| `packages/core/` | ~80 | Core logic & generators |
| `.iflow/skills/` | ~60 | iFlow skills |
| `.gemini/skills/` | ~30 | Gemini skills |
| `.sisyphus/` | ~60 | Project management |
| `tests/` | ~40 | Root tests |
| `packages/tools/` | ~20 | Tools |
| `apps/cli/` | ~25 | CLI application |
| `docs/` | ~5 | Documentation |
| `scripts/` | ~7 | Utility scripts |
| Otros | ~500 | Configs, templates, references |

---

*Documentación generada para transferencia de contexto a otras IAs - Marzo 2026*

**NOTA:** Este documento incluye TODOS los archivos del proyecto cisco-auto (~1097 archivos).

**Archivos excluidos (no documentados individualmente):**
- `node_modules/` - Dependencias de npm/Bun
- `.git/` - Historial de Git
- `bun.lock` - Lock file binario
- Archivos `.DS_Store` - Metadatos de macOS
- Archivos binarios generados (si los hubiera)

**Para buscar un archivo específico:** Usa Ctrl+F/Cmd+F en este documento.

**Para más detalles de un archivo:** Lee su contenido directamente con `cat`, `read_file`, o un editor.
