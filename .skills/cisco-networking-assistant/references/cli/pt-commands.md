# Comandos CLI de Packet Tracer y Cisco-auto

Breve referencia de comandos CLI útiles para automatización y troubleshooting en laboratorios Cisco.

- `bun run pt device add <nombre> <modelo> <x> <y>` — Agrega un dispositivo a la topología
- `bun run pt link add <dev1:iface> <dev2:iface> <tipo>` — Crea un enlace entre dispositivos
- `bun run pt config host <nombre> <ip> <mask> <gw>` — Configura IP en host
- `bun run pt snapshot` — Guarda snapshot de la topología
- `bun run src/cli/index.ts parse-pka <archivo.pka>` — Analiza archivo PKA
- `bun run src/cli/index.ts config <archivo.yaml>` — Genera configuración IOS
- `bun run src/cli/index.ts deploy <archivo.yaml>` — Despliega configuración

Para más ejemplos, consulta los playbooks modulares.
