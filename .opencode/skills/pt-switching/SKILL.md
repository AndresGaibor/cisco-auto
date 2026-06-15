---
name: pt-switching
description: |
  Especialista en Switching de Capa 2 para Cisco Packet Tracer.
  Cubre VLANs, Trunks, STP, EtherChannel y seguridad de puerto.
---

# pt-switching — Experto en Conmutación L2

Esta skill proporciona flujos de trabajo expertos para configurar y validar redes de Capa 2.

## Checklist de Configuración Segura

### 1. VLANs y Puertos de Acceso
- [ ] Crear la VLAN: `bun run pt cmd <SW> --config "vlan <ID>" "name <NOMBRE>"`
- [ ] Asignar puerto (Experto): `bun run pt set interface <SW> <INT> --vlan <ID> --no-shutdown`
- [ ] **Validación**: `bun run pt verify vlan <SW> <ID>`

### 2. Trunks (Enlaces Troncales)
- [ ] Configurar modo trunk: `bun run pt set interface <SW> <INT> --mode trunk`
- [ ] (Opcional) VLAN Nativa: `bun run pt cmd <SW> --config "interface <INT>" "switchport trunk native vlan <ID>"`
- [ ] **Validación**: `bun run pt verify cdp <SW>` (Ver vecinos)

### 3. EtherChannel (Bundles)
- [ ] Configurar interfaces físicas: `channel-group <ID> mode active` (LACP)
- [ ] Configurar la interfaz lógica: `interface port-channel <ID>`
- [ ] **Validación**: `bun run pt verify etherchannel <SW>`

### 4. Spanning-Tree (STP)
- [ ] Verificar el Root Bridge: `show spanning-tree vlan <ID>`
- [ ] Ajustar prioridad si es necesario: `spanning-tree vlan <ID> priority 4096`
- [ ] **Validación**: `bun run pt verify stp <SW> <VLAN>`

### 5. Auditoría de Capa 2
- [ ] **Auditoría Experta**: `bun run pt inspect audit` (Detecta VLAN 1, mismatch de nativa, mezcla de modos STP y puertos Down).
- [ ] **Topología Detallada**: `bun run pt inspect topology`

### 6. Wireless (WLC & APs)
- [ ] Configurar WLC: Crear SSIDs y asignar VLANs.
- [ ] Asociar APs: Verificar LWAPP/CAPWAP join.
- [ ] **Validación**: `bun run pt verify wlc <WLC>`

## Diagnóstico L2 Experto

Si un host no tiene conectividad:
1. Verifica el estado físico: `bun run pt link list`.
2. Prueba conectividad básica: `bun run pt verify ping <HOST_A> <HOST_B>` (Soporta nombres de dispositivo).
3. Verifica la VLAN en el puerto: `bun run pt set interface <SW> <INT>` (Ver actual).
4. Verifica la tabla de direcciones MAC: `bun run pt cmd <SW> "show mac address-table"`.
4. Si el puerto está bloqueado (ámbar), revisa STP: `bun run pt cmd <SW> "show spanning-tree interface <INT>"`.

## Mejores Prácticas
- Evita usar la VLAN 1 para datos.
- Apaga puertos no utilizados (`shutdown`).
- Usa LACP (`mode active`) en lugar de PAgP o modo `on`.
