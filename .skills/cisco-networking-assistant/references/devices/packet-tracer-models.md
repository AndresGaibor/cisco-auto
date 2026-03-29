# Modelos comunes de Packet Tracer

Referencia rápida de familias de dispositivos disponibles en Cisco Packet Tracer para automatización y troubleshooting. Usa esta tabla para elegir el tipo de equipo adecuado según las capacidades requeridas.

| Familia / Serie         | Tipo         | Ejemplos de modelos         | Notas clave |
|------------------------|--------------|-----------------------------|-------------|
| 2901, 2911, 1941       | Router       | 2901, 2911, 1941            | Soportan la mayoría de protocolos de routing y módulos WAN. |
| 4321, 4331, 4351       | Router       | 4321, 4331, 4351             | Modelos ISR más recientes, mejor soporte de features modernos. |
| 2960, 2960-24TT, 2960-48TT | Switch   | 2960, 2960-24TT, 2960-48TT  | Switches de acceso, VLANs, STP, pero sin routing L3 completo. |
| 3560, 3650             | Switch L3    | 3560, 3650                   | Soportan routing L3 limitado, ideal para labs de inter-VLAN. |
| 9300                   | Switch L3    | 9300                         | Switch moderno, soporte avanzado, pero algunas features limitadas en PT. |
| PC, Laptop, Server     | Host         | PC, Laptop, Server           | Para pruebas de conectividad, servicios básicos. |

**Regla:** Si necesitas una capacidad que no aparece en la tabla, abre un ticket para revisión.

> No dupliques aquí detalles de configuración, consulta las guías específicas para VLAN, routing o seguridad.
