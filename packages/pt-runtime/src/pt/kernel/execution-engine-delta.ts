// Stub simple: retorna el output desde el baseline
export const getNativeDeltaForCurrentStep = (_job: { context: { nativeBaselineOutput: string } }, currentOutput: string, _command: string): string => {
  const ctx = _job.context;
  const baseline = ctx.nativeBaselineOutput || "";
  if (currentOutput.length <= baseline.length) return "";
  return currentOutput.slice(baseline.length);
};
