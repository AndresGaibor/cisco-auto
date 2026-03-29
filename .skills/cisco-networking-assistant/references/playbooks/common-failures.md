# Playbook: Fallos Comunes y Troubleshooting Rápido

## Objetivo
Diagnosticar y resolver los problemas más frecuentes en laboratorios Cisco/PT de forma ágil.

## Checklist General

1. **Recopilar síntomas:**
   - ¿Qué no funciona? (ej: no hay ping, PCs no se ven)
   - ¿Quién está afectado? (un PC, una VLAN, toda la red)
   - ¿Cuándo empezó? ¿Hubo cambios?

2. **Verificar conectividad física:**
   - ¿Cables conectados y verdes en PT?
   - `show ip interface brief` (interfaces up/up)
   - Si algún puerto está down: `no shutdown`

3. **Verificar VLANs y enlaces:**
   - `show vlan brief` (puertos en VLAN correcta)
   - `show interfaces trunk` (VLANs permitidas en trunks)
   - `show spanning-tree` (puertos bloqueados)

4. **Verificar IP y routing:**
   - PCs: ¿IP, máscara y gateway correctos?
   - Routers: `show ip route`, `show running-config`
   - Subinterfaces con `encapsulation dot1Q` si hay Inter-VLAN

5. **Verificar ACLs y NAT:**
   - `show access-lists` (reglas deny/permit)
   - `show ip nat translations` (traducciones activas)

6. **Pruebas de conectividad:**
   - `ping 127.0.0.1` (local)
   - `ping <gateway>`
   - `ping <otro PC>`
   - `traceroute <destino>`

7. **Documentar hallazgos:**
   - Anota comandos ejecutados y resultados clave.
   - Si no resuelves, abre ticket con checklist y salidas relevantes.

## Acciones de Emergencia
- Reinicia el bridge o runtime si todo parece correcto pero no hay respuesta.
- Si hay errores de permisos o archivos, revisa rutas y permisos del sistema.

> Usa este playbook antes de escalar problemas. Si el checklist no resuelve el fallo, documenta y reporta.