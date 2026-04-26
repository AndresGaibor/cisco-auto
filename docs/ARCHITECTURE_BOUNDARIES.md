# Architecture Boundaries

Este repo usa guardrails automáticos para evitar regresiones de arquitectura.

## Reglas principales

| Capa | Puede depender de | No puede depender de |
|---|---|---|
| `ios-primitives` | nada de negocio | `kernel`, `pt-control`, `pt-runtime`, `apps` |
| `ios-domain` | `ios-primitives`, `types` | `kernel`, `pt-control`, `pt-runtime`, `pt-memory`, `bun:sqlite`, `node:fs` |
| `pt-memory` | `ios-domain` | `pt-control`, `pt-runtime`, `apps` |
| `kernel` | contratos/domain base | `apps`, `pt-cli` |
| `pt-runtime` | contratos PT-safe | `node:*` en runtime estable |
| `pt-control` | paquetes inferiores | `apps/pt-cli` |
| `apps/pt-cli` | APIs públicas de paquetes | `src/` internos de otros paquetes, `pt-control/legacy` |

## Comandos

```bash
bun run architecture:check
bun run quality:check
bun run lint
bun run typecheck
bun test
```

## Notas

- ESLint bloquea imports estáticos.
- `scripts/check-architecture-boundaries.ts` también bloquea imports dinámicos y archivos generados.
- Si necesitas romper una regla, primero crea un subpath público en el paquete dueño.