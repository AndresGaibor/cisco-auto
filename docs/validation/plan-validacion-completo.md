# Plan de Validación Completo — cisco-auto + Packet Tracer

> **Versión del plan:** 1.0  
> **Proyecto:** cisco-auto (PT Control / PT Runtime / PT Kernel / CLI)  
> **Objetivo:** Validar exhaustivamente cada comando, subsistema, handler, parser y flujo de red contra Packet Tracer real.  
> **Topología de prueba recomendada:** 2 routers (R1, R2), 2 switches (SW1, SW2), 2 PCs (PC1, PC2), 1 server (SRV1), 1 laptop (LAP1). Ver diagrama al final.  

---

## Índice

1. [Pre-flight: Estado del Entorno](#1-pre-flight-estado-del-entorno)
2. [Build System](#2-build-system)
3. [Runtime (main.js / runtime.js / catalog.js)](#3-runtime)
4. [Device Management](#4-device-management)
5. [Link / Cable Management](#5-link--cable-management)
6. [IOS Command Execution (pt cmd)](#6-ios-command-execution-pt-cmd)
7. [pt cmd read (Modo Lectura)](#7-pt-cmd-read-modo-lectura)
8. [pt cmd each (Multi-dispositivo)](#8-pt-cmd-each-multi-dispositivo)
9. [Chained Commands (Separador ; )](#9-chained-commands-separador-)
10. [Configuration: pt set](#10-configuration-pt-set)
11. [Configuration: pt save](#11-configuration-pt-save)
12. [Verification: pt verify](#12-verification-pt-verify)
13. [Project Management](#13-project-management)
14. [App Lifecycle (pt app)](#14-app-lifecycle-pt-app)
15. [Inspect (pt inspect)](#15-inspect-pt-inspect)
16. [Omni / Omniscience (pt omni)](#16-omni--omniscience-pt-omni)
17. [Agent Workflow (pt agent)](#17-agent-workflow-pt-agent)
18. [Logs & Tracing](#18-logs--tracing)
19. [Collab (Multi-instancia)](#19-collab-multi-instancia)
20. [MCP Server](#20-mcp-server)
21. [Bridge (File Bridge Internals)](#21-bridge-file-bridge-internals)
22. [pt-control: Servicios de Aplicación](#22-pt-control-servicios-de-aplicación)
23. [pt-control: Terminal & Execution](#23-pt-control-terminal--execution)
24. [pt-control: Verificación & Planners](#24-pt-control-verificación--planners)
25. [pt-control: Workflows de Red](#25-pt-control-workflows-de-red)
26. [pt-runtime: Kernel Internals](#26-pt-runtime-kernel-internals)
27. [pt-runtime: Handlers](#27-pt-runtime-handlers)
28. [pt-runtime: Terminal Engine](#28-pt-runtime-terminal-engine)
29. [pt-runtime: Build Pipeline (AST Transforms)](#29-pt-runtime-build-pipeline-ast-transforms)
30. [IOS Domain: Parsers & Operations](#30-ios-domain-parsers--operations)
31. [IOS Domain: Session & CLI](#31-ios-domain-session--cli)
32. [IOS Primitives: Value Objects](#32-ios-primitives-value-objects)
33. [Kernel (Legacy)](#33-kernel-legacy)
34. [Network Scenarios End-to-End](#34-network-scenarios-end-to-end)
35. [Error Handling & Edge Cases](#35-error-handling--edge-cases)
36. [Performance & Stress Testing](#36-performance--stress-testing)
37. [Topología Recomendada](#37-topología-recomendada)

---

## 1. Pre-flight: Estado del Entorno

Antes de empezar, verificar que el entorno está sano.

### 1.1 Variables de entorno

- [ ] `echo $PT_DEV_DIR` — debe apuntar a directorio válido (ej: `~/pt-dev`)
- [ ] `echo $PT_CLI_LEGACY` — (opcional) si legacy está habilitado
- [ ] Packet Tracer instalado y accesible

### 1.2 Doctor

```bash
bun run pt doctor
bun run pt doctor --json
```

- [ ] `doctor` retorna éxito sin errores críticos
- [ ] `doctor --json` tiene estructura JSON válida
- [ ] Reporta: instalación OK, bridge OK, runtime OK, PT status
- [ ] Si hay errores, `doctor` los lista con sugerencias

### 1.3 Flags globales

```bash
bun run pt --version
bun run pt --help
bun run pt doctor --verbose
bun run pt doctor --quiet
bun run pt doctor --trace
```

- [ ] `--version` muestra versión correcta (0.3.0)
- [ ] `--help` lista todos los comandos públicos esperados
- [ ] `--verbose` muestra logs detallados
- [ ] `--quiet` reduce salida al mínimo
- [ ] Flags `--timeout`, `--no-timeout` aceptados
- [ ] `--json` en todos los comandos que lo soportan

### 1.4 Comandos raíz visibles en --help

- [ ] `build`, `doctor`, `runtime`, `device`, `link`, `cmd`, `set`, `verify`, `omni`, `logs`, `completion`, `mcp`, `collab`, `bench`, `bridge`, `e2e`, `project`, `app`, `agent`, `save`, `inspect`

---

## 2. Build System

### 2.1 Build estándar

```bash
bun run pt build
```

- [ ] Build termina sin errores
- [ ] `main.js` generado en `$PT_DEV_DIR/main.js`
- [ ] `runtime.js` generado en `$PT_DEV_DIR/runtime.js`
- [ ] `catalog.js` generado en `$PT_DEV_DIR/catalog.js`
- [ ] `manifest.json` generado con checksums y versiones

### 2.2 PT-Safe validation

- [ ] Build valida que generated JS sea PT-safe (sin `import`, `class`, `const`, arrow, template literals, optional chaining, etc.)
- [ ] AST transforms aplicados correctamente (`let→var`, `class→function`, `async→sync`, etc.)
- [ ] No hay errores de "invalid syntax" en el build

### 2.3 Deploy

```bash
bun run pt build  # ya incluye deploy
# o directamente:
bun run --cwd packages/pt-runtime deploy
```

- [ ] Artefactos copiados a `$PT_DEV_DIR/`
- [ ] Permisos correctos en archivos
- [ ] Checksums coinciden entre build y deploy

### 2.4 Build differences (modular vs estándar)

```bash
bun run --cwd packages/pt-runtime modular  # si existe
```

- [ ] Build modular genera `dist-modular/` con runtime modular
- [ ] Hot-reload funciona correctamente

### 2.5 Validate artifacts

```bash
bun run --cwd packages/pt-runtime validate
```

- [ ] Validación de artefactos pasa
- [ ] No hay advertencias de compatibilidad

---

## 3. Runtime

### 3.1 Runtime status

```bash
bun run pt runtime status
bun run pt runtime status --json
bun run pt runtime status --live
```

- [ ] `status` muestra estado del runtime (online/offline)
- [ ] `--json` retorna JSON con `connected`, `kernel`, `heartbeat`
- [ ] `--live` verifica heartbeat en tiempo real
- [ ] Muestra versión de main.js y runtime.js cargados

### 3.2 Runtime reload (hot-reload)

```bash
bun run pt runtime reload
bun run pt runtime reload --json
```

- [ ] Hot-reload de runtime.js sin cerrar PT
- [ ] Cambios en handlers se reflejan inmediatamente
- [ ] `--json` retorna resultado del reload

### 3.3 Runtime logs

```bash
bun run pt runtime logs
bun run pt runtime logs --json
```

- [ ] Muestra logs del runtime con niveles (info, warn, error)
- [ ] `--json` retorna logs estructurados

### 3.4 Runtime releases & rollback

```bash
bun run pt runtime releases
bun run pt runtime rollback --last
```

- [ ] `releases` lista snapshots disponibles
- [ ] `rollback` restaura snapshot anterior
- [ ] Rollback no corrompe el runtime actual

### 3.5 Runtime trace

```bash
bun run pt runtime trace
```

- [ ] Tracing activo con eventos del kernel y handlers

---

## 4. Device Management

### 4.1 Listar dispositivos

```bash
bun run pt device list
bun run pt device list --json
bun run pt device list --deep
```

- [ ] Lista vacía si no hay dispositivos
- [ ] `--json` retorna array con `name`, `type`, `model`, `status`
- [ ] `--deep` incluye interfaces y puertos
- [ ] Mostrar nombres, tipos, modelos
- [ ] Con dispositivos creados, muestra estado correcto

### 4.2 Agregar dispositivo (router)

```bash
bun run pt device add --model 4321 --name R1 --at 100,100
bun run pt device add --model ISR4331 --name R2 --at 400,100 --json
```

- [ ] Router creado exitosamente
- [ ] `--json` retorna datos del dispositivo creado
- [ ] Coordenadas `--at` respetadas
- [ ] Nombre personalizado `--name` funciona
- [ ] Device aparece en `pt device list`

### 4.3 Agregar dispositivo (switch)

```bash
bun run pt device add --model 2960 --name SW1 --at 100,300
bun run pt device add --model 3560-24PS --name SW2 --at 400,300 --json
```

- [ ] Switch L2 (2960) creado
- [ ] Switch L3 (3560) creado
- [ ] Ambos aparecen en device list

### 4.4 Agregar dispositivos finales

```bash
bun run pt device add --model PC --name PC1 --at 50,500
bun run pt device add --model PC --name PC2 --at 250,500
bun run pt device add --model Server --name SRV1 --at 450,500
bun run pt device add --model Laptop --name LAP1 --at 600,500
```

- [ ] PC, Server, Laptop creados
- [ ] Tipos correctos (`pc`, `server`, `laptop`)

### 4.5 Modelos adicionales (probar variedad)

Routers:
- [ ] `bun run pt device add --model 1941 --name R3`
- [ ] `bun run pt device add --model 2901 --name R4`
- [ ] `bun run pt device add --model 2911 --name R5`
- [ ] `bun run pt device add --model 4451 --name R6`

Switches:
- [ ] `bun run pt device add --model 2950-24 --name SW3`
- [ ] `bun run pt device add --model 3650 --name SW4`
- [ ] `bun run pt device add --model 2960-24TT --name SW5`

Otros:
- [ ] Access Point: `bun run pt device add --model AccessPoint-PT --name AP1`
- [ ] Wireless Router: `bun run pt device add --model WRT300N --name WR1`
- [ ] Hub: `bun run pt device add --model Hub-PT --name HUB1`
- [ ] Printer: `bun run pt device add --model Printer --name PR1`

### 4.6 Obtener detalle de dispositivo

```bash
bun run pt device get R1
bun run pt device get R1 --json
```

- [ ] Muestra: nombre, tipo, modelo, coordenadas, puertos, módulos
- [ ] `--json` retorna todos los detalles estructurados
- [ ] Error si dispositivo no existe: `bun run pt device get NOEXISTE`

### 4.7 Mover dispositivo

```bash
bun run pt device move R1 --at 200,200
bun run pt device move R1 --at 200,200 --json
```

- [ ] Dispositivo movido a nuevas coordenadas
- [ ] Posición reflejada en `pt device get R1`
- [ ] Se puede volver a mover (idempotente)

### 4.8 Gestionar módulos

```bash
bun run pt device module R1 --list
bun run pt device module R1 --add HWIC-4ESW
bun run pt device module R1 --remove HWIC-4ESW
```

- [ ] `--list` muestra módulos instalados
- [ ] `--add` agrega módulo al slot disponible
- [ ] `--remove` remueve módulo específico

### 4.9 Listar puertos

```bash
bun run pt device ports R1
bun run pt device ports R1 --json
```

- [ ] Lista todos los puertos del dispositivo
- [ ] Incluye: nombre, tipo, estado (up/down)
- [ ] `--json` retorna puertos estructurados

### 4.10 Eliminar dispositivo

```bash
bun run pt device remove R3
bun run pt device remove R3 --json
```

- [ ] Dispositivo eliminado exitosamente
- [ ] Ya no aparece en `pt device list`
- [ ] Error al eliminar dispositivo inexistente
- [ ] Error al eliminar dispositivo conectado (si aplica)

### 4.11 Modo interactivo

```bash
bun run pt device interactive
```

- [ ] Modo interactivo permite crear/queries sin flags repetitivos

---

## 5. Link / Cable Management

### 5.1 Agregar enlaces directos

```bash
bun run pt link add R1 SW1
bun run pt link add R2 SW2
bun run pt link add SW1 PC1
bun run pt link add SW2 PC2
bun run pt link add SW1 SRV1
bun run pt link add R1 R2
```

- [ ] Enlace creado entre router y switch (automático el puerto)
- [ ] Enlace creado entre switch y PC
- [ ] Enlace creado entre switch y server
- [ ] Enlace creado entre routers
- [ ] `bun run pt link add R1 SW1 --no-verify` — salta verificación

### 5.2 Agregar enlace con especificación de puertos

```bash
bun run pt link add SW1 SW2 --ports GigabitEthernet0/1,GigabitEthernet0/1
```

- [ ] Enlace creado en puertos específicos
- [ ] Puertos correctos reflejados en `pt link list`

### 5.3 Agregar enlace serial

```bash
bun run pt link add R1 R2 --serial
```

- [ ] Enlace serial creado (si aplica al modelo)

### 5.4 Listar enlaces

```bash
bun run pt link list
bun run pt link list --json
```

- [ ] Lista todos los enlaces creados
- [ ] Muestra: dispositivos conectados, puertos, tipo de cable
- [ ] `--json` retorna array con todos los detalles

### 5.5 Sugerir puertos

```bash
bun run pt link suggest R1 SW1
```

- [ ] Sugiere puertos compatibles para el enlace
- [ ] Sugiere tipo de cable apropiado

### 5.6 Verificar enlace

```bash
bun run pt link verify R1 SW1
bun run pt link verify --json
```

- [ ] Verifica que el enlace existe y es válido
- [ ] `--json` retorna estado de verificación

### 5.7 Doctor de enlace

```bash
bun run pt link doctor R1 SW1
```

- [ ] Diagnóstico detallado del enlace
- [ ] Reporta: estado físico, vecino, posibles problemas

### 5.8 Eliminar enlace

```bash
bun run pt link remove R1 R2
bun run pt link remove R1 R2 --if-exists
```

- [ ] Enlace eliminado
- [ ] Ya no aparece en `pt link list`
- [ ] `--if-exists` no falla si no existe

---

## 6. IOS Command Execution (pt cmd)

### 6.1 Comandos show básicos

```bash
bun run pt cmd R1 "show version"
bun run pt cmd R1 "show version" --json
bun run pt cmd R1 "show ip interface brief"
bun run pt cmd R1 "show ip route"
bun run pt cmd SW1 "show vlan brief"
bun run pt cmd SW1 "show interfaces"
bun run pt cmd R1 "show running-config"
bun run pt cmd R1 "show cdp neighbors"
bun run pt cmd R1 "show ip arp"
bun run pt cmd SW1 "show mac address-table"
bun run pt cmd SW1 "show spanning-tree"
```

Cada uno:
- [ ] Output completo sin truncar
- [ ] `--json` retorna `{command, output, status, device}`
- [ ] Sin errores de paginador
- [ ] Comando identificado como "show"

### 6.2 Comandos de configuración

```bash
bun run pt cmd R1 "enable"
bun run pt cmd R1 "configure terminal"
bun run pt cmd R1 "hostname R1-Core"
bun run pt cmd R1 "end"
bun run pt cmd R1 "show running-config | include hostname"
```

- [ ] Transición a modo privilegiado
- [ ] Transición a modo configuración
- [ ] Comandos de configuración aplicados correctamente
- [ ] Verificación post-config funciona

### 6.3 Múltiples modos IOS

```bash
bun run pt cmd R1 "interface GigabitEthernet0/0"
bun run pt cmd R1 "ip address 192.168.1.1 255.255.255.0"
bun run pt cmd R1 "no shutdown"
bun run pt cmd R1 "exit"
bun run pt cmd SW1 "vlan 10"
bun run pt cmd SW1 "name VLAN_10"
bun run pt cmd SW1 "exit"
```

- [ ] Entrada a submodo `config-if`
- [ ] Comandos en submodo aplicados
- [ ] Salida de submodo correcta
- [ ] Entrada a submodo `config-vlan`
- [ ] Comandos en VLAN database aplicados

### 6.4 Modos seguros y strict

```bash
bun run pt cmd R1 "show version" --mode safe
bun run pt cmd R1 "show running-config" --mode strict
bun run pt cmd R1 "reload" --mode safe  # debe fallar o solicitar confirmación
bun run pt cmd R1 "debug ip packet" --mode strict  # debe fallar
```

- [ ] `--mode safe`: comandos destructivos rechazados
- [ ] `--mode strict`: solo comandos show/no-destructive
- [ ] Políticas de ejecución respetadas

### 6.5 Allow confirm & allow destructive

```bash
bun run pt cmd R1 "reload" --allow-confirm
bun run pt cmd R1 "delete flash:config.text" --allow-destructive
```

- [ ] Confirmaciones manejadas automáticamente
- [ ] `--allow-destructive` permite comandos peligrosos
- [ ] Output refleja la confirmación/respuesta

### 6.6 REPL mode

```bash
bun run pt cmd R1 --repl
```

- [ ] Modo interactivo REPL funciona
- [ ] Salida con Ctrl+C o `exit`

### 6.7 Command logs & history

```bash
bun run pt cmd R1 "show version" --logs
bun run pt cmd R1 "show version" --history
bun run pt cmd R1 "show version" --complete
```

- [ ] `--logs` guarda trace de la ejecución
- [ ] `--history` registra en historial persistente
- [ ] `--complete` captura output completo

### 6.8 Timeout

```bash
bun run pt cmd R1 "traceroute 8.8.8.8" --timeout 5000
```

- [ ] Timeout respetado
- [ ] Error claro de timeout al expirar
- [ ] Sesión recuperable después del timeout

---

## 7. pt cmd read (Modo Lectura)

```bash
bun run pt cmd read R1 "show running-config"
bun run pt cmd read R1 "show running-config" --json
bun run pt cmd read R1 "show ip route"
bun run pt cmd read SW1 "show vlan brief"
bun run pt cmd read R1 "show running-config | section interface"
```

Cada uno:
- [ ] Output sin preámbulo del paginador (`--More--`)
- [ ] `terminal length 0` aplicado automáticamente (o equivalente)
- [ ] `--json` retorna output limpio
- [ ] `pt cmd R1 read "show running-config"` — orden incorrecto: DEBE FALLAR
- [ ] `pt cmd read` sin dispositivo — DEBE FALLAR con mensaje de uso claro

---

## 8. pt cmd each (Multi-dispositivo)

```bash
bun run pt cmd each --devices R1,R2,SW1 "show version"
bun run pt cmd each --devices R1,R2 "show ip interface brief"
```

- [ ] Ejecuta el comando en todos los dispositivos especificados
- [ ] Retorna resultados agregados
- [ ] Si un dispositivo falla, continúa con los demás
- [ ] `--devices` separado por comas funciona

---

## 9. Chained Commands (Separador `;`)

### 9.1 Shows encadenados

```bash
bun run pt cmd R1 "show version ; show ip interface brief ; show ip route"
bun run pt cmd SW1 "show vlan brief ; show interfaces trunk ; show spanning-tree summary"
bun run pt cmd R1 "show running-config | include hostname ; show cdp neighbors"
```

- [ ] Múltiples comandos ejecutados secuencialmente
- [ ] Output de cada comando separado
- [ ] Sin contaminación entre comandos sucesivos
- [ ] La salida contiene todo el output combinado

### 9.2 Configuración encadenada

```bash
bun run pt cmd R1 "enable ; configure terminal ; interface g0/0 ; ip address 10.0.0.1 255.255.255.0 ; no shutdown"
bun run pt cmd SW1 "enable ; configure terminal ; vlan 100 ; name DMZ ; exit ; interface f0/1 ; switchport mode access ; switchport access vlan 100"
```

- [ ] Transiciones de modo automáticas entre comandos
- [ ] Todos los comandos de configuración aplicados
- [ ] Verificación: `bun run pt cmd read R1 "show running-config | section interface g0/0"`

### 9.3 Comandos con pipes dentro de cadena

```bash
bun run pt cmd R1 "show running-config | section ospf ; show ip ospf neighbor"
```

- [ ] Pipe (`|`) dentro de un comando individual funciona
- [ ] Siguiente comando después de `;` se ejecuta correctamente

---

## 10. Configuration: pt set

### 10.1 Set host IP

```bash
bun run pt set host ip PC1 192.168.1.10 --mask 255.255.255.0 --gateway 192.168.1.1
bun run pt set host ip PC2 192.168.1.20/24
bun run pt set host ip SRV1 192.168.1.100/24 --gateway 192.168.1.1
bun run pt set host ip LAP1 192.168.1.30/24 --gateway 192.168.1.1 --dns 8.8.8.8
```

- [ ] IP asignada correctamente
- [ ] Máscara aplicada
- [ ] Gateway por defecto configurado
- [ ] DNS configurado (si corresponde)
- [ ] `bun run pt cmd PC1 "ipconfig"` o `pt inspect topology --json` confirma
- [ ] Si falla por timeout (`HOST_CONFIG_FAILED`), reintentar una vez

### 10.2 Set host DHCP

```bash
bun run pt set host dhcp PC1
bun run pt set host dhcp PC2
```

- [ ] Host configurado en DHCP
- [ ] Verificar con `pt cmd PC1 "ipconfig"`
- [ ] Estado reflejado en `pt inspect topology --json`

### 10.3 Set interface

```bash
bun run pt set interface R1 GigabitEthernet0/0 --ip 10.0.0.1/30
bun run pt set interface R1 GigabitEthernet0/0 --desc "Link a SW1"
bun run pt set interface SW1 FastEthernet0/1 --vlan 10
bun run pt set interface SW1 FastEthernet0/1 --mode trunk
bun run pt set interface R1 GigabitEthernet0/0 --shutdown
bun run pt set interface R1 GigabitEthernet0/0 --no-shutdown
```

- [ ] IP asignada a interfaz
- [ ] Descripción configurada
- [ ] VLAN de acceso configurada
- [ ] Modo trunk configurado
- [ ] Shutdown / no shutdown funciona
- [ ] Verificar cada cambio con `pt cmd read`

---

## 11. Configuration: pt save

```bash
bun run pt save R1
bun run pt save R1 --json
bun run pt save --all
```

- [ ] `write memory` ejecutado en el dispositivo
- [ ] Configuración guardada en startup-config
- [ ] `--all` guarda en todos los dispositivos
- [ ] `--json` retorna resultado del save

---

## 12. Verification: pt verify

### 12.1 Basic verification

```bash
bun run pt verify ping PC1 192.168.1.1
bun run pt verify ping PC1 192.168.1.2
bun run pt verify ping PC1 192.168.1.100
```

- [ ] Ping exitoso a gateway
- [ ] Ping entre PCs (después de configurar red)
- [ ] Ping a servidor
- [ ] Ping fallido reporta error correctamente

### 12.2 VLAN verification

```bash
bun run pt verify vlan SW1 10
bun run pt verify vlan SW1 20
```

- [ ] Verifica que VLAN existe en el switch
- [ ] VLAN no existente reporta correctamente

### 12.3 STP verification

```bash
bun run pt verify stp SW1
bun run pt verify stp SW1 10
```

- [ ] Verifica estado de STP
- [ ] VLAN específica es verificable

### 12.4 EtherChannel verification

```bash
bun run pt verify etherchannel SW1
```

- [ ] Verifica EtherChannel si está configurado
- [ ] Reporta estado del channel-group

### 12.5 OSPF verification

```bash
# Configurar OSPF primero
bun run pt cmd R1 "enable ; configure terminal ; router ospf 1 ; network 192.168.1.0 0.0.0.255 area 0"

bun run pt verify ospf R1
```

- [ ] Verifica configuración OSPF
- [ ] Reporta neighbors, process-id, networks

### 12.6 Routing verification

```bash
bun run pt verify routing R1
bun run pt verify routing R1 192.168.1.0
```

- [ ] Verifica tabla de routing
- [ ] Red específica verificable

### 12.7 CDP verification

```bash
bun run pt verify cdp R1
bun run pt verify cdp SW1
```

- [ ] CDP habilitado y muestra vecinos
- [ ] Dispositivos sin CDP reportan correctamente

### 12.8 DHCP verification

```bash
bun run pt verify dhcp PC1
bun run pt verify dhcp PC2
```

- [ ] Host tiene IP via DHCP
- [ ] Host sin DHCP/estático reporta correctamente

### 12.9 HSRP verification

```bash
# Configurar HSRP en routers
bun run pt verify hsrp R1
bun run pt verify hsrp R1 10
```

- [ ] HSRP configurado correctamente
- [ ] Grupo específico verificable

### 12.10 NAT verification

```bash
# Configurar NAT
bun run pt verify nat R1
```

- [ ] NAT configurado correctamente

### 12.11 IPv6 verification

```bash
# Configurar IPv6
bun run pt verify ipv6 R1
```

- [ ] IPv6 configurado en dispositivo

### 12.12 WLC verification

```bash
bun run pt verify wlc WLC1  # si existe WLC
```

- [ ] WLC verificado correctamente

---

## 13. Project Management

### 13.1 Project status

```bash
bun run pt project status
bun run pt project status --json
```

- [ ] Muestra archivo .pkt activo
- [ ] Muestra tamaño, última modificación
- [ ] `--json` retorna metadatos estructurados

### 13.2 Project save

```bash
bun run pt project save
```

- [ ] Guarda el proyecto .pkt actual
- [ ] No corrompe el archivo

### 13.3 Project autosave

```bash
bun run pt project autosave
```

- [ ] Backup externo creado
- [ ] Archivo de autosave en ubicación esperada

### 13.4 Project open

```bash
bun run pt project open ~/pt-dev/mi-proyecto.pkt
bun run pt project open --help
```

- [ ] Abre archivo .pkt
- [ ] Error claro si archivo no existe

### 13.5 Project recover

```bash
bun run pt project recover
```

- [ ] Recupera desde autosave si existe
- [ ] Mensaje claro si no hay autosave

### 13.6 Project checkpoints

```bash
bun run pt project checkpoints
```

- [ ] Lista checkpoints disponibles

---

## 14. App Lifecycle (pt app)

### 14.1 App paths

```bash
bun run pt app paths
bun run pt app paths --json
```

- [ ] Resuelve paths de instalación de PT
- [ ] Muestra: bin, scripts, data, config

### 14.2 App status

```bash
bun run pt app status
bun run pt app status --json
```

- [ ] Muestra: proceso (running/stopped), runtime, proyecto activo
- [ ] `--json` retorna estado completo

### 14.3 App open

```bash
bun run pt app open
bun run pt app open ~/pt-dev/mi-proyecto.pkt
bun run pt app open --clean
bun run pt app open --wait
bun run pt app open --close-existing
```

- [ ] Abre Packet Tracer
- [ ] Abre archivo específico si se proporciona
- [ ] `--clean` abre sin proyecto
- [ ] `--wait` espera a que PT esté listo para comandos
- [ ] `--close-existing` cierra instancia previa

### 14.4 App wait

```bash
bun run pt app wait
bun run pt app wait --runtime
bun run pt app wait --active-file
```

- [ ] Espera condición de runtime listo
- [ ] `--runtime` espera a que runtime.js responda
- [ ] `--active-file` espera archivo activo

### 14.5 App close

```bash
bun run pt app close
bun run pt app close --save
bun run pt app close --autosave
bun run pt app close --force
```

- [ ] Cierra PT graceful
- [ ] `--save` guarda antes de cerrar
- [ ] `--force` mata el proceso si es necesario

### 14.6 App restart

```bash
bun run pt app restart
```

- [ ] Reinicia PT (close + open)

### 14.7 App track

```bash
bun run pt app track
```

- [ ] Registra proyecto activo en metadata

---

## 15. Inspect (pt inspect)

### 15.1 Topology inspect

```bash
bun run pt inspect topology
bun run pt inspect topology --json
```

- [ ] Muestra topología completa: dispositivos, enlaces, posiciones
- [ ] `--json` retorna representación estructurada
- [ ] Es la referencia canónica para estado de topología

### 15.2 Neighbors inspect

```bash
bun run pt inspect neighbors R1
bun run pt inspect neighbors R1 --json
```

- [ ] Muestra vecinos del dispositivo
- [ ] Tipo de conexión, puertos

### 15.3 Free ports inspect

```bash
bun run pt inspect free-ports
bun run pt inspect free-ports R1
```

- [ ] Muestra puertos disponibles
- [ ] Filtro por dispositivo funciona

### 15.4 Drift inspect

```bash
bun run pt inspect drift
bun run pt inspect drift --json
```

- [ ] Detecta diferencias entre estado deseado y real
- [ ] Reporta dispositivos faltantes/excedentes

### 15.5 Port inspect

```bash
bun run pt inspect port R1 GigabitEthernet0/0
bun run pt inspect port R1 GigabitEthernet0/0 --json
```

- [ ] Muestra estado detallado del puerto
- [ ] Velocidad, duplex, estado, vecino

### 15.6 API inspect

```bash
bun run pt inspect api
```

- [ ] Muestra información de la API de PT disponible

### 15.7 Audit inspect

```bash
bun run pt inspect audit
```

- [ ] Auditoría de diseño: detecta errores proactivamente
- [ ] Sugiere mejoras de configuración

### 15.8 Eval inspect

```bash
bun run pt inspect eval
```

- [ ] Evalúa expresiones en PT

---

## 16. Omni / Omniscience (pt omni)

### 16.1 Omni status

```bash
bun run pt omni status
```

- [ ] Verifica disponibilidad del sistema omni
- [ ] Reporta capacidades registradas

### 16.2 Omni raw

```bash
bun run pt omni raw "listDevices()"
bun run pt omni raw "listDevices(); listLinks()"
bun run pt omni raw --file /tmp/script.js
bun run pt omni raw --stdin
# pipe: echo "listDevices()" | bun run pt omni raw --stdin
bun run pt omni raw --dry-run "listDevices()"
```

- [ ] JS raw ejecutado en contexto de PT
- [ ] `--file` carga script desde archivo
- [ ] `--stdin` lee desde pipe
- [ ] `--dry-run` muestra código sin ejecutar
- [ ] Múltiples comandos separados por `;` en raw

### 16.3 Omni guards

```bash
bun run pt omni raw "deleteAllDevices()" --guard strict
bun run pt omni raw "deleteAllDevices()" --guard warn
bun run pt omni raw "deleteAllDevices()" --guard off
```

- [ ] `--guard strict` rechaza comandos destructivos
- [ ] `--guard warn` advierte pero ejecuta
- [ ] `--guard off` permite todo

### 16.4 Omni inspect

```bash
bun run pt omni inspect env
bun run pt omni inspect scope
bun run pt omni inspect process
```

- [ ] `env`: muestra entorno de ejecución PT
- [ ] `scope`: variables y ámbito disponibles
- [ ] `process`: estado del proceso PT

### 16.5 Omni topology

```bash
bun run pt omni topology physical
```

- [ ] Muestra topología física desde omni

### 16.6 Omni device

```bash
bun run pt omni device genome R1
bun run pt omni device port R1 GigabitEthernet0/0
```

- [ ] `genome`: inspección profunda del dispositivo
- [ ] `port`: inspección detallada del puerto

### 16.7 Omni assessment

```bash
bun run pt omni assessment running-config R1
bun run pt omni assessment item R1 "interface"
bun run pt omni assessment correct R1
bun run pt omni assessment time R1
```

- [ ] Assessment de running-config
- [ ] Assessment de ítem específico
- [ ] Assessment de corrección
- [ ] Assessment de tiempo

### 16.8 Omni capability

```bash
bun run pt omni capability list
bun run pt omni capability show <name>
bun run pt omni capability run <name>
```

- [ ] Lista capacidades registradas
- [ ] Muestra detalle de una capacidad
- [ ] Ejecuta una capacidad específica

### 16.9 Omni env set

```bash
bun run pt omni env set KEY VALUE
```

- [ ] Establece variable de entorno en runtime

---

## 17. Agent Workflow (pt agent)

```bash
bun run pt agent context
bun run pt agent plan "configurar vlan 10 en SW1"
bun run pt agent apply --plan-id <id>
bun run pt agent verify --plan-id <id>
```

- [ ] `context`: genera contexto del sistema para el agente
- [ ] `plan`: crea plan de ejecución para intent
- [ ] `apply`: ejecuta el plan
- [ ] `verify`: verifica que el plan se ejecutó correctamente

---

## 18. Logs & Tracing

### 18.1 Logs básicos

```bash
bun run pt logs
bun run pt logs --json
```

- [ ] Muestra logs de ejecución recientes
- [ ] `--json` retorna logs estructurados
- [ ] Filtro por nivel, fecha, comando

### 18.2 Trace flags

```bash
bun run pt cmd R1 "show version" --trace
bun run pt cmd R1 "show version" --trace --trace-payload
bun run pt cmd R1 "show version" --trace --trace-result
bun run pt cmd R1 "show version" --trace-dir /tmp/traza
bun run pt cmd R1 "show version" --trace-bundle
```

- [ ] `--trace` guarda archivo de traza
- [ ] `--trace-payload` incluye payloads en traza
- [ ] `--trace-result` incluye preview del resultado
- [ ] `--trace-dir` guarda en directorio específico
- [ ] `--trace-bundle` genera bundle único de debugging

### 18.3 Bridge logs

```bash
bun run pt bridge stats
bun run pt bridge clean --dry-run
```

- [ ] Estadísticas del bridge (pending, in-flight, results)
- [ ] `--dry-run` muestra qué limpiaría sin hacerlo

---

## 19. Collab (Multi-instancia)

```bash
bun run pt collab serve --port 8080
bun run pt collab status
bun run pt collab join <url>
bun run pt collab stop
```

- [ ] Servidor collab inicia en puerto especificado
- [ ] Cliente se conecta a sala remota
- [ ] Estado muestra peers conectados
- [ ] Sesión se detiene graceful

### 19.1 Collab avanzado

```bash
bun run pt collab serve --funnel  # modo funnel
bun run pt collab doctor
bun run pt collab checkpoint
bun run pt collab conflicts
bun run pt collab resolve
bun run pt collab resync
bun run pt collab peers
bun run pt collab multiuser
```

- [ ] Modo funnel funciona
- [ ] Diagnóstico de collab reporta estado
- [ ] Checkpoints se crean y listan
- [ ] Conflictos se detectan y resuelven (si aplica)

---

## 20. MCP Server

```bash
bun run pt mcp start
bun run pt mcp status
```

- [ ] Servidor MCP inicia correctamente
- [ ] Herramientas MCP registradas y accesibles
- [ ] Recursos MCP disponibles
- [ ] Prompts MCP registrados

---

## 21. Bridge (File Bridge Internals)

NOTA: Estas pruebas verifican el bridge sin PT, mediante tests unitarios.

### 21.1 Bridge lifecycle

- [ ] `stop→starting→leased→recovering→running→stopping` — máquina de estados funciona
- [ ] Transición válida es aceptada
- [ ] Transición inválida es rechazada

### 21.2 Command processing

- [ ] Claim por rename atómico (`commands/` → `in-flight/`)
- [ ] Publicación de resultado en `results/<id>.json`
- [ ] Múltiples consumidores no colisionan
- [ ] Comandos corruptos van a dead-letter

### 21.3 Crash recovery

- [ ] Comandos in-flight se re-queuean tras crash
- [ ] Deduplicación: si resultado existe, no re-ejecuta
- [ ] Máximo 3 intentos, luego dead-letter
- [ ] Recuperación no pierde comandos

### 21.4 Lease manager

- [ ] Lease adquirido exclusivamente
- [ ] Stale lease detectado por TTL y PID
- [ ] Lease renovado periódicamente

### 21.5 Backpressure

- [ ] Exceso de comandos pendientes lanza `BackpressureError`
- [ ] `waitForCapacity()` bloquea hasta espacio disponible
- [ ] Configuración `maxPending` respetada

### 21.6 Queue index

- [ ] Índice append-only crece correctamente
- [ ] Compactación no pierde entradas
- [ ] Consultas por seq funcionan

### 21.7 Shared result watcher

- [ ] Notificación de resultados vía pub/sub
- [ ] Polling fallback cuando fs.watch falla
- [ ] Timeout de espera de resultados

### 21.8 Circuit breaker

- [ ] Closed → Open al exceder failure threshold
- [ ] Open → Half-open después de timeoutMs
- [ ] Half-open → Closed tras success threshold
- [ ] Half-open → Open si falla en half-open

### 21.9 NDJSON consumer (durable)

- [ ] Consume eventos NDJSON línea por línea
- [ ] Checkpoint persiste byteOffset + lastSeq
- [ ] Rotación de logs detectada automáticamente
- [ ] Gaps de secuencia detectados

### 21.10 Garbage collection

- [ ] Resultados vencidos (>24h default) eliminados
- [ ] Logs vencidos (>7d) eliminados
- [ ] Resultados activos (con consumer) no eliminados

---

## 22. pt-control: Servicios de Aplicación

NOTA: Estos tests verifican que los servicios de aplicación estén correctamente cableados.

### 22.1 Topology services

- [ ] `TopologyService`: obtener, actualizar, cachear topología
- [ ] `TopologyQueryService`: consultas de topología OK
- [ ] `TopologyMutationService`: mutaciones OK
- [ ] `TopologyConnectivityVerificationService`: verificación de conectividad OK

### 22.2 Device services

- [ ] `DeviceService`: CRUD de dispositivos
- [ ] `DeviceQueryService`: consultas OK
- [ ] `DeviceMutationService`: mutaciones OK
- [ ] `DeviceXmlParser`: parseo de XML de dispositivos

### 22.3 IOS services

- [ ] `IosService`: servicio IOS principal
- [ ] `IosExecutionService`: ejecución de comandos IOS
- [ ] `IosSemanticService`: semántica y post-procesamiento
- [ ] `IosVerificationService`: verificación de resultados
- [ ] `IosValidator`: validación de comandos
- [ ] `IosDeviceLock`: lock de dispositivos
- [ ] `IosSessionManager`: gestor de sesiones

### 22.4 Canvas & Layout services

- [ ] `CanvasService`: operaciones de canvas
- [ ] `LayoutPlannerService`: planificación de layout
- [ ] `PortPlannerService`: planificación de puertos
- [ ] `LinkFeasibilityService`: factibilidad de enlaces

### 22.5 Lab & Scenario services

- [ ] `LabService`: gestión de laboratorios
- [ ] `LabScenarioRunner`: ejecución de escenarios
- [ ] `ScenarioService`: escenarios de prueba
- [ ] `ScenarioCatalog`: catálogo de escenarios
- [ ] `ScenarioEndToEndVerificationService`: verificación E2E

### 22.6 Desired State Pipeline

- [ ] `DesiredStatePipeline`: pipeline de estado deseado se ejecuta sin errores

### 22.7 WLC service

- [ ] `WlcService`: servicio WLC responde correctamente

### 22.8 Doctor

```bash
bun run pt doctor
```

- [ ] `DoctorUseCases`: diagnóstico completo y por módulo
- [ ] Tipos de doctor correctamente categorizados

### 22.9 Check

```bash
bun run pt check  # si existe como comando
```

- [ ] `CheckUseCases`: checks funcionales OK
- [ ] `CheckTypes`: tipos correctos

---

## 23. pt-control: Terminal & Execution

### 23.1 Terminal command service

```bash
bun run pt cmd R1 "show version"
```

- [ ] `TerminalCommandService`: comando simple ejecutado
- [ ] `TerminalPlanBuilder`: plan de terminal construido correctamente
- [ ] `TerminalPlanPolicies`: políticas aplicadas
- [ ] `TerminalCommandClassifier`: clasificación de comandos correcta

### 23.2 IOS command executor

```bash
bun run pt cmd R1 "enable ; configure terminal ; interface g0/0 ; ip address 1.1.1.1 255.255.255.0 ; no shutdown"
```

- [ ] `IosCommandExecutor`: ejecuta batch de comandos IOS
- [ ] `IosCommandBatch`: batch agrupado correctamente
- [ ] `IosRetryPolicy`: reintentos aplicados cuando es necesario
- [ ] `IosRuntimeResultClassifier`: clasificación de resultados runtime

### 23.3 Host command executor

```bash
bun run pt cmd PC1 "ipconfig"
bun run pt set host ip PC1 10.0.0.1/24
```

- [ ] `HostCommandExecutor`: comandos en hosts ejecutados
- [ ] Output parseado correctamente

### 23.4 Terminal evidence & readiness

- [ ] `TerminalEvidenceBarrier`: barrera de evidencia funcional
- [ ] `TerminalReadinessChecker`: readiness verificado
- [ ] `CommandResultMapper`: mapeo de resultados correcto
- [ ] `CommandTimingRecorder`: timings registrados
- [ ] `DeviceKindResolver`: tipo de dispositivo resuelto correctamente

### 23.5 Omniscience service

```bash
bun run pt omni raw "listDevices()"
```

- [ ] `OmniscienceService`: servicio omni responde
- [ ] Capacidades registradas y ejecutables

---

## 24. pt-control: Verificación & Planners

### 24.1 Change planner

```bash
bun run pt agent plan "configurar vlan 10 en SW1"
```

- [ ] `ChangePlannerService`: plan generado
- [ ] `OperationCompiler`: operaciones compiladas
- [ ] `CheckpointExecutor`: checkpoints ejecutados

### 24.2 Network planners

```bash
# Configurar OSPF via planner
bun run pt cmd R1 "enable ; configure terminal ; router ospf 1 ; network 10.0.0.0 0.0.0.255 area 0"
```

- [ ] `OspfPlanner`: plan OSPF generado
- [ ] `EigrpPlanner`: plan EIGRP generado (si configurado)
- [ ] `StaticRoutePlanner`: plan rutas estáticas generado
- [ ] `AclPlanner`: plan ACL generado

### 24.3 Policy engine

```bash
bun run pt cmd R1 "reload" --allow-confirm
bun run pt cmd R1 "reload" --mode safe
```

- [ ] `TerminalPolicyEngine`: políticas evaluadas
- [ ] `PolicyManager`: gestión de políticas OK
- [ ] `SessionArbiter`: sesiones arbitradas
- [ ] `ModeTransition`: transiciones de modo correctas

### 24.4 Standard terminal plans

```bash
bun run pt cmd R1 "show version"
bun run pt cmd read R1 "show running-config"
```

- [ ] Planes estándar de terminal se ejecutan
- [ ] `TerminalEvidenceVerifier`: evidencia verificada
- [ ] `TerminalOutputParsers`: output parseado

### 24.5 Diagnosis engine

- [ ] `DiagnosisEngine`: diagnóstico ejecutado
- [ ] `DiagnosisService`: servicio de diagnóstico responde
- [ ] Categorías y severidades correctas

### 24.6 Evidence ledger

- [ ] `EvidenceLedgerService`: ledger de evidencia funcional
- [ ] Evidencia almacenada y recuperable

---

## 25. pt-control: Workflows de Red

### 25.1 VLAN workflow

```bash
bun run pt cmd SW1 "enable ; configure terminal ; vlan 10 ; name VENTAS ; exit ; vlan 20 ; name MARKETING ; exit"
bun run pt cmd SW1 "interface fastEthernet 0/1 ; switchport mode access ; switchport access vlan 10"
bun run pt cmd SW1 "interface fastEthernet 0/2 ; switchport mode access ; switchport access vlan 20"
```

- [ ] VLANs creadas
- [ ] Puertos asignados a VLANs correctas
- [ ] `show vlan brief` refleja configuración
- [ ] `show interfaces fastEthernet 0/1 switchport` muestra VLAN correcta

### 25.2 Trunk workflow

```bash
bun run pt cmd SW1 "interface gigabitEthernet 0/1 ; switchport mode trunk ; switchport trunk allowed vlan 10,20"
bun run pt cmd SW2 "interface gigabitEthernet 0/1 ; switchport mode trunk ; switchport trunk allowed vlan 10,20"
```

- [ ] Trunk configurado en ambos extremos
- [ ] VLANs permitidas correctas
- [ ] `show interfaces trunk` refleja configuración

### 25.3 Router-on-a-stick

```bash
bun run pt cmd R1 "interface gigabitEthernet 0/0.10 ; encapsulation dot1Q 10 ; ip address 192.168.10.1 255.255.255.0 ; no shutdown"
bun run pt cmd R1 "interface gigabitEthernet 0/0.20 ; encapsulation dot1Q 20 ; ip address 192.168.20.1 255.255.255.0 ; no shutdown"
bun run pt cmd R1 "interface gigabitEthernet 0/0 ; no shutdown"
```

- [ ] Subinterfaces creadas
- [ ] Encapsulación 802.1Q aplicada
- [ ] IPs asignadas a subinterfaces

### 25.4 OSPF workflow

```bash
bun run pt cmd R1 "router ospf 1 ; network 192.168.10.0 0.0.0.255 area 0 ; network 10.0.0.0 0.0.0.3 area 0"
bun run pt cmd R2 "router ospf 1 ; network 192.168.20.0 0.0.0.255 area 0 ; network 10.0.0.4 0.0.0.3 area 0"
```

- [ ] OSPF configurado en ambos routers
- [ ] `show ip ospf neighbor` muestra vecinos
- [ ] `show ip route` muestra rutas OSPF

### 25.5 DHCP workflow

```bash
bun run pt cmd R1 "ip dhcp pool VENTAS ; network 192.168.10.0 255.255.255.0 ; default-router 192.168.10.1 ; dns-server 8.8.8.8 ; exit"
bun run pt cmd R1 "ip dhcp excluded-address 192.168.10.1 192.168.10.10"
```

- [ ] DHCP pool configurado
- [ ] IPs excluidas configuradas
- [ ] `show ip dhcp binding` muestra asignaciones
- [ ] PC en DHCP recibe IP del pool

### 25.6 EtherChannel workflow

```bash
# Requiere 2 enlaces entre SW1 y SW2
bun run pt link add SW1 SW2 --ports GigabitEthernet0/2,GigabitEthernet0/2
bun run pt cmd SW1 "interface range gigabitEthernet 0/1-2 ; channel-group 1 mode active"
bun run pt cmd SW2 "interface range gigabitEthernet 0/1-2 ; channel-group 1 mode active"
```

- [ ] EtherChannel configurado (LACP active/active)
- [ ] `show etherchannel summary` muestra Port-channel up
- [ ] Ambos miembros en el channel-group

### 25.7 STP workflow

- [ ] `show spanning-tree` en SW1 raíz
- [ ] Puertos en estado forwarding/blocking correctos
- [ ] Si se cambia prioridad, nuevo root election ocurre

### 25.8 Router-on-a-stick workflow (completo)

```bash
bun run pt cmd R1 "interface g0/0.10 ; encapsulation dot1Q 10 ; ip address 192.168.10.1 255.255.255.0"
bun run pt cmd R1 "interface g0/0.20 ; encapsulation dot1Q 20 ; ip address 192.168.20.1 255.255.255.0"
bun run pt cmd R1 "interface g0/0 ; no shutdown"
```

- [ ] Router-on-a-stick funcional completo (verificado con pings entre VLANs)

### 25.9 Trunk workflow (completo)

- [ ] Trunk entre SW1 y SW2 funcional
- [ ] Trunk allow vlan restringido correctamente
- [ ] PC en VLAN 10 de SW1 puede alcanzar PC en VLAN 10 de SW2 (con router)

---

## 26. pt-runtime: Kernel Internals

NOTA: Verificar mediante tests unitarios (no requieren PT abierto).

### 26.1 Kernel boot

- [ ] `createKernel()` inicializa subsistemas en orden correcto: FM → directories → heartbeat → lease → queue → runtime loader → poller
- [ ] Kernel arranca sin errores
- [ ] `kernel-lifecycle` transiciones correctas

### 26.2 Kernel state

- [ ] Estado `idle`, `running`, `busy_command` manejado correctamente
- [ ] Transiciones de estado válidas
- [ ] Estado incorrecto rechazado

### 26.3 Runtime loader

- [ ] `runtime.js` cargado correctamente
- [ ] Hot-reload detecta cambios por mtime
- [ ] Fallos de carga reportados sin crash

### 26.4 Runtime API

- [ ] `getDeviceByName`, `listDevices`, `querySessionState`, `createJob`, `getJobState` — API completa funcional
- [ ] Valores retornados correctos
- [ ] Errores manejados graceful

### 26.5 Execution engine

- [ ] Estados: `pending→waiting-command→completed|error`
- [ ] Deferred jobs ejecutados correctamente
- [ ] Timeout de jobs manejado
- [ ] Análisis semántico de output

### 26.6 Command queue

- [ ] Archivos `.json` leídos del directorio `commands/`
- [ ] Polling FIFO sin perder comandos
- [ ] Índice de cola mantenido

### 26.7 Queue claim

- [ ] Claim atómico: `commands/*.json` → `in-flight/*.json`
- [ ] Fallback copy-delete para PT 9.0
- [ ] Múltiples claims simultáneos no colisionan

### 26.8 Queue cleanup

- [ ] Stale jobs (tiempo excedido) limpiados
- [ ] Orphan jobs (sin proceso dueño) limpiados
- [ ] Cleanup no afecta jobs activos

### 26.9 Queue discovery

- [ ] Escaneo de filesystem encuentra comandos nuevos
- [ ] Archivos temporales (`.tmp`) ignorados
- [ ] Archivos de sidecar (`.meta.json`) ignorados

### 26.10 Heartbeat

- [ ] Heartbeat escrito periódicamente a `heartbeat.json`
- [ ] Contenido: timestamp, kernel state, uptime
- [ ] Heartbeat stale detecta kernel muerto

### 26.11 Lease

- [ ] Acceso exclusivo a `PT_DEV_DIR` via lease file
- [ ] Stale lease detectado por TTL y PID
- [ ] Lease renovado dentro del TTL
- [ ] Sin lease: comando falla con error claro

### 26.12 Directories

- [ ] 7 directorios base creados: `commands/`, `in-flight/`, `results/`, `logs/`, `consumer-state/`, `dead-letter/`, `meta/`
- [ ] Directorios existentes no causan error

### 26.13 Debug log

- [ ] Buffer NDJSON rotativo (500 eventos)
- [ ] Escritura a `logs/pt-debug.current.ndjson`
- [ ] Eventos de debug no afectan rendimiento

### 26.14 Dead letter

- [ ] Comandos corruptos movidos a dead-letter
- [ ] Metadata preservada (timestamp, error, original filename)

### 26.15 Command finalizer

- [ ] Resultado escrito a `results/<commandId>.json`
- [ ] Archivo in-flight eliminado
- [ ] Sidecars (meta, error) preservados si aplica

### 26.16 Command result envelope

- [ ] Envelope estandarizado: `{status, output, error, device, command, timestamp}`
- [ ] Status correcto: `ok`, `error`, `timeout`, `deferred`
- [ ] Output capturado completo

### 26.17 Output completion policy

- [ ] Políticas: `wait-for-prompt`, `timeout-only`, `line-count`, `regex-match`
- [ ] Política por defecto aplicada
- [ ] Política específica por tipo de comando

### 26.18 Force complete native

- [ ] Comandos nativos forzados a completar después de timeout
- [ ] Output parcial preservado
- [ ] Error con código `FORCE_COMPLETE`

---

## 27. pt-runtime: Handlers

NOTA: Verificar mediante tests unitarios.

### 27.1 Dispatcher

- [ ] Dispatcher central recibe envelope
- [ ] Identifica tipo de comando correctamente
- [ ] Delega al handler apropiado
- [ ] Handler inexistente → error claro

### 27.2 Device handlers

- [ ] `handleListDevices()`: enumera dispositivos, conexiones, puertos
- [ ] `handleAddDevice()`: crea dispositivo con atributos
- [ ] `handleRemoveDevice()`: elimina dispositivo
- [ ] `handleRenameDevice()`: renombra dispositivo
- [ ] `handleMoveDevice()`: mueve dispositivo en canvas
- [ ] `handleGetDevice()`: detalle de dispositivo

### 27.3 Device discovery

- [ ] Discovery profundo: interfaces, módulos, puertos
- [ ] Información de conexiones incluidas
- [ ] Estado de cada interfaz reportado

### 27.4 Device classifier

- [ ] Clasificación correcta: router, switch, host, server, etc.
- [ ] Basado en modelo y tipo

### 27.5 Device info & config

- [ ] Información detallada del dispositivo
- [ ] Configuración actual obtenida

### 27.6 Link handlers

- [ ] `handleAddLink()`: crea enlace entre dispositivos
- [ ] `handleListLinks()`: lista enlaces
- [ ] `handleRemoveLink()`: elimina enlace
- [ ] `handleVerifyLink()`: verifica enlace

### 27.7 VLAN handler

- [ ] `handleVlanOperation()`: crea, elimina, modifica VLANs
- [ ] Operaciones validadas (IDs válidos, nombres correctos)

### 27.8 DHCP handler

- [ ] `handleDhcpOperation()`: pool DHCP, exclusiones, bindings
- [ ] Configuración de DHCP server

### 27.9 Host handler

- [ ] `handleHostOperation()`: configuración de hosts (IP, DHCP, gateway)
- [ ] Host type detection correcta

### 27.10 Canvas handler

- [ ] `handleCanvasOperation()`: workspace, zoom, clear
- [ ] Operaciones de canvas atómicas

### 27.11 Inspect handlers

- [ ] `handleInspectDevice()`: inspección detallada
- [ ] `handleDeepInspect()`: inspección profunda (genome)

### 27.12 Project handler

- [ ] `handleProjectOperation()`: status, save, open, metadata

### 27.13 Terminal plan run

- [ ] Ejecuta plan de terminal completo (múltiples steps)
- [ ] Steps: ensureMode, command, confirm, save
- [ ] Rollback en caso de fallo

### 27.14 Terminal native exec

- [ ] Ejecuta comando IOS nativo (single step, sin plan)
- [ ] Output inmediato

### 27.15 IOS execution handler

- [ ] Ejecuta comando en modo exec
- [ ] Maneja paginación, confirmaciones
- [ ] Detecta prompts correctamente

### 27.16 IOS config handler

- [ ] Ejecuta comandos en modo configuración
- [ ] Transiciones de modo automáticas
- [ ] Verificación de cambios

### 27.17 Ping handler

- [ ] Ejecuta ping en hosts
- [ ] Parsea resultado (% success, rtt)
- [ ] Ping exitoso vs fallido

### 27.18 Cable recommender

- [ ] Recomienda tipo de cable basado en dispositivos
- [ ] Cable correcto para router↔router, router↔switch, switch↔host

### 27.19 Module handlers

- [ ] `handleAddModule()`: agrega módulo a slot
- [ ] `handleRemoveModule()`: remueve módulo
- [ ] `handleListModules()`: lista módulos instalados
- [ ] Slot finder: encuentra slot compatible

### 27.20 File operations

- [ ] Lee/crea/elimina archivos en PT_DEV_DIR
- [ ] Operaciones seguras (no leak de rutas)

### 27.21 Stability classification

- [ ] Handlers estables vs experimentales correctamente clasificados
- [ ] `StableHandlers`: lista completa de handlers estables
- [ ] `ExperimentalHandlers`: lista de handlers experimentales

---

## 28. pt-runtime: Terminal Engine

### 28.1 TerminalEngine

- [ ] `createTerminalEngine()`: inicialización correcta
- [ ] `attach(device)`: attach a terminal de dispositivo
- [ ] `detach(device)`: detach graceful
- [ ] `executeCommand(device, command)`: ejecución asíncrona

### 28.2 Terminal session

- [ ] Estado de sesión: `mode`, `prompt`, `paging`, `busyJobId`, `healthy`
- [ ] Sesión healthy tras attach exitoso
- [ ] Sesión unhealthy tras error grave
- [ ] Reset de sesión

### 28.3 Terminal events (PT)

- [ ] `commandStarted`, `commandEnded`, `outputWritten` — eventos PT correctos
- [ ] Eventos disparados en orden correcto
- [ ] Payload de eventos completo

### 28.4 Prompt parser

- [ ] `parsePrompt()` detecta: `user-exec>`, `priv-exec#`, `(config)#`, `(config-if)#`, etc.
- [ ] Prompt de host detectado (ej: `C:\>`)
- [ ] Prompt desconocido manejado graceful

### 28.5 Plan engine (moderno)

- [ ] `createPlanEngine()`: inicialización correcta
- [ ] Steps tipados ejecutados en orden
- [ ] Error en step medio detiene plan
- [ ] Rollback steps ejecutados si falla plan

### 28.6 Command executor (moderno)

- [ ] Envía comando, espera output, retorna resultado
- [ ] Timeout manejado
- [ ] Output completo capturado

### 28.7 Pager handler

- [ ] `--More--` detectado y manejado (send space)
- [ ] Múltiples páginas (20+) manejado
- [ ] `terminal length 0` desactiva pager

### 28.8 Confirm handler

- [ ] Confirmaciones detectadas: `[confirm]`, `[yes/no]`, `[y/n]`
- [ ] Respuesta automática enviada
- [ ] Timeout de confirmación manejado

### 28.9 Prompt detector (moderno)

- [ ] Patrones de prompt IOS detectados
- [ ] Prompt changes monitoreados

### 28.10 Terminal recovery

- [ ] `Ctrl+C`, `end`, `disable` intentados secuencialmente
- [ ] Recuperación de estado desconocido
- [ ] Sesión restaurada a estado conocido

### 28.11 Terminal readiness

- [ ] Terminal listo para recibir comandos
- [ ] Device not ready → error claro
- [ ] Wait for readiness

### 28.12 Semantic verifier

- [ ] Output verificado semánticamente
- [ ] Errores IOS detectados: `Invalid input`, `Incomplete command`, `Ambiguous command`
- [ ] Éxito vs error clasificado correctamente

### 28.13 Stability heuristic

- [ ] Tiempo de estabilidad configurable
- [ ] Output estable solo si no hay cambios recientes
- [ ] Heurística ajustable por tipo de comando

---

## 29. pt-runtime: Build Pipeline (AST Transforms)

### 29.1 AST transforms — individuales

- [ ] `remove-imports-exports`: import/export removidos
- [ ] `remove-type-annotations`: `:Type` removidos
- [ ] `let-const-to-var`: `let`/`const` convertidos a `var`
- [ ] `arrow-to-function`: `()=>{}` convertido a `function`
- [ ] `class-to-function-constructor`: clase convertida a función
- [ ] `for-of-to-for-loop`: `for...of` convertido a `for`
- [ ] `spread-to-object-assign`: `...obj` convertido a `Object.assign`
- [ ] `template-literal-to-concat`: `` `text ${val}` `` a `"text "+val`
- [ ] `optional-chaining-to-logical`: `a?.b` a `a && a.b`
- [ ] `nullish-coalescing-to-logical`: `a ?? b` a `a !== null && a !== void 0 ? a : b`
- [ ] `destructuring-to-assignment`: `{a,b}=obj` a `var a=obj.a; var b=obj.b`
- [ ] `default-params-to-checks`: `(a=5)` a `(a){(a===void 0&&(a=5))`

### 29.2 Pipeline completo

- [ ] `main-pipeline`: TypeScript → main.js (IIFE, PT-safe)
- [ ] `runtime-pipeline`: TS → runtime.js (hot-reloadable)
- [ ] Pipeline produce código ES5/PT-safe válido

### 29.3 Preflight validation

- [ ] Sintaxis TypeScript válida antes de build
- [ ] Errores de sintaxis reportados con línea exacta

### 29.4 PT-Safe build gate

- [ ] Código generado verificado contra reglas PT-safe
- [ ] No `import/export`, `const/let`, arrow, `class`, `async/await`, template literals, optional chaining, `globalThis`, `require()`, `node:*`

### 29.5 Artifact factories

- [ ] `main-artifact`: main.js generado con checksum correcto
- [ ] `runtime-artifact`: runtime.js generado con checksum correcto
- [ ] `catalog-artifact`: catalog.js con constantes PT
- [ ] Artefactos idempotentes (mismo source → mismo hash)

### 29.6 Build context & options

- [ ] Build options: target ES5, source maps, minification
- [ ] Build context con paths correctos

---

## 30. IOS Domain: Parsers & Operations

### 30.1 Parsers — show version

```bash
bun run pt cmd read R1 "show version"
```

- [ ] `parseShowVersion()` extrae: uptime, IOS version, image, processor, config register, uptime
- [ ] Valores parseados correctamente

### 30.2 Parsers — show ip route

```bash
bun run pt cmd read R1 "show ip route"
```

- [ ] `parseShowIpRoute()` extrae: rutas, protocolo, next-hop, metric, AD, gateway of last resort
- [ ] Rutas directas (connected) y dinámicas (OSPF) parseadas
- [ ] Gateway of last resort detectado

### 30.3 Parsers — show running-config

```bash
bun run pt cmd read R1 "show running-config"
```

- [ ] `parseShowRunningConfig()` extrae: secciones, interfaces, hostname, version, ACLs, routing
- [ ] Configuración completa y parseable

### 30.4 Parsers — show vlan

```bash
bun run pt cmd read SW1 "show vlan brief"
bun run pt cmd read SW1 "show vlan"
```

- [ ] `parseShowVlan()` extrae: VLAN ID, nombre, status, puertos
- [ ] VLANs por defecto y creadas parseadas

### 30.5 Parsers — show interfaces

```bash
bun run pt cmd read R1 "show ip interface brief"
bun run pt cmd read R1 "show interfaces"
```

- [ ] `parseShowInterfaces()`: todas las interfaces con su estado
- [ ] `parseShowIpInterfaceBrief()`: IP, OK, status, protocol
- [ ] Valores parseados: IP, status, protocol, MTU, bandwidth

### 30.6 Parsers — show cdp neighbors

```bash
bun run pt cmd read R1 "show cdp neighbors"
bun run pt cmd read R1 "show cdp neighbors detail"
```

- [ ] `parseShowCdpNeighbors()`: device ID, local interface, port ID, platform, capabilities
- [ ] Vecinos listados correctamente

### 30.7 Operations — CommandPlan

- [ ] `CommandPlanBuilder` fluido: `.operation()`, `.target()`, `.step()`, `.config()`, `.iface()`, `.enable()`, `.enterInterface()`, `.recovery()`
- [ ] Auto-agrega `exit` al final si último paso es submodo
- [ ] `requiresPrivilege` y `requiresConfig` calculados

### 30.8 Operations — Configure VLAN

- [ ] `planConfigureVlan(vlanId, name?)`: plan para crear VLAN
- [ ] `planRemoveVlan(vlanId)`: plan para eliminar VLAN
- [ ] Comandos IOS generados correctamente

### 30.9 Operations — Configure Access Port

- [ ] `planConfigureAccessPort(interface, vlan)`: switchport mode access + access vlan + PortFast + BPDU guard
- [ ] Configuración completa de puerto de acceso

### 30.10 Operations — Configure Trunk Port

- [ ] `planConfigureTrunkPort(interface, allowedVlans?)`: trunk mode + allowed VLANs
- [ ] `switchport trunk native vlan` si se especifica

### 30.11 Operations — Configure SVI

- [ ] `planConfigureSvi(vlan, ip, mask)`: interface vlan + IP + no shutdown
- [ ] SVI creada correctamente

### 30.12 Operations — Configure Subinterface

- [ ] `planConfigureSubinterface(parentIf, subId, vlan, ip, mask)`: subinterface + dot1Q + IP
- [ ] Router-on-a-stick config generado

### 30.13 Operations — Configure Static Route

- [ ] `planConfigureStaticRoute(network, mask, nextHop, ad?)`: ip route + opcional AD
- [ ] Ruta estática generada correctamente

### 30.14 Operations — Configure DHCP Pool

- [ ] `planConfigureDhcpPool(name, network, mask, gateway, dns?)`: ip dhcp pool completo
- [ ] Pool DHCP generado con todos los parámetros

### 30.15 Operations — Configure DHCP Relay

- [ ] `planConfigureDhcpRelay(interface, helperAddress)`: ip helper-address
- [ ] DHCP relay configurado en interfaz

---

## 31. IOS Domain: Session & CLI

### 31.1 CliSession

- [ ] `CliSession.execute(command)`: comando ejecutado
- [ ] `CliSession.executeAndWait(command)`: espera output hasta prompt estable
- [ ] `CliSession.resyncPrompt()`: re-sincroniza prompt perdido
- [ ] `CliSession.recoverFromUnknownState()`: recupera de estado desconocido

### 31.2 Session state

- [ ] `createInitialState()`: estado inicial correcto
- [ ] `calculateMemoryStats()`: estadísticas de memoria
- [ ] `calculateSessionHealth()`: salud de sesión calculada

### 31.3 Session utilities

- [ ] `processCommandOutput()`: output procesado correctamente
- [ ] `updateStateFromResult()`: estado actualizado tras resultado
- [ ] `maintainHistory()`: historial mantenido

### 31.4 Interactive handlers

- [ ] `InteractiveStateHandler.handle()`: enable, config, confirm, paging manejados
- [ ] Estados interactivos detectados y resueltos

### 31.5 Command result classification

- [ ] `classifyOutput()`: ~30 tipos clasificados:
  - DNS lookup, copy destination, reload/erase confirm
  - Interface not found, VLAN not found, invalid mask
  - IP conflict, permission denied, unsupported command
  - Invalid/incomplete/ambiguous command
  - Paging, save-failed, success

### 31.6 Prompt state inference

- [ ] `inferPromptState()`: ~25 modos IOS detectados:
  - `user-exec>`, `priv-exec#`, `config#`, `config-if#`
  - `config-router#`, `config-router-af#`, `config-route-map#`
  - `config-class-map#`, `config-policy-map#`
  - `config-dhcp#`, `config-crypto-map#`, `config-keychain#`
  - `config-std-nacl#`, `config-ext-nacl#`
  - `resolving-hostname`, `copy-destination`

### 31.7 Transaction

- [ ] `Transaction` (Unit of Work): comandos agrupados
- [ ] Rollback: comandos inversos ejecutados
- [ ] Commit: todos los comandos aplicados
- [ ] Partial rollback en caso de error

### 31.8 TransactionBuilder

- [ ] Builder fluido: `.add()`, `.addRollback()`, `.withAudit()`
- [ ] Transacción construida correctamente

### 31.9 Audit log

- [ ] `AuditLogger.log()`: evento registrado
- [ ] `AuditLogger.getSessionLog()`: log de sesión recuperado
- [ ] Eventos: command, mode_change, error, recovery, confirmation

---

## 32. IOS Primitives: Value Objects

### 32.1 ValueObject base

- [ ] `ValueObject<T>`: equals, toString, toJSON
- [ ] Inmutabilidad preservada
- [ ] Comparación por valor (no por referencia)

### 32.2 DomainError

- [ ] 5 factory methods: `invalidArgument`, `notFound`, `conflict`, `validation`, `unexpected`
- [ ] Error con código, mensaje, detalles opcionales

### 32.3 IPv4Address

- [ ] Validación: formato `x.x.x.x`, cada octeto 0-255
- [ ] Clasificación: privada, loopback, multicast, broadcast, APIPA
- [ ] Conversión a CIDR, wildcard mask
- [ ] `from()`, `fromString()`, `tryFrom()`, `isValid()`

### 32.4 MacAddress

- [ ] 4 formatos: Cisco (`aaaa.bbbb.cccc`), colon, hyphen, bare
- [ ] Normalización entre formatos

### 32.5 VlanId

- [ ] Rango 1-4094
- [ ] Clasificación: DEFAULT(1), NORMAL(2-1005), RESERVED(1006-1024), EXTENDED(1025-4094)

### 32.6 InterfaceName

- [ ] Nomenclatura Cisco: `GigabitEthernet0/0`, `FastEthernet0/1`, `Serial0/0/0`, `VLAN100`, `Port-channel1`
- [ ] Prefijos válidos y formato de slot/puerto

### 32.7 Hostname

- [ ] Longitud ≤63 caracteres
- [ ] Caracteres permitidos: letras, dígitos, guiones

### 32.8 ASN

- [ ] Rango 1-65535

### 32.9 CidrPrefix

- [ ] Rango 0-32
- [ ] Conversión a subnet mask, wildcard mask
- [ ] `usableHosts()`, `totalAddresses()`

### 32.10 VlanName

- [ ] Formato válido de nombre de VLAN

### 32.11 VlanRange

- [ ] Formato: `"10-20,30,40-50"` parseado correctamente
- [ ] Iteración sobre VLANs en el rango

### 32.12 InterfaceDescription

- [ ] Validación de descripción de interfaz

### 32.13 DeviceId & DeviceType

- [ ] Tipos: router, switch, firewall, server, pc, hub, wireless-router

### 32.14 AdministrativeDistance

- [ ] Constantes: OSPF=110, RIP=120, EIGRP=90/170, Static=1, Connected=0

### 32.15 SpanningTreePriority

- [ ] Rango 0-61440
- [ ] Múltiplos de 4096 validados

### 32.16 CapabilityMatrixService

- [ ] Feature groups: Switchport, Routing, Switching, Security, Management
- [ ] Por modelo: router, l2Switch, l3Switch
- [ ] `canBeTrunk()`, `supportsInterVlanRouting()`, `isL2Only()`, `isL3Capable()`

### 32.17 Result type

- [ ] `Result<T, E>`: Ok/Err type funcional
- [ ] Pattern matching: `.match(ok, err)`, `.unwrap()`, `.unwrapOr()`, `.isOk()`, `.isErr()`

---

## 33. Kernel (Legacy)

NOTA: El paquete `packages/kernel` es el kernel legacy. Tests mínimos.

### 33.1 Topology use cases

- [ ] Topología: obtener, actualizar, eliminar componentes

### 33.2 VLAN use cases

- [ ] VLAN: CRUD de VLANs en dispositivos

### 33.3 Device use cases

- [ ] Device: CRUD de dispositivos

### 33.4 Domain aggregates & entities

- [ ] Aggregate roots, entities, value objects legacy

### 33.5 Plugins

- [ ] security, switching, vlan, routing, ipv6, services, port-template, orchestrator

### 33.6 Backends

- [ ] Packet Tracer adapter/plugin legacy

---

## 34. Network Scenarios End-to-End

### 34.1 Escenario 1: Red básica con VLANs

Topología: PC1 — SW1 — R1 — Internet

```bash
# 1. Configurar VLANs en SW1
bun run pt cmd SW1 "enable ; configure terminal ; vlan 10 ; name USERS ; exit ; vlan 20 ; name GUESTS ; exit"
bun run pt cmd SW1 "interface fastEthernet 0/1 ; switchport mode access ; switchport access vlan 10"
bun run pt cmd SW1 "interface fastEthernet 0/2 ; switchport mode access ; switchport access vlan 20"

# 2. Configurar trunk a R1
bun run pt cmd SW1 "interface gigabitEthernet 0/1 ; switchport mode trunk"

# 3. Configurar router-on-a-stick en R1
bun run pt cmd R1 "interface g0/0.10 ; encapsulation dot1Q 10 ; ip address 192.168.10.1 255.255.255.0 ; no shutdown"
bun run pt cmd R1 "interface g0/0.20 ; encapsulation dot1Q 20 ; ip address 192.168.20.1 255.255.255.0 ; no shutdown"
bun run pt cmd R1 "interface g0/0 ; no shutdown"

# 4. Configurar PCs
bun run pt set host ip PC1 192.168.10.10/24 --gateway 192.168.10.1
bun run pt set host ip PC2 192.168.20.10/24 --gateway 192.168.20.1

# 5. Verificar
bun run pt verify ping PC1 192.168.10.1
bun run pt verify ping PC1 192.168.20.10  # debe funcionar (router-on-a-stick)
bun run pt verify ping PC2 192.168.20.1
bun run pt verify ping PC2 192.168.10.10  # debe funcionar
```

- [ ] VLANs creadas (show vlan brief)
- [ ] Puertos asignados a VLANs correctas
- [ ] Trunk configurado y activo (show interfaces trunk)
- [ ] Subinterfaces en R1 configuradas
- [ ] PCs con IP configurada
- [ ] Ping intra-VLAN (PC1 → gateway)
- [ ] Ping inter-VLAN (PC1 → PC2)

### 34.2 Escenario 2: OSPF entre dos routers

Topología: PC1 — SW1 — R1 — R2 — SW2 — PC2

```bash
# 1. Configurar enlaces entre R1 y R2
bun run pt link add R1 R2

# 2. Configurar IPs en enlace serial/ethernet
bun run pt cmd R1 "interface g0/1 ; ip address 10.0.0.1 255.255.255.252 ; no shutdown"
bun run pt cmd R2 "interface g0/1 ; ip address 10.0.0.2 255.255.255.252 ; no shutdown"

# 3. Configurar OSPF
bun run pt cmd R1 "router ospf 1 ; network 192.168.10.0 0.0.0.255 area 0 ; network 10.0.0.0 0.0.0.3 area 0"
bun run pt cmd R2 "router ospf 1 ; network 192.168.20.0 0.0.0.255 area 0 ; network 10.0.0.4 0.0.0.3 area 0"

# 4. Verificar
bun run pt verify ospf R1
bun run pt verify ospf R2
bun run pt verify routing R1
bun run pt verify routing R2
bun run pt verify ping PC1 192.168.20.10  # extremo a extremo
```

- [ ] Enlace R1-R2 activo
- [ ] IPs en interfaz correctas (show ip interface brief)
- [ ] OSPF configurado (show ip ospf)
- [ ] OSPF neighbors UP (show ip ospf neighbor)
- [ ] Rutas OSPF en tabla (show ip route)
- [ ] Ping extremo a extremo funciona

### 34.3 Escenario 3: DHCP + VLANs

Topología basada en escenario 1

```bash
# 1. Configurar DHCP pools en R1
bun run pt cmd R1 "ip dhcp pool USERS ; network 192.168.10.0 255.255.255.0 ; default-router 192.168.10.1 ; dns-server 8.8.8.8 ; exit"
bun run pt cmd R1 "ip dhcp pool GUESTS ; network 192.168.20.0 255.255.255.0 ; default-router 192.168.20.1 ; dns-server 8.8.8.8 ; exit"
bun run pt cmd R1 "ip dhcp excluded-address 192.168.10.1 192.168.10.10"
bun run pt cmd R1 "ip dhcp excluded-address 192.168.20.1 192.168.20.10"

# 2. Configurar PCs en DHCP
bun run pt set host dhcp PC1
bun run pt set host dhcp PC2

# 3. Verificar
bun run pt cmd PC1 "ipconfig"
bun run pt cmd PC2 "ipconfig"
bun run pt verify dhcp PC1
bun run pt verify dhcp PC2
bun run pt cmd read R1 "show ip dhcp binding"
```

- [ ] DHCP pools configurados (`show ip dhcp pool`)
- [ ] Exclusiones aplicadas
- [ ] PCs reciben IP via DHCP
- [ ] `ipconfig` muestra IP, mask, gateway, DNS
- [ ] `show ip dhcp binding` muestra leases activas
- [ ] Ping desde PC DHCP a gateway funciona
- [ ] `pt verify dhcp` reporta OK

### 34.4 Escenario 4: Spanning Tree + EtherChannel

Topología: SW1 — SW2 (2 enlaces), SW1 — PC1, SW2 — PC2

```bash
# 1. Configurar STP
bun run pt cmd SW1 "spanning-tree vlan 1 priority 4096"  # SW1 es root
bun run pt cmd SW2 "spanning-tree vlan 1 priority 8192"

# 2. Agregar segundo enlace entre SW1 y SW2
bun run pt link add SW1 SW2 --ports GigabitEthernet0/2,GigabitEthernet0/2

# Verificar STP antes de EtherChannel
bun run pt cmd read SW1 "show spanning-tree"
bun run pt cmd read SW2 "show spanning-tree"

# 3. Configurar EtherChannel (LACP)
bun run pt cmd SW1 "interface range gigabitEthernet 0/1-2 ; channel-group 1 mode active"
bun run pt cmd SW2 "interface range gigabitEthernet 0/1-2 ; channel-group 1 mode active"

# 4. Verificar
bun run pt cmd read SW1 "show etherchannel summary"
bun run pt cmd read SW1 "show spanning-tree"
```

- [ ] STP: SW1 es root bridge
- [ ] STP: Puerto en blocking detectado en SW2
- [ ] Prioridad STP cambiada correctamente
- [ ] EtherChannel: Port-channel UP (show etherchannel summary)
- [ ] EtherChannel: Ambos miembros en channel-group
- [ ] STP después de EtherChannel: Port-channel es el único enlace lógico

### 34.5 Escenario 5: ACLs de seguridad

Basado en escenario 1 (red con VLANs)

```bash
# 1. Configurar ACL extendida
bun run pt cmd R1 "access-list 100 deny tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 22"
bun run pt cmd R1 "access-list 100 permit ip any any"
bun run pt cmd R1 "interface g0/0.10 ; ip access-group 100 in"

# 2. Verificar
bun run pt cmd read R1 "show access-list"
bun run pt cmd read R1 "show running-config | section access-list"
bun run pt cmd read R1 "show ip interface g0/0.10"  # debe mostrar "Inbound access list is 100"
```

- [ ] ACL extendida configurada
- [ ] Aplicada a interfaz correcta (inbound)
- [ ] `show access-list` muestra hits
- [ ] Ping desde VLAN10 a VLAN20 (debe funcionar — ACL permite ip)
- [ ] Tráfico SSH bloqueado (si se pudiera probar)

### 34.6 Escenario 6: NAT (PAT/Overload)

Basado en escenario 2

```bash
# 1. Configurar NAT en R1 (asumiendo g0/2 es outside)
bun run pt cmd R1 "access-list 1 permit 192.168.10.0 0.0.0.255"
bun run pt cmd R1 "ip nat inside source list 1 interface g0/2 overload"
bun run pt cmd R1 "interface g0/0.10 ; ip nat inside"
bun run pt cmd R1 "interface g0/2 ; ip nat outside"

# 2. Verificar
bun run pt cmd read R1 "show ip nat translations"
bun run pt cmd read R1 "show ip nat statistics"
```

- [ ] ACL de NAT configurada
- [ ] NAT inside/outside en interfaces correctas
- [ ] `show ip nat statistics` muestra traducciones
- [ ] Tráfico desde LAN debe traducirse (si hay tráfico)

### 34.7 Escenario 7: Wireless (WLC + AP)

```bash
# 1. Agregar WLC y AP
bun run pt device add --model WLC --name WLC1 --at 300,100
bun run pt device add --model AccessPoint-PT --name AP1 --at 300,50

# 2. Conectar
bun run pt link add WLC1 AP1
bun run pt link add WLC1 SW1

# 3. Configurar WLC
bun run pt cmd WLC1 "show wlan summary"
```

- [ ] WLC detectado como wireless controller
- [ ] AP conectado al WLC
- [ ] WLANs listadas (show wlan summary)
- [ ] `pt verify wlc WLC1` funciona

### 34.8 Escenario 8: Servicios (HTTP, DNS, Email)

Basado en escenario con SRV1

```bash
# 1. Configurar servicios en servidor
bun run pt set host ip SRV1 192.168.1.100/24 --gateway 192.168.1.1

# 2. Verificar servicios
bun run pt cmd SRV1 "ipconfig"
```

- [ ] Servidor responde en red
- [ ] Servicios HTTP/DNS/Email detectados

### 34.9 Escenario 9: IPv6

```bash
# 1. Configurar IPv6 en R1
bun run pt cmd R1 "ipv6 unicast-routing"
bun run pt cmd R1 "interface g0/0 ; ipv6 address 2001:db8:1::1/64 ; no shutdown"

# 2. Verificar
bun run pt cmd read R1 "show ipv6 interface brief"
bun run pt cmd read R1 "show ipv6 route"
```

- [ ] IPv6 routing habilitado globalmente
- [ ] Dirección IPv6 en interfaz configurada
- [ ] `show ipv6 interface brief` muestra interfaz
- [ ] `show ipv6 route` muestra ruta connected

### 34.10 Escenario 10: Topología completa multi-capa

Combinar escenarios 1-2-3-4-5-6 en una sola topología:

```
PC1(10) ──┐
          SW1 ──trunk── R1 ─── R2 ──trunk── SW2 ── PC2(20)
PC3(10) ──┘         │                      │
                   SRV1                  PC4(20)
```

- [ ] Toda la topología desplegable
- [ ] VLANs 10 y 20 en ambos switches
- [ ] Trunks entre SW1-R1 y SW2-R2
- [ ] OSPF entre R1 y R2
- [ ] Router-on-a-stick en ambos routers
- [ ] DHCP en R1/R2 para ambas VLANs
- [ ] ACLs de seguridad aplicadas
- [ ] NAT configurado (si hay outside)
- [ ] Ping funciona extremo a extremo (PC1→PC2, PC1→PC4)
- [ ] `pt doctor` no reporta problemas

---

## 35. Error Handling & Edge Cases

### 35.1 Comandos inválidos

```bash
bun run pt cmd R1 "sho wersion"  # typo
bun run pt cmd R1 "show versionn"  # typo sutil
bun run pt cmd R1 ""  # comando vacío
bun run pt cmd NOEXISTE "show version"
bun run pt cmd PC1 "show version"  # comando IOS en PC
bun run pt cmd R1 "configure terminal ; invalid-command"
```

- [ ] Typos: mensaje de error claro (`Invalid input detected`)
- [ ] Comando vacío: error o no ejecutado
- [ ] Dispositivo inexistente: error `DEVICE_NOT_FOUND`
- [ ] Comando IOS en PC: error o mensaje informativo
- [ ] Comando inválido en configuración: error sin crash

### 35.2 Timeouts

```bash
bun run pt cmd R1 "traceroute 8.8.8.8" --timeout 1000
```

- [ ] Timeout lanza error con código `COMMAND_TIMEOUT`
- [ ] Sesión recuperable después de timeout
- [ ] `pt cmd` posterior funciona

### 35.3 Sesión rota / recuperación

```bash
# Simular sesión rota (cerrar PT a mitad de comando)
# Reabrir y ejecutar comando
bun run pt app close --force
bun run pt app open
bun run pt cmd R1 "show version"
```

- [ ] Después de crash/force close, nueva sesión funciona
- [ ] Recovery engine re-establece sesión IO

### 35.4 Dispositivo apagado

```bash
bun run pt cmd R1 "shutdown"
bun run pt cmd R1 "show version"
# Luego encenderlo de nuevo
```

- [ ] Comando en dispositivo apagado: error claro
- [ ] Después de encender, comando funciona

### 35.5 Bridge sin runtime

```bash
# Detener runtime o no tener PT abierto
bun run pt doctor
bun run pt cmd R1 "show version"
```

- [ ] `doctor` reporta runtime no conectado
- [ ] `pt cmd` falla con error claro (no timeout silencioso)

### 35.6 Archivo .pkt no guardado

```bash
bun run pt project save  # sin proyecto abierto
```

- [ ] Mensaje claro: no hay proyecto activo
- [ ] No crashes

### 35.7 Casos límite de nombres

```bash
bun run pt device add --model 2960 --name "SW-1"  # guión
bun run pt device add --model 2960 --name "SW_1"  # underscore
bun run pt device add --model 2960 --name "a"  # nombre corto
bun run pt device add --model 2960 --name "abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz"  # nombre largo
```

- [ ] Nombres con guiones aceptados
- [ ] Nombres con underscore aceptados
- [ ] Nombres muy cortos aceptados
- [ ] Nombres muy largos: truncados o error informativo

### 35.8 Múltiples operaciones rápidas

```bash
bun run pt device add --model 2960 --name SW10 && bun run pt device add --model 2960 --name SW11 && bun run pt link add SW10 SW11
```

- [ ] Operaciones encadenadas rápidas no fallan
- [ ] Bridge maneja backpressure correctamente
- [ ] No hay race conditions

### 35.9 Vlan IDs extremos

```bash
bun run pt cmd SW1 "vlan 1"      # VLAN default
bun run pt cmd SW1 "vlan 4094"   # VLAN máxima
bun run pt cmd SW1 "vlan 0"      # inválido
bun run pt cmd SW1 "vlan 4095"   # fuera de rango
```

- [ ] VLAN 1: creada (o mensaje que ya existe)
- [ ] VLAN 4094: creada correctamente
- [ ] VLAN 0: error claro
- [ ] VLAN 4095: error claro

### 35.10 Interfaz inexistente

```bash
bun run pt cmd R1 "interface GigabitEthernet10/0"
```

- [ ] Mensaje: `Interface GigabitEthernet10/0 not found`
- [ ] Sesión no se rompe (sigue en config mode)

---

## 36. Performance & Stress Testing

### 36.1 Benchmark

```bash
bun run pt bench
bun run pt bench --json
```

- [ ] Bench ejecuta comandos benchmark
- [ ] Reporta tiempos de ejecución
- [ ] `--json` retorna métricas estructuradas

### 36.2 Comandos rápidos en serie (100 comandos)

```bash
for i in $(seq 1 100); do bun run pt cmd R1 "show version" > /dev/null 2>&1; done
time bun run pt cmd R1 "show version"
```

- [ ] 100 comandos show ejecutados sin degradación
- [ ] Tiempo por comando no aumenta significativamente
- [ ] No hay leak de memoria en runtime

### 36.3 Múltiples dispositivos concurrentes

```bash
bun run pt cmd R1 "show version" &
bun run pt cmd R2 "show ip route" &
bun run pt cmd SW1 "show vlan brief" &
bun run pt cmd PC1 "ipconfig" &
wait
```

- [ ] 4 comandos concurrentes ejecutados
- [ ] Resultados correctos de cada uno
- [ ] Bridge maneja concurrencia

### 36.4 Output muy grande

```bash
bun run pt cmd read R1 "show running-config"
bun run pt cmd read SW1 "show running-config | include interface"
```

- [ ] Output grande (>100KB) manejado sin truncar
- [ ] No timeout por output grande
- [ ] Parser detecta fin de output correctamente

### 36.5 Sesiones prolongadas

```bash
# Dejar PT abierto 1 hora, luego ejecutar comando
sleep 3600 ; bun run pt cmd R1 "show version"
```

- [ ] Sesión sigue activa después de 1 hora
- [ ] Heartbeat mantiene sesión viva
- [ ] Comando ejecutado correctamente

### 36.6 Stress de bridge

```bash
# Enviar 50 comandos rápidos
for i in $(seq 1 50); do
  bun run pt cmd R1 "show version" --json > /dev/null 2>&1 &
done
```

- [ ] 50 comandos simultáneos no saturan bridge
- [ ] Backpressure maneja sobrecarga graceful
- [ ] Resultados no se pierden

### 36.7 Build time

```bash
time bun run pt build
```

- [ ] Build completo < 30 segundos (objetivo)
- [ ] Build incremental más rápido (< 10s)

---

## 37. Topología Recomendada

```
    ┌─────────────────────────────────────────────────────────────┐
    │                        R1 (4321)                           │
    │  g0/0 ──┬── g0/0.10 (192.168.10.1/24)                    │
    │         ├── g0/0.20 (192.168.20.1/24)                    │
    │         └── g0/0.99 (10.99.99.1/30)                     │
    │  g0/1 ───────── 10.0.0.1/30 ──── R2 (ISR4331) g0/1     │
    │  g0/2 ───────── (outside/NAT)                           │
    └──────────┬───────────────────────────────────────────────┘
               │ g0/0.10       │ g0/0.20
               │ trunk         │ trunk
               ▼               ▼
    ┌──────────────────┐  ┌──────────────────┐
    │  SW1 (2960)      │  │  SW2 (3560-24PS) │
    │  f0/1: VLAN 10   │  │  f0/1: VLAN 20   │
    │  f0/2: VLAN 10   │  │  f0/2: VLAN 20   │
    │  g0/1: trunk     │  │  g0/1: trunk     │
    │  g0/2: trunk SW2 │  │  g0/2: trunk SW1 │
    └────────┬─────────┘  └────────┬─────────┘
             │ f0/1                │ f0/1
             ▼                     ▼
    ┌──────────────┐    ┌──────────────┐
    │  PC1 (PC)    │    │  PC2 (PC)    │
    │  192.168.    │    │  192.168.    │
    │  10.10/24    │    │  20.10/24    │
    └──────────────┘    └──────────────┘

    ┌──────────────┐
    │ SRV1 (Server)│
    │ 192.168.     │
    │ 1.100/24     │
    └──────┬───────┘
           │
    ┌──────┴───────┐
    │ SW1 f0/3     │
    └──────────────┘
```

### Modelos recomendados

| Dispositivo | Modelo | Puerto |
|---|---|---|
| R1 | 4321 | Router con 3 GigabitEthernet |
| R2 | ISR4331 | Router con 3 GigabitEthernet + NIM |
| SW1 | 2960 | Switch L2, 24 FastEthernet + 2 Gigabit |
| SW2 | 3560-24PS | Switch L3, 24 FastEthernet + 2 Gigabit |
| PC1 | PC | Desktop |
| PC2 | PC | Desktop |
| SRV1 | Server | Server |

---

## Instrucciones para usar Omni raw durante las pruebas

Cuando un test falle y necesites depuración profunda, usa `pt omni raw`:

```bash
# Inspeccionar dispositivos
bun run pt omni raw "listDevices()"

# Inspeccionar enlaces
bun run pt omni raw "listLinks()"

# Inspeccionar un dispositivo específico
bun run pt omni raw "getDeviceByName('R1')"

# Ejecutar comando IOS via omni
bun run pt omni raw "execIos('R1', 'show version')"

# Ver estado del kernel
bun run pt omni raw "kernelState()"

# Debug: ver cola de comandos
bun run pt omni raw "listCommands()"

# Ver resultados pendientes
bun run pt omni raw "listResults()"

# Forzar limpieza (si es necesario, con guard off)
bun run pt omni raw --guard off "cleanAll()"
```

---

## Notas finales

1. **Orden sugerido:** Ejecutar las pruebas en orden secuencial (1→37). Cada sección depende de la anterior.
2. **Topología:** Usar la topología recomendada del §37. Si alguna prueba requiere topología diferente, se indica explícitamente.
3. **Persistencia:** Guardar configuración después de cada escenario exitoso (`bun run pt save --all`).
4. **Reporte:** Documentar resultados en archivo separado (`resultados-validacion.md`).
5. **Fallos:** Si un test falla, ejecutar diagnóstico con `bun run pt doctor` y depurar con `bun run pt omni raw`.
6. **Reintentos:** Algunos comandos pueden fallar por timeout en PT. Reintentar 1-2 veces antes de marcar como fallo.
7. **Reset:** Para empezar de nuevo, cerrar PT sin guardar y recargar el .pkt original.
8. **Tests unitarios:** Complementar con `bun run test:<area>` para verificar capas sin PT abierto.