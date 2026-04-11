# Plan: Eliminar Type Assertions `as`

## TL;DR

> **Objetivo**: Corregir todos los `as` type assertions en el codebase para que TypeScript/linter muestre errores apropiados en lugar de silenciarlos.
>
> **Entregables**:
> - `createErrorResult<T>()` genérico
> - Schemas Zod para validación de JSON.parse
> - Todos los archivos TypeScript sin `as` problemáticos
>
> **Esfuerzo estimado**: Medium (~100 cambios en ~50 archivos)
> **Ejecución paralela**: SÍ - 5 waves
> **Camino crítico**: Wave 1 → Wave 2 → Wave 3 → Wave 4 → Wave 5

---

## Contexto

### Solicitud Original
"Corrige todos los 'as', para que TypeScript si hay error salte el linter"

### Resumen de Entrevista
- **Alcance**: Todos los type assertions problemáticos (NO `as const` que es válido)
- **Tests**: Incluir archivos de test en correcciones
- **Exclusiones**: Mantener `as const` para constantes literales

### Análisis realizado
- ~208 ocurrencias de `as` en archivos `.ts`
- Patrones principales:
  1. `createErrorResult()` no genérico → 30+ casts `as CliResult<T>`
  2. `JSON.parse()` sin validación → 15+ casts
  3. `as any` para acceso a propiedades
  4. `as unknown as T` doble casting
  5. Casts en parseo de datos externos

### Patrones a preservar (NO eliminar)
- `as const` - válido para constantes literales
- Type guards necesarios donde TS no puede inferir
- Narrowing manual en casos justificados

---

## Objectivos de Trabajo

### Objetivo Principal
Eliminar todos los type assertions problemáticos, reemplazándolos con tipado adecuado:
1. Hacer `createErrorResult<T = never>` genérico
2. Crear schemas Zod para validación de `JSON.parse`
3. Usar tipos correctos en lugar de `as any`
4. Eliminar dobles casts `as unknown as T`

### Entregables Concretos
- `cli-result.ts` con función genérica
- Schemas Zod nuevos en `packages/types/src/schemas/`
- ~50 archivos TypeScript corregidos
- Tests actualizados

### Definition of Done
- [ ] `bun run typecheck` pasa sin errores
- [ ] `bun run lint` pasa sin errores relacionados a `@typescript-eslint/no-explicit-any` o `@typescript-eslint/consistent-type-assertions`
- [ ] Todos los tests pasan: `bun test`
- [ ] No hay cambios funcionales (mismo comportamiento)

### Must Have
- Todos los `as Type` eliminados (excepto `as const`)
- `createErrorResult<T>()` genérico funcionando
- Schemas Zod para validación de JSON

### Must NOT Have (Guardrails de Metis)
- No cambiar comportamiento funcional
- No tocar archivos generados/vendorizados
- No introducir refactors no relacionados
- No usar `any` como escape
- No reemplazar casts por escapes similares

---

## Estrategia de Verificación

### Test Decision
- **Infraestructura existe**: SÍ (`bun test`)
- **Tests automatizados**: Tests-after (ejecutar al final para verificar)
- **Framework**: `bun test`
- **Cobertura**: Tests existentes deben pasar

### QA Policy
Cada tarea incluye escenarios de QA ejecutados por agente:
- **TypeScript**: `bun run typecheck` - verificar sin errores
- **Linter**: `bun run lint` - verificar sin warnings de type assertions
- **Tests**: `bun test` - verificar que todos pasan
- **Build**: `bun run build` - verificar que compila

---

## Estrategia de Ejecución

### Oleadas de Ejecución Paralela

