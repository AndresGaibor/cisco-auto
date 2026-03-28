# ACL (Access Control List)

## ¿Qué resuelve?
Permite filtrar tráfico de red según IP, protocolo o puerto, mejorando la seguridad y el control de acceso.

## ¿Cuándo usar?
- Cuando necesitas restringir acceso entre segmentos de red.
- Para limitar servicios o proteger recursos críticos.

## Comandos esenciales
```cisco
access-list 10 permit 192.168.1.0 0.0.0.255
ip access-group 10 in
```

## Validaciones mínimas
- `show access-lists`: Verifica reglas aplicadas.
- `show running-config`: Confirma interfaces con ACL aplicada.

## Regla de ticket
Si el CLI no permite crear, aplicar o verificar ACLs, abre un ticket con el modelo de equipo y el síntoma.