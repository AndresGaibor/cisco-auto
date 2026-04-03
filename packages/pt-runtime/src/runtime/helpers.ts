/**
 * PT Runtime Helpers
 * Utility functions used by handlers
 */

/**
 * Format error message with optional context
 */
function formatError(message: string, context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }

  var result = message + " [";
  var first = true;

  for (var key in context) {
    if (context.hasOwnProperty(key)) {
      if (!first) result += ", ";
      result += key + "=" + JSON.stringify(context[key]);
      first = false;
    }
  }

  result += "]";
  return result;
}

/**
 * Safely get a string value with type checking
 */
function safeGetString(obj: any, key: string): string | null {
  if (!obj || typeof obj !== "object") return null;
  var value = obj[key];
  return typeof value === "string" ? value : null;
}

/**
 * Safely get a number value with type checking
 */
function safeGetNumber(obj: any, key: string): number | null {
  if (!obj || typeof obj !== "object") return null;
  var value = obj[key];
  return typeof value === "number" ? value : null;
}

/**
 * Safely get a boolean value with type checking
 */
function safeGetBoolean(obj: any, key: string): boolean | null {
  if (!obj || typeof obj !== "object") return null;
  var value = obj[key];
  return typeof value === "boolean" ? value : null;
}

/**
 * Log with timestamp
 */
function logWithTime(dprint: (msg: string) => void, message: string): void {
  var now = new Date().toISOString();
  dprint("[" + now + "] " + message);
}

/**
 * Create error result
 */
function errorResult(error: string, context?: Record<string, unknown>): any {
  return {
    ok: false,
    error: formatError(error, context),
  };
}

/**
 * Create success result
 */
function successResult(value: unknown): any {
  return {
    ok: true,
    value: value,
  };
}

/**
 * Validate object has required keys
 */
function hasKeys(obj: any, keys: string[]): boolean {
  if (!obj || typeof obj !== "object") return false;
  for (var i = 0; i < keys.length; i++) {
    if (!(keys[i] in obj)) {
      return false;
    }
  }
  return true;
}

/**
 * Clamp number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
