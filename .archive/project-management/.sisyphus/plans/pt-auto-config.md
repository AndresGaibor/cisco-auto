# Plan: Automatización VLAN/Trunk/SSH con pt-control-v2

## TL;DR

Crear comandos CLI y funciones utilitarias para aplicar automáticamente VLANs, trunks y SSH a los dispositivos de Packet Tracer usando exclusivamente pt-control-v2 (sin archivos YAML).

## Context

El usuario tiene una topología en Packet Tracer con:
- 3 switches (Switch1, Switch2, Multilayer Switch0)
- 7 PCs en diferentes subredes (10, 20, 30, 40)
- 2 servidores en subred 50
- Todos los dispositivos sin configuración VLAN/trunk/SSH

El usuario quiere:
1. **Automatizar la configuración** de estos dispositivos SIN usar YAML, directamente con pt-control
2. **Deprecificar .pka e import-yaml** - No eliminar código, pero marcar como deprecated y en docs indicar que no se usa
3. **Enfocarse en pt-control para real-time** - Todo flujo nuevo va por pt-control-v2

### Decisión de Arquitectura: pt-control como Prioridad

| Funcionalidad | Status | Razón |
|--------------|--------|-------|
| pt-control-v2 (real-time) | ✅ ACTIVO | Control directo de Packet Tracer, real-time |
| import-yaml | ⚠️ DEPRECATED | Parser de labs YAML - código mantiene pero no se usa |
| import-pka | ⚠️ DEPRECATED | Parser de archivos .pka - código mantiene pero no se usa |
| lab-model | ⚠️ DEPRECATED | Modelo de dominio para YAML - lógica reusable pero no como entrada principal |

**No se elimina código** - Se marca con @deprecated y se actualizan los docs. La lógica existente (parsers, generators IOS) puede reutilizarse internamente.

## Work Objectives

### Core Objective
Crear herramientas CLI y funciones para configurar VLANs, trunks y SSH en dispositivos Packet Tracer usando pt-control-v2.

### Deliverables
1. **Comando `pt vlan apply`** - Aplica VLANs a un switch
2. **Comando `pt trunk apply`** - Configura puertos trunk entre switches
3. **Comando `pt ssh setup`** - Configura SSH en routers/switches
4. **Función utilitaria `aplicarTopologia()`** - Aplica configuración completa a toda la topología
5. **Tests de verificación** - Validar que la configuración se aplicó correctamente
6. **Deprecificar import-yaml** - Marcar @deprecated, actualizar README/docs
7. **Deprecificar import-pka** - Marcar @deprecated, actualizar README/docs

### Definition of Done
- [x] `pt vlan apply Switch1 10,20,30,40,50` aplica VLANs y guarda
- [x] `pt trunk apply Switch1 Gi0/1 Gi0/2` configura trunks
- [x] `pt ssh setup TestRouter` configura SSH completo
- [x] `pt拓扑ologia apply` detecta dispositivos y aplica configuración automáticamente
- [x] Tests pasan con `bun test`

### Must Have
- Comandos funcionan en dispositivos reales de Packet Tracer
- Se guarda configuración con `write memory`
- Output claro de éxito/error
- Código de import-yaml/import-pka marcado como @deprecated
- README.md principal actualizado indicando flujo deprecated
- Documentación de packages deprecados indica que no se usa

### Must NOT Have
- Sin archivos YAML de entrada para flujos nuevos
- Sin uso de import-yaml como entrada principal
- Sin eliminación de código legacy (solo marcar deprecated)
- Sin cambios en la funcionalidad interna de los packages deprecated

---

## Verification Strategy

**Test Strategy**: Tests-after con Bun
- Framework: bun test
- Tests verifican comandos CLI con mock del PTController
- QA con dispositivos reales de Packet Tracer

---

## Execution Strategy

### Wave 1 (Foundation + Deprecation)
- T1: Estudiar PTController existente y crear funciones utilitarias
- T2: Implementar comando `pt vlan apply`
- T3: Implementar comando `pt trunk apply`
- T4: Deprecificar import-yaml (marcar @deprecated, actualizar docs)
- T5: Deprecificar import-pka (marcar @deprecated, actualizar docs)

### Wave 2 (Advanced)
- T6: Implementar comando `pt ssh setup`
- T7: Crear script de topología automática

