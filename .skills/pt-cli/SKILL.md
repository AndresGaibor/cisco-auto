---
name: pt-cli
description: |
  Cisco Packet Tracer CLI automation skill.
  
  USA ESTA SKILL AUTOMÁTICAMENTE cuando el usuario mencione:
  - Packet Tracer, PT, Cisco networking
  - Redes Cisco: VLANs, routing, switching, OSPF, EIGRP, BGP, STP
  - Laboratorios .pka, .pkt, .yaml
  - Comandos 'bun run pt' o 'pt' en general
  
  Esta skill proporciona acceso completo a la CLI de Packet Tracer.
---

# PT CLI (`bun run pt`)

**Skill para automatización de Cisco Packet Tracer**

## ¿Cuándo activar esta skill?

Esta skill se activa AUTOMÁTICAMENTE cuando el usuario menciona (NO preguntar):
- "Packet Tracer", "PT", "cisco", "redes Cisco"
- "bun run pt", "pt device", "pt config", "pt show"
- "VLAN", "OSPF", "EIGRP", "BGP", "STP", "EtherChannel"
- ".pka", ".pkt", ".yaml" (archivos de lab)
- Cualquier tarea de configuración de red Cisco

## 57 Comandos CLI Disponibles

### 🖥️ Gestión de Dispositivos
```bash
bun run pt device list              # Listar dispositivos en PT
bun run pt device add R1 2911      # Agregar dispositivo
bun run pt device remove R1         # Remover dispositivo
bun run pt device move R1 --xpos 300 --ypos 200  # Mover dispositivo
```

### 📊 Comandos Show
```bash
bun run pt show                     # Ejecutar comandos show
bun run pt show ip-int-brief R1     # Mostrar interfaces IPs
bun run pt show vlan Switch1        # Mostrar VLANs
bun run pt show ip-route R1         # Mostrar rutas
bun run pt show run-config R1       # Mostrar configuración
bun run pt show run R1              # Alias de show run-config
bun run pt show cdp R1              # Mostrar vecinos CDP
bun run pt show-cdp R1              # Mostrar vecinos CDP (alternativo)
bun run pt show-route R1            # Mostrar tabla de enrutamiento
bun run pt show-vlan Switch1        # Mostrar VLANs de switch
```

### ⚙️ Configuración
```bash
bun run pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0 --gateway 192.168.1.254
bun run pt config-ios R1 interface GigabitEthernet0/0 ip address 192.168.1.1 255.255.255.0
bun run pt config-interface --device R1 --name Gig0/0 --ip 192.168.1.1 --mask 255.255.255.0
bun run pt config-acl --device R1 --name FILTER --type extended --rule "permit,ip,any,any"
bun run pt config-vlan --device S1 --vlan "10,ADMIN" --vlan "20,USERS"
```

### 🌐 Protocolos de Routing
```bash
bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0"
bun run pt eigrp --device R1 --as 100 --network "192.168.1.0,0.0.0.255"
bun run pt bgp --device R1 --as 65000 --neighbor "10.0.0.2,65001"
bun run pt routing                  # Comandos legacy de routing
bun run pt routing ospf enable R1
bun run pt routing static add 0.0.0.0 0.0.0.0 192.168.1.1
```

### 🔀 VLANs y Switching
```bash
bun run pt vlan                    # Gestión de VLANs
bun run pt vlan apply Switch1 10 20 30
bun run pt stp                    # Spanning Tree Protocol
bun run pt stp set Switch1 mode rapid-pvst
bun run pt stp set Switch1 priority 4096
bun run pt etherchannel            # EtherChannel
bun run pt etherchannel create Switch1 1 Gi0/1 Gi0/2
bun run pt etherchannel list
```

### 🔒 ACLs
```bash
bun run pt acl                     # Gestión de ACLs
bun run pt acl create 100 permit tcp any any eq 80
bun run pt acl apply ACL-100 R1
```

