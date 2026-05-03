# RedNET - Debug de sesion Packet Tracer

Fecha: 2026-04-28
Repo: `cisco-auto`
Objetivo inicial: validar y corregir la guia RedNET Documento 2, principalmente configuracion de switches, VLANs y comunicacion inter-VLAN.

## Resumen ejecutivo

Durante la sesion se encontro que Packet Tracer 9 estaba activo, pero el runtime/bridge de `pt-cli` quedo inestable varias veces. Algunos comandos IOS funcionaron correctamente, otros fallaron por `IOS_EXEC_FAILED`, `HOST_EXEC_FAILED`, `BRIDGE_NOT_READY`, timeout o `SIGTERM`.

La evidencia mas importante obtenida antes de la inestabilidad muestra que los MLS tienen SVIs y EtherChannel configurados, pero los switches de acceso y `SW-SERVERS` no tenian aplicada la configuracion esperada de puertos access/voice/trunk del Documento 2. Por eso la validacion de comunicacion entre VLANs con PCs no pudo completarse de forma confiable.

## Estado del entorno

Packet Tracer detectado por `omni inspect env`:

```text
version: 9.0.0.0810
basePath: /Applications/Cisco Packet Tracer 9.0.0/Cisco Packet Tracer 9.0.app/Contents
userFolder: /Users/andresgaibor/Cisco Packet Tracer 9.0.0
isPTSA: false
isRealtimeMode: true
isSimulationMode: false
```

Diagnostico recurrente de `pt doctor --json`:

```text
Archivos runtime presentes: main.js, runtime.js
Heartbeat encontrado: ok
Bridge ready: no
Topologia no materializada
Queue: 1 queued / 0 in-flight / 0 dead-letter
```

Interpretacion: Packet Tracer estaba abierto y con heartbeat, pero el bridge no quedaba completamente listo para ciertos comandos, especialmente hacia hosts/PCs y a veces hacia IOS.

## Inventario observado

Comando ejecutado:

```bash
bun run pt device list --json --links
```

Resultado relevante:

```text
deviceCount: 39
linkCount: 0
connectionsByDevice: {}
unresolvedLinks: []
```

Dispositivos principales detectados:

```text
SW-ACC-P1..SW-ACC-P6
MLS-CORE-1
MLS-CORE-2
SW-SERVERS
WEB, DNS
EMAIL
DHCP, AAA
Wireless Router0
Wireless Router1
Light Weight Access Point0..3
Router0
IP Phone0..5
Wireless LAN Controller0
PC0..PC12
```

Problema: aunque hay dispositivos, `device list --links` reporto 0 enlaces. Eso impide usar el inventario fisico como fuente confiable de conectividad. Se intento suplir con comandos IOS.

## Evidencia que si se obtuvo

### MLS-CORE-1 EtherChannel

Comando:

```bash
bun run pt cmd MLS-CORE-1 "show etherchannel summary"
```

Resultado:

```text
Number of channel-groups in use: 2
Number of aggregators:           2

Group  Port-channel  Protocol    Ports
1      Po1(SU)       LACP        Gig1/0/23(P) Gig1/0/24(P)
2      Po2(SU)       PAgP        Gig1/0/9(P)  Gig1/0/10(P)
```

Conclusion: `MLS-CORE-1` tiene `Po1` LACP y `Po2` PAgP en estado `SU`.

### MLS-CORE-2 EtherChannel

Comando:

```bash
bun run pt cmd MLS-CORE-2 "show etherchannel summary"
```

Resultado:

```text
Number of channel-groups in use: 1
Number of aggregators:           1

Group  Port-channel  Protocol    Ports
1      Po1(SU)       LACP        Gig1/0/23(P) Gig1/0/24(P)
```

Conclusion: `MLS-CORE-2` tiene `Po1` LACP en estado `SU`. No muestra `Po2`, lo cual puede ser coherente si `Po2` solo conecta `MLS-CORE-1` con `SW-SERVERS`.

### MLS-CORE-1 SVIs

Comando:

