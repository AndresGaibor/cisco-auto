import { RuntimeArtifact } from "../artifacts/runtime-artifact.js";
import {
  RenderRuntimeV2OptionsSchema,
  type RenderRuntimeV2OptionsInput,
} from "../schemas/build-options.schema.js";
import {
  renderRuntimeV2Sync,
  type RenderRuntimeV2Options,
} from "../render-runtime-v2.js";

export function renderRuntimeV2Pipeline(input: unknown): string {
  const opciones: RenderRuntimeV2OptionsInput = RenderRuntimeV2OptionsSchema.parse(input);

  const opcionesRender: RenderRuntimeV2Options = {
    srcDir: opciones.srcDir,
    outputPath: opciones.outputPath,
    injectDevDir: opciones.injectDevDir,
    minify: opciones.minify,
  };

  const resultado = renderRuntimeV2Sync(opcionesRender);

  RuntimeArtifact.assertContract(resultado);

  return resultado;
}
