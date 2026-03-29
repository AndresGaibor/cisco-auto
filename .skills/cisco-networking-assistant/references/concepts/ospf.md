# OSPF (Open Shortest Path First)

## ¿Qué resuelve?
Protocolo de routing dinámico que encuentra rutas óptimas en redes medianas y grandes, soportando múltiples áreas.

## ¿Cuándo usar?
- Cuando la red requiere convergencia rápida y escalabilidad.
- Para segmentar la red en áreas lógicas.

## Comandos esenciales
```cisco
router ospf 1
 network 192.168.1.0 0.0.0.255 area 0
```

## Validaciones mínimas
- `show ip ospf neighbor`: Verifica vecinos OSPF.
- `show ip route ospf`: Confirma rutas aprendidas por OSPF.

## Regla de ticket
Si el CLI no soporta OSPF o no muestra vecinos/rutas, abre un ticket con el modelo de router y el síntoma.