import { describe, test, expect } from 'bun:test';
import {
  getRequiredSuites,
  getRiskLevel,
  requiresVerification,
  requiresRegression,
  CHANGE_SAFETY_POLICY,
  type ChangeScope,
} from '../change-safety-policy';

describe('getRequiredSuites', () => {
  test('retorna suites para terminal-engine', () => {
    const suites = getRequiredSuites('terminal-engine');

    expect(suites).toContain('terminal-core');
    expect(suites).toContain('regression-smoke');
  });

  test('retorna suites para omni-adapters', () => {
    const suites = getRequiredSuites('omni-adapters');

    expect(suites).toContain('omni-safe');
    expect(suites).toContain('regression-smoke');
  });

  test('retorna suites para build-kernel', () => {
    const suites = getRequiredSuites('build-kernel');

    expect(suites).toContain('REGRESSION_BASELINE');
  });

  test('retorna default para scope desconocido', () => {
    const suites = getRequiredSuites('workflows' as ChangeScope);

    expect(suites.length).toBeGreaterThan(0);
  });
});

describe('getRiskLevel', () => {
  test('terminal-engine es dangerous', () => {
    const risk = getRiskLevel('terminal-engine');

    expect(risk).toBe('dangerous');
  });

  test('omni-adapters es elevated', () => {
    const risk = getRiskLevel('omni-adapters');

    expect(risk).toBe('elevated');
  });

  test('device-handlers es safe', () => {
    const risk = getRiskLevel('device-handlers');

    expect(risk).toBe('safe');
  });
});

describe('requiresVerification', () => {
  test('todas las reglas requieren verification', () => {
    for (const rule of CHANGE_SAFETY_POLICY) {
      expect(requiresVerification(rule.scope)).toBe(true);
    }
  });
});

describe('requiresRegression', () => {
  test('terminal-engine requiere regression', () => {
    expect(requiresRegression('terminal-engine')).toBe(true);
  });

  test('workflows no requiere regression', () => {
    expect(requiresRegression('workflows')).toBe(false);
  });
});

describe('CHANGE_SAFETY_POLICY', () => {
  test('tiene reglas definidas', () => {
    expect(CHANGE_SAFETY_POLICY.length).toBeGreaterThan(0);
  });

  test('cada regla tiene riskLevel valido', () => {
    for (const rule of CHANGE_SAFETY_POLICY) {
      expect(['safe', 'elevated', 'dangerous']).toContain(rule.riskLevel);
    }
  });

  test('cada regla tiene requiredSuites', () => {
    for (const rule of CHANGE_SAFETY_POLICY) {
      expect(rule.requiredSuites.length).toBeGreaterThan(0);
    }
  });
});