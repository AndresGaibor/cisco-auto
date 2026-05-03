export function toPtRuntimePath(input: string): string {
  return input.replace(/\\/g, "/").replace(/\/+$/g, "");
}

export function toPtRuntimePathLiteral(input: string): string {
  return JSON.stringify(toPtRuntimePath(input));
}
