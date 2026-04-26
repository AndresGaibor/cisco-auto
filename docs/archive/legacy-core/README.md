# Legacy `@cisco-auto/core` Archive

Esta carpeta contiene referencias históricas a `@cisco-auto/core` / `packages/core`.

Estado actual:

- `@cisco-auto/core` no existe como workspace activo.
- `packages/core` no existe en el árbol actual.
- La funcionalidad histórica fue repartida entre:
  - `@cisco-auto/kernel`
  - `@cisco-auto/ios-domain`
  - `@cisco-auto/ios-primitives`
  - `@cisco-auto/pt-control`
  - `@cisco-auto/pt-runtime`
  - `@cisco-auto/network-intent`
  - `@cisco-auto/types`

Regla:

- No agregar imports nuevos hacia `@cisco-auto/core`.
- No escribir documentación activa que indique usar `packages/core`.
- Si se necesita conservar una referencia histórica, debe vivir en esta carpeta o en `.sisyphus/`.