# IOS Jobs System Analysis

> Generated: 2026-04-12
> Source: packages/pt-runtime/src/templates/runtime-assembly.ts (lines 37-1268)

## Overview

The IOS Jobs System is a state-machine-based execution engine for running IOS CLI commands on Cisco devices in Packet Tracer. It handles command sequencing, mode transitions (user exec → privileged exec → configuration mode), dialog dismissal (initial config, autoinstall, confirm prompts), and pager/More-- handling. Jobs are created by runtime handlers and executed asynchronously with event-driven progress tracking.

## Key Functions

### createIosJob(type, payload)
Creates a new IOS job and stores it in `IOS_JOBS` global map.

**Parameters:**
- `type`: Job type - `"configIos"` (multiple commands) or `"execIos"` (single command)
- `payload`: Object containing:
  - `device`: Device name (required)
  - `commands`: Array of commands (for configIos)
  - `command`: Single command string (for execIos)
  - `ensurePrivileged`: boolean (default: true) - Whether to enter enable mode
  - `dismissInitialDialog`: boolean (default: true) - Auto-dismiss initial config dialog
  - `commandTimeoutMs`: number (default: 8000) - Timeout per command
  - `stallTimeoutMs`: number (default: 15000) - Stall detection timeout

**Returns:** Job ticket string (e.g., `"ios_job_1"`)

**Job Structure:**
```javascript
{
  ticket: "ios_job_1",
  device: "Router1",
  type: "configIos",
  payload: { commands: [...], device: "Router1" },
  steps: ["interface GigabitEthernet0/0", "ip address 192.168.1.1 255.255.255.0"],
  currentStep: 0,

  phase: "queued",      // Current execution phase
  resumePhase: "",      // Phase to resume after dialog
  resumeStep: 0,        // Step to resume after dialog

  state: "queued",       // Same as phase (duplicated for convenience)
  startedAt: Date.now(),
  updatedAt: Date.now(),
  lastActivityAt: Date.now(),

  output: "",           // Accumulated output
  outputs: [],          // Per-step outputs array
  stepResults: [],      // Detailed results per step

  currentCommand: "",
  currentCommandOutput: "",
  currentCommandStartedAt: 0,

  status: null,         // Last command status
  modeBefore: "",
  modeAfter: "",
  lastMode: "",         // Current IOS mode
  lastPrompt: "",       // Current prompt string

  paged: false,         // --More-- has been displayed
  autoConfirmed: false, // Auto-confirmed a dialog
  dialogDismissAttempts: 0,

  waitingForCommandEnd: false,  // Event-driven flag
  finished: false,
  result: null,
  error: null,
  errorCode: null,

  inFlightPath: "",
  commandId: "",
  seq: 0,

  ensurePrivileged: true,
  dismissInitialDialog: true,
  commandTimeoutMs: 8000,
  stallTimeoutMs: 15000,

  abortSent: false
}
```

### pollIosJob(ticket)
Polls the current state of a job.

**Parameters:**
- `ticket`: Job ticket string

**Returns:**
- `{ done: false, state: job.state }` if job is still running
- `{ done: true, ok: true, value: job.result }` if completed successfully
- `{ done: true, ok: false, error: job.error, code: job.errorCode }` if error

### stepJobForward(job) / issueIosJobPhase(ticket)
Advances the state machine by issuing the next command based on current phase.

**Phase transitions handled:**
1. `ensure-privileged` → sends "enable", transitions to `ensure-config` or `run-exec`
2. `ensure-config` → sends "configure terminal", transitions to `run-config`
3. `run-exec` → sends single exec command, completes job
4. `run-config` → sends next command in steps array, or transitions to `exit-config`
5. `exit-config` → sends "end", transitions to `save-config` or completes
6. `save-config` → sends "write memory", completes job

### startIosJob(ticket)
Initializes and starts a job:
1. Attaches terminal listeners to device
2. Creates job session
3. Extracts steps from payload
4. Determines starting phase based on job type and `ensurePrivileged` flag
5. Calls `issueIosJobPhase()` to begin execution

### checkIosJobTimeouts()
Scans all jobs for stall conditions:
- If `waitingForCommandEnd` and time since `lastActivityAt` exceeds `commandTimeoutMs`
- Sends Ctrl+C (char code 3) via `term.enterChar(3, 0)`
- Sets `abortSent: true` and continues monitoring
- If abort already sent, calls `failIosJob()` with `COMMAND_TIMEOUT`

### failIosJob(ticket, message, code)
Marks job as failed with error details.

### completeIosJob(ticket)
Marks job as successfully completed with result data.

## Job States

1. **`queued`** - Initial state when job is created but not yet started
2. **`waiting-ensure-mode`** - Waiting for privileged exec mode (after "enable" command)
3. **`waiting-command`** - General waiting state during command execution
4. **`waiting-confirm`** - Waiting for confirmation prompt [confirm] to be answered
5. **`waiting-prompt`** - Waiting for specific prompt pattern
6. **`waiting-save`** - Waiting for "write memory" to complete
7. **`waiting-delay`** - Waiting for delay step to complete (delay type)
8. **`completed`** / **`done`** - Job finished successfully
9. **`error`** - Job failed with error

## DeferredStep Types

