---
name: pt-cli
description: |
  Cisco Packet Tracer CLI automation skill.
  Usa esta skill automáticamente cuando el usuario mencione:
  - Packet Tracer, PT, Cisco networking
  - Redes Cisco, VLANs, routing, switching
  - Laboratorios .pka, .pkt, .yaml
  - Comandos 'bun run pt' o 'pt' en general
  
  Esta skill proporciona acceso completo a la CLI de Packet Tracer automation.
---

# PT CLI (bun run pt)

**Skill base para automatización de Cisco Packet Tracer**

## ¿Cuándo activar esta skill?

Esta skill se activa AUTOMÁTICAMENTE cuando el usuario menciona:
- "Packet Tracer", "PT", "cisco"
- "bun run pt", "pt device", "pt config", "pt show"
- "VLAN", "OSPF", "EIGRP", "BGP", "STP"
- ".pka", ".pkt", ".yaml" (archivos de lab)
- Cualquier tarea de configuración de red Cisco

**NO preguntar al usuario si debe usar esta skill** — activarla directamente.

## Comandos CLI Disponibles

### Gestión de Dispositivos
```bash
bun run pt device list              # Listar dispositivos en PT
bun run pt device add R1 2911      # Agregar dispositivo
bun run pt device remove R1         # Remover dispositivo
bun run pt device move R1 --xpos 300 --ypos 200
```

### Comandos Show
```bash
bun run pt show ip-int-brief R1   # Mostrar interfaces IPs
bun run pt show vlan Switch1       # Mostrar VLANs
bun run pt show ip-route R1        # Mostrar rutas
bun run pt show run-config R1      # Mostrar configuración
bun run pt show cdp R1            # Mostrar vecinos CDP
```

### Configuración
```bash
bun run pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0
bun run pt config-ios R1 interface GigabitEthernet0/0 ip address 192.168.1.1 255.255.255.0
bun run pt config-interface --device R1 --name Gig0/0 --ip 192.168.1.1 --mask 255.255.255.0
```

### Protocolos de Routing
```bash
bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0"
bun run pt eigrp --device R1 --as 100 --network "192.168.1.0,0.0.0.255"
bun run pt bgp --device R1 --as 65000 --neighbor "10.0.0.2,65001"
bun run pt routing ospf enable R1
bun run pt routing static add 0.0.0.0 0.0.0.0 192.168.1.1
```

### VLANs y Switching
```bash
bun run pt vlan apply Switch1 10 20 30
bun run pt config-vlan --device S1 --vlan "10,ADMIN" --vlan "20,USERS"
bun run pt stp set Switch1 mode rapid-pvst
bun run pt etherchannel create Switch1 1 Gi0/1 Gi0/2
```

### ACLs
```bash
bun run pt acl create 100 permit tcp any any eq 80
bun run pt acl apply ACL-100 R1
bun run pt config-acl --device R1 --name FILTER --type extended --rule "permit,ip,any,any"
```

### Gestión de Enlaces
```bash
bun run pt link add R1 Gi0/0 S1 Fa0/1
bun run pt link list
bun run pt link remove R1 Gi0/0
```

### Servicios de Red
```bash
bun run pt services dhcp Switch1
bun run pt services ntp Switch1
bun run pt services syslog Switch1
```

### Lab Management
```bash
bun run pt lab list
bun run pt lab create <nombre>
bun run pt lab lift
bun run pt lab validate <archivo>
bun run pt lab interactive
bun run pt lab pipeline
bun run pt lab parse <archivo>
```

### Auditoría e Historia
```bash
bun run pt history list
bun run pt history show <id>
bun run pt history last
bun run pt history search "ospf"
bun run pt history failed
bun run pt audit tail
bun run pt audit export --format json
bun run pt audit-failed
```

### Topología
```bash
bun run pt topology analyze
bun run pt topology visualize
bun run pt topology show
bun run pt topology export
bun run pt topology clean
```

### Inspección y Verificación
```bash
bun run pt inspect topology
bun run pt inspect neighbors R1
bun run pt inspect free-ports R1
bun run pt inspect drift
bun run pt verify ios R1
bun run pt verify link R1 Gi0/0 S1 Fa0/1
```

### Comandos Avanzados
```bash
bun run pt lint                    # Validación de topología
bun run pt capability list         # Listar modelos soportados
bun run pt capability model 2911   # Ver capacidades de modelo
bun run pt planner list            # Change planner
bun run pt planner execute <plan-id>
bun run pt ledger list             # Trazabilidad
bun run pt ledger stats
bun run pt diagnose ping-fails R1 # Diagnóstico causal
bun run pt diagnose no-dhcp R1
```

### Agent Workflow
```bash
bun run pt agent context --task "connect R1 and S1"
bun run pt agent plan --goal "normalize access layer"
bun run pt agent verify
```

### Utility
```bash
bun run pt status                  # Estado del CLI
bun run pt doctor                  # Diagnóstico del sistema
bun run pt build                   # Build y deploy a ~/pt-dev/
bun run pt logs tail               # Ver logs
bun run pt results list            # Resultados de comandos
```

## Flags Globales

```bash
--help, -h              # Ayuda
--json, -j              # Salida JSON
--verbose, -v           # Salida detallada
--quiet, -q             # Solo errores
--plan                  # Mostrar plan sin ejecutar
--verify                # Verificar post-ejecución (default: true)
--no-verify             # Omitir verificación
--timeout <ms>          # Timeout global
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
# Configurar OSPF en router
bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0"
```

### Ejemplo 3: Verificar laboratorio
```bash
# Inspección completa
bun run pt inspect topology
bun run pt verify ios R1
bun run pt topology show
```

### Ejemplo 4: Lab interactivo
```bash
bun run pt lab interactive
```

## Notas

- **PT debe estar corriendo** con el módulo de scripting cargado
- **Archivo de salida**: `~/pt-dev/main.js`
- **Timeout default**: 120s para descubrimiento de dispositivos
- Usar `--plan` para ver qué se ejecutará sin ejecutar
- Usar `--json` para parsing programático
