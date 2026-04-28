# debug cleanup locations

Fecha: Tue Apr 28 14:03:03 -05 2026

## terminal-plan-run-debug locations
```
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:318:        "[terminal-plan-run-debug] submitResult=" +
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:322:        "[terminal-plan-run-debug] submitValue=" +
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:326:        "[terminal-plan-run-debug] isDeferredValue=" +
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:367:          "[terminal-plan-run-debug] ENTER deferred polling ticket=" +
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:382:              "[terminal-plan-run-debug] POLL ticket=" +
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:401:              "[terminal-plan-run-debug] pollValue=" +
```

## native verbose debug locations
```
packages/pt-runtime/src/pt/kernel/execution-engine.ts:655:      "native-tick reason=" +
packages/pt-runtime/src/pt/kernel/execution-engine.ts:741:    jobDebug(job, "native-fallback-enter reason=" + reason);
packages/pt-runtime/src/pt/kernel/execution-engine.ts:744:    jobDebug(job, "native-output-len=" + String(output.length));
packages/pt-runtime/src/pt/kernel/execution-engine.ts:773:      "native-check command=" +
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:327:          expect.stringContaining("native-tick reason=getJob"),
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:328:          expect.stringContaining("native-output-len="),
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:329:          expect.stringContaining("native-check command=\"show version\""),
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:390:          expect.stringContaining("native-tick reason=getJobState"),
```
