// ============================================================================
// Tipos compartidos para AST Transformers
// ============================================================================

import type { Node, TransformationContext, SourceFile } from "typescript";

export type { Node, TransformationContext, SourceFile };

export interface AstTransform {
  name: string;
  description: string;
  visitors: {
    [kind: number]: (node: Node, context: TransformationContext) => Node | undefined;
  };
}

export function noVisit(_node: Node, _context: TransformationContext): Node {
  return _node;
}

export function removeNode(node: Node, _context: TransformationContext): Node | undefined {
  return undefined;
}