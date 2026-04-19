export type ChangeScope = 'terminal-engine' | 'omni-adapters' | 'build-kernel' | 'workflows' | 'device-handlers';

export interface ChangeRule {
  scope: ChangeScope;
  requiredSuites: string[];
  requiresVerification: boolean;
  requiresRegression: boolean;
  riskLevel: 'safe' | 'elevated' | 'dangerous';
}

export const CHANGE_SAFETY_POLICY: ChangeRule[] = [
  {
    scope: 'terminal-engine',
    requiredSuites: ['terminal-core', 'regression-smoke'],
    requiresVerification: true,
    requiresRegression: true,
    riskLevel: 'dangerous',
  },
  {
    scope: 'omni-adapters',
    requiredSuites: ['omni-safe', 'regression-smoke'],
    requiresVerification: true,
    requiresRegression: true,
    riskLevel: 'elevated',
  },
  {
    scope: 'build-kernel',
    requiredSuites: ['REGRESSION_BASELINE'],
    requiresVerification: true,
    requiresRegression: true,
    riskLevel: 'dangerous',
  },
  {
    scope: 'workflows',
    requiredSuites: ['workflow-basic', 'workflow-integration'],
    requiresVerification: true,
    requiresRegression: false,
    riskLevel: 'elevated',
  },
  {
    scope: 'device-handlers',
    requiredSuites: ['device-basic', 'link-basic'],
    requiresVerification: true,
    requiresRegression: true,
    riskLevel: 'safe',
  },
];

export function getRequiredSuites(scope: ChangeScope): string[] {
  const rule = CHANGE_SAFETY_POLICY.find((r) => r.scope === scope);
  return rule?.requiredSuites ?? [];
}

export function getRiskLevel(scope: ChangeScope): 'safe' | 'elevated' | 'dangerous' {
  const rule = CHANGE_SAFETY_POLICY.find((r) => r.scope === scope);
  return rule?.riskLevel ?? 'elevated';
}

export function requiresVerification(scope: ChangeScope): boolean {
  const rule = CHANGE_SAFETY_POLICY.find((r) => r.scope === scope);
  return rule?.requiresVerification ?? true;
}

export function requiresRegression(scope: ChangeScope): boolean {
  const rule = CHANGE_SAFETY_POLICY.find((r) => r.scope === scope);
  return rule?.requiresRegression ?? true;
}