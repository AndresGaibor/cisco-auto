// ============================================================================
// TRANSFORM: Spread to Object.assign
// Convierte spread operator a Object.assign o concat
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

export const spreadToObjectAssignTransform: AstTransform = {
  name: "spread-to-object-assign",
  description: "Convierte spread operator a Object.assign o concat",
  visitors: {
    [ts.SyntaxKind.ObjectLiteralExpression](node: Node, _context) {
      const obj = node as ts.ObjectLiteralExpression;
      const spreadProps = obj.properties.filter(
        (p): p is ts.SpreadAssignment => ts.isSpreadAssignment(p)
      );
      
      if (spreadProps.length === 0) return obj;
      
      const nonSpreadProps = obj.properties.filter(
        (p) => !ts.isSpreadAssignment(p)
      );
      
      let result: ts.Expression = spreadProps[0].expression;
      
      for (let i = 1; i < spreadProps.length; i++) {
        result = ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier("Object"), "assign"),
          undefined,
          [result, spreadProps[i].expression]
        );
      }
      
      if (nonSpreadProps.length > 0) {
        const newObj = ts.factory.createObjectLiteralExpression(
          nonSpreadProps as any,
          true
        );
        result = ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier("Object"), "assign"),
          undefined,
          [result, newObj]
        );
      }
      
      return result;
    },
    [ts.SyntaxKind.ArrayLiteralExpression](node: Node, _context) {
      const arr = node as ts.ArrayLiteralExpression;
      const spreadElements = arr.elements.filter(
        (e): e is ts.SpreadElement => ts.isSpreadElement(e)
      );
      
      if (spreadElements.length === 0) return arr;
      
      const nonSpreadElements = arr.elements.filter(
        (e) => !ts.isSpreadElement(e)
      ) as ts.Expression[];
      
      let result: ts.Expression = ts.factory.createArrayLiteralExpression(nonSpreadElements, true);
      
      for (const sp of spreadElements.reverse()) {
        result = ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(result, "concat"),
          undefined,
          [sp.expression as ts.Expression]
        );
      }
      
      return result;
    },
  },
};