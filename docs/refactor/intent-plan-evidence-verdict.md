# Flow: Intent → Plan → Evidence → Verdict

> Framework para documentar ejecuciones de automatización en Packet Tracer con trazabilidad completa.

## Propósito

Estandarizar la documentación de cada tarea ejecutada en el pipeline de automatización:

1. **Intent** — Qué se intenta lograr (declarativo)
2. **Plan** — Cómo se logra (procedural)
3. **Evidence** — Qué outputs se capturan (empírico)
4. **Verdict** — Si funcionó o no (decisorio)

Cada documento representa una ejecución atómica con toda la trazabilidad para debug y audit.

---

## Ejemplo: Configurar VLANs en SW1

### Paso A — Intent

**Objetivo:** Configurar VLANs 10/20/30 en SW1 y trunk hacia SW2

**Contexto:**

- Topology: SW1 ↔ SW2 (G0/1 trunk)
- Dispositivo: Switch 2960
- Objetivo de negocio: Segmentación de tráfico por VLANs

### Paso B — Plan

```yaml
plan:
  - primitive: list-devices
    description: Verificar que SW1 y SW2 existen en la topología
    command: "n.listDevices()"

  - terminal-plan: configurar-vlans
    description: Entrar a configuración VLAN y aplicar secuencias
    steps:
      - enable
      - vlan database
      - vlan 10 name TI
      - vlan 20 name ADMIN
      - vlan 30 name GUEST
      - exit

  - terminal-plan: configura-trunk
    description: Configurar trunk en G0/1 hacia SW2
    steps:
      - enable
      - configure terminal
      - interface G0/1
      - switchport mode trunk
      - switchport trunk allowed vlan 10,20,30
      - end

  - omni-capability: verify-vlan-database
    description: Verificar VLANs creadas usando OmniRead
    command: "n.devices.SW1.getVlanDatabase()"

  - omni-capability: verify-trunk-status
    description: Verificar trunk usando OmniRead
    command: "n.devices.SW1.getInterfaceStatus('G0/1')"

  - verification: revisar-evidencia
    description: Comparar outputs esperados vs reales

  - cleanup: none
    description: No hay cleanup necesario para VLANs estáticas
```

### Paso C — Evidence

```yaml
evidence:
  timestamp: "2026-04-19T10:30:00Z"

  outputs:
    - type: primitive
      command: "n.listDevices()"
      output:
        - id: "SW1"
          type: "2960"
          status: "active"
        - id: "SW2"
          type: "2960"
          status: "active"

    - type: terminal
      command: "show vlan brief"
      output: |
        VLAN Name                             Status    Ports
        ---- -------------------------------- --------- -------------------------------
        1    default                          active    Fa0/1-24, G0/1-2
        10   TI                              active
        20   ADMIN                          active
        30   GUEST                          active

    - type: terminal
      command: "show interface trunk"
      output: |
        Port        Mode         Encapsulation  Status        Native vlan
        G0/1       on           802.1q        trunking      1

        Port        Vlans allowed on trunk
        G0/1       10,20,30

  facts:
    - "VLAN 10 (TI) creada exitosamente"
    - "VLAN 20 (ADMIN) creada exitosamente"
    - "VLAN 30 (GUEST) creada exitosamente"
    - "Trunk G0/1 con allowed vlans 10,20,30"

  warnings: []

  confidence_inputs:
    - source: "terminal output"
      value: "show vlan brief confirma VLANs activas"
      confidence: 1.0
```

### Paso D — Verdict

```yaml
verdict:
  status: "SUCCESS"

  summary: |
    Objetivo logrado completamente.
    VLANs 10/20/30 creadas en SW1.
    Trunk configurado hacia SW2 con allowed VLANs 10,20,30.

  details:
    - objetivo_logro: 100
    - outputs_capturados: 3
    - warnings: 0
    - ejecutable: true

  recommendation: |
    Listo para siguiente tarea.
    No hay intervención manual requerida.
```

---

## Ejemplo: Diagnosticar DHCP sin entrega

### Paso A — Intent

**Objetivo:** Diagnosticar por qué DHCP no entrega IP a clientes

**Contexto:**

