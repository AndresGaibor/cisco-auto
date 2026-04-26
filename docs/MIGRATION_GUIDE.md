# Migration Guide

La guía histórica que menciona `@cisco-auto/core` fue archivada en:

```
docs/archive/legacy-core/MIGRATION_GUIDE.md
```

Estado actual:

* `@cisco-auto/core` no existe como workspace activo.
* Nuevas migraciones deben usar paquetes activos:

  * `@cisco-auto/kernel`
  * `@cisco-auto/ios-domain`
  * `@cisco-auto/ios-primitives`
  * `@cisco-auto/pt-control`
  * `@cisco-auto/pt-runtime`
  * `@cisco-auto/file-bridge`
  * `@cisco-auto/types`

Antes de agregar una nueva migración, valida:

```bash
bun run architecture:check
bun run typecheck
bun test
```