const A = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

function truncate(v: unknown, maxLines = 80): string {
  let text: string;
  try {
    text = JSON.stringify(v, null, 2);
  } catch {
    text = String(v);
  }
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines) + `\n${A.dim}  … (${lines.length - maxLines} líneas más)${A.reset}`;
}

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

export function wrapHandler(
  toolName: string,
  handler: (input: any) => Promise<any>,
  write: (line: string) => void,
): (input: any) => Promise<any> {
  return async (input: any) => {
    const start = Date.now();

    write(`${A.yellow}  ◀ call${A.reset} ${truncate(input).replace(/\n/g, "\n     ")}`);

    try {
      const result = await handler(input);
      const dur = Date.now() - start;
      const isErr = result.isError === true;

      const display = result.structuredContent ?? result;
      const label = isErr ? `${A.red}  ▶ err${A.reset}` : `${A.green}  ▶ ok${A.reset}`;
      write(`${label} ${truncate(display, isErr ? 40 : 25).replace(/\n/g, "\n     ")} ${A.dim}${dur}ms${A.reset}`);

      return result;
    } catch (error) {
      const dur = Date.now() - start;
      const errMsg = error instanceof Error ? error.message : String(error);
      write(`${A.red}  ▶ error${A.reset} ${errMsg} ${A.dim}${dur}ms${A.reset}`);
      throw error;
    }
  };
}

export function logMcpMessage(
  body: string,
  write: (line: string) => void,
): string | null {
  try {
    const msg = JSON.parse(body);
    const method: string | undefined = msg.method;

    if (!method) return null;

    if (method === "tools/call") {
      const toolName = msg.params?.name ?? "?";
      const args = msg.params?.arguments ?? {};
      write(`\n${A.dim}╶ ${"─".repeat(60)}${A.reset}`);
      write(`${A.bold}${A.cyan}  MCP › ${toolName}${A.reset} ${A.gray}${ts()}${A.reset}`);
      return toolName;
    }

    if (method === "notifications/initialized") {
      write(`\n${A.dim}╶ ${"─".repeat(60)}${A.reset}`);
      write(`${A.blue}  MCP ◀ initialized${A.reset} ${A.gray}${ts()}${A.reset}`);
      return null;
    }

    write(`\n${A.dim}╶ ${"─".repeat(60)}${A.reset}`);
    write(`${A.magenta}  MCP ◀ ${method}${A.reset} ${A.gray}${ts()}${A.reset}`);

    const params = msg.params;
    if (params) {
      write(`${A.dim}    ${truncate(params).replace(/\n/g, "\n    ")}${A.reset}`);
    }

    return null;
  } catch {
    return null;
  }
}
