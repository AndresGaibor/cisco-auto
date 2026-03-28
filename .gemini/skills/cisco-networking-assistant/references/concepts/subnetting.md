# Subnetting (Subneteo)

## ¿Qué resuelve?
Divide una red grande en subredes más pequeñas para optimizar el uso de direcciones y mejorar el control.

## ¿Cuándo usar?
- Cuando necesitas separar segmentos lógicos o limitar el tamaño de los dominios de broadcast.
- Para asignar rangos IP eficientes a diferentes áreas.

## Comandos esenciales
```cisco
interface FastEthernet0/1
 ip address 192.168.10.1 255.255.255.224
```

## Validaciones mínimas
- `show ip interface brief`: Verifica IPs y máscaras asignadas.
- `show running-config`: Confirma subredes configuradas.

## Regla de ticket
Si el CLI no permite asignar subredes o no muestra la configuración IP esperada, abre un ticket con el modelo de equipo y el síntoma.