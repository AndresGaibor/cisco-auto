# VLAN (Virtual LAN)

## ¿Qué resuelve?
Permite segmentar una red física en varias redes lógicas aisladas, mejorando seguridad y control de tráfico.

## ¿Cuándo usar?
- Cuando necesitas separar departamentos, áreas o funciones en la misma infraestructura física.
- Para reducir dominios de broadcast y mejorar el rendimiento.

## Comandos esenciales
```cisco
vlan 10
 name VENTAS
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
```

## Validaciones mínimas
- `show vlan brief`: Verifica que la VLAN exista y los puertos estén asignados.
- `show interfaces status`: Confirma el estado de los puertos.

## Regla de ticket
Si el CLI no permite crear, asignar o verificar VLANs, abre un ticket indicando el modelo de switch y la limitación encontrada.
