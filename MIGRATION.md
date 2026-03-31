# Migration Guide: v2.x → v3.0

## Paquetes Eliminados

| Paquete Anterior | Estado | Alternativa |
|------------------|--------|-------------|
| `@cisco-auto/api` | ❌ Eliminado | Usar `@cisco-auto/pt-control` |
| `@cisco-auto/bridge` | ❌ Eliminado | Usar `@cisco-auto/file-bridge` |
| `@cisco-auto/device-catalog` | ❌ Eliminado | Usar `@cisco-auto/core/catalog` |

## AI Skills

Skills ahora unificadas en `.skills/` con symlinks.

## Pasos de Migración

1. Actualizar imports
2. Ejecutar tests: `bun test`
3. Build: `bun run build`
