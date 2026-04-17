// ============================================================================
// Deep Inspect Handler - Accessing any object/method in the PT API
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";

export interface DeepInspectPayload {
  type: "deepInspect";
  /** Path to the object relative to ipc (e.g., "network().getDevice('Router0')") */
  path: string;
  /** Method to call on the resolved object */
  method?: string;
  /** Arguments to pass to the method */
  args?: any[];
}

/**
 * High-performance, dynamic inspector for the PT internal API.
 * Uses the 18k+ method map to unlock full PT capabilities.
 */
export function handleDeepInspect(payload: DeepInspectPayload, deps: HandlerDeps): HandlerResult {
  const { getIpc } = deps;
  const ipc = getIpc();
  
  if (!ipc) {
    return { ok: false, error: "IPC connection unavailable", code: "IPC_UNAVAILABLE" };
  }

  try {
    // 1. Resolve target object using a safe evaluation scope
    // We use a limited scope to prevent arbitrary JS execution outside the PT API
    const target = resolvePath(ipc, payload.path);
    
    if (!target) {
      return { ok: false, error: `Could not resolve path: ${payload.path}`, code: "PATH_NOT_RESOLVED" };
    }

    // 2. If no method is provided, return an overview of the object
    if (!payload.method) {
      return {
        ok: true,
        className: target.getClassName ? target.getClassName() : typeof target,
        methods: Object.keys(target).filter(k => typeof target[k] === 'function'),
        value: (typeof target !== 'object') ? target : "[Object]"
      };
    }

    // 3. Call the requested method
    if (typeof target[payload.method] !== 'function') {
      return { ok: false, error: `Method '${payload.method}' not found on object`, code: "METHOD_NOT_FOUND" };
    }

    const result = target[payload.method](...(payload.args || []));
    
    // 4. Return result, serializing basic types or providing info for objects
    return {
      ok: true,
      result: serializeResult(result)
    };

  } catch (error: any) {
    return { 
      ok: false, 
      error: error.message || "Unknown error during deep inspection", 
      code: "INSPECTION_FAILED" 
    };
  }
}

/**
 * Safely navigates the IPC object tree based on a string path.
 * Supports method calls in the path like getDevice('R1').getPortAt(0)
 */
function resolvePath(root: any, path: string): any {
  if (!path || path === "ipc") return root;
  
  // Basic tokenizer for path (simple implementation for PT context)
  const parts = path.split('.');
  let current = root;
  
  for (let part of parts) {
    if (!current) return null;
    
    // Check if part is a method call: name(arg)
    const methodMatch = part.match(/^(\w+)\((.*)\)$/);
    if (methodMatch) {
      const methodName = methodMatch[1];
      const argStr = methodMatch[2];
      
      if (typeof current[methodName] !== 'function') return null;
      
      // Parse simple arguments (string, number, boolean)
      const args = argStr ? argStr.split(',').map(a => {
        const trimmed = a.trim();
        if (trimmed.startsWith("'") || trimmed.startsWith("'")) return trimmed.slice(1, -1);
        if (trimmed === "true") return true;
        if (trimmed === "false") return false;
        if (!isNaN(Number(trimmed))) return Number(trimmed);
        return trimmed;
      }) : [];
      
      current = current[methodName](...args);
    } else {
      current = current[part];
    }
  }
  
  return current;
}

function serializeResult(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'object') return val;
  
  // If it's a PT native object, return its identification
  if (typeof val.getClassName === 'function') {
    return {
      __pt_object__: true,
      className: val.getClassName(),
      uuid: val.getObjectUuid ? val.getObjectUuid() : undefined
    };
  }
  
  return val;
}
