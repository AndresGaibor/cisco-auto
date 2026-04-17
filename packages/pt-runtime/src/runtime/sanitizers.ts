// packages/pt-runtime/src/runtime/sanitizers.ts
// Funciones de sanitización (limpieza de datos, NO validación)

export function sanitizeDeviceName(name: string): string {
  return String(name || "")
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .substring(0, 64);
}

export function sanitizePath(path: string, devDir: string): string {
  var clean = String(path || "").replace(/\0/g, "");

  if (clean.charAt(0) === "/") {
    return devDir + "/" + clean.substring(1);
  }

  if (clean.indexOf("..") >= 0) {
    return devDir + "/" + clean.replace(/\.\./g, "");
  }

  return devDir + "/" + clean;
}

export function safeJsonParse(text: string): unknown {
  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return null;
  }

  if (parsed === null || typeof parsed !== "object") {
    return parsed;
  }

  return stripDangerousKeys(parsed);
}

function stripDangerousKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    var result = [];
    for (var i = 0; i < obj.length; i++) {
      result.push(stripDangerousKeys(obj[i]));
    }
    return result;
  }

  var clean: Record<string, unknown> = {};
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    clean[key] = stripDangerousKeys((obj as Record<string, unknown>)[key]);
  }
  return clean;
}
