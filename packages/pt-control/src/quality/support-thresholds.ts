export interface DomainMetrics {
  supportedTests: number;
  totalTests: number;
  flakyTests: number;
}

export interface SupportThreshold {
  domain: string;
  minSupported: number;
  maxFlaky: number;
  allowPartial: boolean;
  allowExperimental: boolean;
}

export interface ThresholdResult {
  passed: boolean;
  supportedRate: number;
  flakyRate: number;
  details: string;
}

export const SUPPORT_THRESHOLDS: SupportThreshold[] = [
  {
    domain: 'device',
    minSupported: 0.8,
    maxFlaky: 0.1,
    allowPartial: true,
    allowExperimental: true,
  },
  {
    domain: 'link',
    minSupported: 0.8,
    maxFlaky: 0.1,
    allowPartial: true,
    allowExperimental: true,
  },
  {
    domain: 'terminal',
    minSupported: 0.9,
    maxFlaky: 0.05,
    allowPartial: false,
    allowExperimental: false,
  },
  {
    domain: 'assessment',
    minSupported: 0.85,
    maxFlaky: 0.08,
    allowPartial: false,
    allowExperimental: true,
  },
  {
    domain: 'omni',
    minSupported: 0.75,
    maxFlaky: 0.12,
    allowPartial: true,
    allowExperimental: true,
  },
  {
    domain: 'workflow',
    minSupported: 0.7,
    maxFlaky: 0.15,
    allowPartial: true,
    allowExperimental: true,
  },
  {
    domain: 'environment',
    minSupported: 0.65,
    maxFlaky: 0.2,
    allowPartial: true,
    allowExperimental: true,
  },
];

export function evaluateThreshold(domain: string, metrics: DomainMetrics): ThresholdResult {
  const threshold = SUPPORT_THRESHOLDS.find((t) => t.domain === domain);

  if (!threshold) {
    return {
      passed: false,
      supportedRate: 0,
      flakyRate: 0,
      details: `No threshold defined for domain: ${domain}`,
    };
  }

  const supportedRate = metrics.totalTests > 0
    ? metrics.supportedTests / metrics.totalTests
    : 0;

  const flakyRate = metrics.totalTests > 0
    ? metrics.flakyTests / metrics.totalTests
    : 0;

  const passed = supportedRate >= threshold.minSupported
    && flakyRate <= threshold.maxFlaky;

  return {
    passed,
    supportedRate,
    flakyRate,
    details: passed
      ? `Supported: ${(supportedRate * 100).toFixed(1)}%, Flaky: ${(flakyRate * 100).toFixed(1)}%`
      : `Failed - Supported: ${(supportedRate * 100).toFixed(1)}% (min: ${(threshold.minSupported * 100).toFixed(0)}%), Flaky: ${(flakyRate * 100).toFixed(1)}% (max: ${(threshold.maxFlaky * 100).toFixed(0)}%)`,
  };
}