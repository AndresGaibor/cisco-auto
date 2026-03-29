# Checklist de Verificación Post-Configuración

Utiliza esta lista después de completar una configuración para asegurarte de que todo funciona correctamente.

## VLANs y Switching

- [ ] `show vlan brief` muestra todas las VLANs creadas
- [ ] Cada puerto de acceso está asignado a la VLAN correcta
- [ ] Puertos troncal permiten todas las VLANs necesarias
- [ ] Native VLAN coincide en ambos extremos del trunk
- [ ] DTP desactivado (`switchport nonegotiate`)

## Inter-VLAN Routing

- [ ] Subinterfaces del router configuradas con encapsulación dot1Q
- [ ] Cada subinterface tiene la IP de gateway correcta
- [ ] Interfaz física del router está `up/up`
- [ ] PCs tienen configurado el gateway predeterminado correcto
- [ ] Ping entre PCs de diferentes VLANs funciona

## Routing Dinámico (OSPF/EIGRP)

- [ ] `show ip protocols` muestra el protocolo activo
- [ ] `show ip ospf neighbor` (o `eigrp`) muestra vecinos establecidos
- [ ] `show ip route` muestra rutas aprendidas
- [ ] Ping a redes remotas funciona
- [ ] Tabla de routing tiene rutas para todas las redes destino

## Seguridad - ACLs

- [ ] `show access-lists` muestra las ACLs configuradas
- [ ] ACLs aplicadas en las interfaces correctas (dirección in/out)
- [ ] Tráfico permitido pasa correctamente
- [ ] Tráfico denegado es bloqueado
- [ ] Logging habilitado para denies

## NAT

- [ ] `show ip nat translations` muestra traducciones activas
- [ ] Interfaces correctamente marcadas (inside/outside)
- [ ] ACL del NAT permite la red interna
- [ ] PCs pueden acceder a redes externas (Internet simulado)
- [ ] Traducciones se incrementan al generar tráfico

## VPN IPsec

- [ ] `show crypto isakmp sa` muestra SA en estado `QM_IDLE`
- [ ] `show crypto ipsec sa` muestra SA de IPsec activas
- [ ] Ping entre redes protegidas por VPN funciona
- [ ] No hay errores en `show crypto isakmp sa`

## Switch Security

- [ ] `show port-security` muestra configuración activa
- [ ] `show ip dhcp snooping` está habilitado
- [ ] `show ip arp inspection` está habilitado
- [ ] Puertos en estado `err-disabled` son recuperados
- [ ] BPDU Guard activo en puertos de acceso

## Conectividad General

- [ ] Todos los dispositivos responden a ping desde la red de management
- [ ] SSH funciona en todos los dispositivos
- [ ] Telnet está desactivado
- [ ] Acceso por consola está protegido
- [ ] Banner MOTD configurado

## Documentación

- [ ] Configuración guardada (`write memory` / `copy run start`)
- [ ] Documentación actualizada con cambios realizados
- [ ] Diagrama de red actualizado (si aplica)
- [ ] Lista de IPs y VLANs documentada
- [ ] Credenciales almacenadas de forma segura
