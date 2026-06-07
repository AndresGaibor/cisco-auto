import { TslibHelperBundle, countOccurrences } from "./tslib-helper-bundle";

export interface MainArtifactInput {
  header: string;
  kernelIife: string;
  fileLoader: string;
  entryPoints: string;
}

export class MainArtifact {
  static compose(input: MainArtifactInput): string {
    return [
      input.header,
      TslibHelperBundle.compose(),
      input.kernelIife,
      input.fileLoader,
      input.entryPoints,
    ].join("\n");
  }

  static assertContract(code: string): void {
    if (!code.includes("function main()")) {
      throw new Error("main.js missing function main()");
    }
    if (!code.includes("function cleanUp()")) {
      throw new Error("main.js missing function cleanUp()");
    }
    if (!code.includes("createKernel(")) {
      throw new Error("main.js missing createKernel()");
    }
    if (!code.includes("_ptLoadModule")) {
      throw new Error("main.js missing _ptLoadModule");
    }
    if (code.includes("runtimeDispatcher(")) {
      throw new Error("main.js must not include runtime dispatcher");
    }
    if (countOccurrences(code, "var __values = function") > 1) {
      throw new Error("main.js has duplicate tslib helpers");
    }
  }
}