```
Wave 1 (Fundación - iniciar primero):
├── Task 1: Hacer createErrorResult genérico [quick]
├── Task 2: Crear schema Zod para ContextStatus [quick]
├── Task 3: Crear schema Zod para HistoryEntry [quick]
├── Task 4: Crear schema Zod para SessionLogEvent [quick]
└── Task 5: Crear schema Zod para LockInfo [quick]

Wave 2 (Core - después de Wave 1):
├── Task 6: Corregir JSON.parse en context-supervisor.ts [quick]
├── Task 7: Corregir JSON.parse en system/context-supervisor.ts [quick]
├── Task 8: Corregir JSON.parse en history-store.ts [quick]
├── Task 9: Corregir JSON.parse en session-log-store.ts [quick]
├── Task 10: Corregir JSON.parse en doctor.ts [quick]
├── Task 11: Eliminar as CliResult<T> en apply-and-verify.ts [quick]
├── Task 12: Eliminar as CliResult<T> en run-command.ts [quick]
└── Task 13: Eliminar as en post-validate-topology.ts [quick]

Wave 3 (Commands - después de Wave 2):
├── Task 14: Corregir type assertions en commands/acl.ts [unspecified-low]
├── Task 15: Corregir type assertions en commands/config-*.ts [unspecified-low]
├── Task 16: Corregir type assertions en commands/device/*.ts [unspecified-low]
├── Task 17: Corregir type assertions en commands/history.ts [unspecified-low]
├── Task 18: Corregir type assertions en commands/lab/*.ts [unspecified-low]
├── Task 19: Corregir type assertions en commands/logs.ts [unspecified-low]
├── Task 20: Corregir type assertions en commands/results.ts [unspecified-low]
└── Task 21: Corregir type assertions en commands/router/*.ts [unspecified-low]

Wave 4 (Otros módulos - después de Wave 3):
├── Task 22: Corregir type assertions en telemetry/*.ts [quick]
├── Task 23: Corregir type assertions en utils/*.ts [quick]
├── Task 24: Corregir type assertions en contextual-suggestions.ts [quick]
├── Task 25: Corregir type assertions en system-context-service.ts [quick]
└── Task 26: Corregir type assertions en parse.ts, completion.ts [quick]

Wave 5 (Tests y verificación final - después de Wave 4):
├── Task 27: Corregir type assertions en archivos .test.ts [unspecified-low]
├── Task 28: Corregir type assertions en exhaustive-pt-test.ts [quick]
├── Task 29: Corregir type assertions en packages/core/ [quick]
└── Task FINAL: Verificación completa [deep]

Camino Crítico: Wave 1 → Wave 2 → Wave 3 → Wave 4 → Wave 5
Speedup Paralelo: ~60% más rápido que secuencial
Max Concurrent: 8 tareas en Wave 3
```

### Matriz de Dependencias (todas las tareas)

- **T1-T5**: Sin dependencias (pueden empezar inmediatamente)
- **T6**: depende de T2 (schema ContextStatus)
- **T7**: depende de T2 (schema ContextStatus)
- **T8**: depende de T3 (schema HistoryEntry)
- **T9**: depende de T4 (schema SessionLogEvent)
- **T10**: depende de T5 (schema LockInfo)
- **T11**: depende de T1 (createErrorResult genérico)
- **T12**: depende de T1 (createErrorResult genérico)
- **T13**: Sin dependencias
- **T14-T26**: depende de T1 (createErrorResult genérico)
- **T27**: depende de todos los schemas y createErrorResult
- **T28**: Sin dependencias
- **T29**: Sin dependencias
- **FINAL**: depende de T1-T29 (verificación completa)

---

## TODOs

- [x] 1. Hacer `createErrorResult<T = never>` genérico

  **What to do**:
  - Modificar `apps/pt-cli/src/contracts/cli-result.ts`
  - Cambiar `createErrorResult(action: string, error: CliError): CliResult` a `createErrorResult<T = never>(action: string, error: CliError): CliResult<T>`
  - Esto elimina la necesidad de `as CliResult<T>` en ~30+ lugares

  **Must NOT do**:
  - No cambiar el comportamiento de la función
  - No afectar los tipos de retorno existentes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Parallelization**: Puede ejecutarse en paralelo con Tasks 2-5

  **QA Scenarios**:
  ```
  Scenario: Typecheck pasa después del cambio
    Tool: Bash
    Steps:
      1. cd /Users/andresgaibor/code/javascript/cisco-auto
      2. bun run typecheck
    Expected Result: No errors related to CliResult or createErrorResult
    Evidence: .sisyphus/evidence/task-01-typecheck.txt

  Scenario: Existing tests still pass
    Tool: Bash
    Steps:
      1. bun test apps/pt-cli/src/contracts/cli-result.test.ts (si existe)
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-01-tests.txt
  ```

  **Commit**: SÍ (Wave 1)
  - Message: `refactor(types): make createErrorResult generic`
  - Files: `apps/pt-cli/src/contracts/cli-result.ts`

