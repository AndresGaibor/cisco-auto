# Learnings: pt-control-v2-refactor

## Wave 1 Task Decomposition (Session: 2026-03-28)

### Rationale for decomposition

**Granularidad elegida**: Cada task del plan se descompuso en subtareas a nivel de archivo específico.

- T1 (Tipos logging): 3 subtareas — types.ts, index.ts, QA verification
- T2 (LogManager): 5 subtareas — log-manager.ts, directorio logs, update index.ts, 2 QA scenarios
- T3 (Tipos topology): 3 subtareas — types.ts, index.ts export, QA verification
- T4 (Destructive actions): 3 subtareas — destructive-actions.ts, 2 QA scenarios
- T5 (Confirmation helpers): 3 subtareas — confirmation.ts, index.ts, QA no-TTY

**Decisiones de descomposición**:

1. **Separación QA como subtarea独立的**: Cada QA scenario se treató como subtarea verificable, no solo como nota. Esto permitetrackear evidencia.

2. **Dependencies explícitas**: T2 bloqueada por T1 (necesita tipos), T5 bloqueada por T4 (necesita isDestructive).

3. **Directorios deben crearse**: .sisyphus/logs/ necesita existir antes de que LogManager pueda escribir.

4. **index.ts como punto de entrada**: Cada módulo tiene su index.ts para re-exports — patrón consistente con el resto del codebase.

### Pattern observado del plan

- Tasks 1-5 son "quick" category, todos paralelizables en Wave 1
- Critical path: T1 → T2 → T6 → T9 → T15 → T18
- Cada task tiene QA Scenarios específicos con evidencia a guardar en .sisyphus/evidence/

### Archivos a crear en Wave 1

```
packages/pt-control-v2/src/logging/
├── types.ts          (T1)
├── log-manager.ts    (T2)
└── index.ts          (T1+T2 exports)

packages/pt-control-v2/src/autonomy/
├── destructive-actions.ts  (T4)
├── confirmation.ts         (T5)
└── index.ts                (T4+T5 exports)

packages/topology/src/
└── types.ts (update, T3)
```

### Nota sobre verification commands

Los commands de verification en el JSON usan `&&` para encadenar ejecución + verificación, pero en la práctica el output se guarda en archivos de evidencia. El verification command real es la parte antes del `&&`.
