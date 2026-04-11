#!/usr/bin/env bun
import { getContextualSuggestions } from './contextual-suggestions.js';
/**
 * Runner unificado para todos los comandos de la CLI.
 * Encapsula lógica de ejecución, logging, historial y rendering.
 */

import { randomUUID } from 'node:crypto';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import type { PTController } from '@cisco-auto/pt-control';

import type { CliResult } from '../contracts/cli-result.js';
import { createErrorResult, createSuccessResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { HistoryEntry } from '../contracts/history-entry.js';
import type { GlobalFlags, OutputFormat } from '../flags.js';

import { sessionLogStore } from '../telemetry/session-log-store.js';
import { historyStore } from '../telemetry/history-store.js';
import { bundleWriter } from '../telemetry/bundle-writer.js';
import { persistHistoryEntryToMemory } from './memory-persistence.js';
import type { CommandRuntimeContext } from './context-inspector.js';
import { inspectCommandContext } from './context-inspector.js';
import { buildContextWarnings } from './context-advice.js';
import { collectContextStatus, writeContextStatus } from './context-supervisor.js';
import { ensureSupervisorRunning } from '../system/context-supervisor.js';

export interface CommandContext {
  sessionId: string;
  correlationId: string;
  flags: GlobalFlags;
  controller: PTController;
  runtimeContext: CommandRuntimeContext;
  logPhase: (phase: string, metadata?: Record<string, unknown>) => Promise<void>;
}

export interface RunCommandOptions<T> {
  action: string;
  meta: CommandMeta;
  flags: GlobalFlags;
  payloadPreview?: Record<string, unknown>;
  execute: (ctx: CommandContext) => Promise<CliResult<T>>;
}

function generateSessionId(): string {
  return `s-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function generateCorrelationId(): string {
  return `c-${randomUUID().slice(0, 8)}`;
}

export async function runCommand<T>(options: RunCommandOptions<T>): Promise<CliResult<T>> {
  const startTime = Date.now();
  const sessionId = options.flags.sessionId ?? generateSessionId();
  const correlationId = generateCorrelationId();


  // Asegurar que el supervisor de contexto esté corriendo
  try {
    await ensureSupervisorRunning();
  } catch (e) {
    console.debug('[runCommand] Error arrancando supervisor:', e);
    // Continuar sin supervisor
  }
  const controller = createDefaultPTController();

  const logPhase = async (phase: string, metadata?: Record<string, unknown>) => {
    await sessionLogStore.append({
      session_id: sessionId,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      phase,
      action: options.action,
      metadata,
    });
  };

  let result: CliResult<T> | undefined;
  let runtimeContext: CommandRuntimeContext = {
    bridgeReady: false,
    topologyMaterialized: false,
    deviceCount: 0,
    linkCount: 0,
    heartbeat: {
      state: 'unknown',
    },
    bridge: {
      ready: false,
      warnings: [],
    },
    warnings: ['Controller no se pudo iniciar'],
  };
  let contextStatusToPersist: Awaited<ReturnType<typeof collectContextStatus>> | null = null;

  try {
    await controller.start();
    runtimeContext = await inspectCommandContext(controller);

    await logPhase('start', {
      flags: options.flags,
      payloadPreview: options.payloadPreview,
      contextSummary: {
        bridgeReady: runtimeContext.bridgeReady,
        topologyMaterialized: runtimeContext.topologyMaterialized,
        deviceCount: runtimeContext.deviceCount,
        linkCount: runtimeContext.linkCount,
      },
    });

    const ctx: CommandContext = {
      sessionId,
      correlationId,
      flags: options.flags,
      controller,
      runtimeContext,
      logPhase,
    };

    try {
      result = await options.execute(ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result = createErrorResult<T>(options.action, {
        message,
        details: error instanceof Error ? { stack: error.stack } : undefined,
      });
    }
  } finally {
    try {
      contextStatusToPersist = await collectContextStatus(controller);
    } catch (err) {
      console.warn('No se pudo actualizar context-status:', err);
    }

    await controller.stop();
  }

  if (!result) {
    result = createErrorResult<T>(options.action, {
      message: 'No result produced after execution.',
    });
  }

  const verificationWarnings = result.verification?.warnings ?? [];
  const contextWarnings = buildContextWarnings(runtimeContext);
  const mergedWarnings: string[] = [];
  const seenWarnings = new Set<string>();
  for (const warning of [...contextWarnings, ...(result.warnings ?? []), ...verificationWarnings]) {
    if (seenWarnings.has(warning)) continue;
    seenWarnings.add(warning);
    mergedWarnings.push(warning);
  }
  result.warnings = mergedWarnings;

  // Fase 6: Drenar command trace del controller para trazabilidad end-to-end
  const commandTrace = controller.drainCommandTrace();
  const commandIds = commandTrace.map(t => t.id);
  const interactionSummary = commandTrace.length > 0
    ? commandTrace.map(t => `${t.type}:${t.commandType ?? 'unknown'}:${t.status ?? 'n/a'}`).join(', ')
    : undefined;

  // Phase 7: add contextual suggestions based on verification and context
  const suggestions = getContextualSuggestions(result, { saveRequested: options.flags.verify });
  if (suggestions.length > 0) {
    result.advice = [...(result.advice ?? []), ...suggestions];
  }
  if (result.meta) {
    result.meta.sessionId = sessionId;
    result.meta.correlationId = correlationId;
    result.meta.commandIds = commandIds.length > 0 ? commandIds : (result.meta.commandIds ?? []);
    if (interactionSummary) result.meta.interactionSummary = interactionSummary;
    result.meta.context = {
      bridgeReady: runtimeContext.bridgeReady,
      topologyMaterialized: runtimeContext.topologyMaterialized,
      deviceCount: runtimeContext.deviceCount,
      linkCount: runtimeContext.linkCount,
      heartbeat: runtimeContext.heartbeat,
      bridge: runtimeContext.bridge,
    };
  } else {
    result.meta = {
      sessionId,
      correlationId,
      commandIds: commandIds.length > 0 ? commandIds : undefined,
      interactionSummary,
      context: {
        bridgeReady: runtimeContext.bridgeReady,
        topologyMaterialized: runtimeContext.topologyMaterialized,
        deviceCount: runtimeContext.deviceCount,
        linkCount: runtimeContext.linkCount,
        heartbeat: runtimeContext.heartbeat,
        bridge: runtimeContext.bridge,
      },
    };
  }

  const durationMs = Date.now() - startTime;
  if (result.meta) {
    result.meta.durationMs = durationMs;
  }

  const historyEntry: HistoryEntry = {
    schemaVersion: '1.0',
    sessionId,
    correlationId,
    startedAt: new Date(startTime).toISOString(),
    endedAt: new Date().toISOString(),
    durationMs,
    action: options.action,
    status: result.ok ? 'success' : 'error',
    ok: result.ok,
    argv: process.argv,
    flags: Object.fromEntries(Object.entries(options.flags)),
    payloadSummary: options.payloadPreview,
    resultSummary: result.data != null && typeof result.data === 'object' && !Array.isArray(result.data)
      ? Object.fromEntries(Object.entries(result.data))
      : undefined,
    commandIds: commandIds.length > 0 ? commandIds : (result.meta?.commandIds ?? []),
    interactionSummary: interactionSummary ? { summary: interactionSummary } : (result.meta?.interactionSummary ? { summary: result.meta.interactionSummary } : undefined),
    completionReason: result.ok ? 'completed' : (result.error?.message ? `error: ${result.error.message}` : 'failed'),
    contextSummary: {
      bridgeReady: runtimeContext.bridgeReady,
      topologyMaterialized: runtimeContext.topologyMaterialized,
      deviceCount: runtimeContext.deviceCount,
      linkCount: runtimeContext.linkCount,
      warnings: runtimeContext.warnings,
    },
    verificationSummary: result.verification?.verified === true
      ? `verified via ${(result.verification.verificationSource && result.verification.verificationSource.length) ? result.verification.verificationSource.join(', ') : 'checks'}`
      : result.verification?.partiallyVerified === true
        ? `partially verified via ${(result.verification.verificationSource && result.verification.verificationSource.length) ? result.verification.verificationSource.join(', ') : 'partial checks'}`
        : result.verification?.executed === true && result.verification?.verified === false
          ? 'executed only (not verified)'
          : undefined,
    warnings: result.warnings ?? [],
  };

  try {
    await historyStore.append(historyEntry);
  } catch (err) {
    console.error('Error writing history:', err);
  }

  try {
    persistHistoryEntryToMemory(historyEntry);
  } catch (err) {
    console.error('Error writing memory audit:', err);
  }

  if (options.flags.traceBundle) {
    try {
      await bundleWriter.writeBundle(sessionId);
    } catch (err) {
      console.error('Error writing bundle:', err);
    }
  }

  await logPhase('end', {
    ok: result.ok,
    durationMs,
    contextWarnings: runtimeContext.warnings,
  });

  // Persistir estado de contexto tras la ejecución (Fase 3)
  try {
    const ctxStatus = contextStatusToPersist ?? await collectContextStatus(controller);
    if (result.ok) {
      ctxStatus.bridge.ready = true;
    }
    // Propagar warnings del resultado al estado persistente
    if (result.warnings && result.warnings.length > 0) {
      for (const w of result.warnings) {
        if (!ctxStatus.warnings.includes(w)) ctxStatus.warnings.push(w);
      }
    }
    // Si hubo verificación y falló, marcar posible desincronización con razón
    if (result.verification && result.verification.verified === false) {
      ctxStatus.topology.health = 'desynced';
      const desyncReason = `Post-validation failed after ${options.action}`;
      if (!ctxStatus.warnings.includes(desyncReason)) {
        ctxStatus.warnings.push(desyncReason);
      }
      // Persistir razón en notes para que status/doctor/history explain la reutilicen
      if (!ctxStatus.notes) ctxStatus.notes = [];
      const reasonEntry = `[${new Date().toISOString()}] desynced: ${desyncReason}`;
      if (!ctxStatus.notes.includes(reasonEntry)) ctxStatus.notes.push(reasonEntry);
    }
    await writeContextStatus(ctxStatus);
  } catch (err) {
    console.warn('No se pudo actualizar context-status:', err);
  }


  return result;
}

export async function runCommandWithRender<T>(
  options: RunCommandOptions<T>,
  renderFn: (result: CliResult<T>, format: OutputFormat) => string
): Promise<void> {
  const result = await runCommand(options);

  const output = renderFn(result, options.flags.output);

  if (!options.flags.quiet || !result.ok) {
    console.log(output);
  }

  if (!result.ok) {
    process.exit(1);
  }
}
