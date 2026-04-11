2026-04-10 - Hicimos createErrorResult genérico

- Qué: Cambié la firma de `createErrorResult` en `apps/pt-cli/src/contracts/cli-result.ts` a `createErrorResult<T = never>(...): CliResult<T>` para permitir que los llamadores retornen `CliResult<T>` sin usar `as`.
- Por qué: Muchas partes del código estaban usando casts `as CliResult<T>` porque la función devolvía `CliResult` sin genérico; hacerla genérica preserva el mismo objeto en runtime pero mejora la inferencia de TypeScript.
- Dónde: apps/pt-cli/src/contracts/cli-result.ts
- Aprendido: Cambiar sólo la firma es suficiente; no se debe tocar el objeto retornado. Ejecutar `bun run typecheck` en el repo produce muchos errores preexistentes en el monorepo, pero el cambio local no introdujo nuevos errores aislados en este archivo.

2026-04-10 - Añadido ContextStatusSchema

- Qué: Agregué `ContextStatusSchema` en `packages/types/src/schemas/context-status.ts` para validar el JSON persistido en `~/.pt-cli/context-status.json` sin usar as-casts.
- Por qué: Evita conversiones inseguras y centraliza la validación del estado persistido (heartbeat, bridge, topology, warnings, notes) usando Zod.
- Dónde: packages/types/src/schemas/context-status.ts
- Aprendido: Seguir la convención `export const XSchema = z.object(...).strict()` + `export type X = z.infer<typeof XSchema>` mantiene compatibilidad con el resto del paquete de esquemas.

Nota: Corrigido el barrel export para que `ContextStatusSchema` se exporte desde `./context-status.js` en lugar de `./bridge.js`.

Nota: Eliminado `default export` en packages/types/src/schemas/context-status.ts para mantener la convención de exportaciones nombradas.

2026-04-10 - Añadido HistoryEntrySchema

- Qué: Agregué `HistoryEntrySchema` en `packages/types/src/schemas/history-entry.ts` para validar las entradas de historial persistidas según `apps/pt-cli/src/contracts/history-entry.ts`. Incluye variantes legacy en snake_case (p. ej. command_ids, payload_summary) para compatibilidad.
- Por qué: Centralizar la validación evita `as` y permite validar archivos de historial leídos desde disco.
- Dónde: packages/types/src/schemas/history-entry.ts
- Aprendido: Usar `z.record(z.string(), z.unknown())` para campos map-like mantiene compatibilidad con claves dinámicas.

2026-04-11 - Removidos `as CliResult<T>` en run-command.ts

- Qué: Eliminé los cast `as CliResult<T>` en `apps/pt-cli/src/application/run-command.ts` reemplazándolos por llamadas genéricas `createErrorResult<T>(...)`.
- Por qué: Tras hacer `createErrorResult` genérico en cambios anteriores, los `as` eran redundantes y podían ocultar problemas de inferencia. Usar la firma genérica preserva la inferencia sin alterar el objeto retornado.
- Dónde: apps/pt-cli/src/application/run-command.ts (líneas donde se asignaba `result` en bloques de error y falta de resultado)
- Aprendido: Reemplazar casts por firmas genéricas mantiene runtime sin cambios y limpia el código. Ejecutar `type_check` y `lsp_diagnostics` en el archivo objetivo confirma que no se introdujeron errores.

2026-04-10 - Añadido SessionLogEventSchema

- Qué: Agregué `SessionLogEventSchema` en `packages/types/src/schemas/session-log-event.ts` para validar eventos persistidos de sesión (session_id, correlation_id, timestamp, phase, action, metadata).
- Por qué: Evita casts inseguros al parsear ndjson de logs de sesión y asegura la estructura esperada.
- Dónde: packages/types/src/schemas/session-log-event.ts
- Aprendido: metadata debe ser un record de claves string a unknown, igual que otros campos map-like en el repo.

2026-04-10 - Añadido LockInfoSchema

- Qué: Agregué `LockInfoSchema` en `packages/types/src/schemas/lock-info.ts` para validar el lock persistido del supervisor (pid, timestamp, version).
- Por qué: Permite validar y parsear de forma segura el archivo de lock sin usar casts.
- Dónde: packages/types/src/schemas/lock-info.ts
- Aprendido: Usar z.number().int().nonnegative() protege contra valores no enteros o negativos en archivos corruptos.

2026-04-10 - Reemplazo de cast con validación Zod en loadContextStatus

- Qué: En `apps/pt-cli/src/application/context-supervisor.ts` reemplacé `JSON.parse(content) as ContextStatus` por `ContextStatusSchema.parse(...)` importado desde `@cisco-auto/types`.
- Por qué: Esto asegura que el JSON persistido cumple la estructura esperada y evita casts inseguros sin cambiar la semántica (sigue devolviendo null en fallo).
- Dónde: apps/pt-cli/src/application/context-supervisor.ts
- Aprendido: Mantener el try/catch externo y devolver null preserva el comportamiento previo mientras añade validación fuerte.

