# Switches en Packet Tracer — Referencia rápida

Modelos de switch más usados en Packet Tracer, con capacidades y limitaciones prácticas. Útil para seleccionar el switch correcto o explicar restricciones en automatización/troubleshooting.

| Modelo         | Tipo      | VLANs | Routing L3 | Notas clave |
|----------------|-----------|-------|------------|-------------|
| 2960           | Acceso    | Sí    | No         | Soporta VLANs, STP, port-security. Sin routing L3. |
| 2960-24TT      | Acceso    | Sí    | No         | Igual al 2960, más puertos. |
| 2960-48TT      | Acceso    | Sí    | No         | Igual al 2960, más puertos. |
| 3560           | L3        | Sí    | Parcial    | Routing L3 limitado (static, RIP), ideal para labs inter-VLAN. |
| 3650           | L3        | Sí    | Parcial    | Más avanzado, pero no todo el IOS real está disponible. |
| 9300           | L3        | Sí    | Parcial    | Switch moderno, soporte avanzado, pero features limitadas en PT. |

**Regla:** Si necesitas una función de switching o routing L3 no soportada, abre un ticket para revisión.

> No repitas aquí comandos de configuración; consulta la guía de VLAN o routing para detalles de CLI y ejemplos.
