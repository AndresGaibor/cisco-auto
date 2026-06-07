import {
  type ArtifactKind,
  type ArtifactPage,
  pageFromContent,
} from "./artifact-page";

export interface ArtifactRenderContext {
  srcDir: string;
  outputPath: string;
  minify?: boolean;
}

export interface ArtifactFactory {
  // eslint-disable-next-line no-unused-vars
  render(kind: ArtifactKind, ctx: ArtifactRenderContext): string;
  // eslint-disable-next-line no-unused-vars
  page(kind: ArtifactKind, ctx: ArtifactRenderContext): ArtifactPage;
  // eslint-disable-next-line no-unused-vars
  assertContract(kind: ArtifactKind, content: string): void;
}

export interface ArtifactComposer {
  // eslint-disable-next-line no-unused-vars
  (ctx: ArtifactRenderContext): string;
}

export interface ArtifactContract {
  // eslint-disable-next-line no-unused-vars
  (code: string): void;
}

export type ArtifactMarkers = Readonly<Record<string, boolean>>;

export interface ArtifactFactoryDeps {
  mainComposer: ArtifactComposer;
  runtimeComposer: ArtifactComposer;
  catalogComposer: ArtifactComposer;
  mainContract: ArtifactContract;
  runtimeContract: ArtifactContract;
  catalogContract: ArtifactContract;
  mainMarkers: ArtifactMarkers;
  runtimeMarkers: ArtifactMarkers;
  catalogMarkers: ArtifactMarkers;
}

export class DefaultArtifactFactory implements ArtifactFactory {
  private readonly composers: Record<ArtifactKind, ArtifactComposer>;
  private readonly contracts: Record<ArtifactKind, ArtifactContract>;
  private readonly markers: Record<ArtifactKind, ArtifactMarkers>;

  constructor(deps: ArtifactFactoryDeps) {
    this.composers = {
      main: deps.mainComposer,
      runtime: deps.runtimeComposer,
      catalog: deps.catalogComposer,
    };
    this.contracts = {
      main: deps.mainContract,
      runtime: deps.runtimeContract,
      catalog: deps.catalogContract,
    };
    this.markers = {
      main: deps.mainMarkers,
      runtime: deps.runtimeMarkers,
      catalog: deps.catalogMarkers,
    };
  }

  render(kind: ArtifactKind, ctx: ArtifactRenderContext): string {
    return this.composers[kind](ctx);
  }

  page(kind: ArtifactKind, ctx: ArtifactRenderContext): ArtifactPage {
    const content = this.render(kind, ctx);
    return pageFromContent(kind, content, this.markers[kind]);
  }

  assertContract(kind: ArtifactKind, content: string): void {
    this.contracts[kind](content);
  }
}
