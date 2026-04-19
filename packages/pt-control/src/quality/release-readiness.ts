import { REGRESSION_GATES, evaluateGate, type SuiteResult } from './regression-gates';
import { evaluateThreshold, SUPPORT_THRESHOLDS, type DomainMetrics } from './support-thresholds';

export interface ReadinessInput {
  suiteResults: SuiteResult[];
  domainMetrics: Record<string, DomainMetrics>;
  debtItems: {
    total: number;
    accepted: number;
    overdue: number;
  };
}

export interface BaselineStatus {
  passed: boolean;
  suitesRun: number;
  passedSuites: number;
}

export interface RegressionStatus {
  criticalFailed: boolean;
  majorFailed: boolean;
  newlyBroken: string[];
}

export interface DebtStatus {
  totalItems: number;
  acceptedItems: number;
  overdueItems: number;
}

export interface QualityStatus {
  supportedDomains: number;
  experimentalDomains: number;
  brokenDomains: number;
}

export interface ReleaseReadiness {
  baseline: BaselineStatus;
  regressions: RegressionStatus;
  debt: DebtStatus;
  quality: QualityStatus;
  ready: 'ready' | 'not-ready' | 'conditionally-ready';
  summary: string;
}

export function evaluateReleaseReadiness(input: ReadinessInput): ReleaseReadiness {
  const criticalGates = REGRESSION_GATES.filter((g) => g.severity === 'critical');
  const majorGates = REGRESSION_GATES.filter((g) => g.severity === 'major');

  const criticalResults = criticalGates.map((gate) => evaluateGate(input.suiteResults, gate));
  const majorResults = majorGates.map((gate) => evaluateGate(input.suiteResults, gate));

  const criticalFailed = criticalResults.some((r) => !r.passed);
  const majorFailed = majorResults.some((r) => !r.passed);

  const newlyBroken: string[] = [];
  for (const gate of [...criticalGates, ...majorGates]) {
    const result = evaluateGate(input.suiteResults, gate);
    if (!result.passed) {
      newlyBroken.push(gate.suiteId);
    }
  }

  const domainStatuses: Array<'supported' | 'experimental' | 'broken'> = [];
  for (const threshold of SUPPORT_THRESHOLDS) {
    const metrics = input.domainMetrics[threshold.domain] ?? {
      supportedTests: 0,
      totalTests: 0,
      flakyTests: 0,
    };
    const result = evaluateThreshold(threshold.domain, metrics);

    if (threshold.allowExperimental) {
      domainStatuses.push(result.passed ? 'experimental' : 'broken');
    } else {
      domainStatuses.push(result.passed ? 'supported' : 'broken');
    }
  }

  const supportedDomains = domainStatuses.filter((s) => s === 'supported').length;
  const experimentalDomains = domainStatuses.filter((s) => s === 'experimental').length;
  const brokenDomains = domainStatuses.filter((s) => s === 'broken').length;

  const debt = input.debtItems;
  const overdueRatio = debt.total > 0 ? debt.overdue / debt.total : 0;
  const hasHighDebt = overdueRatio > 0.1;

  const baseline: BaselineStatus = {
    passed: !criticalFailed,
    suitesRun: input.suiteResults.length,
    passedSuites: input.suiteResults.filter((r) => r.passedTests > 0).length,
  };

  const regressions: RegressionStatus = {
    criticalFailed,
    majorFailed,
    newlyBroken,
  };

  const debtStatus: DebtStatus = {
    totalItems: debt.total,
    acceptedItems: debt.accepted,
    overdueItems: debt.overdue,
  };

  const quality: QualityStatus = {
    supportedDomains,
    experimentalDomains,
    brokenDomains,
  };

  let ready: 'ready' | 'not-ready' | 'conditionally-ready';
  let summary: string;

  if (criticalFailed) {
    ready = 'not-ready';
    summary = `Fallo crítico: ${newlyBroken.join(', ') || 'sin suites disponibles'}`;
  } else if (hasHighDebt) {
    ready = 'conditionally-ready';
    summary = `Deuda técnica elevada: ${debt.overdue}/${debt.total} items vencidos`;
  } else if (brokenDomains > SUPPORT_THRESHOLDS.length * 0.3) {
    ready = 'conditionally-ready';
    summary = `${brokenDomains} dominios rotos (${supportedDomains} OK)`;
  } else if (majorFailed) {
    ready = 'conditionally-ready';
    summary = `Fallos mayores: ${newlyBroken.join(', ')}`;
  } else {
    ready = 'ready';
    summary = 'Todos los gates pasaron';
  }

  return {
    baseline,
    regressions,
    debt: debtStatus,
    quality,
    ready,
    summary,
  };
}