- Topology: R1 (DHCP server) ↔ SW1 ↔ PC1
- Síntoma: PC1 no obtiene IP automática
- Dispositivo: Router 2911

### Paso B — Plan

```yaml
plan:
  - primitive: list-devices
    description: Verificar dispositivos en topología
    command: "n.listDevices()"

  - terminal-plan: verify-dhcp-config
    description: Verificar configuración DHCP en router
    steps:
      - enable
      - show ip dhcp pool
      - show ip dhcp binding
      - show ip dhcp conflict

  - terminal-plan: verify-interface-config
    description: Verificar configuración de interfaz
    steps:
      - enable
      - show ip interface G0/0
      - show running-config | include dhcp

  - omni-capability: diagnose-dhcp-server
    description: Usar OmniRead para diagnóstico profundo
    command: "n.devices.R1.getDhcpServerStatus()"

  - verification: revisar-evidencia
    description: Comparar outputs esperados vs reales

  - cleanup: none
```

### Paso C — Evidence

```yaml
evidence:
  timestamp: "2026-04-19T10:35:00Z"

  outputs:
    - type: terminal
      command: "show ip dhcp pool"
      output: |
        Pool DEFAULT :
        Utilization mark (0/100)      0
        Subnet type                    GATEWAYS
        Total addresses                254
        Excluded addresses             1
        Available addresses            253

    - type: terminal
      command: "show ip dhcp binding"
      output: |
        IP address          Client-ID/              Lease expiration        Type
        Hardware address
        192.168.1.10       0063.7073.2d30.3330   Apr 20 2026 11:00 AM    Automatic

    - type: terminal
      command: "show ip dhcp conflict"
      output: |
        IP address          Detection time        Interface
        192.168.1.20       Apr 19 2026        G0/0

  facts:
    - "DHCP pool configurado con rango 192.168.1.0/24"
    - "1 binding activo existe"
    - "1 conflicto detectado en .20"
    - "PC1 probablemente recibió dirección conflicted"

  warnings:
    - "Conflicto DHCP detectado en 192.168.1.20"

  confidence_inputs:
    - source: "terminal output"
      value: "show dhcp conflict muestra IP en conflicto"
      confidence: 0.9
```

### Paso D — Verdict

```yaml
verdict:
  status: "PARTIAL_SUCCESS"

  summary: |
    DHCP configurado y funcionando.
    Existe conflicto de IP detectado.
    PC1 probablemente recibió IP en conflicto y no puede renovar.

  details:
    - objetivo_logro: 70
    - outputs_capturados: 3
    - warnings: 1
    - ejecutable: true

  recommendation: |
    Limpiar conflict: clear ip dhcp conflict
    Reiniciar DHCP en PC1
    Verificar nuevamente después de cleanup
```

---

## Ejemplo: Verificar hack de assessment

### Paso A — Intent

**Objetivo:** Verificar si el hack de assessment puede leer running-config

**Contexto:**

- Propuesta: Usar AssessmentModel para leer configs sin pasar por terminal
- Dispositivo: Router 2911
- Requisito: Leer configuración sin interactuar con CLI

### Paso B — Plan

```yaml
plan:
  - primitive: list-devices
    description: Verificar que R1 existe
    command: "n.listDevices()"

  - omni-capability: read-running-config
    description: Intentar leer via AssessmentModel
    command: "global.AssessmentModel.devices.R1.getRunningConfig()"

  - omni-capability: read-startup-config
    description: Intentar leer startup-config
    command: "global.AssessmentModel.devices.R1.getStartupConfig()"

  - terminal-plan: verify-manual
    description: Verificar manualmente para对比
    steps:
      - enable
      - show running-config

  - verification: comparar-evidencia
    description: Comparar outputs de ambos métodos

  - cleanup: none
```

### Paso C — Evidence