```bash
bun run pt cmd MLS-CORE-1 "show ip interface brief"
```

Resultado relevante:

```text
Vlan10   192.168.10.2    up up
Vlan20   192.168.20.2    up up
Vlan30   192.168.30.2    up up
Vlan40   192.168.40.2    up up
Vlan50   192.168.50.2    up up
Vlan55   192.168.55.2    up up
Vlan60   192.168.60.2    up up
Vlan65   192.168.65.2    up up
Vlan70   192.168.70.2    up up
Vlan80   192.168.80.2    up up
Vlan90   192.168.90.2    up up
Vlan99   192.168.99.2    up up
Vlan100  192.168.100.2   up up
Vlan110  192.168.110.2   up up
Vlan120  192.168.120.2   up up
Vlan130  192.168.130.2   up up
Vlan140  192.168.140.2   up up
```

Conclusion: `MLS-CORE-1` tiene SVIs de VLAN 10-140 levantadas.

### MLS-CORE-2 SVIs

Comando:

```bash
bun run pt cmd MLS-CORE-2 "show ip interface brief"
```

Resultado obtenido en una reejecucion exitosa:

```text
Vlan10   192.168.10.3    up up
Vlan20   192.168.20.3    up up
Vlan30   192.168.30.3    up up
Vlan40   192.168.40.3    up up
Vlan50   192.168.50.3    up up
Vlan55   192.168.55.3    up up
Vlan60   192.168.60.3    up up
Vlan65   192.168.65.3    up up
Vlan70   192.168.70.3    up up
Vlan80   192.168.80.3    up up
Vlan90   192.168.90.3    up up
Vlan99   192.168.99.3    up up
Vlan100  192.168.100.3   up up
Vlan110  192.168.110.3   up up
Vlan120  192.168.120.3   up up
Vlan130  192.168.130.3   up up
Vlan140  192.168.140.3   up up
```

Conclusion: `MLS-CORE-2` tambien tiene SVIs de VLAN 10-140 levantadas, aunque luego algunos comandos hacia ese equipo fallaron por `IOS_EXEC_FAILED`.

### HSRP

Comando intentado:

```bash
bun run pt cmd MLS-CORE-1 "show standby brief"
bun run pt cmd MLS-CORE-2 "show standby brief"
```

Resultado:

```text
% Invalid input detected at '^' marker.
```

Comando alternativo exitoso:

```bash
bun run pt cmd MLS-CORE-1 "show running-config | include standby"
bun run pt cmd MLS-CORE-2 "show running-config | include standby"
```

Resultado relevante:

```text
MLS-CORE-1: standby version 2, VIP .1 en VLANs 10-140, priority 110, preempt
MLS-CORE-2: standby version 2, VIP .1 en VLANs 10-140, preempt, sin priority 110
```

Conclusion: la configuracion HSRP existe. La verificacion operacional con `show standby brief` no es viable en esta imagen/CLI de Packet Tracer, o el parser/terminal no acepta esa sintaxis.

## Problemas detectados en switches

### Puertos access de SW-ACC no aplicados

Comandos ejecutados:

```bash
bun run pt cmd each --devices SW-SERVERS,SW-ACC-P1,SW-ACC-P2,SW-ACC-P3,SW-ACC-P4,SW-ACC-P5,SW-ACC-P6 "show vlan brief"
bun run pt cmd each --devices SW-SERVERS,SW-ACC-P1,SW-ACC-P2,SW-ACC-P3,SW-ACC-P4,SW-ACC-P5,SW-ACC-P6 "show running-config | section interface"
```

Evidencia observada:

```text
Los puertos FastEthernet aparecen en VLAN 1/default.
No se observa switchport access vlan X en los puertos esperados.
No se observa switchport voice vlan 80 en los puertos de telefonos.
Las descripciones son genericas: === Puerto de acceso ===
```

Impacto: mientras los puertos FastEthernet sigan en VLAN 1/default, los PCs y telefonos no quedan en sus VLANs de datos/voz. Esto bloquea la validacion real de comunicacion inter-VLAN desde hosts.

