/**
 * IOS Session Primitives Template (Fase 6)
 * 
 * High-level helpers for managing IOS mode transitions and command execution.
 * These wrap the IosSessionEngine and provide semantic meaning.
 * 
 * Generated into: pt-runtime/src/templates/ios-session-primitives-template.ts
 */

import { IosMode, SessionInfo, IosInteractiveResult, createSuccessResult, createFailedResult } from '@cisco-auto/types';
import { IosSessionEngine, TerminalEvent } from './ios-session-engine-template';

/**
 * Helper to transition to user exec mode
 * Sends 'exit' or 'disable' as needed
 */
export async function ensureUserExec(
  engine: IosSessionEngine,
  executeCommand: (cmd: string) => Promise<string>
): Promise<boolean> {
  const state = engine.getState();
  
  if (state.mode === 'user-exec') {
    return true;
  }

  // If in priv-exec or config, exit
  if (state.mode === 'priv-exec' || state.mode.startsWith('config')) {
    const output = await executeCommand('exit');
    engine.processEvent({ type: 'outputWritten', data: output });
    
    const newState = engine.getState();
    return newState.mode === 'user-exec';
  }

  return false;
}

/**
 * Helper to transition to privileged exec mode
 * Sends 'enable' and handles password if needed
 */
export async function ensurePrivilegedExec(
  engine: IosSessionEngine,
  executeCommand: (cmd: string) => Promise<string>,
  enablePassword?: string
): Promise<boolean> {
  const state = engine.getState();
  
  if (state.mode === 'priv-exec') {
    return true;
  }

  // Must be in user-exec first
  if (state.mode !== 'user-exec') {
    const ok = await ensureUserExec(engine, executeCommand);
    if (!ok) return false;
  }

  // Send enable
  let output = await executeCommand('enable');
  engine.processEvent({ type: 'outputWritten', data: output });

  // Handle password if prompted
  if (engine.getState().awaitingPassword && enablePassword) {
    output = await executeCommand(enablePassword);
    engine.processEvent({ type: 'outputWritten', data: output });
  }

  const newState = engine.getState();
  return newState.mode === 'priv-exec';
}

/**
 * Helper to transition to config mode
 * Sends 'configure terminal' from privileged exec
 */
export async function ensureConfigMode(
  engine: IosSessionEngine,
  executeCommand: (cmd: string) => Promise<string>
): Promise<boolean> {
  const state = engine.getState();
  
  if (state.mode.startsWith('config')) {
    return true;
  }

  // Must be in priv-exec first
  if (state.mode !== 'priv-exec') {
    const ok = await ensurePrivilegedExec(engine, executeCommand);
    if (!ok) return false;
  }

  // Send configure terminal
  const output = await executeCommand('configure terminal');
  engine.processEvent({ type: 'outputWritten', data: output });

  const newState = engine.getState();
  return newState.mode.startsWith('config');
}

/**
 * Helper to exit from config mode back to privileged exec
 */
export async function exitConfigMode(
  engine: IosSessionEngine,
  executeCommand: (cmd: string) => Promise<string>
): Promise<boolean> {
  const state = engine.getState();

  if (state.mode === 'priv-exec') {
    return true;
  }

  if (state.mode.startsWith('config')) {
    const output = await executeCommand('exit');
    engine.processEvent({ type: 'outputWritten', data: output });

    const newState = engine.getState();
    if (newState.mode === 'priv-exec') {
      return true;
    }
  }

  return false;
}

/**
 * Helper to handle paging automatically
 * Simulates pressing space/return to advance
 */
export async function handlePaging(
  engine: IosSessionEngine,
  executeCommand: (cmd: string) => Promise<string>
): Promise<void> {
  while (engine.getState().paging) {
    engine.advancePaging();
    // In real implementation, send space or \n to device
    const output = await executeCommand(' '); // space to continue paging
    engine.processEvent({ type: 'outputWritten', data: output });
  }
}

/**
 * Helper to handle confirm prompts
 */
export async function handleConfirm(
  engine: IosSessionEngine,
  executeCommand: (cmd: string) => Promise<string>,
  answer: 'y' | 'n' = 'y'
): Promise<void> {
  if (engine.getState().awaitingConfirm) {
    engine.answerConfirm(answer);
    const output = await executeCommand(answer);
    engine.processEvent({ type: 'outputWritten', data: output });
  }
}

/**
 * Helper to provide password
 */
export async function providePassword(
  engine: IosSessionEngine,
  executeCommand: (cmd: string) => Promise<string>,
  password: string
): Promise<void> {
  if (engine.getState().awaitingPassword) {
    engine.providePassword(password);
    const output = await executeCommand(password);
    engine.processEvent({ type: 'outputWritten', data: output });
  }
}

/**
 * Helper to provide destination filename (for copy/backup commands)
 */
export async function provideDestinationFilename(
  engine: IosSessionEngine,
  executeCommand: (cmd: string) => Promise<string>,
  filename: string
): Promise<void> {
  if (engine.getState().awaitingDestinationFilename) {
    engine.provideDestinationFilename(filename);
    const output = await executeCommand(filename);
    engine.processEvent({ type: 'outputWritten', data: output });
  }
}

/**
 * Execute a command interactively with automatic prompt handling
 */
export async function runInteractiveCommand(
  engine: IosSessionEngine,
  executeCommand: (cmd: string) => Promise<string>,
  command: string,
  options?: {
    handlePagingAuto?: boolean;
    confirmAnswer?: 'y' | 'n';
    enablePassword?: string;
  }
): Promise<IosInteractiveResult> {
  const startTime = Date.now();
  engine.reset();

  try {
    // Start the command
    engine.processEvent({ type: 'commandStarted', command });
    const output = await executeCommand(command);
    engine.processEvent({ type: 'outputWritten', data: output });

    // Handle paging if enabled
    if (options?.handlePagingAuto !== false) {
      while (engine.getState().paging && !engine.isComplete()) {
        engine.advancePaging();
        const moreOutput = await executeCommand(' '); // space to continue
        engine.processEvent({ type: 'outputWritten', data: moreOutput });
      }
    }

    // Handle confirm if present
    if (engine.getState().awaitingConfirm) {
      const answer = options?.confirmAnswer ?? 'y';
      engine.answerConfirm(answer);
      const confirmOutput = await executeCommand(answer);
      engine.processEvent({ type: 'outputWritten', data: confirmOutput });
    }

    // Signal command ended (normal IOS behavior)
    engine.processEvent({ type: 'commandEnded' });

    const executionTime = Date.now() - startTime;
    const state = engine.getState();

    return createSuccessResult({
      raw: engine.getOutput(),
      command,
      session: state,
      interaction: engine.getMetrics(),
      executionTimeMs: executionTime,
      transcriptSummary: engine.getEventLog().map((entry) => ({
        timestamp: entry.timestamp,
        type: entry.type as any,
        payload: entry.data ?? {},
      })),
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const state = engine.getState();

    return createFailedResult({
      raw: engine.getOutput(),
      command,
      session: state,
      completionReason: engine.isDesynced() ? 'desync' : 'unknown',
      errors: [error instanceof Error ? error.message : String(error)],
      executionTimeMs: executionTime,
      transcriptSummary: engine.getEventLog().map((entry) => ({
        timestamp: entry.timestamp,
        type: entry.type as any,
        payload: entry.data ?? {},
      })),
    });
  }
}
