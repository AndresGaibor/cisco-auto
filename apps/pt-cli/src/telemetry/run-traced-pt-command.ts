#!/usr/bin/env bun
/**
 * Wrapper para ejecutar comandos PT con tracing completo.
 * Proporciona logging estructurado de extremo a extremo.
 * 
 * Estructura de directorios:
 * ~/pt-dev/logs/sessions/<sessionId>.ndjson
 * ~/pt-dev/logs/commands/<commandId>.json
 * ~/pt-dev/logs/bundles/<sessionId>.bundle.json
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { LogManager, redactSensitive } from '@cisco-auto/pt-control/logging';
import { createPTController, type CommandTraceEntry } from '@cisco-auto/pt-control/controller';
import type { GlobalFlags } from '../flags';

function getDefaultLogDir(): string {
  const home = homedir();
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    return join(process.env.USERPROFILE ?? home, 'pt-dev', 'logs', 'sessions');
  }
  return join(home, 'pt-dev', 'logs', 'sessions');
}

function getDefaultBundlesDir(): string {
  const home = homedir();
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    return join(process.env.USERPROFILE ?? home, 'pt-dev', 'logs', 'bundles');
  }
  return join(home, 'pt-dev', 'logs', 'bundles');
}

function getPtDevDir(): string {
  const home = homedir();
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    return process.env.PT_DEV_DIR ?? join(process.env.USERPROFILE ?? home, 'pt-dev');
  }
  return process.env.PT_DEV_DIR ?? join(home, 'pt-dev');
}

export interface TraceContext {
  sessionId: string;
  correlationId: string;
  mark: (phase: string, extra?: Record<string, unknown>) => void;
  attachCommandIds: (ids: string[]) => void;
  attachResultPreview: (value: unknown) => void;
  attachError: (err: Error) => void;
  getBridgeTimeline: () => CommandTraceEntry[];
}

export interface RunTracedPtCommandOptions<T> {
  action: string;
  argv: string[];
  flags: GlobalFlags;
  payloadPreview?: Record<string, unknown>;
  targetDevice?: string;
  run: (controller: ReturnType<typeof createPTController>, trace: TraceContext) => Promise<T>;
}

async function loadCommandTrace(cmdId: string, commandsTraceDir: string): Promise<Record<string, unknown> | null> {
  const tracePath = join(commandsTraceDir, `${cmdId}.json`);
  if (existsSync(tracePath)) {
    try {
      return JSON.parse(readFileSync(tracePath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

async function loadCommandResult(cmdId: string, resultsDir: string): Promise<Record<string, unknown> | null> {
  const resultPath = join(resultsDir, `${cmdId}.json`);
  if (existsSync(resultPath)) {
    try {
      return JSON.parse(readFileSync(resultPath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

async function generateBundle(
  sessionId: string,
  action: string,
  argv: string[],
  flags: GlobalFlags,
  traceEvents: Record<string, unknown>[],
  bridgeEvents: unknown[],
  commandIds: string[],
  errorInfo: string | undefined,
  startTime: number,
  endTime: number,
  outcome: 'success' | 'error' | 'failure'
): Promise<Record<string, unknown>> {
  const ptDevDir = getPtDevDir();
  const resultsDir = join(ptDevDir, 'results');
  const commandsTraceDir = join(ptDevDir, 'logs', 'commands');

  const ptRuntimeCommands = await Promise.all(
    commandIds.map(cmdId => loadCommandTrace(cmdId, commandsTraceDir))
  );

  const results = await Promise.all(
    commandIds.map(cmdId => loadCommandResult(cmdId, resultsDir))
  );

  return {
    session: {
      id: sessionId,
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date(endTime).toISOString(),
      argv,
      cwd: process.cwd(),
      flags: flags.trace ? flags : undefined,
    },
    cli: {
      action,
      payloadPreview: flags.tracePayload ? redactSensitive({}) : undefined,
      timeline: traceEvents,
      error: errorInfo,
    },
    bridge: {
      events: bridgeEvents,
    },
    ptRuntime: {
      commands: ptRuntimeCommands.filter(Boolean),
    },
    results: results.filter(Boolean),
    summary: {
      ok: outcome === 'success',
      durationMs: endTime - startTime,
      commandIds,
    },
  };
}

export async function runTracedPtCommand<T>({
  action,
  argv,
  flags,
  payloadPreview,
  targetDevice,
  run,
}: RunTracedPtCommandOptions<T>): Promise<{ result: T; trace: TraceContext }> {
  const sessionId = flags.sessionId ?? LogManager.generateSessionId();
  const correlationId = LogManager.generateCorrelationId();

  const logManager = new LogManager({
    logDir: flags.traceDir ?? getDefaultLogDir(),
    prefix: 'pt-cli-trace',
  });

  logManager.startSession(sessionId);

  const traceEvents: Record<string, unknown>[] = [];
  let commandIds: string[] = [];
  let resultPreview: unknown = null;
  let errorInfo: string | undefined;
  let outcome: 'success' | 'error' | 'failure' = 'success';
  let bridgeEvents: unknown[] = [];

  const ptDevDir = getPtDevDir();
  const resultsDir = join(ptDevDir, 'results');
  const commandsTraceDir = join(ptDevDir, 'logs', 'commands');

  const mark = (phase: string, extra?: Record<string, unknown>) => {
    const event = {
      phase,
      timestamp: Date.now(),
      ...extra,
    };
    traceEvents.push(event);
  };

  const attachCommandIds = (ids: string[]) => {
    commandIds = [...commandIds, ...ids];
  };

  const attachResultPreview = (value: unknown) => {
    resultPreview = flags.traceResult ? redactSensitive(value) : undefined;
  };

  const attachError = (err: Error) => {
    errorInfo = err.message;
  };

  const trace: TraceContext = {
    sessionId,
    correlationId,
    mark,
    attachCommandIds,
    attachResultPreview,
    attachError,
    getBridgeTimeline: () => [],
  };

  const sessionStartTime = Date.now();
  let sessionEndTime = 0;

  try {
    mark('cli.received', {
      action,
      argv: flags.tracePayload ? argv : undefined,
      payload_preview: flags.tracePayload ? redactSensitive(payloadPreview) : undefined,
      target_device: targetDevice,
    });

    const controller = createPTController({
      devDir: ptDevDir,
    });

    mark('cli.controller.start');

    controller.getBridge().onAll((event) => {
      bridgeEvents.push(event);
      const evt = event as { id?: string; type?: string };
      if (evt.id && evt.type?.startsWith('command-')) {
        attachCommandIds([evt.id]);
      }
    });

    trace.getBridgeTimeline = () => {
      return bridgeEvents.filter(
        (e) => (e as { type?: string }).type?.startsWith('command-')
      ) as CommandTraceEntry[];
    };

    await controller.start();

    try {
      mark('bridge.timeline.collected');

      const result = await run(controller, trace);

      const duration = Date.now() - sessionStartTime;

      mark('cli.render.success', {
        duration_ms: duration,
        command_ids: commandIds,
        result_preview: resultPreview,
      });

      await logManager.logAction(sessionId, correlationId, action, 'success', {
        duration_ms: duration,
        command_ids: commandIds,
        payload_preview: flags.tracePayload ? redactSensitive(payloadPreview) as Record<string, unknown> : undefined,
        result_preview: resultPreview as Record<string, unknown>,
        bridge_events: bridgeEvents,
        phase: 'completed',
        target_device: targetDevice,
        flags: flags.trace ? flags as unknown as Record<string, unknown> : undefined,
      });

      await controller.stop();

      sessionEndTime = Date.now();

      if (flags.traceBundle) {
        const bundle = await generateBundle(
          sessionId,
          action,
          argv,
          flags,
          traceEvents,
          bridgeEvents,
          commandIds,
          errorInfo,
          sessionStartTime,
          sessionEndTime,
          outcome
        );

        const bundlesDir = flags.traceBundlePath 
          ? join(flags.traceBundlePath, '..')
          : getDefaultBundlesDir();
        
        if (!existsSync(bundlesDir)) {
          mkdirSync(bundlesDir, { recursive: true });
        }

        const bundlePath = flags.traceBundlePath 
          ?? join(bundlesDir, `${sessionId}.bundle.json`);
        
        writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
        console.log(`📦 Bundle generado: ${bundlePath}`);
      }

      return { result, trace };
    } catch (runError) {
      outcome = 'error';
      const duration = Date.now() - sessionStartTime;
      const err = runError instanceof Error ? runError : new Error(String(runError));

      attachError(err);

      mark('cli.render.error', {
        duration_ms: duration,
        error: err.message,
        command_ids: commandIds,
      });

      await logManager.logAction(sessionId, correlationId, action, 'error', {
        duration_ms: duration,
        command_ids: commandIds,
        error: err.message,
        payload_preview: flags.tracePayload ? redactSensitive(payloadPreview) as Record<string, unknown> : undefined,
        result_preview: resultPreview as Record<string, unknown>,
        bridge_events: bridgeEvents,
        phase: 'failed',
        target_device: targetDevice,
        flags: flags.trace ? flags as unknown as Record<string, unknown> : undefined,
      });

      await controller.stop();
      sessionEndTime = Date.now();

      if (flags.traceBundle) {
        const bundle = await generateBundle(
          sessionId,
          action,
          argv,
          flags,
          traceEvents,
          bridgeEvents,
          commandIds,
          errorInfo,
          sessionStartTime,
          sessionEndTime,
          outcome
        );

        const bundlesDir = flags.traceBundlePath 
          ? join(flags.traceBundlePath, '..')
          : getDefaultBundlesDir();
        
        if (!existsSync(bundlesDir)) {
          mkdirSync(bundlesDir, { recursive: true });
        }

        const bundlePath = flags.traceBundlePath 
          ?? join(bundlesDir, `${sessionId}.bundle.json`);
        
        writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
        console.log(`📦 Bundle generado: ${bundlePath}`);
      }

      throw err;
    }
  } catch (outerError) {
    outcome = 'failure';
    const duration = Date.now() - sessionStartTime;
    const err = outerError instanceof Error ? outerError : new Error(String(outerError));

    await logManager.logAction(sessionId, correlationId, action, 'failure', {
      duration_ms: duration,
      error: err.message,
      command_ids: commandIds,
      phase: 'crashed',
      target_device: targetDevice,
    });

    logManager.endSession();
    sessionEndTime = Date.now();

    if (flags.traceBundle) {
      const bundle = await generateBundle(
        sessionId,
        action,
        argv,
        flags,
        traceEvents,
        bridgeEvents,
        commandIds,
        errorInfo,
        sessionStartTime,
        sessionEndTime,
        outcome
      );

      const bundlesDir = flags.traceBundlePath 
        ? join(flags.traceBundlePath, '..')
        : getDefaultBundlesDir();
      
      if (!existsSync(bundlesDir)) {
        mkdirSync(bundlesDir, { recursive: true });
      }

      const bundlePath = flags.traceBundlePath 
        ?? join(bundlesDir, `${sessionId}.bundle.json`);
      
      writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
      console.log(`📦 Bundle generado: ${bundlePath}`);
    }

    throw err;
  }

  logManager.endSession();
}
