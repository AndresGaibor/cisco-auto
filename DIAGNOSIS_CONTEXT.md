# Packet Tracer IOS Terminal Capture Issue - Diagnosis Context

## Problem Description
The `pt cmd` (or `pt host exec`) command fails to show output when targeting IOS devices (Switches and Routers), while it works perfectly for PC/Server devices (Host Command Prompt). 

Specifically, on a Switch named `FIE` which is currently experiencing a "log storm" (constant interface flapping messages), the command `pt cmd FIE "show clock"` returns a successful status but with `0 chars captured` and empty output in the CLI.

### Evidence of Failure
```bash
❯ bun run pt cmd FIE "show clock"
⏳ Esperando respuesta de FIE... ¡RECIBIDA!

📟 SALIDA DE CONSOLA (FIE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  (Salida vacía o filtrada por el sistema)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ejecución exitosa (1 eventos, 0 chars capturados)
```

### Evidence of System Working (PC)
```bash
❯ bun run pt cmd PC3 "ipconfig"
📟 SALIDA DE CONSOLA (PC3):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FastEthernet0 Connection:(default port)
... (Correct output) ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ejecución exitosa (4 eventos, 452 chars capturados)
```

---

## Technical Root Cause Analysis

### 1. The Kernel Loop (Packet Tracer C++ / QtScript Environment)
Using `omni raw` (direct access to the native API), we confirmed that the device **DOES** have output in its buffer and **DOES** respond to commands.

**Direct Inspection Result:**
```javascript
// omni raw command:
(function() {
    var cli = ipc.network().getDevice('FIE').getCommandLine();
    cli.enterCommand('show clock');
    cli.enterChar(13, 0);
    var t0 = Date.now(); while(Date.now() - t0 < 1000) {}
    return cli.getOutput();
})()

// Result:
"show clock
*11:5:47.660 UTC Sun Mar 7 1993
SW-FIE>
SW-FIE>"
```
**Conclusion:** The native `getOutput()` and `enterCommand()` methods work. The issue is in the TypeScript framework layers that wrap these calls.

### 2. The Chain of Failure
1.  **CLI (`apps/pt-cli/src/commands/host.ts`)**: Calls `controller.execIos`.
2.  **Service (`packages/pt-control/src/application/services/ios-execution-service.ts`)**: Orchestrates the terminal plan.
3.  **Adapter (`packages/pt-control/src/adapters/runtime-terminal-adapter.ts`)**: Sends the command via FileBridge and waits for the JSON result.
4.  **Runtime Handler (`packages/pt-runtime/src/handlers/ios-execution.ts`)**: Receives the payload and invokes `CommandExecutor`.
5.  **Execution Engine (`packages/pt-runtime/src/terminal/command-executor.ts`)**: **CRITICAL LAYER.**
    *   Attempts to register events (`outputWritten`, `commandEnded`).
    *   Sends the command.
    *   Has a polling timer (250ms) to capture raw output as fallback.
    *   Uses `stripBaselineOutput` to subtract historical text.
    *   Uses `sanitizeCommandOutput` to clean noise.

### 3. Identified Bugs & Fixes Attempted
*   **ReferenceError:** `registryEnsureSession is not defined` was crashing the kernel loop. Fixed by using the correct import `ensureSession`.
*   **Property Mapping:** The CLI was looking for `execResult.raw` but the service was returning `execResult.output`. Fixed by aligning the contracts.
*   **Aggressive Stripping:** `stripBaselineOutput` was using `lastIndexOf` on common strings (like syslog lines), which caused it to delete the *entire* buffer if a log message from the past was repeated during command execution.
*   **Event Handling:** IOS devices under high load (log storms) sometimes drop `outputWritten` events or fire them out of order.

---

## Involved Files (Full Context)

