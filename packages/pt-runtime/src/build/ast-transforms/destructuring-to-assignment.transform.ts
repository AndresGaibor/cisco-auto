// ============================================================================
// TRANSFORM: Destructuring to Assignment
// Convierte destructuring a asignaciones individuales ES5
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

function processBinding(
  binding: ts.BindingPattern,
  source: string
): ts.Statement[] {
  const stmts: ts.Statement[] = [];
  
  for (const elem of binding.elements) {
    if (!ts.isBindingElement(elem)) continue;
    
    const propName = elem.propertyName;
    const varName = elem.name;
    
    let accessExpr: ts.Expression;
    if (propName && ts.isIdentifier(propName)) {
      if (ts.isIdentifier(varName)) {
        accessExpr = ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(source),
          propName
        );
      } else {
        accessExpr = ts.factory.createElementAccessExpression(
          ts.factory.createIdentifier(source),
          ts.factory.createStringLiteral(propName.text)
        );
      }
    } else if (ts.isIdentifier(varName)) {
      accessExpr = ts.factory.createElementAccessExpression(
        ts.factory.createIdentifier(source),
        varName
      );
    } else {
      continue;
    }
    
    stmts.push(
      ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList([
          ts.factory.createVariableDeclaration(varName as ts.BindingName, undefined, undefined, accessExpr),
        ])
      )
    );
  }
  
  return stmts;
}

export const destructuringToAssignmentTransform: AstTransform = {
  name: "destructuring-to-assignment",
  description: "Convierte destructuring a asignaciones individuales ES5",
  visitors: {
    [ts.SyntaxKind.VariableStatement](node: Node, _context) {
      const stmt = node as ts.VariableStatement;
      const declarations = stmt.declarationList.declarations;
      const newDeclarations: ts.VariableDeclaration[] = [];
      const extraStatements: ts.Statement[] = [];
      
      for (const decl of declarations) {
        if (!ts.isVariableDeclaration(decl)) {
          newDeclarations.push(decl);
          continue;
        }
        
        const name = decl.name;
        
        if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
          if (!decl.initializer) {
            newDeclarations.push(decl);
            continue;
          }
          
          const uniqueId = Math.random().toString(36).substr(2, 8);
          const sourceName = `__obj_${uniqueId}`;
          
          extraStatements.push(
            ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList([
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier(sourceName),
                  undefined,
                  undefined,
                  decl.initializer
                ),
              ])
            )
          );
          
          const assignments = processBinding(name, sourceName);
          extraStatements.push(...assignments);
          
          continue;
        }
        
        newDeclarations.push(decl);
      }
      
      if (extraStatements.length === 0) {
        return stmt;
      }
      
      if (newDeclarations.length > 0) {
        extraStatements.unshift(
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(newDeclarations)
          )
        );
      }
      
      return extraStatements as any;
    },
  },
};