// Fase 1: Spec y tipos de plan
export * from './lab-plan-types.js';

// Fase 2: Diff y planner
export * from './lab-diff.js';
export * from './lab-planner.js';
export * from './lab-checks.js';

// Fase 3: Reconciliación y ejecución
export * from './lab-reconciler.js';
export * from './lab-executor.js';

// Fase 4: Reconciliación IOS
export * from './ios-state-observer.js';
export * from './ios-reconciler.js';

// Fase 5: Runtime unificado
export * from './lab-runtime-manager.js';

// Fase 6: Persistencia de progreso
export * from './lab-plan-persistence.js';

// Fase 7: Verificación por capas
export * from './lab-verifier.js';

// Fase 8: Validación PT-safe
export * from './pt-safe-validator.js';

// Fase 9: CLI unificado
export * from './lab-cli.js';