Source: `packages/pt-runtime/src/runtime/contracts.ts` (lines 50-57)

- **`ensure-mode`** - Ensure device is in specified IOS mode (exec, privileged, config)
- **`command`** - Execute a CLI command
- **`confirm`** - Answer a [confirm] prompt with Enter (default yes)
- **`expect-prompt`** - Wait for a specific prompt pattern to appear
- **`save-config`** - Execute "write memory" to save configuration
- **`delay`** - Wait for specified delay period
- **`close-session`** - Close the terminal session

## PT Events Consumed

Source: `TERMINAL_LISTENERS_TEMPLATE` (lines 196-206)

### Core Events (always attached)
- **`commandStarted`** - Fired when user types a command
  - Updates `job.lastInput`, `job.currentCommand`, `job.lastMode`
  - Sets `job.session.busy = true`
- **`outputWritten`** - Fired when new output appears on terminal
  - Appends to `job.output` and `job.currentCommandOutput`
  - Updates `job.session.outputBuffer` and `job.session.lastOutputTs`
  - Resets `lastActivityAt` if `isDebug === true`
- **`commandEnded`** - Fired when command completes
  - Updates `job.status`, clears `waitingForCommandEnd`
  - Calls `handleTerminalPrompt()` to check for dialogs
  - Processes phase-specific logic (ensure-privileged, run-config, etc.)
- **`modeChanged`** - Fired when IOS mode changes
  - Updates `job.lastMode` and `job.session.currentMode`
- **`promptChanged`** - Fired when prompt changes
  - Updates `job.lastPrompt`
  - Special handling: if not waiting and in `ensure-privileged` phase, re-triggers phase
- **`moreDisplayed`** - Fired when `--More--` appears
  - Auto-advances pager by sending space (char 32)
  - Sets `job.paged = true`

### Optional Events (with try/catch for older PT versions)
- **`directiveSent`** - User sent a directive
- **`commandSelectedFromHistory`** - User selected from command history
- **`commandAutoCompleted`** - Command was auto-completed by terminal
- **`cursorPositionChanged`** - Cursor position changed (indicates dirty line)

## State Machine Transitions

### Config IOS Job Flow
```
queued → ensure-privileged → ensure-config → run-config → exit-config → [save-config] → completed
```

### Exec IOS Job Flow
```
queued → ensure-privileged → run-exec → completed
```

### Dialog Handling Flow
When dialog is detected (initial config, autoinstall, etc.):
1. Save current `phase` and `currentStep` to `resumePhase`/`resumeStep`
2. Send dialog-dismissing command (e.g., "no" for initial dialog)
3. On `commandEnded`, restore phase/step and continue

### Error Handling
- `commandEnded` with status !== 0 → `failIosJob()` with COMMAND_FAILED
- Timeout detection → `failIosJob()` with COMMAND_TIMEOUT
- Enable password prompt → `failIosJob()` with ENABLE_PASSWORD_REQUIRED
- Failed config mode entry → `failIosJob()` with FAILED_TO_ENTER_CONFIG

## Important Implementation Details

1. **Event-driven architecture**: Jobs don't poll; they respond to PT terminal events via registered listeners.

2. **Global state**: `IOS_JOBS` is a global map accessible to all event handlers. Jobs are looked up by iterating all keys and matching `deviceName`.

3. **Session normalization**: `normalizeTerminalSession()` handles edge cases:
   - Setup dialog dismissal
   - Autoinstall dialog handling
   - Pager advancement
   - Dirty line detection and clearing

4. **Resume mechanism**: Dialog dismissal saves `resumePhase`/`resumeStep` so execution can continue after the dialog is dismissed.

5. **Two-phase result building**: `buildIosSuccessResult()` for exec jobs, `buildIosConfigSuccessResult()` for config jobs (aggregates step results).

6. **Terminal policy**: Jobs respect `terminalPolicy` object which can control:
   - `dismissInitialDialog`: false to fail instead of auto-dismiss
   - `terminateAutoinstall`: "yes", "no", or "enter"
   - `autoAdvancePager`: false to fail on paging
   - `failOnExternalInteraction`: true to fail on user input
   - `clearDirtyLine`: false to fail on dirty line

7. **Job sequence**: `IOS_JOB_SEQ` counter generates unique ticket IDs.

## Next Steps for Extraction

Based on the migration plan (docs/plans/2026/04-12-pt-runtime-migration.md):

- [ ] Extract state machine to `pt/kernel/job-state-machine.ts`
  - `setIosJobPhase()`, `issueIosJobPhase()`, `startIosJob()`
  - `failIosJob()`, `completeIosJob()`, `sendIosJobCommand()`
  - `checkIosJobTimeouts()`
  
- [ ] Extract step executor to `pt/kernel/step-executor.ts`
  - `createIosJob()`, `pollIosJob()`
  - DeferredStepType handling logic
  
- [ ] Extract terminal event handlers to `pt/kernel/terminal-event-handlers.ts`
  - All `onTerminal*` functions
  - `attachTerminalListeners()`, `detachTerminalListeners()`
  
- [ ] Define formal `KernelJobState` interface (already in contracts.ts:198-216)
  
- [ ] Create `DeferredStepType` → phase mapping table for cleaner state machine