### 🔗 Gestión de Enlaces
```bash
bun run pt link                    # Gestión de conexiones
bun run pt link add R1 Gi0/0 S1 Fa0/1
bun run pt link list
bun run pt link remove R1 Gi0/0
```

### 🌩️ Servicios de Red
```bash
bun run pt services                # Servicios (DHCP/NTP/Syslog)
bun run pt service                # Alias de services
bun run pt services dhcp Switch1
bun run pt services ntp Switch1
bun run pt services syslog Switch1
```

### 🧪 Lab Management
```bash
bun run pt lab                     # Gestión de laboratorios
bun run pt lab list                # Listar labs
bun run pt lab create <nombre>     # Crear nuevo lab
bun run pt lab lift                # Levantar lab desde YAML
bun run pt lab validate <archivo>  # Validar lab
bun run pt lab interactive         # Modo interactivo/wizard
bun run pt lab pipeline            # Pipeline de labs
bun run pt lab parse <archivo>     # Parsear lab
```

### 📝 Auditoría e Historia
```bash
bun run pt history                 # Historial de comandos
bun run pt history list
bun run pt history show <id>
bun run pt history last
bun run pt history search "ospf"   # Buscar en historial
bun run pt history failed         # Comandos fallidos
bun run pt search <query>          # Buscar en historial (alias)
bun run pt failed                  # Mostrar fallidos (alias)
```

### 📋 Audit Log
```bash
bun run pt audit tail              # Últimas operaciones
bun run pt audit tail --lines 50
bun run pt audit export            # Exportar auditoría
bun run pt audit export --format json --output audit.json
bun run pt audit-failed           # Operaciones fallidas
bun run pt audit-failed --since "2026-04-01"
bun run pt audit query             # Consultar audit_log
bun run pt query                  # Alias de audit query
```

### 🗺️ Topología
```bash
bun run pt topology                # Análisis de topología
bun run pt topology analyze        # Analizar topología
bun run pt topology visualize     # Visualizar
bun run pt topology show          # Mostrar topología descubierta
bun run pt topology export        # Exportar
bun run pt topology clean         # Limpiar
bun run pt topology-show          # Alias de inspect topology
```

### 🔍 Inspección y Verificación
```bash
bun run pt inspect                 # Inspección canónica
bun run pt inspect topology       # Ver topología
bun run pt inspect neighbors R1   # Ver vecinos
bun run pt inspect free-ports R1  # Ver puertos libres
bun run pt inspect drift          # Detectar drift

bun run pt verify                  # Verificación post-cambio
bun run pt verify ios R1          # Verificar IOS
bun run pt verify link R1 Gi0/0 S1 Fa0/1
```

### 📐 Layout
```bash
bun run pt layout                  # Disposición espacial
bun run pt layout place R1 right-of S1 --gap 160
```

### 🧠 Comandos Avanzados
```bash
bun run pt lint                    # Validación de topología
bun run pt capability             # Capacidades de dispositivos
bun run pt capability list        # Listar modelos soportados
bun run pt capability model 2911 # Ver capacidades de modelo

bun run pt planner                # Change planner
bun run pt planner list           # Listar planes
bun run pt planner execute <id>  # Ejecutar plan
bun run pt planner show <id>     # Ver plan

bun run pt ledger                 # Trazabilidad
bun run pt ledger list            # Listar operaciones
bun run pt ledger show <id>       # Ver operación
bun run pt ledger device R1       # Operaciones por dispositivo
bun run pt ledger stats           # Estadísticas

bun run pt diagnose               # Diagnóstico causal
bun run pt diagnose ping-fails R1
bun run pt diagnose no-dhcp R1
bun run pt diagnose no-access R1
bun run pt diagnose packet-loss R1
bun run pt diagnose acl-block R1
```

### 🤖 Agent Workflow
```bash
bun run pt agent                  # Flujo para agentes
bun run pt agent context --task "connect R1 and S1"
bun run pt agent plan --goal "normalize access layer"
bun run pt agent verify
bun run pt agent apply
```

