// ============================================================================
// Evaluate Handler - THE NUCLEAR OPTION (V2)
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";

export interface EvaluatePayload {
  type: "__evaluate";
  code: string;
}

export function handleEvaluate(payload: EvaluatePayload, deps: HandlerDeps): HandlerResult {
  // EXPOSICIÓN DE CONTEXTO: Hacemos que estas variables estén disponibles para el eval()
  var ipc = deps.ipc;
  var privileged = deps.privileged;
  var global = (deps as any).global;
  var dprint = deps.dprint;
  
  // SHORTCUTS (Los "Atajos de Dios")
  var n = ipc.network();
  var w = (deps as any).getLW ? (deps as any).getLW() : null;
  if (!w && global.appWindow) {
      try { w = global.appWindow.getActiveWorkspace().getLogicalWorkspace(); } catch(e) {}
  }

  try {
    // Usamos eval nativo de QtScript. 
    // Ahora el código puede usar 'ipc', 'privileged', etc.
    var result = eval(payload.code);
    
    return {
      ok: true,
      result: serializeResult(result)
    };
  } catch (error: any) {
    var errMsg = "EVAL_ERROR: " + String(error.message || error);
    if (dprint) dprint(errMsg);
    
    return {
      ok: false,
      error: errMsg,
      code: "EVALUATION_FAILED"
    };
  }
}

function serializeResult(val: any): any {
  if (val === null || val === undefined) return null;
  var type = typeof val;
  
  if (type === "string" || type === "number" || type === "boolean") return val;
  
  if (type === "object") {
    if (typeof val.getClassName === 'function') {
        return "[PT_OBJECT:" + val.getClassName() + "]";
    }
    
    if (val instanceof Array) {
        var arr = [];
        for (var i = 0; i < val.length; i++) {
            arr.push(serializeResult(val[i]));
        }
        return arr;
    }

    var obj: any = {};
    var count = 0;
    for (var k in val) {
        if (Object.prototype.hasOwnProperty.call(val, k)) {
            obj[k] = serializeResult(val[k]);
            count++;
        }
    }
    return count > 0 ? obj : "[Object]";
  }
  
  return String(val);
}
