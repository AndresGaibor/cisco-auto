import { describe, test, expect } from 'bun:test';
import {
  evaluateReleaseReadiness,
  type ReadinessInput,
} from '../release-readiness';
import type { SuiteResult } from '../regression-gates';
import type { DomainMetrics } from '../support-thresholds';

describe('evaluateReleaseReadiness', () => {
  test('ready cuando todos los gates pasan', () => {
    const input: ReadinessInput = {
      suiteResults: [
        { suiteId: 'terminal-core', totalTests: 10, passedTests: 10, failedTests: 0, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'device-basic', totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'link-basic', totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'workflow-basic', totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'omni-safe', totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, flakyTests: 0 },
      ] as SuiteResult[],
      domainMetrics: {
        device: { supportedTests: 9, totalTests: 10, flakyTests: 0 },
        link: { supportedTests: 9, totalTests: 10, flakyTests: 0 },
        terminal: { supportedTests: 10, totalTests: 10, flakyTests: 0 },
        assessment: { supportedTests: 9, totalTests: 10, flakyTests: 0 },
        omni: { supportedTests: 8, totalTests: 10, flakyTests: 1 },
        workflow: { supportedTests: 8, totalTests: 10, flakyTests: 1 },
        environment: { supportedTests: 7, totalTests: 10, flakyTests: 1 },
      } as Record<string, DomainMetrics>,
      debtItems: { total: 5, accepted: 5, overdue: 0 },
    };

    const result = evaluateReleaseReadiness(input);

    expect(result.ready).toBe('ready');
    expect(result.summary).toContain('Todos los gates pasaron');
  });

  test('not-ready cuando falla critical gate', () => {
    const input: ReadinessInput = {
      suiteResults: [
        { suiteId: 'terminal-core', totalTests: 10, passedTests: 5, failedTests: 5, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'device-basic', totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'link-basic', totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, flakyTests: 0 },
      ] as SuiteResult[],
      domainMetrics: {
        device: { supportedTests: 9, totalTests: 10, flakyTests: 0 },
        terminal: { supportedTests: 5, totalTests: 10, flakyTests: 0 },
      } as Record<string, DomainMetrics>,
      debtItems: { total: 5, accepted: 5, overdue: 0 },
    };

    const result = evaluateReleaseReadiness(input);

    expect(result.ready).toBe('not-ready');
    expect(result.regressions.criticalFailed).toBe(true);
  });

  test('conditionally-ready cuando hay deuda alta', () => {
    const input: ReadinessInput = {
      suiteResults: [
        { suiteId: 'terminal-core', totalTests: 10, passedTests: 10, failedTests: 0, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'device-basic', totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'link-basic', totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, flakyTests: 0 },
      ] as SuiteResult[],
      domainMetrics: {
        device: { supportedTests: 9, totalTests: 10, flakyTests: 0 },
        terminal: { supportedTests: 10, totalTests: 10, flakyTests: 0 },
      } as Record<string, DomainMetrics>,
      debtItems: { total: 10, accepted: 5, overdue: 2 },
    };

    const result = evaluateReleaseReadiness(input);

    expect(result.ready).toBe('conditionally-ready');
    expect(result.summary).toContain('Deuda técnica');
  });

  test('conditionally-ready cuando hay muchos dominos rotos', () => {
    const input: ReadinessInput = {
      suiteResults: [
        { suiteId: 'terminal-core', totalTests: 10, passedTests: 10, failedTests: 0, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'device-basic', totalTests: 10, passedTests: 10, failedTests: 0, skippedTests: 0, flakyTests: 0 },
        { suiteId: 'link-basic', totalTests: 10, passedTests: 10, failedTests: 0, skippedTests: 0, flakyTests: 0 },
      ] as SuiteResult[],
      domainMetrics: {
        device: { supportedTests: 5, totalTests: 10, flakyTests: 0 },
        link: { supportedTests: 5, totalTests: 10, flakyTests: 0 },
        terminal: { supportedTests: 5, totalTests: 10, flakyTests: 0 },
        assessment: { supportedTests: 5, totalTests: 10, flakyTests: 0 },
        omni: { supportedTests: 5, totalTests: 10, flakyTests: 0 },
        workflow: { supportedTests: 5, totalTests: 10, flakyTests: 0 },
        environment: { supportedTests: 5, totalTests: 10, flakyTests: 0 },
      } as Record<string, DomainMetrics>,
      debtItems: { total: 5, accepted: 5, overdue: 0 },
    };

    const result = evaluateReleaseReadiness(input);

    expect(result.ready).toBe('conditionally-ready');
  });

  test('reporta newlyBroken correctamente', () => {
    const input: ReadinessInput = {
      suiteResults: [
        { suiteId: 'terminal-core', totalTests: 10, passedTests: 5, failedTests: 5, skippedTests: 0, flakyTests: 0 },
      ] as SuiteResult[],
      domainMetrics: {
        terminal: { supportedTests: 5, totalTests: 10, flakyTests: 0 },
      } as Record<string, DomainMetrics>,
      debtItems: { total: 5, accepted: 5, overdue: 0 },
    };

    const result = evaluateReleaseReadiness(input);

    expect(result.regressions.newlyBroken).toContain('terminal-core');
  });
});