```yaml
evidence:
  timestamp: "2026-04-19T10:40:00Z"

  outputs:
    - type: omni
      command: "global.AssessmentModel.devices.R1.getRunningConfig()"
      output: |
        Error: getRunningConfig is not a function
        Available methods: getDeviceName, getDeviceType, getIOSVersion

    - type: omni
      command: "global.AssessmentModel.devices.R1.getStartupConfig()"
      output: |
        Error: getStartupConfig is not a function
        Same available methods list

    - type: terminal
      command: "show running-config"
      output: |
        Building configuration...
        Current configuration : 1024 bytes
        ! version 15.3
        hostname R1
        ...

  facts:
    - "AssessmentModel NO tiene método para leer configuración"
    - "Solo ofrece getters básicos de información"
    - "Método alternativo requerido"

  warnings:
    - "Hack NO funciona - assessment es read-only para metadata"

  confidence_inputs:
    - source: "omni output"
      value: "Error explícito de función no existente"
      confidence: 1.0
```

### Paso D — Verdict

```yaml
verdict:
  status: "UNSUPPORTED"

  summary: |
    El hack de Assessment NO puede leer running-config.
    AssessmentModel es de solo-lectura para metadata básica.
    Se requiere método alternativo (terminal o Omni raw).

  details:
    - objetivo_logro: 0
    - outputs_capturados: 3
    - warnings: 1
    - ejecutable: false

  recommendation: |
    Usar terminal-plan con show running-config
    O usar n.devices.R1.hostCLI.exec() para ejecutar comando
    Por ahora, no hay bypass de terminal posible
```

---

## Estructura YAML de Referencia

```yaml
# ============================================
# Intent: Qué se intenta lograr
# ============================================
intent:
  objective: "Descripción declarativa del objetivo"
  context:
    topology: "Descripción de topología relevante"
    device: "Dispositivo objetivo"
    business_goal: "Objetivo de negocio si aplica"

# ============================================
# Plan: Cómo se logra (pasos explícitos)
# ============================================
plan:
  - primitive: list-devices
    description: "Descripción breve"
    command: "Comando si aplica"

  - terminal-plan: <nombre>
    description: "Descripción"
    steps:
      - step1
      - step2

  - omni-capability: <nombre>
    description: "Descripción"
    command: "Comando OmniRaw"

  - verification: <nombre>
    description: "Qué revisar"

  - cleanup: none | <nombre>
    description: "Qué limpiar si aplica"

# ============================================
# Evidence: Outputs capturados (raw)
# ============================================
evidence:
  timestamp: "ISO8601"

  outputs:
    - type: primitive | terminal | omni
      command: "Comando ejecutar"
      output: "Output raw"

  facts:
    - "Hecho 1 extraído"
    - "Hecho 2 extraído"

  warnings:
    - "Warning 1 si aplica"

  confidence_inputs:
    - source: "Dónde viene la evidencia"
      value: "Qué dice"
      confidence: 0.0-1.0

# ============================================
# Verdict: Decisión final
# ============================================
verdict:
  status: SUCCESS | PARTIAL_SUCCESS | FLAKY | UNSUPPORTED | EVIDENCE_INSUFFICIENT

  summary: |
    Resumen ejecutivo en una línea

  details:
    - objetivo_logro: 0-100
    - outputs_capturados: N
    - warnings: N
    - ejecutable: true | false

  recommendation: |
    siguiente paso o conclusión
```

---

## Estados de Verdict

| Estado | Descripción |
|--------|-------------|
| **SUCCESS** | Objetivo logrado 100%, sin warnings |
| **PARTIAL_SUCCESS** | Objetivo logrado parcialmente (50-99%) |
| **FLAKY** | Funcionó esta vez pero no es confiable |
| **UNSUPPORTED** | No es posible con las herramientas actuales |
| **EVIDENCE_INSUFFICIENT** | No hay enough evidencia para decidir |

---

## Uso en Pipeline

Cada ejecución automatizada debe generar un documento `.md` en esta estructura:

```
docs/
  refinements/
    intent-plan-evidence-verdict.md
    intent-plan-evidence-verdict-001.md  # si hay múltiples ejecuciones
```

El documento debe generarse automáticamente después de cada `bun run pt` que ejecute una tarea completa, sirviendo como:

1. **Audit trail** — Trazabilidad de qué se intentó y qué resultó
2. **Debug pattern** — Patrones para debuggear fallos
3. **Knowledge base** — Base de conocimiento para futuras tareas similares