### Wave 3 (Integration + Tests)
- T8: Tests de integración
- T9: Documentación CLI

---

## TODOs

- [x] T1. **Estudiar PTController y crear utilitarias IOS**

  **What to do**:
  - Revisar `packages/pt-control-v2/src/controller/index.ts` para entender configIos/execIos
  - Crear utilitarias en `packages/pt-control-v2/src/utils/ios-commands.ts`:
    - `buildVlanCommands(vlans: number[], name?: string)` → `string[]`
    - `buildTrunkCommands(ports: string[], vlans: number[])` → `string[]`
    - `buildSshCommands(domain: string, username: string, password: string)` → `string[]`
  - Exportar desde `packages/pt-control-v2/src/index.ts`

  **Must NOT do**:
  - No modificar el controller original
  - No crear nuevas dependencias

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Investigación y utilities de código existente

  **References**:
  - `packages/pt-control-v2/src/controller/index.ts` - PTController.configIos
  - `packages/pt-control-v2/src/cli/commands/config/ios.ts` - Ejemplo de uso configIos
  - `packages/core/src/config-generators/vlan-generator.ts` - Lógica de generación VLAN (reutilizable)

  **Acceptance Criteria**:
  - [x] Funciones utilitarias creadas y exportadas
  - [x] `bun build` pasa sin errores

- [x] T2. **Implementar comando `pt vlan apply`**

  **What to do**:
  - Crear `packages/pt-control-v2/src/cli/commands/vlan/apply.ts`
  - Comando: `pt vlan apply <device> <vlans...> [--name-prefix <prefix>]`
  - Usar utilitaria `buildVlanCommands` del T1
  - Usar `controller.configIos()` para aplicar
  - Registrar en `packages/pt-control-v2/src/cli/index.ts`

  **QA Scenarios**:
  ```
  Scenario: Aplicar VLANs a Switch1
    Tool: Bash
    Preconditions: Switch1 existe en PT
    Steps:
      1. bun run pt vlan apply Switch1 10 20 30
      2. Verificar: bun run pt config show Switch1 vlan
    Expected Result: Muestra VLANs 10, 20, 30 configuradas
    Evidence: .sisyphus/evidence/t2-vlan-apply.md

  Scenario: Error con dispositivo inexistente
    Tool: Bash
    Preconditions: Ninguno
    Steps:
      1. bun run pt vlan apply NOPE 10
    Expected Result: Error claro "Device NOPE not found"
    Evidence: .sisyphus/evidence/t2-vlan-error.md
  ```

- [x] T3. **Implementar comando `pt trunk apply`**

  **What to do**:
  - Crear `packages/pt-control-v2/src/cli/commands/trunk/apply.ts`
  - Comando: `pt trunk apply <device> <ports...> [--vlans <vlans>]`
  - Por defecto vlans: 10,20,30,40,50
  - Usar utilitaria `buildTrunkCommands`
  - Registrar en CLI

  **QA Scenarios**:
  ```
  Scenario: Configurar trunk en puerto Gi0/1
    Tool: Bash
    Preconditions: Switch1 existe, puerto Gi0/1 disponible
    Steps:
      1. bun run pt trunk apply Switch1 Gi0/1
      2. Verificar: bun run pt exec Switch1 "show interfaces Gi0/1 switchport"
    Expected Result: Mode: Trunk, Encapsulation: dot1q
    Evidence: .sisyphus/evidence/t3-trunk-apply.md
  ```

- [x] T4. **Deprecificar import-yaml**

  **What to do**:
  - Agregar `@deprecated` JSDoc en `packages/import-yaml/src/index.ts` y exports principales
  - Mensaje: "Usar pt-control-v2 para control real-time de Packet Tracer"
  - Actualizar `packages/import-yaml/README.md` (o crear si no existe):
    - Título: "⚠️ DEPRECATED - Usar pt-control-v2"
    - Explicar que el flujo YAML ya no se usa
    - Nota: "La lógica de parsing puede reutilizarse internamente"
  - Actualizar `README.md` principal de cisco-auto:
    - En sección de uso, marcar YAML/deploy como deprecated
    - Agregar referencia a pt-control-v2 como flujo principal

  **Must NOT do**:
  - No eliminar archivos
  - No modificar lógica de parsing
  - No cambiar tests existentes

  **References**:
  - `packages/import-yaml/src/index.ts`
  - `README.md` principal (sección "Generar y Desplegar Configuraciones")

