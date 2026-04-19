// ============================================================================
// Omni Adapters - Capacidades de bajo nivel / hacks
// ============================================================================

export interface OmniResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  evidence?: Record<string, unknown>;
  confidence?: number;
}

// Evaluation adapter - evaluación de expresiones
export function evaluateExpression(code: string, global: any): OmniResult {
  try {
    const result = global.scriptEngine?.evaluate?.(code);
    return {
      ok: true,
      value: result,
      evidence: { code, result },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "EVAL_FAILED" };
  }
}

// Assessment adapter - lectura de assessment items
export function getAssessmentItem(itemId: string, assessment: any): OmniResult {
  try {
    const value = assessment.getAssessmentItemValue?.(itemId);
    const correct = assessment.isAssessmentItemCorrect?.(itemId);
    return {
      ok: true,
      value: { itemId, value, correct },
      evidence: { itemId, value, correct },
      confidence: correct ? 1 : 0,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "ASSESSMENT_GET_FAILED" };
  }
}

// Global scope adapter - acceso a globals de PT
export function accessGlobal(key: string, global: any): OmniResult {
  try {
    const value = global[key];
    return {
      ok: true,
      value,
      evidence: { key, value: typeof value },
      confidence: value !== undefined ? 1 : 0,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "GLOBAL_ACCESS_FAILED" };
  }
}

// Process adapter - control de procesos
export function getProcess(name: string, device: any): OmniResult {
  try {
    const proc = device.getProcess?.(name);
    return {
      ok: true,
      value: proc,
      evidence: { name, found: !!proc },
      confidence: proc ? 1 : 0,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "PROCESS_GET_FAILED" };
  }
}

// Environment adapter - acceso al environment
export function getEnvironmentInfo(app: any): OmniResult {
  try {
    const version = app.getVersion?.();
    const workspace = app.getActiveWorkspace?.();
    return {
      ok: true,
      value: { version, workspace },
      evidence: { version },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "ENV_GET_FAILED" };
  }
}

// Serialization adapter - serialize devices
export function serializeDevice(device: any): OmniResult {
  try {
    const xml = device.serializeToXml?.();
    return {
      ok: true,
      value: xml,
      evidence: { xmlLength: xml?.length },
      confidence: xml ? 1 : 0,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "SERIALIZE_FAILED" };
  }
}