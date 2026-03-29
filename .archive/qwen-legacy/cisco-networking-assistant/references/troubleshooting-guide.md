# Guía de Troubleshooting para Cisco Networking

Esta guía proporciona un enfoque sistemático para diagnosticar y resolver problemas comunes en redes Cisco, con un flujo de trabajo estructurado para casos de Packet Tracer y configuraciones de laboratorio.

## 1. Metodología de Troubleshooting

### El Modelo OSI como Marco de Trabajo

Una red Cisco bien diseñada opera en capas. Cuando surge un problema, una metodología estructurada, como la que se sigue en el modelo OSI, es fundamental para aislar la causa raíz de manera eficiente, evitando cambios innecesarios que puedan empeorar la situación.

**Flujo de Trabajo Recomendado:**

1.  **Recopilación de Información:**
    *   **Síntomas:** ¿Qué no funciona? (ej. "No hay ping", "La página web no carga", "La conexión es lenta")
    *   **Ámbito:** ¿Quién está afectado? (Un PC, una VLAN, toda la red)
    *   **Historial:** ¿Cuándo empezó? ¿Hubo cambios recientes?

2.  **Aislamiento de la Capa del Problema:**
    *   Utiliza el modelo OSI como guía para determinar si el problema es físico, de enlace, de red, de transporte o de aplicación.

3.  **Análisis y Pruebas:**
    *   Utiliza comandos específicos de `show` y `debug` para obtener evidencia.

4.  **Implementación de la Solución:**
    *   Aplica la corrección de manera controlada.

5.  **Verificación:**
    *   Confirma que el problema se resolvió sin crear nuevos problemas.

### Troubleshooting por Capa OSI

| Capa | Nombre | Problemas Típicos | Comandos de Diagnóstico Clave |
| :--- | :--- | :--- | :--- |
| 1 | Física | Cables desconectados, interfaces apagadas, velocidad/duplex incorrecto. | `show ip interface brief`, `show interfaces status` |
| 2 | Enlace de Datos | Problemas de VLAN, Spanning Tree (STP) bloqueando puertos, MAC address table incorrecta. | `show vlan brief`, `show spanning-tree`, `show mac address-table` |
| 3 | Red | Problemas de IP, máscara de subred incorrecta, tabla de routing incompleta, problemas de ARP. | `show ip route`, `show ip arp`, `show running-config` |
| 4 | Transporte | Listas de acceso (ACLs) bloqueando puertos, NAT mal configurado. | `show access-lists`, `show ip nat translations`, `show running-config` |
| 7 | Aplicación | Problemas de DNS, configuración incorrecta de gateway, aplicaciones mal configuradas en los PCs. | Verificar configuración de IP en PCs (Packet Tracer), pruebas de ping/traceroute |

---

## 2. Diagnóstico de Problemas de Conectividad Básica

### Verificando la Conectividad Física (Capa 1)

Antes de sumergirte en configuraciones complejas, asegúrate de que las bases sean sólidas.

**Pasos de Verificación en Packet Tracer:**

1.  **Estado del Cable:**
    *   Observa visualmente la topología. Los cables deben mostrar una conexión verde y estable.
    *   **Consejo de Troubleshooting:** Si el punto de conexión es naranja/ámbar, el puerto está en proceso de negociación o bloqueado por STP. Si es rojo, hay un problema de capa 1 o 2.

2.  **Verificación de Interfaces (CLI):**

    ```cisco
    Router> enable
    Router# show ip interface brief
    ```

    **Salida Esperada:**

    ```
    Interface              IP-Address      OK? Method Status                Protocol
    GigabitEthernet0/0     192.168.1.1     YES manual up                    up
    GigabitEthernet0/1     unassigned      YES unset  administratively down down
    ```

    **Análisis:**
    *   `Status` y `Protocol` deben estar en `up`. Si alguno está en `down` o `administratively down`, el problema está aquí.
    *   **Acción:** Si está `administratively down`, ejecuta `no shutdown` en el modo de configuración de interfaz.

### Verificando la Conectividad de Capa 3 (IP)

Una vez que las interfaces están activas, verifica la comunicación básica entre dispositivos.

**Pruebas de Conectividad:**

1.  **Ping Local (Loopback):**
    *   Ejecuta `ping 127.0.0.1` en el PC o router.
    *   **Objetivo:** Verificar que la pila TCP/IP local funciona correctamente.

