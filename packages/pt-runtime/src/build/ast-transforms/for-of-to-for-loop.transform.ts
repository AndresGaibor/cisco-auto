// ============================================================================
// TRANSFORM: for...of to for loop
// Convierte for...of a for loop ES5 compatible
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

export const forOfToForLoopTransform: AstTransform = {
  name: "for-of-to-for-loop",
  description: "Convierte for...of a for loop ES5 compatible",
  visitors: {
    [ts.SyntaxKind.ForOfStatement](node: Node, _context) {
      const forOf = node as ts.ForOfStatement;
      const uniqueId = Math.random().toString(36).substr(2, 8);
      const arrayName = `__arr_${uniqueId}`;
      const indexName = `__i_${uniqueId}`;
      
      const statements: ts.Statement[] = [];
      
      const arrayDecl = ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList([
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier(arrayName),
            undefined,
            undefined,
            forOf.expression
          ),
        ])
      );
      statements.push(arrayDecl);
      
      const indexDecl = ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList([
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier(indexName),
            undefined,
            undefined,
            ts.factory.createNumericLiteral(0)
          ),
        ])
      );
      
      const condition = ts.factory.createBinaryExpression(
        ts.factory.createIdentifier(indexName),
        ts.SyntaxKind.LessThanToken,
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(arrayName),
          "length"
        )
      );
      
      const increment = ts.factory.createPrefixUnaryExpression(
        ts.SyntaxKind.PlusPlusToken,
        ts.factory.createIdentifier(indexName)
      );
      
      const varDecl = ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList([
          ts.factory.createVariableDeclaration(
            forOf.initializer as ts.BindingName,
            undefined,
            undefined,
            ts.factory.createElementAccessExpression(
              ts.factory.createIdentifier(arrayName),
              ts.factory.createIdentifier(indexName)
            )
          ),
        ])
      );
      
      const bodyStatements = isBlock(forOf.statement)
        ? forOf.statement.statements
        : [forOf.statement];
      
      const body = ts.factory.createBlock([varDecl, ...bodyStatements]);
      
      const forLoop = ts.factory.createForStatement(
        indexDecl.declarationList,
        condition,
        increment,
        body
      );
      
      return [arrayDecl, forLoop] as any;
    },
  },
};

function isBlock(node: ts.Statement): node is ts.Block {
  return ts.isBlock(node);
}