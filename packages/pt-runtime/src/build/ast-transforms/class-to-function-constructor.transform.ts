// ============================================================================
// TRANSFORM: Class to Function Constructor
// Convierte class declarations a function constructors
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

export const classToFunctionConstructorTransform: AstTransform = {
  name: "class-to-function-constructor",
  description: "Convierte class declarations a function constructors",
  visitors: {
    [ts.SyntaxKind.ClassDeclaration](node: Node, _context) {
      const cls = node as ts.ClassDeclaration;
      if (!cls.name) return cls;
      
      const constructor = cls.members.find(
        (m): m is ts.ConstructorDeclaration => ts.isConstructorDeclaration(m)
      );
      const otherMembers = cls.members.filter(
        (m) => !ts.isConstructorDeclaration(m)
      );
      
      const ctorParams = constructor?.parameters.map(
        (p) =>
          ts.factory.createParameterDeclaration(
            [...(ts.getModifiers(p) ?? []), ...(ts.getDecorators(p) ?? [])],
            p.dotDotDotToken,
            p.name,
            p.questionToken,
            p.type,
            p.initializer
          )
      ) || [];
      
      const ctorBody = constructor?.body || ts.factory.createBlock([]);
      
      const funcExpr = ts.factory.createFunctionExpression(
        undefined,
        undefined,
        cls.name,
        undefined,
        ctorParams,
        undefined,
        ctorBody
      );
      
      const stmts: ts.Statement[] = [funcExpr as any];
      
      for (const member of otherMembers) {
        if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          const init = member.initializer || ts.factory.createVoidZero();
          stmts.push(
            ts.factory.createExpressionStatement(
              ts.factory.createBinaryExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createPropertyAccessExpression(cls.name, "prototype"),
                  member.name.text
                ),
                ts.SyntaxKind.EqualsToken,
                init
              )
            ) as any
          );
        }
      }
      
      return stmts as any;
    },
  },
};