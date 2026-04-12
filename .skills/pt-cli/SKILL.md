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

# PT CLI - Skill para Automatización de Cisco Packet Tracer

## ¿Cuándo activar esta skill?

Esta skill se activa AUTOMÁTICAMENTE cuando el usuario menciona (NO preguntar):
- "Packet Tracer", "PT", "cisco", "redes Cisco"
- "bun run pt", "pt device", "pt config", "pt show"
- "VLAN", "OSPF", "EIGRP", "BGP", "STP", "EtherChannel"
- ".pka", ".pkt", ".yaml" (archivos de lab)
- Cualquier tarea de configuración de red Cisco

---

## 🎯 Casos de Uso Comunes

### 1. "Quiero configurar una VLAN básica"
```bash
# Pasos:
bun run pt device add Switch1 2960
bun run pt device add PC1 PC  
bun run pt vlan apply Switch1 10 20
bun run pt link add PC1 Fa0/1 Switch1 Fa0/1

# Verificar:
bun run pt show vlan Switch1
```

### 2. "Quiero configurar OSPF en mi router"
```bash
# Simple:
bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0"

# Con múltiples redes:
bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0" --network "192.168.2.0,0.0.0.255,0"
```

### 3. "Quiero ver qué dispositivos hay"
```bash
# En Packet Tracer:
bun run pt device list

# En memoria SQLite:
bun run pt list
```

### 4. "Quiero verificar mi configuración"
```bash
# Ver IOS de un dispositivo:
bun run pt verify ios R1

# Ver topología descubierta:
bun run pt topology show

# Ver todas las interfaces:
bun run pt show ip-int-brief R1
```

### 5. "Quiero crear un laboratorio desde cero"
```bash
# Modo interactivo (wizard):
bun run pt lab interactive

# O crear desde YAML:
bun run pt lab create mi-lab
bun run pt lab lift
```

### 6. "Tengo un problema de red, diagnostícalo"
```bash
# Diagnóstico automático:
bun run pt diagnose ping-fails R1
bun run pt diagnose no-dhcp Switch1

# Validar topología:
bun run pt lint
```

### 7. "Quiero saber qué puede hacer mi switch"
```bash
# Ver modelos disponibles:
bun run pt capability list

# Ver capacidades de un modelo:
bun run pt capability model 2960

# Ver si soporta una operación:
bun run pt capability check 2960 vlan
```

### 8. "Quiero hacer un cambio grande con rollback"
```bash
# Crear plan:
bun run pt planner compile config R1 --vlan 10 --description "VLAN ADMIN"

# Ejecutar con checkpoints:
bun run pt planner execute <plan-id>

# O verificar primero:
bun run pt planner show <plan-id>
```

### 9. "Quiero ver el historial de comandos"
```bash
# Últimos comandos:
bun run pt history list
bun run pt history last

# Buscar por texto:
bun run pt history search "ospf"

# Ver comandos fallidos:
bun run pt history failed
```

### 10. "Quiero aplicar configuración desde archivo YAML"
```bash
bun run pt apply config.yaml --dry-run  # Probar primero
bun run pt apply config.yaml             # Ejecutar
```

---

## 🔧 Guía de Comandos por Objetivo

### Gestión de Dispositivos
| Objetivo | Comando |
|----------|---------|
| Agregar dispositivo a PT | `bun run pt device add R1 2911` |
| Agregar con posición | `bun run pt device add R1 2911 -x 200 -y 300` |
| Remover dispositivo | `bun run pt device remove R1` |
| Mover dispositivo | `bun run pt device move R1 --xpos 300 --ypos 200` |
| Listar dispositivos | `bun run pt device list` |

### Ver Información (Show Commands)
| Objetivo | Comando |
|----------|---------|
| Ver interfaces IP | `bun run pt show ip-int-brief R1` |
| Ver VLANs | `bun run pt show vlan Switch1` |
| Ver rutas | `bun run pt show ip-route R1` |
| Ver configuración | `bun run pt show run-config R1` |
| Ver vecinos CDP | `bun run pt show cdp R1` |
| Ver tabla ARP | `bun run pt show ip arp R1` |
| Ver MAC table | `bun run pt show mac-address-table Switch1` |

### Configuración de Red
| Objetivo | Comando |
|----------|---------|
| Configurar IP/host | `bun run pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0 --gateway 192.168.1.254` |
| Configurar interfaz | `bun run pt config-interface --device R1 --name Gig0/0 --ip 192.168.1.1 --mask 255.255.255.0` |
| Configurar IOS directo | `bun run pt config-ios R1 interface GigabitEthernet0/0 ip address 192.168.1.1 255.255.255.0` |

