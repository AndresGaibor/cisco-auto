// ============================================================================
// TRANSFORM: Remove Type Annotations
// Elimina anotaciones de tipo TypeScript
// ============================================================================

import * as ts from "typescript";
import { noVisit, removeNode, type AstTransform, type Node } from "./types.js";

export const removeTypeAnnotationsTransform: AstTransform = {
  name: "remove-type-annotations",
  description: "Elimina anotaciones de tipo TypeScript",
  visitors: {
    [ts.SyntaxKind.TypeAliasDeclaration]: removeNode,
    [ts.SyntaxKind.InterfaceDeclaration]: removeNode,
    [ts.SyntaxKind.TypeReference]: noVisit,
    [ts.SyntaxKind.TypeOfExpression](node: Node, _context) {
      return (node as ts.TypeOfExpression).expression;
    },
    [ts.SyntaxKind.AsExpression](node: Node, _context) {
      return (node as ts.AsExpression).expression;
    },
    [ts.SyntaxKind.Parameter](node: Node, _context) {
      const param = node as ts.ParameterDeclaration;
      if (!param.type) return param;
      return ts.factory.updateParameterDeclaration(
        param,
        param.modifiers,
        param.dotDotDotToken,
        param.name,
        param.questionToken,
        undefined,
        param.initializer
      );
    },
    [ts.SyntaxKind.VariableDeclaration](node: Node, _context) {
      const decl = node as ts.VariableDeclaration;
      if (!decl.type) return decl;
      return ts.factory.updateVariableDeclaration(
        decl,
        decl.name,
        decl.exclamationToken,
        undefined,
        decl.initializer
      );
    },
    [ts.SyntaxKind.PropertyDeclaration](node: Node, _context) {
      const prop = node as ts.PropertyDeclaration;
      if (!prop.type) return prop;
      return ts.factory.updatePropertyDeclaration(
        prop,
        prop.modifiers,
        prop.name,
        prop.questionToken,
        undefined,
        prop.initializer
      );
    },
    [ts.SyntaxKind.FunctionDeclaration](node: Node, _context) {
      const func = node as ts.FunctionDeclaration;
      if (!func.type) return func;
      return ts.factory.updateFunctionDeclaration(
        func,
        func.modifiers,
        func.asteriskToken,
        func.name,
        func.typeParameters,
        func.parameters,
        undefined,
        func.body
      );
    },
    [ts.SyntaxKind.ArrowFunction](node: Node, _context) {
      const arrow = node as ts.ArrowFunction;
      if (!arrow.type) return arrow;
      return ts.factory.updateArrowFunction(
        arrow,
        arrow.modifiers,
        arrow.typeParameters,
        arrow.parameters,
        undefined,
        arrow.equalsGreaterThanToken,
        arrow.body
      );
    },
    [ts.SyntaxKind.MethodDeclaration](node: Node, _context) {
      const method = node as ts.MethodDeclaration;
      if (!method.type) return method;
      return ts.factory.updateMethodDeclaration(
        method,
        method.modifiers,
        method.asteriskToken,
        method.name,
        method.questionToken,
        method.typeParameters,
        method.parameters,
        undefined,
        method.body
      );
    },
    [ts.SyntaxKind.GetAccessor](node: Node, _context) {
      const accessor = node as ts.GetAccessorDeclaration;
      if (!accessor.type) return accessor;
      return ts.factory.updateGetAccessorDeclaration(
        accessor,
        accessor.modifiers,
        accessor.name,
        accessor.parameters,
        undefined,
        accessor.body
      );
    },
    [ts.SyntaxKind.SetAccessor](node: Node, _context) {
      const accessor = node as ts.SetAccessorDeclaration;
      if (!accessor.type) return accessor;
      return ts.factory.updateSetAccessorDeclaration(
        accessor,
        accessor.modifiers,
        accessor.name,
        accessor.parameters,
        accessor.body
      );
    },
  },
};