// ============================================================================
// Omniscience Utils Handlers - Low-level System Functions (ES5 Strict)
// Exposes persistent storage, crypto, and encoding native functions.
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";

/**
 * Access PT native key-value memory storage.
 * Survives across commands in the same session.
 */
export function handleKVStore(payload: { action: "get" | "put" | "remove", key: string, value?: string }, deps: HandlerDeps): HandlerResult {
  var scope = (deps as any).global;
  
  try {
    if (payload.action === "put") {
      if (scope.$putData) {
        scope.$putData(payload.key, payload.value || "");
        return { ok: true, result: "STORED" };
      }
      return { ok: false, error: "$putData not found globally" };
    } 
    
    if (payload.action === "get") {
      if (scope.$getData) {
        return { ok: true, result: scope.$getData(payload.key) };
      }
      return { ok: false, error: "$getData not found globally" };
    }
    
    if (payload.action === "remove") {
      if (scope.$removeData) {
        scope.$removeData(payload.key);
        return { ok: true, result: "REMOVED" };
      }
      return { ok: false, error: "$removeData not found globally" };
    }

    return { ok: false, error: "Invalid action" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Access PT native Base64 encoding.
 */
export function handleBase64(payload: { action: "encode" | "decode", text: string }, deps: HandlerDeps): HandlerResult {
  var scope = (deps as any).global;
  if (!scope || !scope.Base64) return { ok: false, error: "Base64 not available" };

  try {
    if (payload.action === "encode") {
      return { ok: true, result: scope.Base64.encode(payload.text) };
    } else {
      return { ok: true, result: scope.Base64.decode(payload.text) };
    }
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Access PT native MD5 hashing and GUID generator.
 */
export function handleCryptoUtils(payload: { action: "md5" | "guid", text?: string }, deps: HandlerDeps): HandlerResult {
  var scope = (deps as any).global;

  try {
    if (payload.action === "guid") {
      if (typeof scope.guid === "function") {
        return { ok: true, result: scope.guid() };
      }
      return { ok: false, error: "guid() not available" };
    }

    if (payload.action === "md5" && payload.text !== undefined) {
      if (typeof scope.MD5 === "function") {
        var md = new scope.MD5();
        md.append(payload.text);
        return { ok: true, result: md.toHexString() };
      }
      return { ok: false, error: "MD5 class not available" };
    }

    return { ok: false, error: "Invalid action or missing text" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
