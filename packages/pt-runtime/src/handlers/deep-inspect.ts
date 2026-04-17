// ============================================================================
// Deep Inspect Handler - Accessing any object/method in the PT API
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";

export interface DeepInspectPayload {
  type: "deepInspect";
  /** Path to the object relative to global scope (e.g., "AssessmentModel") or ipc (e.g., "network().getDevice('Router0')") */
  path: string;
  /** Method to call on the resolved object */
  method?: string;
  /** Arguments to pass to the method */
  args?: any[];
}

/**
 * High-performance, dynamic inspector for the PT internal API.
 * Uses the 18k+ method map to unlock full PT capabilities.
 * 
 * Supports three levels of resolution:
 * 1. Global Scope (this) - For system objects like AssessmentModel, Simulation.
 * 2. IPC Scope (ipc) - For network topology and device control.
 * 3. Privileged Scope (_ScriptModule) - For file system and low-level IPC.
 */
export function handleDeepInspect(payload: DeepInspectPayload, deps: HandlerDeps): HandlerResult {
  const { ipc, global, privileged } = deps;
  
  if (!ipc && !global) {
    return { ok: false, error: "Runtime environment unavailable", code: "IPC_UNAVAILABLE" };
  }

  try {
    // 1. Resolve target object using Global Search Order:
    // a. Check Global Scope first (this includes AssessmentModel, scriptEngine, etc.)
    let target = resolvePath(global, payload.path);
    
    // b. Fallback to IPC (where most network methods live)
    if (!target) {
        target = resolvePath(ipc, payload.path);
    }
    
    // c. Fallback to Privileged object (_ScriptModule)
    if (!target && privileged) {
        target = resolvePath(privileged, payload.path);
    }

    if (!target) {
      return { ok: false, error: "Could not resolve path: " + payload.path, code: "PATH_NOT_RESOLVED" };
    }

    // 2. If no method is provided, return an overview of the object
    if (!payload.method) {
      var methods: string[] = [];
      try {
          for (var k in target) {
              if (typeof target[k] === 'function') methods.push(k);
          }
      } catch(e) {}

      return {
        ok: true,
        className: (typeof target.getClassName === 'function') ? target.getClassName() : typeof target,
        methods: methods,
        value: (typeof target !== 'object') ? target : "[Object]"
      };
    }

    // 3. Call the requested method
    if (typeof target[payload.method] !== 'function') {
      return { ok: false, error: "Method '" + payload.method + "' not found on object", code: "METHOD_NOT_FOUND" };
    }

    var result = target[payload.method].apply(target, payload.args || []);
    
    // 4. Return result, serializing basic types or providing info for objects
    return {
      ok: true,
      result: serializeResult(result)
    };

  } catch (error: any) {
    var errMsg = "DEEP_INSPECT_ERROR: " + (error.message || error);
    try {
        if (deps.dprint) deps.dprint(errMsg);
    } catch(e) {}
    
    return { 
      ok: false, 
      error: errMsg, 
      code: "INSPECTION_FAILED" 
    };
  }
}

/**
 * Safely navigates the IPC object tree based on a string path.
 * Supports method calls in the path like getDevice('R1').getPortAt(0)
 */
function resolvePath(root: any, path: string): any {
  if (!root) return null;
  if (!path || path === "ipc" || path === "global" || path === "this") return root;
  
  var parts = path.split('.');
  var current = root;
  
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (!current) return null;
    
    // Check if part is a method call: name(arg)
    var methodMatch = part.match(/^(\w+)\((.*)\)$/);
    if (methodMatch) {
      var methodName = methodMatch[1];
      var argStr = methodMatch[2];
      
      if (typeof current[methodName] !== 'function') return null;
      
      // Parse simple arguments
      var args = argStr ? argStr.split(',').map(function(a) {
        var trimmed = a.trim();
        if (trimmed.startsWith("'") || trimmed.startsWith("\"")) return trimmed.slice(1, -1);
        if (trimmed === "true") return true;
        if (trimmed === "false") return false;
        if (!isNaN(Number(trimmed))) return Number(trimmed);
        return trimmed;
      }) : [];
      
      current = current[methodName].apply(current, args);
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
      uuid: (typeof val.getObjectUuid === 'function') ? val.getObjectUuid() : undefined
    } as any;
  }
  
  return val;
}
