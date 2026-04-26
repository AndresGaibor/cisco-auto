// ============================================================================
// TRANSFORM: Nullish Coalescing to Logical OR
// Convierte ?? a expresiones ternarias o ||
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

export const nullishCoalescingToLogicalOrTransform: AstTransform = {
  name: "nullish-coalescing-to-logical",
  description: "Convierte ?? a expresiones ternarias o ||",
  visitors: {
    [ts.SyntaxKind.BinaryExpression](node: Node, _context) {
      const bin = node as ts.BinaryExpression;
      if (bin.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken) {
        return bin;
      }
      
      return ts.factory.createConditionalExpression(
        ts.factory.createBinaryExpression(
          bin.left,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
          ts.factory.createNull()
        ),
        undefined,
        bin.right,
        undefined,
        bin.left
      );
    },
  },
};