### SW-SERVERS Fa0/1 no esta en VLAN 70

Comando:

```bash
bun run pt cmd SW-SERVERS "show interfaces fa0/1 switchport"
```

Resultado:

```text
Administrative Mode: dynamic auto
Operational Mode: static access
Access Mode VLAN: 1 (default)
Voice VLAN: none
```

Impacto: el puerto del servidor esperado para VLAN 70 no esta configurado como indica el Documento 2. Si el servidor esta conectado ahi, no estara en VLAN 70.

### SW-SERVERS Fa0/20 hacia router voz

Comando:

```bash
bun run pt cmd SW-SERVERS "show interfaces fa0/20 switchport"
```

Resultado:

```text
Administrative Mode: trunk
Operational Mode: down
Trunking VLANs Enabled: All
```

Impacto: el puerto esta configurado como trunk, pero esta operativo `down`. Ademas permite todas las VLANs, no solo VLAN 80 como seria mas restringido para el enlace hacia el router de VoIP.

### SW-SERVERS Fa0/21 hacia WLC no esta trunk

Comando:

```bash
bun run pt cmd SW-SERVERS "show interfaces fa0/21 switchport"
```

Resultado:

```text
Administrative Mode: dynamic auto
Operational Mode: down
Access Mode VLAN: 1 (default)
```

Impacto: el puerto hacia WLC no cumple el Documento 2. Deberia ser trunk con VLANs `99,90,100,110,120,140`.

### Puertos LAP en SW-ACC no aplicados

Comando:

```bash
bun run pt cmd SW-ACC-P2 "show interfaces fa0/20 switchport"
```

Resultado:

```text
Administrative Mode: dynamic auto
Operational Mode: down
Access Mode VLAN: 1 (default)
Voice VLAN: none
```

Impacto: `Fa0/20` de `SW-ACC-P2` no esta como trunk para LAP. No se pudo confirmar `SW-ACC-P4 Fa0/20` porque el comando fallo con `IOS_EXEC_FAILED`, pero el running-config previo tampoco mostraba la configuracion esperada.

### Puerto de telefono en SW-ACC-P3 sin voice VLAN

Comando:

```bash
bun run pt cmd SW-ACC-P3 "show interfaces fa0/9 switchport"
```

Resultado:

```text
Administrative Mode: dynamic auto
Operational Mode: down
Access Mode VLAN: 1 (default)
Voice VLAN: none
```

Impacto: el puerto que deberia ser `VLAN 30 + voice VLAN 80` no esta aplicado.

## Fallos del runtime/CLI observados

### BRIDGE_NOT_READY

Ejemplo:

```bash
bun run pt cmd PC0 "ipconfig"
```

Resultado:

```text
Codigo: BRIDGE_NOT_READY
Mensaje: El bridge no quedo listo despues de 35000ms.
state: stopped
leaseValid: false
warnings:
  No valid lease held
  Lifecycle state is stopped, not running
```

Interpretacion: el bridge local de comandos quedo detenido o sin lease valido. No es una prueba de red; es un problema de control/runtime.

### HOST_EXEC_FAILED

Ejemplos:

```bash
bun run pt cmd PC0 "ipconfig"
bun run pt cmd PC2 "ipconfig"
```

Resultado:

```text
Codigo: HOST_EXEC_FAILED
Mensaje: Error en ejecucion de comando Host
```

Interpretacion: el terminal/ejecutor de host en PT fallo. Puede ser por host no listo, ventana/terminal no disponible, problema del bridge o falta de conectividad real. No se pudo usar como evidencia de IP.

### IOS_EXEC_FAILED

Ejemplos:

```bash
bun run pt cmd MLS-CORE-1 "ping 192.168.70.10"
bun run pt cmd MLS-CORE-1 "show ip route"
bun run pt cmd SW-ACC-P1 "show vlan brief"
bun run pt cmd SW-ACC-P2 "show vlan brief"
```

Resultado:

```text
Codigo: IOS_EXEC_FAILED
Mensaje: Error en ejecucion de comando IOS
```