### 🏢 Gestión de Dispositivos (memoria SQLite)
```bash
bun run pt list                   # Listar dispositivos guardados
bun run pt add R1 --ip 10.0.0.1   # Agregar a memoria
```

### 🔧 Utilidades
```bash
bun run pt status                 # Estado del CLI
bun run pt doctor                 # Diagnóstico del sistema
bun run pt build                  # Build y deploy a ~/pt-dev/
bun run pt setup                  # Preparar entorno
bun run pt runtime                # Operaciones del runtime

bun run pt logs                   # Logs
bun run pt logs tail
bun run pt logs session <id>
bun run pt logs errors

bun run pt results                # Resultados
bun run pt results list
bun run pt results show <id>
bun run pt results last

bun run pt prefs                  # Preferencias
bun run pt config-prefs set default_router 2911
bun run pt config-prefs get default_router

bun run pt bridge                 # Estado del bridge CLI ↔ PT

bun run pt dhcp-server            # Servidores DHCP
bun run pt host                   # Gestionar PCs/Servers

bun run pt router                 # Gestión de routers Cisco
bun run pt router add R1 2911
bun run pt router add R1 2911 -x 200 -y 300

bun run pt interface              # Configurar interfaces
bun run pt apply <archivo>        # Aplicar config desde YAML/JSON

bun run pt completion bash        # Completions de shell

bun run pt help                   # Ayuda enriquecida
bun run pt help <comando>
```

## Flags Globales

```bash
-h, --help               # Ayuda
-j, --json              # Salida JSON
--jq <filter>           # Filtrar JSON con sintaxis jq
-o, --output <format>   # Formato: json, yaml, table, text
-v, --verbose           # Salida detallada (debug)
-q, --quiet             # Solo errores
--trace                 # Traza estructurada
--trace-payload         # Incluir payload en traza
--trace-result          # Incluir preview del resultado
--session-id <id>       # ID de sesión manual
--examples              # Mostrar ejemplos
--schema                # Mostrar schema JSON
--explain               # Explicar qué hace el comando
--plan                  # Mostrar plan sin ejecutar
--verify                # Verificar post-ejecución (default: true)
--no-verify             # Omitir verificación
--timeout <ms>          # Timeout global
--no-timeout            # Desactivar timeout
```

## Ejemplos de Uso

### Ejemplo 1: Configurar VLAN básica
```bash
# 1. Agregar dispositivos
bun run pt device add Switch1 2960
bun run pt device add PC1 PC

# 2. Crear VLANs
bun run pt vlan apply Switch1 10 20

# 3. Crear enlaces
bun run pt link add PC1 Fa0/1 Switch1 Fa0/1
```

### Ejemplo 2: Configurar OSPF
```bash
bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0"
```

### Ejemplo 3: Verificar laboratorio
```bash
bun run pt inspect topology
bun run pt verify ios R1
bun run pt topology show
```

### Ejemplo 4: Lab interactivo
```bash
bun run pt lab interactive
```

### Ejemplo 5: Diagnóstico de problema
```bash
bun run pt diagnose ping-fails R1
bun run pt diagnose no-dhcp Switch1
bun run pt lint
```

### Ejemplo 6: Ver capacidades de dispositivo
```bash
bun run pt capability list
bun run pt capability model 2911
bun run pt capability ops 2960
bun run pt capability check 2911 vlan
```

## Notas

- **PT debe estar corriendo** con el módulo de scripting cargado
- **Archivo de salida**: `~/pt-dev/main.js`
- **Timeout default**: 120s para descubrimiento de dispositivos
- Usar `--plan` para ver qué se ejecutará sin ejecutar
- Usar `--json` para parsing programático
- Usar `--explain` para entender qué hace un comando
- La skill se activa automáticamente - no preguntar al usuario