2.  **Ping a la Gateway por Defecto:**
    *   Desde un PC en Packet Tracer, haz ping a la IP del router en su misma subred (por ejemplo, `ping 192.168.1.1`).
    *   **Objetivo:** Verificar conectividad local y que la configuración de IP y máscara de subred del PC son correctas.

3.  **Ping entre Subredes (Inter-VLAN):**
    *   Desde un PC en VLAN 10, haz ping a un PC en VLAN 20.
    *   **Objetivo:** Verificar que el routing (inter-vlan) está funcionando.

**Diagnóstico con `traceroute`:**

Si un ping falla, `traceroute` (o `tracert` en Windows) te ayudará a identificar en qué salto se pierde el paquete.

```cisco
Router# traceroute 192.168.2.10
```

---

## 3. Troubleshooting de VLANs y Switching (Capa 2)

Las VLANs son una fuente común de problemas en laboratorios. Una mala configuración puede aislar segmentos de red enteros.

### Problema: Dispositivos en la Misma VLAN no se Comunican

**Árbol de Decisión:**

1.  **¿Los puertos están en la VLAN correcta?**
    *   **Comando:** `show vlan brief` (en el switch)
    *   Busca el puerto al que está conectado el PC (ej. `Fa0/1`).
    *   **Solución:** Si está en la VLAN incorrecta, usa:
        ```cisco
        Switch(config)# interface fa0/1
        Switch(config-if)# switchport access vlan 10
        ```

2.  **¿El puerto está en modo 'access'?**
    *   Un puerto en modo `trunk` no asignará dispositivos finales a una VLAN de acceso.
    *   **Comando:** `show interfaces fa0/1 switchport`
    *   **Solución:**
        ```cisco
        Switch(config-if)# switchport mode access
        Switch(config-if)# switchport access vlan 10
        ```

3.  **¿Los switches tienen un enlace Trunk entre ellos?**
    *   Si los PCs están en switches diferentes, el enlace entre ellos debe permitir el paso de las VLANs.
    *   **Comando:** `show interfaces trunk`
    *   **Verificación:** Asegúrate de que la VLAN de los PCs esté en la lista "Vlans allowed on trunk".
    *   **Solución:** Configura el puerto como trunk y permite las VLANs necesarias:
        ```cisco
        Switch(config)# interface gi0/1
        Switch(config-if)# switchport mode trunk
        Switch(config-if)# switchport trunk allowed vlan 10,20
        ```

### Problema: Spanning Tree (STP) Bloquea un Puerto

STP puede poner un puerto en estado `blocking` para prevenir bucles, lo que impedirá el paso de tráfico.

**Diagnóstico:**

1.  **Verificar el Estado de los Puertos:**
    *   **Comando:** `show spanning-tree`
    *   **Comando:** `show spanning-tree blockedports`

2.  **Identificación:**
    *   Si un puerto que debería estar reenviando tráfico (por ejemplo, un enlace entre switches) aparece como `blocking` (BLK), STP está actuando.

**Solución y Buenas Prácticas:**

*   **En Puertos de Acceso:** Los puertos que conectan a PCs o servidores nunca deben recibir BPDUs. Configura `PortFast` y `BPDU Guard` para saltar los estados de aprendizaje de STP y proteger contra bucles.
    ```cisco
    Switch(config)# interface range fa0/1 - 24
    Switch(config-if-range)# spanning-tree portfast
    Switch(config-if-range)# spanning-tree bpduguard enable
    ```
*   **Recuperación:** Si `BPDU Guard` deshabilitó un puerto, se mostrará como `err-disabled`. Para recuperarlo, debes apagarlo y encenderlo (`shutdown` / `no shutdown`).

---

## 4. Troubleshooting de Routing (Capa 3)

Cuando la conectividad local funciona pero no hay comunicación entre diferentes redes (VLANs o subredes), el problema suele estar en el routing.

### Problema: No hay Comunicación entre VLANs (Inter-VLAN Routing)

**Suponiendo el modelo "Router-on-a-Stick":**

**Árbol de Decisión:**

1.  **¿La interfaz física del router está activa?**
    *   **Comando:** `show ip interface brief` en el router.
    *   La interfaz física (ej. `Gig0/0`) debe estar `up/up`. Las subinterfaces (ej. `Gig0/0.10`) dependen de la física.