- [x] 2. Crear schema Zod para `ContextStatus`

  **What to do**:
  - Crear archivo `packages/types/src/schemas/context-status.ts`
  - Definir schema Zod que valide la estructura de `ContextStatus`
  - Exportar schema y tipo inferido

  **Must NOT do**:
  - No crear tipos nuevos, solo validar existentes
  - No cambiar interfaces existentes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Parallelization**: Puede ejecutarse en paralelo con Tasks 1, 3-5

  **References**:
  - `apps/pt-cli/src/contracts/context-status.ts:ContextStatus` - interfaz a validar

  **QA Scenarios**:
  ```
  Scenario: Schema valida objeto válido
    Tool: Bun
    Steps:
      1. Importar schema
      2. Crear objeto ContextStatus válido
      3. Ejecutar schema.parse(obj)
    Expected Result: No errors, retorna objeto validado
    Evidence: .sisyphus/evidence/task-02-schema-valid.txt

  Scenario: Schema rechaza objeto inválido
    Tool: Bun
    Steps:
      1. Importar schema
      2. Crear objeto sin campos requeridos
      3. Ejecutar schema.parse(obj)
    Expected Result: ZodError thrown
    Evidence: .sisyphus/evidence/task-02-schema-invalid.txt
  ```

  **Commit**: SÍ (Wave 1 junto con Tasks 3-5)

- [x] 3. Crear schema Zod para `HistoryEntry`

  **What to do**:
  - Crear archivo `packages/types/src/schemas/history-entry.ts`
  - Definir schema Zod que valide la estructura de `HistoryEntry`
  - Exportar schema y tipo inferido

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Parallelization**: Puede ejecutarse en paralelo con Tasks 1-2, 4-5

  **References**:
  - `apps/pt-cli/src/contracts/history-entry.ts:HistoryEntry` - interfaz a validar

  **Commit**: SÍ (Wave 1)

- [x] 4. Crear schema Zod para `SessionLogEvent`

  **What to do**:
  - Crear archivo `packages/types/src/schemas/session-log-event.ts`
  - Definir schema Zod que valide la estructura de `SessionLogEvent`
  - Exportar schema y tipo inferido

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Parallelization**: Puede ejecutarse en paralelo con Tasks 1-3, 5

  **References**:
  - Buscar interfaz `SessionLogEvent` con code-index

  **Commit**: SÍ (Wave 1)

- [x] 5. Crear schema Zod para `LockInfo`

  **What to do**:
  - Crear archivo `packages/types/src/schemas/lock-info.ts`
  - Definir schema Zod que valide la estructura de `LockInfo`
  - Exportar schema y tipo inferido

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Parallelization**: Puede ejecutarse en paralelo con Tasks 1-4

  **References**:
  - `apps/pt-cli/src/system/context-supervisor-lock.ts:LockInfo` - interfaz a validar

  **Commit**: SÍ (Wave 1)

- [x] 6. Corregir JSON.parse en `context-supervisor.ts`

  **What to do**:
  - Importar schema `ContextStatus` creado en Task 2
  - Reemplazar `JSON.parse(content) as ContextStatus` por `ContextStatusSchema.parse(JSON.parse(content))`
  - Manejar errores de validación Zod apropiadamente

  **Must NOT do**:
  - No cambiar la firma de la función
  - No silenciar errores de validación

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Dependencies**: Task 2 (schema ContextStatus)

  **References**:
  - `apps/pt-cli/src/application/context-supervisor.ts:85` - línea a corregir

  **QA Scenarios**:
  ```
  Scenario: JSON válido se parsea correctamente
    Tool: Bun
    Steps:
      1. Crear JSON válido de ContextStatus
      2. Llamar loadContextStatus()
    Expected Result: Retorna ContextStatus válido
    Evidence: .sisyphus/evidence/task-06-valid-json.txt

  Scenario: JSON inválido lanza error
    Tool: Bun
    Steps:
      1. Crear JSON con campos faltantes
      2. Llamar loadContextStatus()
    Expected Result: ZodError o null según implementación
    Evidence: .sisyphus/evidence/task-06-invalid-json.txt
  ```

  **Commit**: SÍ (Wave 2)

