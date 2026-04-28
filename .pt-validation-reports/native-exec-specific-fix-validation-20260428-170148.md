# native exec specific fix validation

Fecha: Tue Apr 28 17:01:48 -05 2026

## grep forbidden methods in native handler
```
```

## grep native handler key fixes
```
156:async function wakeTerminal(term: PTTerminal, timeoutMs: number): Promise<void> {
179:async function ensurePrivilegedIfNeeded(term: PTTerminal, command: string): Promise<boolean> {
180:  await wakeTerminal(term, 1800);
299:  await wakeTerminal(term, 1800);
302:  const privilegedOk = await ensurePrivilegedIfNeeded(term, command);
307:      code: "NATIVE_EXEC_PRIVILEGE_REQUIRED",
326:        statusCode: 1,
408:      code: "NATIVE_EXEC_IOS_ERROR",
423:        statusCode: 1,
450:        statusCode: 1,
474:      statusCode: 0,
```