- [x] T5. **Deprecificar import-pka**

  **What to do**:
  - Agregar `@deprecated` JSDoc en `packages/import-pka/src/index.ts`
  - Mensaje: "El análisis de archivos .pka ya no es necesario con pt-control-v2"
  - Actualizar/crear `packages/import-pka/README.md`:
    - Título: "⚠️ DEPRECATED"
    - Explicar que pt-control-v2 detecta topología automáticamente
  - En README.md principal, sección "Analizar Laboratorios .pka" → marcar deprecated

  **Must NOT do**:
  - No eliminar archivos
  - No modificar lógica de parsing PKA

- [x] T6. **Implementar comando `pt ssh setup`**

  **What to do**:
  - Crear `packages/pt-control-v2/src/cli/commands/ssh/setup.ts`
  - Comando: `pt ssh setup <device> [--domain <domain>] [--user <user>] [--pass <pass>]`
  - Domain default: "cisco-lab.local"
  - User default: "admin"
  - Genera: crypto key, domain-name, username, line vty, transport input ssh
  - Usar utilitaria `buildSshCommands`

  **QA Scenarios**:
  ```
  Scenario: Configurar SSH en TestRouter
    Tool: Bash
    Preconditions: TestRouter existe en PT
    Steps:
      1. bun run pt ssh setup TestRouter
      2. Verificar: bun run pt exec TestRouter "show ssh"
    Expected Result: SSH version enabled, connection info
    Evidence: .sisyphus/evidence/t6-ssh-setup.md
  ```

- [x] T7. **Crear script de topología automática**

  **What to do**:
  - Crear `packages/pt-control-v2/scripts/topologia-apply.ts`
  - Script que:
    1. Ejecuta `pt device list` para descubrir dispositivos
    2. Detecta switches vs routers vs PCs
    3. Aplica configuración por tipo:
       - Switches: VLANs + Trunks
       - Routers: SSH + NAT si aplica
       - PCs: IPs via `configHost`
  - Usar Utilitarias del T1
  - Configuración hardcoded para la topología actual del usuario

  **Must NOT do**:
  - No requiere argumentos (autodetecta)
  - No usa YAML

- [x] T8. **Tests de integración**

  **What to do**:
  - Crear `packages/pt-control-v2/tests/vlan-apply.test.ts`
  - Crear `packages/pt-control-v2/tests/trunk-apply.test.ts`
  - Crear `packages/pt-control-v2/tests/ssh-setup.test.ts`
  - Tests con mock de PTController
  - Verificar comandos generados correctos

  **Acceptance Criteria**:
  - [x] `bun test packages/pt-control-v2/tests/vlan-apply.test.ts` → PASS
  - [x] `bun test packages/pt-control-v2/tests/trunk-apply.test.ts` → PASS
  - [x] `bun test packages/pt-control-v2/tests/ssh-setup.test.ts` → PASS

- [x] T9. **Documentación CLI**

  **What to do**:
  - Actualizar `docs/PT_CONTROL_QUICKSTART.md`:
    - Agregar sección de comandos VLAN/Trunk/SSH
    - Agregar ejemplos de uso
  - Actualizar README.md de pt-control-v2 (o crear si no existe)

---

## Final Verification Wave

- [x] F1. **Plan compliance audit** — `oracle`
- [x] F2. **Code quality review** — `unspecified-high`
- [x] F3. **Real QA on Packet Tracer devices** — `unspecified-high`

---

## Success Criteria

```bash
# Verificar VLANs aplicadas
bun run pt config show Switch1 vlan

# Verificar trunk configurado
bun run pt exec Switch1 "show interfaces GigabitEthernet0/1 switchport"

# Verificar SSH
bun run pt exec TestRouter "show ip ssh"

# Verificar deprecación
grep -r "@deprecated" packages/import-yaml/src/
grep -r "@deprecated" packages/import-pka/src/
grep -r "DEPRECATED" packages/import-yaml/README.md
grep -r "DEPRECATED" packages/import-pka/README.md
```

### Final Checklist
- [x] Todos los comandos nuevos funcionan en Packet Tracer real
- [x] import-yaml e import-pka marcados como deprecated
- [x] README.md principal indica flujo deprecated
- [x] Tests pasan
- [x] Documentación actualizada