- [x] 7. Corregir JSON.parse en `system/context-supervisor.ts`

  **What to do**:
  - Importar schema `ContextStatus`
  - Reemplazar `JSON.parse(content) as ContextStatus` por validación Zod
  - Línea 43 en el archivo

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Dependencies**: Task 2 (schema ContextStatus)

  **References**:
  - `apps/pt-cli/src/system/context-supervisor.ts:43`

  **Commit**: SÍ (Wave 2)

- [x] 8. Corregir JSON.parse en `history-store.ts`

  **What to do**:
  - Importar schema `HistoryEntry`
  - Reemplazar todos los `JSON.parse(...) as HistoryEntry` por validación Zod
  - Líneas 56, 93, 107

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Dependencies**: Task 3 (schema HistoryEntry)

  **References**:
  - `apps/pt-cli/src/telemetry/history-store.ts:56,93,107`

  **Commit**: SÍ (Wave 2)

- [x] 9. Corregir JSON.parse en `session-log-store.ts`

  **What to do**:
  - Importar schema `SessionLogEvent`
  - Reemplazar `JSON.parse(line) as SessionLogEvent` por validación Zod
  - Línea 64

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Dependencies**: Task 4 (schema SessionLogEvent)

  **References**:
  - `apps/pt-cli/src/telemetry/session-log-store.ts:64`

  **Commit**: SÍ (Wave 2)

- [x] 10. Corregir JSON.parse en `doctor.ts`

  **What to do**:
  - Importar schema `LockInfo`
  - Reemplazar `JSON.parse(content) as LockInfo` por validación Zod
  - Línea 295

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Dependencies**: Task 5 (schema LockInfo)

  **References**:
  - `apps/pt-cli/src/commands/doctor.ts:295`

  **Commit**: SÍ (Wave 2)

- [x] 11. Eliminar `as CliResult<T>` en `apply-and-verify.ts`

  **What to do**:
  - Eliminar casts en líneas 33 y 76
  - `createErrorResult` ahora retorna `CliResult<T>` genérico
  - Verificar que TypeScript infiere correctamente

  **Must NOT do**:
  - No cambiar otros aspectos del código

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **References**:
  - `apps/pt-cli/src/application/apply-and-verify.ts:33,76`

  **QA Scenarios**:
  ```
  Scenario: Typecheck pasa sin casts
    Tool: Bash
    Steps:
      1. cd /Users/andresgaibor/code/javascript/cisco-auto
      2. bun run typecheck
    Expected Result: No errors in apply-and-verify.ts
    Evidence: .sisyphus/evidence/task-11-typecheck.txt

  Scenario: Tests de apply-and-verify pasan
    Tool: Bash
    Steps:
      1. bun test apps/pt-cli/src/application/apply-and-verify.test.ts (si existe)
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-11-tests.txt
  ```

  **Commit**: SÍ (Wave 2)

- [x] 12. Eliminar `as CliResult<T>` en `run-command.ts`

  **What to do**:
  - Eliminar casts en líneas 127, 142
  - También corregir líneas 213, 215 con mejor tipado
  - Línea 213: usar tipo correcto para `flags`
  - Línea 215: verificar si `result.data` necesita cast

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **References**:
  - `apps/pt-cli/src/application/run-command.ts:127,142,213,215`

  **Commit**: SÍ (Wave 2)

- [x] 13. Eliminar `as` en `post-validate-topology.ts`

  **What to do**:
  - Línea 38: Eliminar `as Array<any>`
  - Usar tipo correcto para `snapshot.links`
  - Investigar qué tipo retorna `Object.values()` y tiparlo correctamente

  **Must NOT do**:
  - No usar `any` como escape

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Parallelization**: Puede ejecutarse en paralelo con Tasks 6-12

  **References**:
  - `apps/pt-cli/src/application/post-validate-topology.ts:38`

  **Commit**: SÍ (Wave 2)

