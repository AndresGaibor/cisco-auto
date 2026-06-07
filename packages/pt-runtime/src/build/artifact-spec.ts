import * as path from "path";

export type ArtifactKind = "main" | "runtime" | "catalog";

export interface ArtifactSpec {
  kind: ArtifactKind;
  srcDir: string;
  devDir: string;
  outputPath: string;
  minify: boolean;
}

export function createArtifactSpec(
  input: Partial<ArtifactSpec> & Pick<ArtifactSpec, "kind" | "srcDir" | "devDir" | "outputPath">,
): ArtifactSpec {
  return {
    kind: input.kind,
    srcDir: path.resolve(input.srcDir),
    devDir: path.resolve(input.devDir),
    outputPath: input.outputPath,
    minify: input.minify ?? false,
  };
}