### 1. `packages/pt-runtime/src/terminal/command-executor.ts`
This is the heart of the execution. It handles the state machine.
```typescript
// (Snippet of the current 'finalize' logic)
      function finalize(cmdOk: boolean, status: number, error?: string, code?: TerminalErrorCode): void {
        // ... (Cleanup and timing)
        const bufferedOutput = outputBuffer.join("");
        const liveOutput = readTerminalOutput(terminal);
        
        var rawOutput = (bufferedOutput.length > 0) ? bufferedOutput : liveOutput;

        // IOS Protection: Skip stripping if output is massive (log flood)
        const newRawOutput = (session.sessionKind === "ios" && rawOutput.length > 5000) 
            ? rawOutput 
            : stripBaselineOutput(rawOutput, baselineOutput);

        const output = sanitizeCommandOutput(newRawOutput);
        // ... (Result resolution)
      }
```

### 2. `packages/pt-runtime/src/terminal/prompt-detector.ts`
Handles reading from the native `terminal` object.
```typescript
export function readTerminalOutput(terminal: any): string {
  try {
    const methods = ["getAllOutput", "getBuffer", "getOutput", "getText", "readAll", "read"];
    let raw = "";
    for (var m of methods) {
      if (typeof terminal[m] === "function") {
        var out = terminal[m]();
        if (out) { raw = out; break; }
      }
    }
    // ... (Nested consoleObj check)
    return sanitizeOutput(raw);
  } catch(e) { return ""; }
}
```

### 3. `packages/pt-runtime/src/terminal/command-sanitizer.ts`
Cleans the text.
```typescript
export function sanitizeCommandOutput(raw: string): string {
  if (!raw) return "";
  // Process backspaces manually
  let processed = "";
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === BACKSPACE_CHAR) { processed = processed.slice(0, -1); }
    else { processed += raw[i]; }
  }
  return processed.replace(BELL_RE, "").replace(ANSI_ESCAPE_RE, "").trim();
}
```

### 4. `packages/pt-control/src/adapters/runtime-terminal-adapter.ts`
The bridge between the Node environment (CLI) and the Packet Tracer JS environment.
```typescript
// (Snippet of property extraction)
      const res = bridgeResult?.value ?? bridgeResult ?? {};
      const raw = String(res.output ?? res.raw ?? "");
      // ...
      aggregatedOutput += raw;
```

---

## Current Status
Even with ReferenceErrors fixed and direct capture enabled, `pt cmd FIE` reports `0 chars captured`. 

**The main suspect is the `outputPollTimer` or the communication between the kernel's `onOutput` and the final `outputBuffer`.**

### Hypothesis: Buffer Volatility or Stale References
1.  **Closure Capture:** The `RuntimeApi` captures the `CommandLine` object once during `getDeviceByName`. If Packet Tracer replaces this object or if its buffer is session-scoped, the kernel might be holding a "dead" reference while the real output goes to a new instance.
2.  **Property Name Mismatch:** Although `getOutput` exists, some PT versions might require `getBuffer` or `readAll`.
3.  **Sanitizer Collision:** The regex `/\x1B\[[0-9;]*[a-zA-Z]/g` or `/[^\x20-\x7E\r\n\t]/g` might be too aggressive if the log storm contains extended characters.

---

## Complete Source Code for Reference

### 1. `packages/pt-runtime/src/terminal/command-executor.ts`
(See attached file in the repository for the full version. Key logic for IOS is in `runExecutionFlowSync` and `finalize`).

### 2. `packages/pt-runtime/src/handlers/ios-execution.ts`
This handler is the entry point for IOS commands.
```typescript
export async function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): Promise<PtResult> {
  const deviceName = payload.device;
  const terminal = getTerminalDevice(api, deviceName);
  // ...
  const execResult = await executor.executeCommand(deviceName, payload.command, terminal, options);
  // ...
  return createSuccessResult({
      output: sanitized,
      raw: raw,
      parsed: { events: execResult.events, ... }
  });
}
```

### 3. `packages/pt-control/src/adapters/runtime-terminal-adapter.ts`
The aggregate layer.
```typescript
      const res = bridgeResult?.value ?? bridgeResult ?? {};
      const raw = String(res.output ?? res.raw ?? "");
      // ...
      aggregatedOutput += raw;
```

---

## Steps to Reproduce
1.  Open a Packet Tracer lab with a Switch (e.g. 2960).
2.  Trigger a log flood (e.g. creating a loop or flapping a Port-channel).
3.  Run `bun run pt cmd <device> "show clock"`.
4.  Observe that output is empty despite the command succeeding.
