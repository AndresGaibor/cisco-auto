# Packet Tracer API Exploration

Esta carpeta contiene scripts de investigación histórica sobre APIs internas de Packet Tracer.

Reglas:

1. Nada de esta carpeta debe ejecutarse como parte de flujos normales de CLI, runtime, build, test o release.
2. Nada de esta carpeta debe importarse desde `apps/*` ni desde `packages/*`.
3. Cualquier descubrimiento útil debe convertirse en una API estable dentro de `packages/pt-runtime` o `packages/pt-control`, con tests y validación PT-safe.
4. Scripts que dependan de APIs internas/no documentadas deben permanecer aquí hasta ser formalizados.