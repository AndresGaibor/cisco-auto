import * as path from "path";
import {
  type ArtifactKind,
  type ArtifactSpec,
  createArtifactSpec,
} from "./artifact-spec";

export interface BuildContext {
  specs: Record<ArtifactKind, ArtifactSpec>;
  minify: boolean;
  devDir: string;
}

export function createBuildContext(config: {
  devDir: string;
  outputDir?: string;
  minify?: boolean;
  srcDir: string;
}): BuildContext {
  const minify = config.minify ?? false;
  const outputDir = config.outputDir ?? config.devDir;
  const srcDir = config.srcDir;
  const devDir = config.devDir;

  const baseName: Record<ArtifactKind, string> = {
    main: "main.js",
    runtime: "runtime.js",
    catalog: "catalog.js",
  };

  const specs: Record<ArtifactKind, ArtifactSpec> = {
    main: createArtifactSpec({
      kind: "main",
      srcDir,
      devDir,
      outputPath: path.join(outputDir, baseName.main),
      minify,
    }),
    runtime: createArtifactSpec({
      kind: "runtime",
      srcDir,
      devDir,
      outputPath: path.join(outputDir, baseName.runtime),
      minify,
    }),
    catalog: createArtifactSpec({
      kind: "catalog",
      srcDir,
      devDir,
      outputPath: path.join(outputDir, baseName.catalog),
      minify,
    }),
  };

  return { specs, minify, devDir };
}

export function getSpec(ctx: BuildContext, kind: ArtifactKind): ArtifactSpec {
  return ctx.specs[kind];
}

export function withSpec(
  ctx: BuildContext,
  kind: ArtifactKind,
  patch: Partial<ArtifactSpec>,
): BuildContext {
  const updated: ArtifactSpec = { ...ctx.specs[kind], ...patch };
  const specs: Record<ArtifactKind, ArtifactSpec> = { ...ctx.specs, [kind]: updated };
  return { ...ctx, specs };
}
