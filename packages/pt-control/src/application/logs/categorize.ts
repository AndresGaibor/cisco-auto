export function categorizeLogErrorLayer(
  action: string,
  message: string,
): "bridge" | "pt" | "ios" | "verification" | "other" {
  const lowerAction = action.toLowerCase();
  const lowerMessage = message.toLowerCase();

  if (
    lowerAction.includes("bridge") ||
    lowerMessage.includes("lease") ||
    lowerMessage.includes("queue")
  ) {
    return "bridge";
  }

  if (
    lowerAction.includes("pt") ||
    lowerMessage.includes("runtime") ||
    lowerMessage.includes("terminal")
  ) {
    return "pt";
  }

  if (
    lowerAction.includes("ios") ||
    lowerAction.includes("config") ||
    lowerMessage.includes("command")
  ) {
    return "ios";
  }

  if (lowerMessage.includes("verif")) {
    return "verification";
  }

  return "other";
}

export function extractPayloadDevice(entry: { metadata?: unknown }): string | undefined {
  const metadata =
    entry.metadata && typeof entry.metadata === "object"
      ? (entry.metadata as Record<string, unknown>)
      : undefined;

  const payloadPreview =
    metadata?.payloadPreview && typeof metadata.payloadPreview === "object"
      ? (metadata.payloadPreview as Record<string, unknown>)
      : undefined;

  const device = payloadPreview?.device;

  return typeof device === "string" ? device : undefined;
}