# Migration Differences

> Generated: 2026-04-12
> Status: BASELINE DOCUMENTED - Actual comparison pending build completion

## Comparison Approach

When the build pipeline is complete, compare:

### main.js comparison
Compare `generated/main.js.baseline` with new `generated/main.js`:
- Check for PT-unsafe patterns
- Verify kernel functions present: main(), cleanUp(), lease handling
- Verify no business logic in kernel
- Check size difference (kernel should be smaller)

### runtime.js comparison
Compare `generated/runtime.js.baseline` with new `generated/runtime.js`:
- Check for PT-unsafe patterns
- Verify handlers present: configIos, execIos, addDevice, etc.
- Verify no lifecycle management in runtime
- Check DeferredJobPlan construction

### PT-Safety Check
Run the validatePtSafe function on both artifacts:
```typescript
import { validatePtSafe } from "./src/build/validate-pt-safe";
const mainValidation = validatePtSafe(mainJsCode);
const runtimeValidation = validatePtSafe(runtimeJsCode);
```

### Behavioral Comparison
When PT is available, test:
1. Load new main.js in PT
2. Execute a simple command (e.g., addDevice)
3. Verify behavior matches baseline

## Current Status
- Build pipeline scaffolding: DONE
- PT API investigation: PENDING
- Kernel implementation: STUB
- TerminalEngine implementation: STUB
- Actual build generation: PENDING

## Notes
- [Any behavior changes that are intentional]