// ============================================================================
// TRANSFORM: Template Literal to String Concatenation
// Convierte template literals a concatenación de strings
// ============================================================================

import * as ts from "typescript";
import type { AstTransform, Node } from "./types.js";

function templateToString(node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral): ts.Expression {
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return ts.factory.createStringLiteral(node.text);
  }
  
  if (ts.isTemplateExpression(node)) {
    let result: ts.Expression = ts.factory.createStringLiteral(node.head.text);
    
    for (const span of node.templateSpans) {
      result = ts.factory.createBinaryExpression(
        result,
        ts.SyntaxKind.PlusToken,
        span.expression
      );
      result = ts.factory.createBinaryExpression(
        result,
        ts.SyntaxKind.PlusToken,
        ts.factory.createStringLiteral(span.literal.text)
      );
    }
    
    return result;
  }
  
  return node as any;
}

export const templateLiteralToStringConcatTransform: AstTransform = {
  name: "template-literal-to-concat",
  description: "Convierte template literals a concatenación de strings",
  visitors: {
    [ts.SyntaxKind.TemplateExpression](node: Node, _context) {
      return templateToString(node as ts.TemplateExpression);
    },
    [ts.SyntaxKind.NoSubstitutionTemplateLiteral](node: Node, _context) {
      return templateToString(node as ts.NoSubstitutionTemplateLiteral);
    },
  },
};