2.  **¿Están configuradas las Subinterfaces?**
    *   Cada VLAN requiere una subinterface en el router.
    *   **Comando:** `show running-config | section interface`
    *   **Verificación:** Cada subinterface debe tener:
        *   `encapsulation dot1Q [vlan-id]`: Especifica la VLAN.
        *   `ip address [ip] [mask]`: La IP de gateway para esa VLAN.

3.  **¿El switch tiene un enlace Trunk al router?**
    *   El puerto del switch conectado al router debe estar en modo `trunk`.
    *   **Comando:** `show interfaces gi0/1 switchport` (en el switch).

### Problema: Rutas Dinámicas (OSPF/EIGRP) no se Aprenden

Si un router no tiene rutas para redes remotas en su tabla de routing, el protocolo de routing dinámico podría tener problemas.

**Diagnóstico General:**

1.  **Verificar Adyacencias (Vecinos):**
    *   **OSPF:** `show ip ospf neighbor`
    *   **EIGRP:** `show ip eigrp neighbors`
    *   **Análisis:** Si la lista está vacía, los routers no se "ven" entre sí.

2.  **Causas Comunes de Fallo de Adyacencia:**
    *   **Problema de Capa 2:** No hay conectividad IP entre los routers vecinos. ¡Haz un `ping` al IP del vecino!
    *   **Máscara de Subred Incorrecta:** Los routers deben estar en la misma subred para formar una adyacencia directa.
    *   **Área OSPF Incorrecta:** En OSPF, dos routers en el mismo enlace deben estar configurados en la misma área (ej. `area 0`).
    *   **Autenticación:** Si un router tiene configurada una contraseña (autenticación) y el otro no, o las contraseñas no coinciden, no se formará la adyacencia.
    *   **Temporizadores (Timers):** Los intervalos de `hello` y `hold` deben coincidir en ambos lados.

3.  **Verificar la Redistribución de Redes:**
    *   **Comando:** `show ip protocols`
    *   **Análisis:** Revisa qué redes está anunciando el router (sección `Routing for Networks`). Asegúrate de que la red a la que pertenecen las interfaces activas esté incluida.

---

## 5. Troubleshooting de Seguridad y NAT

### Problema: ACL Bloquea Tráfico Legítimo

Las ACLs son poderosas pero pueden ser restrictivas si no se configuran correctamente.

**Diagnóstico:**

1.  **Identificar el Tráfico Bloqueado:**
    *   Determina la IP origen, destino, y el puerto/protocolo involucrado.

2.  **Verificar las ACLs Aplicadas:**
    *   **Comando:** `show ip interface [interfaz] | include access`
    *   Identifica si hay una ACL de entrada (`in`) o salida (`out`) aplicada.

3.  **Analizar la Lógica de la ACL:**
    *   **Comando:** `show access-lists`
    *   Recuerda que las ACLs se procesan secuencialmente. Un `deny` al inicio bloqueará todo, incluso si hay un `permit` más abajo.
    *   Recuerda que hay un `deny all` implícito al final de toda ACL.

**Solución:**

*   Modifica la ACL para permitir el tráfico necesario. Por ejemplo, si el tráfico de respuesta HTTP (puerto 80 de vuelta) está siendo bloqueado, asegúrate de tener una regla `permit tcp any any established` o una regla que permita explícitamente el tráfico de retorno.

### Problema: NAT no Traduce Direcciones

Si los PCs de la red interna no pueden acceder a Internet (o a una red externa simulada), el NAT podría ser el problema.

**Diagnóstico:**

1.  **Verificar las Interfaces Inside/Outside:**
    *   **Comando:** `show ip interface brief`
    *   **Comando:** `show running-config | section interface`
    *   **Verificación:** La interfaz hacia la red interna debe tener `ip nat inside` y la interfaz hacia la red externa debe tener `ip nat outside`.

2.  **Verificar la ACL del NAT:**
    *   El NAT utiliza una ACL para identificar qué tráfico debe ser traducido.
    *   **Comando:** `show access-lists`
    *   **Verificación:** Asegúrate de que la red interna (ej. `192.168.1.0 0.0.0.255`) esté permitida en la ACL.

3.  **Verificar la Configuración del NAT:**
    *   **Comando:** `show running-config | include ip nat`
    *   Verifica que la sentencia `ip nat inside source` esté correctamente configurada.

