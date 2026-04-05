const SENSITIVE_KEYWORDS = [
  'password',
  'secret',
  'community',
  'key',
  'token',
  'auth',
  'credential',
  'passphrase',
];

const SENSITIVE_PATTERNS = [
  /username\s+[^\s]+/i,
  /user\s+[^\s]+/i,
  /password\s+[^\s]+/i,
  /pass\s+[^\s]+/i,
  /pwd\s+[^\s]+/i,
  /\s+password\s*=\s*[^\s]+/i,
  /\s+secret\s*=\s*[^\s]+/i,
  /\s+key\s*=\s*[^\s]+/i,
  /\s+token\s*=\s*[^\s]+/i,
  /enable\s+password/i,
  /enable\s+secret/i,
];

const KEY_REDACTION = '[REDACTED]';

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => lowerKey.includes(keyword));
}

export function redactObject(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return redactCommandText(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactObject(item));
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        result[key] = KEY_REDACTION;
      } else {
        result[key] = redactObject(value);
      }
    }
    return result;
  }

  return input;
}

export function redactCommandText(command: string): string {
  let result = command;

  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, (match) => {
      const parts = match.split(/\s+/);
      const sensitiveIndex = parts.findIndex((part) =>
        SENSITIVE_KEYWORDS.some(
          (kw) => part.toLowerCase().includes(kw) || part === 'password' || part === 'pass' || part === 'pwd'
        )
      );

      if (sensitiveIndex >= 0 && sensitiveIndex < parts.length - 1) {
        const prefix = parts.slice(0, sensitiveIndex + 1).join(' ');
        return `${prefix} ${KEY_REDACTION}`;
      }

      return match.replace(/\S+$/, KEY_REDACTION);
    });
  }

  return result;
}

export function redactCommands(commands: string[]): string[] {
  return commands.map(redactCommandText);
}