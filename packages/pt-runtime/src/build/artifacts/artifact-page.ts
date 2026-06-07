import {
  computeChecksum,
  normalizeArtifactForChecksum,
} from "../checksum.js";

export type ArtifactKind = "main" | "runtime" | "catalog";

export interface ArtifactPage {
  readonly kind: ArtifactKind;
  readonly content: string;
  readonly checksum: string;
  readonly normalized: string;
  readonly contract: Readonly<Record<string, boolean>>;
  // eslint-disable-next-line no-unused-vars
  equals(other: ArtifactPage): boolean;
  describe(): string;
}

export interface ArtifactPageInput {
  kind: ArtifactKind;
  content: string;
  contract: Readonly<Record<string, boolean>>;
  checksum: string;
  normalized: string;
}

export function buildArtifactPage(input: ArtifactPageInput): ArtifactPage {
  const kind = input.kind;
  const content = input.content;
  const checksum = input.checksum;
  const normalized = input.normalized;
  const contract = input.contract;
  return {
    kind,
    content,
    checksum,
    normalized,
    contract,
    equals(other: ArtifactPage): boolean {
      return this.content === other.content;
    },
    describe(): string {
      return `${kind} sha=${checksum} len=${content.length} contract=${JSON.stringify(contract)}`;
    },
  };
}

export function pageFromContent(
  kind: ArtifactKind,
  content: string,
  contract: Readonly<Record<string, boolean>>,
): ArtifactPage {
  const normalized = normalizeArtifactForChecksum(content);
  const checksum = computeChecksum(normalized);
  return buildArtifactPage({ kind, content, contract, checksum, normalized });
}
