// ============================================================================
// TRANSFORM: let/const to var
// Convierte declarations let/const a var para ES5
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

export const letConstToVarTransform: AstTransform = {
  name: "let-const-to-var",
  description: "Convierte declarations let/const a var para ES5",
  visitors: {
    [ts.SyntaxKind.VariableDeclarationList](node: Node, _context) {
      const list = node as ts.VariableDeclarationList;
      const flags = list.flags;
      
      if (
        (flags & ts.NodeFlags.Let) ||
        (flags & ts.NodeFlags.Const)
      ) {
        return ts.factory.createVariableDeclarationList(
          list.declarations,
          ts.NodeFlags.None
        );
      }
      return list;
    },
  },
};