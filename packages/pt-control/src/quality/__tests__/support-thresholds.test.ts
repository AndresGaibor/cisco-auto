import { describe, test, expect } from 'bun:test';
import {
  evaluateThreshold,
  SUPPORT_THRESHOLDS,
  type DomainMetrics,
} from '../support-thresholds';

describe('evaluateThreshold', () => {
  test('pasa cuando cumple threshold', () => {
    const metrics: DomainMetrics = {
      supportedTests: 9,
      totalTests: 10,
      flakyTests: 0,
    };

    const result = evaluateThreshold('device', metrics);

    expect(result.passed).toBe(true);
    expect(result.supportedRate).toBe(0.9);
  });

  test('falla cuando no cumple minSupported', () => {
    const metrics: DomainMetrics = {
      supportedTests: 7,
      totalTests: 10,
      flakyTests: 0,
    };

    const result = evaluateThreshold('device', metrics);

    expect(result.passed).toBe(false);
    expect(result.supportedRate).toBe(0.7);
  });

  test('falla cuando excede maxFlaky', () => {
    const metrics: DomainMetrics = {
      supportedTests: 9,
      totalTests: 10,
      flakyTests: 2,
    };

    const result = evaluateThreshold('terminal', metrics);

    expect(result.passed).toBe(false);
    expect(result.flakyRate).toBe(0.2);
  });

  test('falla cuando domain no existe', () => {
    const metrics: DomainMetrics = {
      supportedTests: 10,
      totalTests: 10,
      flakyTests: 0,
    };

    const result = evaluateThreshold('unknown-domain', metrics);

    expect(result.passed).toBe(false);
    expect(result.details).toContain('No threshold defined');
  });
});

describe('SUPPORT_THRESHOLDS', () => {
  test('tiene thresholds definidos', () => {
    expect(SUPPORT_THRESHOLDS.length).toBeGreaterThan(0);
  });

  test('cada threshold tiene valores validos', () => {
    for (const threshold of SUPPORT_THRESHOLDS) {
      expect(threshold.minSupported).toBeGreaterThan(0);
      expect(threshold.minSupported).toBeLessThanOrEqual(1);
      expect(threshold.maxFlaky).toBeGreaterThanOrEqual(0);
      expect(threshold.maxFlaky).toBeLessThan(1);
    }
  });

  test('terminal tiene threshold estricto', () => {
    const terminal = SUPPORT_THRESHOLDS.find((t) => t.domain === 'terminal');
    expect(terminal?.minSupported).toBe(0.9);
    expect(terminal?.maxFlaky).toBe(0.05);
    expect(terminal?.allowPartial).toBe(false);
  });

  test('device y link tienen threshold similar', () => {
    const device = SUPPORT_THRESHOLDS.find((t) => t.domain === 'device');
    const link = SUPPORT_THRESHOLDS.find((t) => t.domain === 'link');

    expect(device?.minSupported).toBe(link?.minSupported);
    expect(device?.maxFlaky).toBe(link?.maxFlaky);
  });
});