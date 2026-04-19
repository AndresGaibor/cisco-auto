export interface SuiteResult {
  suiteId: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  flakyTests: number;
}

export interface RegressionGate {
  suiteId: string;
  name: string;
  severity: 'critical' | 'major' | 'minor';
  domainsAffected: string[];
  threshold: {
    minPassRate: number;
    maxFlakyRate: number;
  };
}

export interface GateResult {
  passed: boolean;
  passRate: number;
  flakyRate: number;
  details: string;
}

export const REGRESSION_GATES: RegressionGate[] = [
  {
    suiteId: 'terminal-core',
    name: 'Terminal Core Regression',
    severity: 'critical',
    domainsAffected: ['terminal-input', 'terminal-output', 'terminal-history'],
    threshold: { minPassRate: 0.9, maxFlakyRate: 0.05 },
  },
  {
    suiteId: 'device-basic',
    name: 'Device Basic Operations',
    severity: 'critical',
    domainsAffected: ['device-create', 'device-delete', 'device-config'],
    threshold: { minPassRate: 0.85, maxFlakyRate: 0.1 },
  },
  {
    suiteId: 'link-basic',
    name: 'Link Basic Operations',
    severity: 'critical',
    domainsAffected: ['link-create', 'link-delete', 'link-state'],
    threshold: { minPassRate: 0.85, maxFlakyRate: 0.1 },
  },
  {
    suiteId: 'workflow-basic',
    name: 'Workflow Basic Execution',
    severity: 'major',
    domainsAffected: ['workflow-exec', 'workflow-validation'],
    threshold: { minPassRate: 0.8, maxFlakyRate: 0.15 },
  },
  {
    suiteId: 'omni-safe',
    name: 'Omni Safe Operations',
    severity: 'major',
    domainsAffected: ['omni-read', 'omni-privileged'],
    threshold: { minPassRate: 0.85, maxFlakyRate: 0.1 },
  },
  {
    suiteId: 'experimental-api',
    name: 'Experimental API Features',
    severity: 'minor',
    domainsAffected: ['experimental', 'beta'],
    threshold: { minPassRate: 0.6, maxFlakyRate: 0.25 },
  },
];

export function evaluateGate(results: SuiteResult[], gate: RegressionGate): GateResult {
  const suiteResult = results.find((r) => r.suiteId === gate.suiteId);

  if (!suiteResult) {
    return {
      passed: false,
      passRate: 0,
      flakyRate: 0,
      details: `Suite ${gate.suiteId} not executed`,
    };
  }

  const passRate = suiteResult.totalTests > 0
    ? suiteResult.passedTests / suiteResult.totalTests
    : 0;

  const flakyRate = suiteResult.totalTests > 0
    ? suiteResult.flakyTests / suiteResult.totalTests
    : 0;

  const passed = passRate >= gate.threshold.minPassRate
    && flakyRate <= gate.threshold.maxFlakyRate;

  return {
    passed,
    passRate,
    flakyRate,
    details: passed
      ? `Pass rate: ${(passRate * 100).toFixed(1)}%, Flaky: ${(flakyRate * 100).toFixed(1)}%`
      : `Failed - Pass: ${(passRate * 100).toFixed(1)}% (min: ${(gate.threshold.minPassRate * 100).toFixed(0)}%), Flaky: ${(flakyRate * 100).toFixed(1)}% (max: ${(gate.threshold.maxFlakyRate * 100).toFixed(0)}%)`,
  };
}

export function getCriticalGates(): RegressionGate[] {
  return REGRESSION_GATES.filter((g) => g.severity === 'critical');
}

export function getGatesBySeverity(severity: 'critical' | 'major' | 'minor'): RegressionGate[] {
  return REGRESSION_GATES.filter((g) => g.severity === severity);
}