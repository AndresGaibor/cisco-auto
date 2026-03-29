# EIGRP (Enhanced Interior Gateway Routing Protocol)

## ¿Qué resuelve?
Protocolo de routing dinámico propietario de Cisco, ideal para redes medianas con balance entre simplicidad y eficiencia.

## ¿Cuándo usar?
- Cuando se requiere convergencia rápida y configuración sencilla en equipos Cisco.
- En redes donde OSPF es innecesario o no soportado.

## Comandos esenciales
```cisco
router eigrp 100
 network 192.168.1.0 0.0.0.255
```

## Validaciones mínimas
- `show ip eigrp neighbors`: Verifica vecinos EIGRP.
- `show ip route eigrp`: Confirma rutas aprendidas por EIGRP.

## Regla de ticket
Si el CLI no permite configurar EIGRP o no muestra vecinos/rutas, abre un ticket con el modelo de router y el síntoma.