---

## 6. Comandos de Diagnóstico Rápido (Cheat Sheet)

Aquí tienes una lista consolidada de los comandos más útiles, organizados por propósito.

### Verificación de Estado General

*   `show running-config`: Muestra la configuración activa actual. **¡Útil para verificar cualquier configuración!**
*   `show startup-config`: Muestra la configuración guardada.
*   `show version`: Información del hardware, software, y uptime.

### Capa 1 y 2

*   `show ip interface brief`: Estado de todas las interfaces (IP, up/down).
*   `show interfaces status`: Estado de los puertos (conectado, desconectado, velocidad/duplex).
*   `show vlan brief`: Lista de VLANs y puertos asignados.
*   `show mac address-table`: Tabla de direcciones MAC aprendidas.
*   `show spanning-tree`: Estado del protocolo STP.
*   `show cdp neighbors`: Dispositivos Cisco conectados directamente.

### Capa 3

*   `show ip route`: Tabla de routing completa.
*   `show ip route [red]`: Buscar una ruta específica.
*   `show ip arp`: Tabla ARP (mapeo IP a MAC).
*   `show ip protocols`: Ver qué protocolos de routing están activos y sus configuraciones.

### Capa 4 (Seguridad y NAT)

*   `show access-lists`: Contenido de las ACLs y contadores de hits.
*   `show ip nat translations`: Tabla de traducciones NAT activas.
*   `show ip nat statistics`: Estadísticas del funcionamiento de NAT.

### Routing Dinámico

*   **OSPF:** `show ip ospf neighbor`, `show ip ospf database`, `show ip ospf interface`.
*   **EIGRP:** `show ip eigrp neighbors`, `show ip eigrp topology`.

### Comandos de Debug (¡Usar con Precaución!)

Los comandos `debug` generan mucha salida y pueden afectar el rendimiento. Úsalos solo en momentos específicos.

*   `debug ip icmp`: Ver mensajes de ping (echo request/reply).
*   `debug ip packet`: Ver todos los paquetes IP (filtrar con ACL para reducir ruido).
*   `terminal monitor`: Ver debugs en una sesión Telnet/SSH (en routers).
*   `undebug all` o `no debug all`: Detener todos los debugs.

---

## 7. Escenarios de Troubleshooting en Packet Tracer

### Escenario 1: "No hay ping entre PCs en la misma VLAN"

**Síntomas:** PC1 (VLAN 10) no puede hacer ping a PC2 (VLAN 10).
**Checklist:**
1.  ¿Ambos PCs están en la misma subred IP? (Ej. ambos en `192.168.10.0/24`)
2.  ¿Ambos puertos del switch están asignados a VLAN 10? (`show vlan brief`)
3.  Si están en switches diferentes, ¿el enlace entre switches es Trunk y permite VLAN 10? (`show interfaces trunk`)
4.  ¿Los puertos de switch están `up/up`? (`show ip interface brief` en el switch)

### Escenario 2: "No hay conectividad entre VLANs"

**Síntomas:** PC1 (VLAN 10) no puede hacer ping a PC3 (VLAN 20).
**Checklist:**
1.  ¿El router tiene subinterfaces para VLAN 10 y VLAN 20? (`show ip interface brief` en el router)
2.  ¿Las subinterfaces tienen `encapsulation dot1Q` correcto?
3.  ¿El switch tiene un enlace Trunk al router?
4.  ¿Los PCs tienen la IP de la subinterface del router como su Default Gateway?
5.  Si se usa OSPF/EIGRP, ¿las adyacencias están formadas? (`show ip ospf neighbor`)

### Escenario 3: "Los PCs no pueden salir a Internet (simulado)"

**Síntomas:** No hay ping a una IP externa (ej. `8.8.8.8`) desde los PCs.
**Checklist:**
1.  ¿Los PCs tienen Default Gateway configurado?
2.  ¿El router tiene una ruta por defecto (Gateway of Last Resort)? (`show ip route | include Gateway`)
3.  Si se usa NAT: ¿las interfaces están marcadas como `inside` y `outside`? ¿La ACL de NAT es correcta? ¿Hay traducciones activas? (`show ip nat translations`)
4.  Si hay una ACL en la interfaz externa: ¿está permitiendo el tráfico de retorno?
