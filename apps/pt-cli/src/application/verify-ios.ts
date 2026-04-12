import { deriveIosConfidence, type IosExecutionEvidence, type IosExecutionSuccess } from '@cisco-auto/pt-control';

export interface IosVerificationCheck {
  name: string;
  ok: boolean;
  details?: Record<string, unknown>;
}

export interface IosVerificationReport {
  ok: boolean;
  confidence: ReturnType<typeof deriveIosConfidence>;
  evidence: IosExecutionEvidence;
  checks: IosVerificationCheck[];
}

export function buildIosVerificationChecks(evidence: IosExecutionEvidence): IosVerificationCheck[] {
  return [
    { name: 'source-terminal', ok: evidence.source === 'terminal', details: { source: evidence.source } },
    { name: 'status-zero', ok: evidence.status === 0, details: { status: evidence.status } },
    { name: 'mode-present', ok: Boolean(evidence.mode), details: { mode: evidence.mode } },
    { name: 'prompt-present', ok: Boolean(evidence.prompt), details: { prompt: evidence.prompt } },
    { name: 'paging-off', ok: evidence.paging === false || evidence.paging === undefined, details: { paging: evidence.paging } },
    { name: 'awaiting-confirmation-off', ok: evidence.awaitingConfirm === false || evidence.awaitingConfirm === undefined, details: { awaitingConfirm: evidence.awaitingConfirm } },
  ];
}

export function buildIosVerificationReport(evidence: IosExecutionEvidence): IosVerificationReport {
  const checks = buildIosVerificationChecks(evidence);
  const ok = checks.every((check) => check.ok);
  return {
    ok,
    confidence: deriveIosConfidence(evidence, { verified: ok }),
    evidence,
    checks,
  };
}

export function renderIosVerificationReport(report: IosVerificationReport): string {
  const lines: string[] = [];
  lines.push('IOS verification report');
  lines.push(`Confidence: ${report.confidence}`);
  lines.push(`Result: ${report.ok ? 'PASS' : 'FAIL'}`);
  lines.push('');

  for (const check of report.checks) {
    const status = check.ok ? 'PASS' : 'FAIL';
    const details = check.details ? ` ${JSON.stringify(check.details)}` : '';
    lines.push(`- [${status}] ${check.name}${details}`);
  }

  lines.push('');
  lines.push(`source=${report.evidence.source}`);
  lines.push(`status=${report.evidence.status ?? 'n/a'}`);
  lines.push(`mode=${report.evidence.mode ?? 'n/a'}`);
  lines.push(`prompt=${report.evidence.prompt ?? 'n/a'}`);
  lines.push(`paging=${report.evidence.paging ?? 'n/a'}`);
  lines.push(`awaitingConfirm=${report.evidence.awaitingConfirm ?? 'n/a'}`);
  return lines.join('\n');
}

export function parseEvidenceInput(input: string): IosExecutionEvidence {
  const parsed = JSON.parse(input) as Partial<IosExecutionEvidence>;
  if (!parsed || typeof parsed.source !== 'string') {
    throw new Error('Invalid evidence payload: missing source');
  }
  return {
    source: parsed.source as IosExecutionEvidence['source'],
    status: typeof parsed.status === 'number' ? parsed.status : undefined,
    mode: parsed.mode,
    prompt: parsed.prompt,
    paging: parsed.paging,
    awaitingConfirm: parsed.awaitingConfirm,
    autoDismissedInitialDialog: parsed.autoDismissedInitialDialog,
    completionReason: parsed.completionReason,
    commandTimeoutMs: parsed.commandTimeoutMs,
  };
}

export function evidenceFromResult(result: IosExecutionSuccess): IosExecutionEvidence {
  return result.evidence;
}
