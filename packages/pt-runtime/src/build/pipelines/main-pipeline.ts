// packages/pt-runtime/src/build/pipelines/main-pipeline.ts
// Pipeline que valida opciones con zod, delega a renderMainV2 y aplica
// el contrato de MainArtifact sobre el resultado.

import { MainArtifact } from "../artifacts/main-artifact.js";
import {
  RenderMainV2OptionsSchema,
  type RenderMainV2OptionsInput,
} from "../schemas/build-options.schema.js";
import { renderMainV2, type RenderMainV2Options } from "../render-main-v2.js";

export function renderMainV2Pipeline(input: unknown): string {
  const options: RenderMainV2Options = RenderMainV2OptionsSchema.parse(
    input,
  ) as RenderMainV2OptionsInput;

  const result = renderMainV2(options);

  MainArtifact.assertContract(result);

  return result;
}
