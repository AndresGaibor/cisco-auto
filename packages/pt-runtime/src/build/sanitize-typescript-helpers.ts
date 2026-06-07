export function sanitizeTypeScriptHelperGlobalThis(code: string): string {
  return code
    .replace(
      /var __assign = \(this && this\.__assign\) \|\| function \(\) \{/g,
      "var __assign = function () {",
    )
    .replace(
      /var __awaiter = \(this && this\.__awaiter\) \|\| function \(thisArg, _arguments, P, generator\) \{/g,
      "var __awaiter = function (thisArg, _arguments, P, generator) {",
    )
    .replace(
      /var __generator = \(this && this\.__generator\) \|\| function \(thisArg, body\) \{/g,
      "var __generator = function (thisArg, body) {",
    )
    .replace(
      /var __values = \(this && this\.__values\) \|\| function\(o\) \{/g,
      "var __values = function(o) {",
    )
    .replace(
      /var __values = \(this && this\.__values\) \|\| function \(o\) \{/g,
      "var __values = function (o) {",
    )
    .replace(
      /var __read = \(this && this\.__read\) \|\| function \(o, n\) \{/g,
      "var __read = function (o, n) {",
    )
    .replace(
      /var __spreadArray = \(this && this\.__spreadArray\) \|\| function \(to, from, pack\) \{/g,
      "var __spreadArray = function (to, from, pack) {",
    )
    .replace(
      /var __rest = \(this && this\.__rest\) \|\| function \(s, e\) \{/g,
      "var __rest = function (s, e) {",
    );
}

export const REQUIRED_TSLIB_HELPERS: readonly string[] = [
  "__assign",
  "__values",
  "__read",
  "__spreadArray",
  "__awaiter",
  "__generator",
  "__rest",
];

export function hasAllTslibHelpers(code: string): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const helper of REQUIRED_TSLIB_HELPERS) {
    if (!code.includes(`var ${helper} = function`)) {
      missing.push(helper);
    }
  }
  return { ok: missing.length === 0, missing };
}

export function assertTslibHelpersOrThrow(label: string, code: string): void {
  const { ok, missing } = hasAllTslibHelpers(code);
  if (!ok) {
    throw new Error(
      `[${label}] missing tslib helper definitions: ${missing.join(", ")}`,
    );
  }
}