- [x] 14. Corregir type assertions en `commands/acl.ts`

  **What to do**:
  - Línea 91: Eliminar `as any` en `SecurityGenerator.generateACLs(acls as any)`
  - Línea 99: Eliminar `as CliResult<{ name: string; type: string; commands: string[] }>`
  - Usar `createErrorResult<T>` genérico

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **Commit**: SÍ (Wave 3)

- [ ] 15. Corregir type assertions en `commands/config-*.ts`

  **What to do**:
  - Archivos: `config-acl.ts`, `config-apply.ts`, `config-bgp.ts`, `config-eigrp.ts`, `config-interface.ts`, `config-ios.ts`, `config-ospf.ts`, `config-vlan.ts`
  - Eliminar todos los `as CliResult<T>` después de `createErrorResult`
  - Eliminar `as CliResult<ConfigIOSResult>` en config-ios.ts

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **References**:
  - Buscar patrones con: `grep -n ") as CliResult" apps/pt-cli/src/commands/config-*.ts`

  **Commit**: SÍ (Wave 3)

- [ ] 16. Corregir type assertions en `commands/device/*.ts`

  **What to do**:
  - `device/get.ts`: Línea 146 eliminar `as CliResult<DeviceGetResult>`
  - `device/interactive.ts`: Líneas 65, 99, 186 corregir `as ToolResult<T>`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **Commit**: SÍ (Wave 3)

- [ ] 17. Corregir type assertions en `commands/history.ts`

  **What to do**:
  - Líneas 226, 312, 436, 445, 494, 508, 572, 580, 601: eliminar `as CliResult<T>`
  - Todas son retornos de funciones que pueden usar generics

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **Commit**: SÍ (Wave 3)

- [ ] 18. Corregir type assertions en `commands/lab/*.ts`

  **What to do**:
  - `lab/lift.ts`: Líneas 523, 628, 637, 641 eliminar `as CliResult<LiftResult>`
  - `lab/pipeline.ts`: Líneas 67, 112 corregir `as ToolResult<T>`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **Commit**: SÍ (Wave 3)

- [ ] 19. Corregir type assertions en `commands/logs.ts`

  **What to do**:
  - Líneas 446-448: `(entry.session_id ?? entry.sessionId ?? '') as string` - estos casts son necesarios, investigar si se pueden mejorar
  - Líneas 243, 464, 555, 560, 607-619: revisar cada caso individualmente
  - Línea 607: `JSON.parse(line) as Record<string, unknown>` - usar validación

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Commit**: SÍ (Wave 3)

- [ ] 20. Corregir type assertions en `commands/results.ts`

  **What to do**:
  - Líneas 138, 165, 238, 292, 314, 368, 386: eliminar `as CliResult<T>`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **Commit**: SÍ (Wave 3)

- [ ] 21. Corregir type assertions en `commands/router/*.ts`

  **What to do**:
  - `router/add.ts`: Líneas 187, 192, 200 eliminar `as unknown as CliResult<RouterAddResult>`
  - Nota: este es doble casting `as unknown as T` - una vez corregido createErrorResult genérico, estos deben funcionar directamente

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **Commit**: SÍ (Wave 3)

- [ ] 22. Corregir type assertions en `telemetry/*.ts`

  **What to do**:
  - `bundle-writer.ts`: Líneas 155, 158, 172 - corregir casts de `redactObject(...)`
  - `run-traced-pt-command.ts`: Líneas 231, 252, 312 - revisar casts de `CommandTraceEntry[]` y `Record<string, unknown>`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Commit**: SÍ (Wave 4)

- [ ] 23. Corregir type assertions en `utils/*.ts`

  **What to do**:
  - `cli-parser.ts`: Línea 123 - `parts[0]!.toLowerCase() as 'permit' | 'deny'` - usar const assertion o enum
  - `device-utils.ts`: Línea 45 - `as DeviceState[]` - verificar tipo de retorno

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Commit**: SÍ (Wave 4)

