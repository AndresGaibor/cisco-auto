# Routers en Packet Tracer — Referencia rápida

Lista de modelos de router comunes en Packet Tracer, con capacidades clave y limitaciones prácticas. Útil para elegir el router adecuado o explicar restricciones en laboratorios automatizados.

| Modelo      | Interfaces típicas     | Protocolos soportados      | Limitaciones / Notas |
|-------------|-----------------------|----------------------------|---------------------|
| 2901        | 2x GigaEthernet, HWIC | RIP, OSPF, EIGRP, NAT, ACL | Sin soporte de switching L3 completo. |
| 2911        | 3x GigaEthernet, HWIC | RIP, OSPF, EIGRP, NAT, ACL | Similar al 2901, más slots. |
| 1941        | 2x GigaEthernet, HWIC | RIP, OSPF, EIGRP, NAT, ACL | Menos slots, ideal para labs pequeños. |
| 4321        | 2x GigaEthernet, NIM  | RIP, OSPF, EIGRP, NAT, ACL | Mejor rendimiento, soporte de features modernos. |
| 4331        | 3x GigaEthernet, NIM  | RIP, OSPF, EIGRP, NAT, ACL | Más interfaces, ideal para topologías medianas. |
| 4351        | 3x GigaEthernet, NIM  | RIP, OSPF, EIGRP, NAT, ACL | Modelo avanzado, más slots y RAM. |

**Regla:** Si el router no soporta un protocolo o módulo necesario, abre un ticket para revisión o actualización de catálogo.

> No repitas aquí comandos de configuración; consulta la guía de routing para detalles de CLI y ejemplos.