2026-04-10 - Reemplazo de cast con validación Zod en readContextStatus

- Qué: En `apps/pt-cli/src/system/context-supervisor.ts` reemplacé `JSON.parse(content) as ContextStatus` por `ContextStatusSchema.parse(...)` importado desde `@cisco-auto/types`.
- Por qué: Añade validación fuerte al leer `context-status.json` y evita que datos corruptos se propaguen; la función sigue devolviendo null en caso de JSON inválido o validación fallida.
- Dónde: apps/pt-cli/src/system/context-supervisor.ts
- Aprendido: Es importante loguear la razón de fallo de validación para diagnóstico (mantener logs cortos y útiles).

2026-04-10 - Reemplazo de casts por validación en history-store

- Qué: En `apps/pt-cli/src/telemetry/history-store.ts` reemplacé los `JSON.parse(...) as HistoryEntry` por `HistoryEntrySchema.parse(...)` con manejo de error para mantener la semántica de fallback (null/[]).
- Por qué: Asegura la integridad de entradas de historial leídas desde disco y evita propagación de datos inválidos.
- Dónde: apps/pt-cli/src/telemetry/history-store.ts
- Aprendido: Validar cada línea del ndjson es más seguro aunque añade algo de CPU; preferible a usar casts inseguros.

2026-04-10 - Reemplazo de cast por validación en session-log-store

- Qué: En `apps/pt-cli/src/telemetry/session-log-store.ts` reemplacé `JSON.parse(line) as SessionLogEvent` por `SessionLogEventSchema.parse(...)` con manejo de errores para ignorar líneas inválidas.
- Por qué: Añade seguridad al procesar ndjson de eventos de sesión y evita que entradas corruptas rompan el store.
- Dónde: apps/pt-cli/src/telemetry/session-log-store.ts
- Aprendido: Mantener la semántica de filtrado (null→filtro) facilita la migración sin cambiar comportamiento observable.
- Por qué: Centralizar la validación evita `as` y permite validar archivos de historial leídos desde disco.
- Dónde: packages/types/src/schemas/history-entry.ts
- Aprendido: Usar `z.record(z.string(), z.unknown())` para campos map-like mantiene compatibilidad con claves dinámicas.

2026-04-11 - Eliminados casts restantes en run-command.ts (flags y resultSummary)

- Qué: Reemplacé los dos casts restantes en el historyEntry de `apps/pt-cli/src/application/run-command.ts`:
  - `flags: options.flags as unknown as Record<string, unknown>` → `flags: Object.fromEntries(Object.entries(options.flags))`
  - `resultSummary: result.data as Record<string, unknown> | undefined` → type guard con `typeof result.data === 'object' && !Array.isArray(result.data)` + `Object.fromEntries(Object.entries(result.data))`
- Por qué: El tipo `Record<string, unknown>` no acepta asignación implícita de tipos con valores concretos (como GlobalFlags) ni de genéricos T. Usar `Object.fromEntries` + `Object.entries` produce `Record<string, any>` que es asignable a `Record<string, unknown>`. El type guard para result.data evita `as object` asegurando que solo se serialicen objetos no-array.
- Dónde: apps/pt-cli/src/application/run-command.ts (líneas 214-218 del historyEntry)
- Aprendido: Cero casts `as` restantes en todo el archivo. `Object.fromEntries(Object.entries(...))` es un patrón seguro para serializar objetos tipados a `Record<string, unknown>` sin assertions. El type guard con `!Array.isArray` es necesario porque Arrays también pasan `typeof === 'object'`.

2026-04-11 - Corregido type assertion en acl.ts

- Qué: Reemplacé los casts `as any` y `as CliResult<T>` en `apps/pt-cli/src/commands/acl.ts` (líneas 91 y 100 originales):
  - `acls as any` → `acls: Parameters<typeof SecurityGenerator.generateACLs>[0]`
  - `as CliResult<{ name: string; type: string; commands: string[] }>` → `createErrorResult<T>(...)` genérico
- Por qué: Usar el tipo inferido del parámetro de `generateACLs` evita el cast a `any`. La función genérica `createErrorResult<T>` (creada en tarea 1) permite retornar el tipo correcto sin cast.
- Dónde: apps/pt-cli/src/commands/acl.ts (líneas 91 y 100)
- Aprendido: Añadir las propiedades faltantes `timeout: null, noTimeout: false` a los objetos `flags: GlobalFlags` en las líneas 74, 144 y 203 del archivo ya que el tipo lo requiere. Corregido `entries: []` a `rules: []` para coincidir con `ACLSpec` del core.
