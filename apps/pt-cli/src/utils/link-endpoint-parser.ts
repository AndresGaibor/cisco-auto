export interface LinkEndpoint {
  device: string;
  port: string;
}

export interface ParsedLinkEndpoints {
  a: LinkEndpoint;
  b: LinkEndpoint;
}

function splitEndpoint(value: string): LinkEndpoint {
  const index = value.indexOf(":");
  if (index <= 0 || index === value.length - 1) {
    throw new Error(`Endpoint inválido '${value}'. Usa formato Device:Port, por ejemplo R1:Gi0/0.`);
  }

  return {
    device: value.slice(0, index).trim(),
    port: value.slice(index + 1).trim(),
  };
}

export function parseLinkEndpointArgs(args: string[]): ParsedLinkEndpoints {
  const clean = args.filter(Boolean);

  if (clean.length === 1 && clean[0]?.includes(":")) {
    return {
      a: splitEndpoint(clean[0]!),
      b: { device: "", port: "" },
    };
  }

  if (clean.length === 2 && clean[0]?.includes(":") && clean[1]?.includes(":")) {
    return {
      a: splitEndpoint(clean[0]!),
      b: splitEndpoint(clean[1]!),
    };
  }

  if (clean.length === 4) {
    return {
      a: { device: clean[0]!, port: clean[1]! },
      b: { device: clean[2]!, port: clean[3]! },
    };
  }

  throw new Error(
    [
      "Uso inválido de link.",
      "Formatos soportados:",
      "  bun run pt link add R1:Gi0/0 S1:Fa0/1",
      "  bun run pt link add R1 Gi0/0 S1 Fa0/1",
    ].join("\n"),
  );
}