- [ ] 24. Corregir type assertions en `contextual-suggestions.ts`

  **What to do**:
  - Línea 7: Eliminar `(result as any).verification`
  - `result` ya tiene tipo `CliResult` que incluye `verification` en su interfaz
  - Usar acceso directo: `result.verification`

  **Must NOT do**:
  - No silenciar errores con tipos incorrectos

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **References**:
  - `apps/pt-cli/src/application/contextual-suggestions.ts:7`
  - `apps/pt-cli/src/contracts/cli-result.ts:CliResult` - interfaz con verification

  **Commit**: SÍ (Wave 4)

- [ ] 25. Corregir type assertions en `system-context-service.ts`

  **What to do**:
  - Línea 35: `return sys as SystemContextSummary`
  - Investigar si `sys` tiene el tipo correcto o necesita conversión
  - Si es necesario, crear una función de conversión tipada

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Commit**: SÍ (Wave 4)

- [ ] 26. Corregir type assertions en `parse.ts` y `completion.ts`

  **What to do**:
  - `parse.ts`: Línea 101 - `as ConnectionSpec['cableType']` - investigar si el tipo es correcto
  - `completion.ts`: Línea 240 - `shell.toLowerCase() as ShellType` - usar const assertion o enum

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Commit**: SÍ (Wave 4)

- [ ] 27. Corregir type assertions en archivos `.test.ts`

  **What to do**:
  - Buscar todos los archivos `*.test.ts` con `as`
  - Corregir casts innecesarios en tests
  - Mantener mocks tipados correctamente

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **References**:
  - Buscar con: `grep -rn ") as" apps/pt-cli/__tests__/ | grep -v "as const"`

  **Commit**: SÍ (Wave 5)

- [ ] 28. Corregir type assertions en `exhaustive-pt-test.ts`

  **What to do**:
  - Líneas 177, 196, 214, 231, 249, 266, 284, 782, 795, 866: `as number`
  - `getPTDeviceType()` ya retorna `number`, el cast es innecesario
  - Eliminar todos los `as number`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **References**:
  - `./exhaustive-pt-test.ts:177,196,214,...`

  **Commit**: SÍ (Wave 5)

- [ ] 29. Corregir type assertions en `packages/core/`

  **What to do**:
  - `packages/core/src/config/loader.ts`: Línea 16
  - `yaml.load(content) as Partial<CiscoAutoConfig>` - usar schema Zod para validar config

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Commit**: SÍ (Wave 5)

- [ ] 30. Verificar `vlan.ts` type assertions

  **What to do**:
  - Líneas 172, 188, 365: eliminar `as CliResult<VlanCreateResult | VlanTrunkResult>`
  - Usar `createErrorResult<T>` genérico

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Dependencies**: Task 1 (createErrorResult genérico)

  **Commit**: SÍ (Wave 5)

- [ ] F1. Plan Compliance Audit

  **What to do**:
  - Verificar que todos los `as` problemáticos fueron eliminados
  - Buscar patrones `as` con grep: `grep -rn ") as" apps/ packages/ | grep -v "as const"`
  - Confirmar que `as const` se preservó
  - Revisar que no se introdujeron `any` nuevos

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **QA Scenarios**:
  ```
  Scenario: No quedan type assertions problemáticos
    Tool: Bash
    Steps:
      1. grep -rn ") as" --include="*.ts" apps/ packages/ | grep -v "as const" | wc -l
    Expected Result: 0 o muy pocos (justificados)
    Evidence: .sisyphus/evidence/final-01-no-assertions.txt

  Scenario: as const se preservó
    Tool: Bash
    Steps:
      1. grep -rn "as const" --include="*.ts" apps/ packages/ | wc -l
    Expected Result: Mismo número que antes
    Evidence: .sisyphus/evidence/final-02-as-const-preserved.txt
  ```

