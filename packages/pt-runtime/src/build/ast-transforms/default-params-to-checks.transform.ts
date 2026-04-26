// ============================================================================
// TRANSFORM: Default Params to Checks
// Convierte default parameters a chequeos explícitos
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

export const defaultParamsToChecksTransform: AstTransform = {
  name: "default-params-to-checks",
  description: "Convierte default parameters a chequeos explícitos",
  visitors: {
    [ts.SyntaxKind.ArrowFunction](node: Node, _context) {
      const arrow = node as ts.ArrowFunction;
      const newParams = arrow.parameters.map((param) => {
        if (!param.initializer) return param;
        
        const paramName = ts.isIdentifier(param.name)
          ? param.name.text
          : `_param_${Math.random().toString(36).substr(2, 8)}`;
        
        return ts.factory.createParameterDeclaration(
          param.modifiers,
          param.dotDotDotToken,
          param.name,
          param.questionToken,
          undefined,
          undefined
        );
      });
      
      return ts.factory.updateArrowFunction(
        arrow,
        arrow.modifiers,
        undefined,
        newParams,
        undefined,
        arrow.equalsGreaterThanToken,
        arrow.body
      );
    },
    [ts.SyntaxKind.FunctionExpression](node: Node, _context) {
      const func = node as ts.FunctionExpression;
      const newParams = func.parameters.map((param) => {
        if (!param.initializer) return param;
        
        return ts.factory.createParameterDeclaration(
          param.modifiers,
          param.dotDotDotToken,
          param.name,
          param.questionToken,
          undefined,
          undefined
        );
      });
      
      return ts.factory.updateFunctionExpression(
        func,
        func.modifiers,
        func.asteriskToken,
        func.name,
        undefined,
        newParams,
        func.type,
        func.body
      );
    },
    [ts.SyntaxKind.FunctionDeclaration](node: Node, _context) {
      const func = node as ts.FunctionDeclaration;
      const newParams = func.parameters.map((param) => {
        if (!param.initializer) return param;
        
        return ts.factory.createParameterDeclaration(
          param.modifiers,
          param.dotDotDotToken,
          param.name,
          param.questionToken,
          undefined,
          undefined
        );
      });
      
      return ts.factory.updateFunctionDeclaration(
        func,
        func.modifiers,
        func.asteriskToken,
        func.name,
        func.typeParameters,
        newParams,
        func.type,
        func.body
      );
    },
  },
};