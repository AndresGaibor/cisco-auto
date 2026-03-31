const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'secret',
  'token',
  'key',
  'private_key',
  'community',
  'commands',
]);

export function sanitizeLogContext<T>(value: T): T {
  return sanitizeValue(value) as T;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const output: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      output[key] = '[REDACTED]';
      continue;
    }

    output[key] = sanitizeValue(item);
  }

  return output;
}