### VLANs
| Objetivo | Comando |
|----------|---------|
| Aplicar VLANs a switch | `bun run pt vlan apply Switch1 10 20 30` |
| Crear VLAN específica | `bun run pt config-vlan --device S1 --vlan "10,ADMIN"` |
| Configurar puerto acceso | `bun run pt config-ios Switch1 interface FastEthernet0/1 switchport mode access` |
| Configurar trunk | `bun run pt config-ios Switch1 interface FastEthernet0/1 switchport mode trunk` |

### Routing
| Objetivo | Comando |
|----------|---------|
| OSPF simple | `bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0"` |
| EIGRP | `bun run pt eigrp --device R1 --as 100 --network "192.168.1.0,0.0.0.255"` |
| BGP | `bun run pt bgp --device R1 --as 65000 --neighbor "10.0.0.2,65001"` |
| Ruta estática | `bun run pt routing static add 0.0.0.0 0.0.0.0 192.168.1.1` |

### STP (Spanning Tree)
| Objetivo | Comando |
|----------|---------|
| Modo rapid-pvst | `bun run pt stp set Switch1 mode rapid-pvst` |
| Prioridad | `bun run pt stp set Switch1 priority 4096` |
| PortFast | `bun run pt config-ios Switch1 interface FastEthernet0/1 spanning-tree portfast` |

### EtherChannel
| Objetivo | Comando |
|----------|---------|
| Crear canal | `bun run pt etherchannel create Switch1 1 Gi0/1 Gi0/2` |
| Listar canales | `bun run pt etherchannel list` |

### ACLs
| Objetivo | Comando |
|----------|---------|
| Crear ACL | `bun run pt acl create 100 permit tcp any any eq 80` |
| Aplicar ACL | `bun run pt acl apply ACL-100 R1` |
| ACL extendida | `bun run pt config-acl --device R1 --name FILTER --type extended --rule "permit,ip,any,any"` |

### Enlaces (Links)
| Objetivo | Comando |
|----------|---------|
| Crear enlace | `bun run pt link add R1 Gi0/0 S1 Fa0/1` |
| Listar enlaces | `bun run pt link list` |
| Remover enlace | `bun run pt link remove R1 Gi0/0` |

### Servicios
| Objetivo | Comando |
|----------|---------|
| DHCP server | `bun run pt services dhcp Switch1` |
| NTP server | `bun run pt services ntp Switch1` |
| Syslog | `bun run pt services syslog Switch1` |

### Laboratorios
| Objetivo | Comando |
|----------|---------|
| Listar labs | `bun run pt lab list` |
| Crear lab | `bun run pt lab create mi-lab` |
| Levantar lab | `bun run pt lab lift` |
| Validar YAML | `bun run pt lab validate archivo.yaml` |
| Modo interactivo | `bun run pt lab interactive` |
| Pipeline | `bun run pt lab pipeline` |
| Parsear | `bun run pt lab parse archivo.yaml` |

### Auditoría e Historia
| Objetivo | Comando |
|----------|---------|
| Ver historial | `bun run pt history list` |
| Último comando | `bun run pt history last` |
| Buscar | `bun run pt history search "ospf"` |
| Fallidos | `bun run pt history failed` |
| Audit log | `bun run pt audit tail` |
| Exportar audit | `bun run pt audit export --format json --output audit.json` |
| Fallos en audit | `bun run pt audit-failed` |

### Topología
| Objetivo | Comando |
|----------|---------|
| Analizar | `bun run pt topology analyze` |
| Visualizar | `bun run pt topology visualize` |
| Mostrar | `bun run pt topology show` |
| Exportar | `bun run pt topology export` |
| Limpiar | `bun run pt topology clean` |

### Inspección y Verificación
| Objetivo | Comando |
|----------|---------|
| Ver topología | `bun run pt inspect topology` |
| Ver vecinos | `bun run pt inspect neighbors R1` |
| Ver puertos libres | `bun run pt inspect free-ports R1` |
| Detectar drift | `bun run pt inspect drift` |
| Verificar IOS | `bun run pt verify ios R1` |
| Verificar enlace | `bun run pt verify link R1 Gi0/0 S1 Fa0/1` |