- [ ] F2. Calidad de Código

  **What to do**:
  - Ejecutar `bun run typecheck` y verificar sin errores
  - Ejecutar `bun run lint` y verificar sin warnings de type assertions
  - Confirmar que no hay `@typescript-eslint/no-explicit-any` warnings

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **QA Scenarios**:
  ```
  Scenario: Typecheck pasa
    Tool: Bash
    Steps:
      1. cd /Users/andresgaibor/code/javascript/cisco-auto
      2. bun run typecheck
    Expected Result: Exit code 0, no errors
    Evidence: .sisyphus/evidence/final-03-typecheck-passes.txt

  Scenario: Lint pasa sin warnings de assertions
    Tool: Bash
    Steps:
      1. bun run lint
    Expected Result: Exit code 0, no warnings
    Evidence: .sisyphus/evidence/final-04-lint-passes.txt
  ```

- [ ] F3. Tests Funcionales

  **What to do**:
  - Ejecutar `bun test` completo
  - Verificar que todos los tests pasan
  - Confirmar que no hay cambios funcionales

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **QA Scenarios**:
  ```
  Scenario: Todos los tests pasan
    Tool: Bash
    Steps:
      1. cd /Users/andresgaibor/code/javascript/cisco-auto
      2. bun test
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/final-05-all-tests-pass.txt
  ```

- [ ] F4. Scope Fidelity Check

  **What to do**:
  - Comparar git diff con plan
  - Verificar que solo se tocaron `as` assertions
  - Confirmar que no se introdujeron refactors no relacionados
  - Revisar que `as const` se preservó

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **QA Scenarios**:
  ```
  Scenario: Git diff coincide con plan
    Tool: Bash
    Steps:
      1. git diff --stat
      2. Verificar que solo hay cambios en archivos listados
    Expected Result: All changes are in listed files
    Evidence: .sisyphus/evidence/final-06-git-diff-scope.txt

  Scenario: No hay refactors no relacionados
    Tool: Bash
    Steps:
      1. git diff | grep -E "^\+" | grep -v "as" | head -20
    Expected Result: Cambios mínimos fuera de type assertions
    Evidence: .sisyphus/evidence/final-07-no-unrelated-changes.txt
  ```

---

## Verificación Final (Obligatoria)

> 4 agentes de revisión en PARALELO. TODOS deben aprobar.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verificar que todos los `as` problemáticos fueron eliminados. Buscar patrones `as` con grep/ast-grep. Confirmar que `as const` se preservó. Revisar que no se introdujeron `any` nuevos.

- [ ] F2. **Calidad de Código** — `unspecified-high`
  Ejecutar `bun run typecheck` y `bun run lint`. Verificar que no hay errores de tipo. Confirmar que no hay warnings de `@typescript-eslint/no-explicit-any` o `@typescript-eslint/consistent-type-assertions`.

- [ ] F3. **Tests Funcionales** — `unspecified-high`
  Ejecutar `bun test`. Verificar que todos los tests pasan. Confirmar que no hay cambios funcionales. Guardar output como evidencia.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Comparar git diff con plan. Verificar que solo se tocaron `as` assertions. Confirmar que no se introdujeron refactors no relacionados. Revisar que `as const` se preservó.

---

## Estrategia de Commit

- **Wave 1-2**: `refactor(types): hacer createErrorResult genérico y agregar schemas Zod`
- **Wave 3**: `refactor(commands): eliminar type assertions en comandos CLI`
- **Wave 4**: `refactor(modules): eliminar type assertions en módulos restantes`
- **Wave 5**: `refactor(tests): eliminar type assertions en tests`
- **Final**: `chore: verificar tipos y tests tras eliminación de assertions`

---

## Criterios de Éxito

### Comandos de Verificación
```bash
# Verificar que no hay errores de tipo
bun run typecheck

# Verificar que linter no reporta type assertions problemáticos
bun run lint

# Verificar que todos los tests pasan
bun test

# Verificar que no quedan `as` problemáticos (excepto as const)
grep -rn ") as" --include="*.ts" apps/ packages/ | grep -v "as const" | wc -l
# Debe dar 0 o muy pocos resultados
```

### Checklist Final
- [ ] Todos los tests pasan (`bun test`)
- [ ] Typecheck pasa (`bun run typecheck`)
- [ ] Lint pasa (`bun run lint`)
- [ ] No hay `as any` nuevos
- [ ] `createErrorResult<T>()` es genérico
- [ ] JSON.parse usa schemas Zod
- [ ] Tests actualizados y pasando
