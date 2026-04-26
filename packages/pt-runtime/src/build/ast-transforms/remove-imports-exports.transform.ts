// ============================================================================
// TRANSFORM: Remove Imports and Exports
// Elimina sentencias import y export
// ============================================================================

import * as ts from "typescript";
import { removeNode, type AstTransform, type Node } from "./types.js";

export const removeImportsExportsTransform: AstTransform = {
  name: "remove-imports-exports",
  description: "Elimina sentencias import y export",
  visitors: {
    [ts.SyntaxKind.ImportDeclaration]: removeNode,
    [ts.SyntaxKind.ImportEqualsDeclaration]: removeNode,
    [ts.SyntaxKind.ExportDeclaration]: removeNode,
    [ts.SyntaxKind.ExportAssignment]: removeNode,
    [ts.SyntaxKind.VariableStatement](node: Node, _context) {
      const varStmt = node as ts.VariableStatement;
      const newModifiers = varStmt.modifiers?.filter(
        (m) => m.kind !== ts.SyntaxKind.ExportKeyword
      );
      if (!newModifiers || newModifiers.length === varStmt.modifiers?.length) {
        return varStmt;
      }
      return ts.factory.updateVariableStatement(varStmt, newModifiers as any, varStmt.declarationList);
    },
    [ts.SyntaxKind.FunctionDeclaration](node: Node, _context) {
      const func = node as ts.FunctionDeclaration;
      if (!func.name) return func;
      const newModifiers = func.modifiers?.filter(
        (m) => m.kind !== ts.SyntaxKind.ExportKeyword
      );
      if (!newModifiers || newModifiers.length === func.modifiers?.length) {
        return func;
      }
      return ts.factory.updateFunctionDeclaration(
        func,
        newModifiers as any,
        func.asteriskToken,
        func.name,
        func.typeParameters,
        func.parameters,
        func.type,
        func.body
      );
    },
    [ts.SyntaxKind.ClassDeclaration](node: Node, _context) {
      const cls = node as ts.ClassDeclaration;
      if (!cls.name) return cls;
      const newModifiers = cls.modifiers?.filter(
        (m) => m.kind !== ts.SyntaxKind.ExportKeyword
      );
      if (!newModifiers || newModifiers.length === cls.modifiers?.length) {
        return cls;
      }
      return ts.factory.updateClassDeclaration(
        cls,
        newModifiers as any,
        cls.name,
        cls.typeParameters,
        cls.heritageClauses,
        cls.members
      );
    },
  },
};