Interpretacion: el comando IOS no llego a completarse correctamente. Dado que comandos similares si funcionaron minutos antes, parece inestabilidad del control/terminal, no necesariamente error de configuracion IOS.

### SIGTERM / timeout

Ejemplos:

```bash
bun run pt cmd each --devices PC0,PC1,PC2,PC3,PC4,PC5,PC6 "ipconfig"
bun run pt cmd each --devices PC7,PC8,PC9,PC10,PC11,PC12 "ipconfig"
bun run pt verify ping PC0 192.168.70.10
```

Resultado:

```text
error: script "pt" was terminated by signal SIGTERM
bash tool terminated command after exceeding timeout 120000 ms
```

Interpretacion: los comandos agrupados o de verificacion con hosts pueden quedar colgados si un host no responde. Conviene probar por dispositivo y con el runtime limpio.

### Omni raw y topologia

Comando:

```bash
bun run pt omni topology physical --json
```

Resultado:

```text
ok: false
code: UNKNOWN_COMMAND
message: Unknown command type: siphonPhysicalTopology
warnings:
  Topologia virtual aun no materializada; la verificacion de estado puede ser incompleta.
```

Interpretacion: el comando `omni topology physical` no esta operativo en este runtime/version para obtener topologia fisica. No sirve como alternativa para mapear enlaces en esta sesion.

Comando seguro de introspeccion:

```bash
bun run pt omni raw --yes --wrap "return {ipc:Object.keys(ipc).slice(0,80), n:Object.keys(n).slice(0,120)};"
```

Resultado:

```json
{
  "ipc": ["_parser"],
  "n": ["_parser"]
}
```

Interpretacion: el contexto raw disponible esta muy limitado; no expuso metodos utiles directamente por `Object.keys`.

## Validacion de comunicacion entre VLANs

No se pudo completar una matriz de ping entre VLANs por estas razones:

```text
1. Los PCs no entregaron `ipconfig` de forma confiable.
2. `verify ping PC0 192.168.70.10` quedo en timeout.
3. Los puertos access/voice esperados no estaban aplicados en SW-ACC.
4. SW-SERVERS no tenia correctamente configurados puertos clave de servidores/WLC.
5. La topologia fisica no se pudo materializar con `device list --links` ni con `omni topology physical`.
```

Conclusion tecnica: antes de validar pings entre VLANs, hay que corregir L2 en switches y estabilizar el bridge/runtime.

## Hipotesis de causa raiz

### Causa raiz de conectividad

La causa mas probable de que no haya comunicacion real entre VLANs desde PCs es que los puertos de acceso no estan en sus VLANs correctas. Evidencia: `show vlan brief` y `show interfaces fa0/x switchport` muestran puertos FastEthernet en VLAN 1/default.

### Causa raiz de fallos de automatizacion

La causa mas probable de los errores de CLI es un estado inestable del bridge/runtime despues de comandos largos o agrupados. Evidencia: `pt doctor` muestra `Bridge ready: no`, `Topologia no materializada` y cola pendiente.

## Recomendaciones para la proxima sesion

### Preparar Packet Tracer

1. Abrir Packet Tracer y cargar el archivo `.pkt` correcto.
2. Confirmar modo Realtime.
3. Recargar o reinyectar `main.js` si el runtime lo requiere.
4. Ejecutar:

```bash
bun run pt doctor --json
bun run pt runtime status --json
```

Continuar solo si el heartbeat esta `ok` y no hay cola pendiente.

### Evitar comandos agrupados con hosts

No iniciar con:

```bash
bun run pt cmd each --devices PC0,PC1,... "ipconfig"
```

Preferir:

```bash
bun run pt cmd PC0 "ipconfig"
bun run pt cmd PC1 "ipconfig"
```

Si un host falla, detenerse y probar otro host en vez de saturar la cola.

### Corregir primero L2 en switches

Aplicar y verificar, en este orden:

