import { describe, test, expect } from 'bun:test';
import {
  evaluateGate,
  getCriticalGates,
  getGatesBySeverity,
  REGRESSION_GATES,
  type SuiteResult,
  type RegressionGate,
} from '../regression-gates';

describe('evaluateGate', () => {
  test('pasa cuando cumple threshold', () => {
    const gate: RegressionGate = {
      suiteId: 'test-suite',
      name: 'Test Gate',
      severity: 'critical',
      domainsAffected: ['test'],
      threshold: { minPassRate: 0.8, maxFlakyRate: 0.1 },
    };
    const results: SuiteResult[] = [
      { suiteId: 'test-suite', totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, flakyTests: 0 },
    ];

    const result = evaluateGate(results, gate);

    expect(result.passed).toBe(true);
    expect(result.passRate).toBe(0.9);
  });

  test('falla cuando no cumple pass rate', () => {
    const gate: RegressionGate = {
      suiteId: 'test-suite',
      name: 'Test Gate',
      severity: 'critical',
      domainsAffected: ['test'],
      threshold: { minPassRate: 0.9, maxFlakyRate: 0.1 },
    };
    const results: SuiteResult[] = [
      { suiteId: 'test-suite', totalTests: 10, passedTests: 7, failedTests: 3, skippedTests: 0, flakyTests: 0 },
    ];

    const result = evaluateGate(results, gate);

    expect(result.passed).toBe(false);
    expect(result.passRate).toBe(0.7);
  });

  test('falla cuando excede flaky rate', () => {
    const gate: RegressionGate = {
      suiteId: 'test-suite',
      name: 'Test Gate',
      severity: 'critical',
      domainsAffected: ['test'],
      threshold: { minPassRate: 0.8, maxFlakyRate: 0.05 },
    };
    const results: SuiteResult[] = [
      { suiteId: 'test-suite', totalTests: 10, passedTests: 9, failedTests: 0, skippedTests: 0, flakyTests: 2 },
    ];

    const result = evaluateGate(results, gate);

    expect(result.passed).toBe(false);
    expect(result.flakyRate).toBe(0.2);
  });

  test('falla cuando suite no existe', () => {
    const gate: RegressionGate = {
      suiteId: 'missing-suite',
      name: 'Missing Gate',
      severity: 'critical',
      domainsAffected: ['test'],
      threshold: { minPassRate: 0.8, maxFlakyRate: 0.1 },
    };
    const results: SuiteResult[] = [];

    const result = evaluateGate(results, gate);

    expect(result.passed).toBe(false);
    expect(result.details).toContain('not executed');
  });
});

describe('getCriticalGates', () => {
  test('retorna solo gates critical', () => {
    const critical = getCriticalGates();

    expect(critical.length).toBeGreaterThan(0);
    expect(critical.every((g) => g.severity === 'critical')).toBe(true);
  });
});

describe('getGatesBySeverity', () => {
  test('filtra por severity', () => {
    const major = getGatesBySeverity('major');

    expect(major.every((g) => g.severity === 'major')).toBe(true);
  });
});

describe('REGRESSION_GATES', () => {
  test('tiene gates definidos', () => {
    expect(REGRESSION_GATES.length).toBeGreaterThan(0);
  });

  test('cada gate tiene threshold valido', () => {
    for (const gate of REGRESSION_GATES) {
      expect(gate.threshold.minPassRate).toBeGreaterThan(0);
      expect(gate.threshold.minPassRate).toBeLessThanOrEqual(1);
      expect(gate.threshold.maxFlakyRate).toBeGreaterThanOrEqual(0);
      expect(gate.threshold.maxFlakyRate).toBeLessThan(1);
    }
  });
});