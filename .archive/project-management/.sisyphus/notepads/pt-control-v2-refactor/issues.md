- `runPtCommand` fallaba al intentar `bun run packages/pt-control-v2/dist/cli/index.js` porque ese archivo no existe en dist; ajusté el fallback para apuntar a `packages/pt-control-v2/bin/run.js`, que sí ejecuta la CLI empaquetada y mantiene la integración oficial.
 - Eliminado paquete legacy `packages/pt-control/` y actualizadas referencias en docs y scripts para apuntar a `pt-control-v2`.
 - Se dejó la entrada workspace `@cisco-auto/pt-control` fuera del lockfile por compatibilidad previa; se removió de package.json.

4:  - Ejecutado `bun install` para regenerar bun.lock; se eliminaron 2 paquetes y el lockfile fue actualizado.
5:  - Verificación: después de la regeneración no se encontraron referencias a `@cisco-auto/pt-control` ni `packages/pt-control` en bun.lock.
6:  - Ejecutado `bun run pt:test` (como `bun test packages/pt-control-v2`) → 45 tests passed, 0 failed.

7:  - Corregido scripts.test en packages/pt-control-v2/package.json: 'bun test packages/pt-control-v2/tests' → 'bun test tests'. Esto permite que 'bun run pt:test' funcione desde el root (se invoca con --cwd packages/pt-control-v2).
