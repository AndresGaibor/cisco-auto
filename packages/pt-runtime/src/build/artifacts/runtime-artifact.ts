import { TslibHelperBundle, countOccurrences } from "./tslib-helper-bundle";

export interface RuntimeArtifactInput {
  bootstrap: string;
  tslibHelpers?: string;
  code: string;
}

export class RuntimeArtifact {
  /**
   * Compone el artefacto runtime.js. El parámetro `tslibHelpers` del input
   * se ignora deliberadamente: el bundle canónico lo aporta siempre
   * `TslibHelperBundle.compose()` para evitar duplicación y deriva entre
   * el bundle y los asserts contractuales.
   */
  static compose(input: RuntimeArtifactInput): string {
    return [
      TslibHelperBundle.compose(),
      input.bootstrap,
      input.code,
    ].join("\n");
  }

  static assertContract(code: string): void {
    if (!code.includes("_ptDispatch")) {
      throw new Error("runtime.js missing _ptDispatch");
    }
    if (!code.includes("runtimeDispatcher")) {
      throw new Error("runtime.js missing runtimeDispatcher");
    }
    if (!code.includes("var __values = function")) {
      throw new Error("runtime.js missing __values helper");
    }
    if (!code.includes("var __read = function")) {
      throw new Error("runtime.js missing __read helper");
    }
    if (code.includes("createKernel(")) {
      throw new Error("runtime.js must not include kernel lifecycle");
    }
    if (countOccurrences(code, "var __values = function") > 1) {
      throw new Error("runtime.js has duplicate tslib helpers");
    }
  }
}
