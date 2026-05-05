function isLocalOrigin(origin: string): boolean {
  return origin.startsWith("http://127.0.0.1:") || origin.startsWith("http://localhost:");
}

function isOpenAIOrigin(origin: string): boolean {
  return origin === "https://chatgpt.com" || origin === "https://chat.openai.com" || origin.endsWith(".openai.com");
}

export function isAllowedOrigin(origin: string | undefined, allowOrigins: string[] = []): boolean {
  if (!origin) return true;
  if (allowOrigins.includes("*")) return true;
  if (allowOrigins.includes(origin)) return true;
  return isLocalOrigin(origin) || isOpenAIOrigin(origin);
}
