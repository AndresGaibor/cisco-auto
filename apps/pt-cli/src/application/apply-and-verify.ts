#!/usr/bin/env bun
/**
 * Patrón para ejecutar acción y verificación.
 * Proporciona estructura unificada para ejecutar una acción y opcionalmente verificarla.
 */

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult, createVerifiedResult } from '../contracts/cli-result.js';

export interface ApplyAndVerifyOptions<TApply, TVerify, TResult> {
  apply: () => Promise<TApply>;
  verify?: () => Promise<TVerify>;
  summarize: (applyResult: TApply, verifyResult?: TVerify) => CliResult<TResult>;
}

export async function applyAndVerify<TApply, TVerify, TResult>(
  options: ApplyAndVerifyOptions<TApply, TVerify, TResult>
): Promise<CliResult<TResult>> {
  try {
    const applyResult = await options.apply();

    if (options.verify) {
      const verifyResult = await options.verify();
      return options.summarize(applyResult, verifyResult);
    }

    return options.summarize(applyResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResult('apply-and-verify', {
      message,
      details: error instanceof Error ? { stack: error.stack } : undefined,
    }) as CliResult<TResult>;
  }
}

export interface ApplyAndVerifyWithChecksOptions<TApply, TVerify, TResult> {
  apply: () => Promise<TApply>;
  verify?: () => Promise<TVerify>;
  buildChecks: (applyResult: TApply, verifyResult?: TVerify) => {
    checks: Array<{ name: string; ok: boolean; details?: Record<string, unknown> }>;
    data: TResult;
  };
}

export async function applyAndVerifyWithChecks<TApply, TVerify, TResult>(
  options: ApplyAndVerifyWithChecksOptions<TApply, TVerify, TResult>
): Promise<CliResult<TResult>> {
  try {
    const applyResult = await options.apply();

    let verifyResult: TVerify | undefined;
    if (options.verify) {
      verifyResult = await options.verify();
    }

    const { checks, data } = options.buildChecks(applyResult, verifyResult);
    const allPassed = checks.every((check) => check.ok);

    if (allPassed) {
      return createVerifiedResult('apply-and-verify', data, {
        verified: true,
        checks: checks.map((c) => ({ name: c.name, ok: c.ok, details: c.details })),
      });
    }

    return createVerifiedResult('apply-and-verify', data, {
      verified: false,
      checks: checks.map((c) => ({ name: c.name, ok: c.ok, details: c.details })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResult('apply-and-verify', {
      message,
      details: error instanceof Error ? { stack: error.stack } : undefined,
    }) as CliResult<TResult>;
  }
}