```text
1. SW-SERVERS Fa0/1-3 access VLAN 70.
2. SW-SERVERS Fa0/20 trunk para VLAN 80 hacia router VoIP.
3. SW-SERVERS Fa0/21 trunk allowed 99,90,100,110,120,140 hacia WLC.
4. SW-ACC-P1 Fa0/1-20 access VLAN 10.
5. SW-ACC-P2 Fa0/1-19 access VLAN 20, Fa0/9-10 voice VLAN 80, Fa0/20 trunk LAP.
6. SW-ACC-P3 Fa0/1-20 access VLAN 30, Fa0/9-10 voice VLAN 80.
7. SW-ACC-P4 Fa0/1-19 access VLAN 40, Fa0/9 voice VLAN 80, Fa0/20 trunk LAP.
8. SW-ACC-P5 Fa0/1-10 access VLAN 55, Fa0/9 voice VLAN 80, Fa0/11-20 access VLAN 50.
9. SW-ACC-P6 Fa0/1-10 access VLAN 65, Fa0/9 voice VLAN 80, Fa0/11-20 access VLAN 60, Fa0/15 voice VLAN 80.
```

### Verificacion minima despues de corregir switches

Ejecutar:

```bash
bun run pt cmd SW-SERVERS "show interfaces fa0/1 switchport"
bun run pt cmd SW-SERVERS "show interfaces fa0/20 switchport"
bun run pt cmd SW-SERVERS "show interfaces fa0/21 switchport"
bun run pt cmd SW-ACC-P2 "show interfaces fa0/9 switchport"
bun run pt cmd SW-ACC-P2 "show interfaces fa0/20 switchport"
bun run pt cmd SW-ACC-P3 "show interfaces fa0/9 switchport"
bun run pt cmd SW-ACC-P4 "show interfaces fa0/20 switchport"
```

Esperado:

```text
Puertos de usuario: Administrative Mode static access, Access VLAN correcta.
Puertos telefonos: Voice VLAN 80.
Puertos LAP/WLC/router: Administrative Mode trunk, allowed VLANs correctas.
```

### Validacion de inter-VLAN despues de L2

Primero obtener IPs:

```bash
bun run pt cmd PC0 "ipconfig"
bun run pt cmd PC1 "ipconfig"
bun run pt cmd PC2 "ipconfig"
```

Luego probar gateway y servidor:

```bash
bun run pt verify ping PC0 192.168.10.1
bun run pt verify ping PC0 192.168.70.10
```

Despues hacer pruebas cruzadas entre hosts de VLANs distintas solo si ambos tienen IP valida:

```bash
bun run pt verify ping <PC_ORIGEN> <IP_PC_DESTINO>
```

## Comandos que funcionaron mejor

```bash
bun run pt cmd MLS-CORE-1 "show ip interface brief"
bun run pt cmd MLS-CORE-1 "show etherchannel summary"
bun run pt cmd MLS-CORE-2 "show etherchannel summary"
bun run pt cmd MLS-CORE-1 "show running-config | include standby"
bun run pt cmd MLS-CORE-2 "show running-config | include standby"
bun run pt omni inspect env --json
```

## Comandos problematicos

```bash
bun run pt cmd each --devices PC0,PC1,PC2,PC3,PC4,PC5,PC6 "ipconfig"
bun run pt cmd each --devices PC7,PC8,PC9,PC10,PC11,PC12 "ipconfig"
bun run pt verify ping PC0 192.168.70.10
bun run pt omni topology physical --json
bun run pt cmd MLS-CORE-1 "show standby brief"
bun run pt cmd MLS-CORE-2 "show standby brief"
```

## Pendientes

1. Estabilizar bridge/runtime hasta que `pt doctor` no reporte `Bridge ready: no`.
2. Aplicar configuracion L2 faltante en switches.
3. Confirmar IPs de servidores `WEB, DNS`, `DHCP, AAA`, `EMAIL`.
4. Confirmar DHCP o IP estatica de PCs por VLAN.
5. Ejecutar matriz de ping inter-VLAN.
6. Documentar la matriz final de resultados cuando el runtime este estable.
