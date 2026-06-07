const defaultHeader = "// Catalog - constantes estáticas de PT\n";

export interface CatalogArtifactInput {
  constants: string;
  header?: string;
}

export class CatalogArtifact {
  static compose(input: CatalogArtifactInput): string {
    return (input.header ?? defaultHeader) + input.constants;
  }

  static assertContract(code: string): void {
    if (!code.includes("PT_CATALOG")) {
      throw new Error("catalog.js missing PT_CATALOG");
    }
    if (code.includes("createKernel(")) {
      throw new Error("catalog.js must not include kernel lifecycle");
    }
    if (code.includes("runtimeDispatcher(")) {
      throw new Error("catalog.js must not include runtime dispatcher");
    }
  }
}
