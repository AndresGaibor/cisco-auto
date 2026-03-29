# STP (Spanning Tree Protocol)

## ¿Qué resuelve?
Previene bucles de capa 2 en redes con switches redundantes, asegurando una topología libre de loops.

## ¿Cuándo usar?
- Siempre que haya enlaces redundantes entre switches.
- Para evitar tormentas de broadcast y caídas de red.

## Comandos esenciales
```cisco
show spanning-tree
spanning-tree vlan 10 priority 4096
```

## Validaciones mínimas
- `show spanning-tree`: Verifica el estado y roles de los puertos.
- `show interfaces status`: Confirma puertos bloqueados o activos.

## Regla de ticket
Si el CLI no permite ver o ajustar STP, abre un ticket con el modelo de switch y el síntoma.