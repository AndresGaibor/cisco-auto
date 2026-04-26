// ============================================================================
// TRANSFORM: Arrow Function to Function Expression
// Convierte arrow functions a function expressions ES5
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

export const arrowToFunctionTransform: AstTransform = {
  name: "arrow-to-function",
  description: "Convierte arrow functions a function expressions ES5",
  visitors: {
    [ts.SyntaxKind.ArrowFunction](node: Node, _context) {
      const arrow = node as ts.ArrowFunction;
      return ts.factory.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        arrow.parameters,
        undefined,
        ts.isBlock(arrow.body) ? arrow.body : ts.factory.createBlock([ts.factory.createReturnStatement(arrow.body)])
      );
    },
  },
};