### Comandos Avanzados
| Objetivo | Comando |
|----------|---------|
| Validar topología | `bun run pt lint` |
| Modelos soportados | `bun run pt capability list` |
| Capacidades modelo | `bun run pt capability model 2911` |
| Ver operaciones | `bun run pt capability ops 2960` |
| Check operación | `bun run pt capability check 2911 vlan` |
| Listar planes | `bun run pt planner list` |
| Ejecutar plan | `bun run pt planner execute <id>` |
| Ver ledger | `bun run pt ledger list` |
| Stats ledger | `bun run pt ledger stats` |
| Diagnosticar ping | `bun run pt diagnose ping-fails R1` |
| Diagnosticar DHCP | `bun run pt diagnose no-dhcp Switch1` |
| Diagnosticar acceso | `bun run pt diagnose no-access R1` |

### Agent Workflow
| Objetivo | Comando |
|----------|---------|
| Crear contexto | `bun run pt agent context --task "connect R1 and S1"` |
| Crear plan | `bun run pt agent plan --goal "normalize access layer"` |
| Verificar | `bun run pt agent verify` |
| Aplicar | `bun run pt agent apply` |

### Utilidades Varias
| Objetivo | Comando |
|----------|---------|
| Estado CLI | `bun run pt status` |
| Doctor | `bun run pt doctor` |
| Build | `bun run pt build` |
| Setup | `bun run pt setup` |
| Runtime | `bun run pt runtime` |
| Logs | `bun run pt logs tail` |
| Resultados | `bun run pt results list` |
| Preferencias | `bun run pt config-prefs set default_router 2911` |
| Bridge | `bun run pt bridge` |
| DHCP server | `bun run pt dhcp-server` |
| Host | `bun run pt host` |
| Router | `bun run pt router add R1 2911` |
| Completion | `bun run pt completion bash` |
| Ayuda | `bun run pt help` |

---

## 🚨 Flags Esenciales para Agentes

Usa estos flags para mejor integración:

| Flag | Cuándo Usar |
|------|-------------|
| `--plan` | Siempre antes de ejecutar, para verificar qué se hará |
| `--json` | Cuando necesites parsear el resultado programáticamente |
| `--explain` | Cuando no estés seguro de qué hace el comando |
| `--verify` | Por defecto es true, pero úsalo para verificar cambios |
| `--verbose` | Para debugging cuando algo falla |
| `--timeout 300000` | Para operaciones largas (5 min) |

---

## 💡 Patrones de Uso Recomendados

### Patrón 1: Verificar antes de ejecutar
```bash
# Siempre verificar el plan primero
bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0" --plan
# Luego ejecutar sin --plan
bun run pt ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0"
```

### Patrón 2: Validar después de ejecutar
```bash
# Después de config, siempre verificar
bun run pt verify ios R1
bun run pt show ip-int-brief R1
```

### Patrón 3: Troubleshooting completo
```bash
# Nivel 1: Verificación básica
bun run pt device list
bun run pt show ip-int-brief R1

# Nivel 2: Inspección profunda
bun run pt inspect topology
bun run pt inspect neighbors R1

# Nivel 3: Diagnóstico
bun run pt diagnose ping-fails R1
bun run pt lint
```

### Patrón 4: Lab desde cero
```bash
# 1. Crear o levantar lab
bun run pt lab interactive

# 2. Agregar dispositivos
bun run pt device add R1 2911
bun run pt device add S1 2960

# 3. Configurar
bun run pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0

# 4. Verificar
bun run pt verify ios R1
bun run pt topology show
```

---

## 📋 Chuleta Rápida

```
# Quick Start
bun run pt --help                          # Ayuda
bun run pt status                          # Estado actual
bun run pt device list                     # Dispositivos en PT

# Configuración básica
bun run pt device add <nombre> <modelo>   # Agregar
bun run pt config-host <device> --ip X     # IP
bun run pt vlan apply <switch> <vlan>     # VLAN
bun run pt link add <d1> <p1> <d2> <p2>    # Enlace

# Verificación
bun run pt show ip-int-brief <device>     # Interfaces
bun run pt verify ios <device>            # Verificar config
bun run pt inspect topology               # Topología

# Problemas
bun run pt diagnose ping-fails <device>   # Ping fails
bun run pt lint                           # Validar topología
```

---

## ⚠️ Requisitos

- **Packet Tracer debe estar corriendo** con el módulo de scripting cargado
- **Archivo de salida**: `~/pt-dev/main.js`
- **Timeout default**: 120s para descubrimiento de dispositivos

## 📝 Notas para Agentes

- NO uses `--help` constantemente - usa esta skill como referencia
- Usa `--plan` para preview antes de ejecutar cualquier comando destructivo
- Después de `config-*`, siempre ejecuta `verify ios <device>`
- Para debugging usa `--verbose` y `--trace`
- La skill se activa automáticamente - no preguntar al usuario
