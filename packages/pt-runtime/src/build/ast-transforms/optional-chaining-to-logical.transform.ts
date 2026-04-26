// ============================================================================
// TRANSFORM: Optional Chaining to Logical AND
// Convierte optional chaining a && expressions
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

export const optionalChainingToLogicalAndTransform: AstTransform = {
  name: "optional-chaining-to-logical",
  description: "Convierte optional chaining a && expressions",
  visitors: {
    [ts.SyntaxKind.ElementAccessExpression](node: Node, _context) {
      const elem = node as ts.ElementAccessExpression;
      if (!elem.questionDotToken) return elem;
      
      return ts.factory.createBinaryExpression(
        elem.expression,
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.factory.createElementAccessExpression(
          elem.expression,
          elem.argumentExpression
        )
      );
    },
    [ts.SyntaxKind.PropertyAccessExpression](node: Node, _context) {
      const prop = node as ts.PropertyAccessExpression;
      if (!prop.questionDotToken) return prop;
      
      return ts.factory.createBinaryExpression(
        prop.expression,
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.factory.createPropertyAccessExpression(
          prop.expression,
          prop.name
        )
      );
    },
    [ts.SyntaxKind.CallExpression](node: Node, _context) {
      const call = node as ts.CallExpression;
      if (!call.questionDotToken) return call;
      
      return ts.factory.createBinaryExpression(
        call.expression,
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.factory.createCallExpression(
          call.expression,
          call.typeArguments,
          call.arguments
        )
      );
    },
  },
};