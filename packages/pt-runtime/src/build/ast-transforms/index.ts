// packages/pt-runtime/src/build/ast-transforms/index.ts
// AST Transformers para convertir TypeScript a ES5 PT-safe
// Usa el patrón de visitors de TypeScript Compiler API

import * as ts from "typescript";
import { createSourceFile, ScriptTarget, ScriptKind, Node, TransformationContext, Visitor, visitNode, SourceFile } from "typescript";

export interface AstTransform {
  name: string;
  description: string;
  visitors: {
    [kind: number]: (node: Node, context: TransformationContext) => Node | undefined;
  };
}

function noVisit(_node: Node, _context: TransformationContext): Node {
  return _node;
}

function removeNode(node: Node, _context: TransformationContext): Node | undefined {
  return undefined;
}

// ============================================================================
// TRANSFORM 1: Remove Imports and Exports
// ============================================================================

const removeImportsExportsTransform: AstTransform = {
  name: "remove-imports-exports",
  description: "Elimina sentencias import y export",
  visitors: {
    [ts.SyntaxKind.ImportDeclaration]: removeNode,
    [ts.SyntaxKind.ImportEqualsDeclaration]: removeNode,
    [ts.SyntaxKind.ExportDeclaration]: removeNode,
    [ts.SyntaxKind.ExportAssignment]: removeNode,
    [ts.SyntaxKind.VariableStatement](node: Node, context) {
      const varStmt = node as ts.VariableStatement;
      const newModifiers = varStmt.modifiers?.filter(
        (m) => m.kind !== ts.SyntaxKind.ExportKeyword
      );
      if (!newModifiers || newModifiers.length === varStmt.modifiers?.length) {
        return varStmt;
      }
      return ts.factory.updateVariableStatement(varStmt, newModifiers as any, varStmt.declarationList);
    },
    [ts.SyntaxKind.FunctionDeclaration](node: Node, context) {
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
    [ts.SyntaxKind.ClassDeclaration](node: Node, context) {
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

// ============================================================================
// TRANSFORM 2: Remove Type Annotations
// ============================================================================

const removeTypeAnnotationsTransform: AstTransform = {
  name: "remove-type-annotations",
  description: "Elimina anotaciones de tipo TypeScript",
  visitors: {
    [ts.SyntaxKind.TypeAliasDeclaration]: removeNode,
    [ts.SyntaxKind.InterfaceDeclaration]: removeNode,
    [ts.SyntaxKind.TypeReference]: noVisit,
    [ts.SyntaxKind.TypeOfExpression](node: Node, context) {
      return (node as ts.TypeOfExpression).expression;
    },
    [ts.SyntaxKind.AsExpression](node: Node, context) {
      return (node as ts.AsExpression).expression;
    },
    [ts.SyntaxKind.Parameter](node: Node, context) {
      const param = node as ts.ParameterDeclaration;
      if (!param.type) return param;
      return ts.factory.updateParameterDeclaration(
        param,
        param.decorators,
        param.modifiers,
        param.name,
        param.questionToken,
        undefined,
        param.initializer
      );
    },
    [ts.SyntaxKind.VariableDeclaration](node: Node, context) {
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
    [ts.SyntaxKind.PropertyDeclaration](node: Node, context) {
      const prop = node as ts.PropertyDeclaration;
      if (!prop.type) return prop;
      return ts.factory.updatePropertyDeclaration(
        prop,
        prop.decorators,
        prop.modifiers,
        prop.name,
        prop.questionToken,
        undefined,
        prop.initializer
      );
    },
    [ts.SyntaxKind.FunctionDeclaration](node: Node, context) {
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
    [ts.SyntaxKind.ArrowFunction](node: Node, context) {
      const arrow = node as ts.ArrowFunction;
      if (!arrow.type) return arrow;
      return ts.factory.updateArrowFunction(
        arrow,
        arrow.modifiers,
        arrow.asteriskToken,
        arrow.parameters,
        undefined,
        arrow.equalsGreaterThanToken,
        arrow.body
      );
    },
    [ts.SyntaxKind.MethodDeclaration](node: Node, context) {
      const method = node as ts.MethodDeclaration;
      if (!method.type) return method;
      return ts.factory.updateMethodDeclaration(
        method,
        method.decorators,
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
    [ts.SyntaxKind.GetAccessor](node: Node, context) {
      const accessor = node as ts.GetAccessorDeclaration;
      if (!accessor.type) return accessor;
      return ts.factory.updateGetAccessorDeclaration(
        accessor,
        accessor.decorators,
        accessor.modifiers,
        accessor.name,
        accessor.parameters,
        undefined,
        accessor.body
      );
    },
    [ts.SyntaxKind.SetAccessor](node: Node, context) {
      const accessor = node as ts.SetAccessorDeclaration;
      if (!accessor.type) return accessor;
      return ts.factory.updateSetAccessorDeclaration(
        accessor,
        accessor.decorators,
        accessor.modifiers,
        accessor.name,
        accessor.parameters,
        undefined,
        accessor.body
      );
    },
  },
};

// ============================================================================
// TRANSFORM 3: let/const to var
// ============================================================================

const letConstToVarTransform: AstTransform = {
  name: "let-const-to-var",
  description: "Convierte declarations let/const a var para ES5",
  visitors: {
    [ts.SyntaxKind.VariableDeclarationList](node: Node, context) {
      const list = node as ts.VariableDeclarationList;
      const flags = list.flags;
      
      if (
        (flags & ts.NodeFlags.Let) ||
        (flags & ts.NodeFlags.Const) ||
        list.declarationKind === ts.SyntaxKind.ConstKeyword ||
        list.declarationKind === ts.SyntaxKind.LetKeyword
      ) {
        return ts.factory.createVariableDeclarationList(
          list.declarations,
          ts.NodeFlags.VarExistingVar | (list.flags & ts.NodeFlags.NumericLiteral)
        );
      }
      return list;
    },
  },
};

// ============================================================================
// TRANSFORM 4: Arrow Function to Function Expression
// ============================================================================

const arrowToFunctionTransform: AstTransform = {
  name: "arrow-to-function",
  description: "Convierte arrow functions a function expressions ES5",
  visitors: {
    [ts.SyntaxKind.ArrowFunction](node: Node, context) {
      const arrow = node as ts.ArrowFunction;
      return ts.factory.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        arrow.parameters,
        undefined,
        arrow.body
      );
    },
  },
};

// ============================================================================
// TRANSFORM 5: Template Literal to String Concatenation
// ============================================================================

function templateToString(node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral): ts.Expression {
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return ts.factory.createStringLiteral(node.text);
  }
  
  if (ts.isTemplateExpression(node)) {
    let result: ts.Expression = ts.factory.createStringLiteral(node.head.text);
    
    for (const span of node.templateSpans) {
      result = ts.factory.createBinary(
        result,
        ts.SyntaxKind.PlusToken,
        span.expression
      );
      result = ts.factory.createBinary(
        result,
        ts.SyntaxKind.PlusToken,
        ts.factory.createStringLiteral(span.literal.text)
      );
    }
    
    return result;
  }
  
  return node as any;
}

const templateLiteralToStringConcatTransform: AstTransform = {
  name: "template-literal-to-concat",
  description: "Convierte template literals a concatenación de strings",
  visitors: {
    [ts.SyntaxKind.TemplateExpression](node: Node, context) {
      return templateToString(node as ts.TemplateExpression);
    },
    [ts.SyntaxKind.NoSubstitutionTemplateLiteral](node: Node, context) {
      return templateToString(node as ts.NoSubstitutionTemplateLiteral);
    },
  },
};

// ============================================================================
// TRANSFORM 6: for...of to for loop
// ============================================================================

const forOfToForLoopTransform: AstTransform = {
  name: "for-of-to-for-loop",
  description: "Convierte for...of a for loop ES5 compatible",
  visitors: {
    [ts.SyntaxKind.ForOfStatement](node: Node, context) {
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
      
      const condition = ts.factory.createBinary(
        ts.factory.createIdentifier(indexName),
        ts.SyntaxKind.LessThanToken,
        ts.factory.createPropertyAccess(
          ts.factory.createIdentifier(arrayName),
          "length"
        )
      );
      
      const increment = ts.factory.createPrefix(
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
            ts.factory.createElementAccess(
              ts.factory.createIdentifier(arrayName),
              ts.factory.createIdentifier(indexName)
            )
          ),
        ])
      );
      
      const bodyStatements = ts.isBlock(forOf.body)
        ? [...forOf.body.statements, varDecl]
        : [varDecl, ts.factory.createExpressionStatement(forOf.body as ts.Expression)];
      
      const body = ts.factory.createBlock([varDecl, ...(ts.isBlock(forOf.body) ? forOf.body.statements : [])]);
      
      const forLoop = ts.factory.createForStatement(
        indexDecl.declarationList,
        condition,
        increment,
        body
      );
      
      return ts.factory.createStatement([arrayDecl, forLoop] as any);
    },
  },
};

// ============================================================================
// TRANSFORM 7: Destructuring to Assignment
// ============================================================================

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
        accessExpr = ts.factory.createPropertyAccess(
          ts.factory.createIdentifier(source),
          propName
        );
      } else {
        accessExpr = ts.factory.createElementAccess(
          ts.factory.createIdentifier(source),
          ts.factory.createStringLiteral(propName.text)
        );
      }
    } else if (ts.isIdentifier(varName)) {
      accessExpr = ts.factory.createElementAccess(
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

const destructuringToAssignmentTransform: AstTransform = {
  name: "destructuring-to-assignment",
  description: "Convierte destructuring a asignaciones individuales ES5",
  visitors: {
    [ts.SyntaxKind.VariableStatement](node: Node, context) {
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
      
      return ts.factory.createStatement(extraStatements as any);
    },
  },
};

// ============================================================================
// TRANSFORM 8: Optional Chaining to Logical AND
// ============================================================================

const optionalChainingToLogicalAndTransform: AstTransform = {
  name: "optional-chaining-to-logical",
  description: "Convierte optional chaining a && expressions",
  visitors: {
    [ts.SyntaxKind.ElementAccessExpression](node: Node, context) {
      const elem = node as ts.ElementAccessExpression;
      if (!elem.questionDotToken) return elem;
      
      return ts.factory.createBinary(
        elem.expression,
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.factory.createElementAccessExpression(
          elem.expression,
          elem.argumentExpression
        )
      );
    },
    [ts.SyntaxKind.PropertyAccessExpression](node: Node, context) {
      const prop = node as ts.PropertyAccessExpression;
      if (!prop.questionDotToken) return prop;
      
      return ts.factory.createBinary(
        prop.expression,
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.factory.createPropertyAccessExpression(
          prop.expression,
          prop.name
        )
      );
    },
    [ts.SyntaxKind.CallExpression](node: Node, context) {
      const call = node as ts.CallExpression;
      if (!call.questionDotToken) return call;
      
      return ts.factory.createBinary(
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

// ============================================================================
// TRANSFORM 9: Nullish Coalescing to Logical OR
// ============================================================================

const nullishCoalescingToLogicalOrTransform: AstTransform = {
  name: "nullish-coalescing-to-logical",
  description: "Convierte ?? a expresiones ternarias o ||",
  visitors: {
    [ts.SyntaxKind.BinaryExpression](node: Node, context) {
      const bin = node as ts.BinaryExpression;
      if (bin.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken) {
        return bin;
      }
      
      return ts.factory.createConditional(
        ts.factory.createBinary(
          bin.left,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
          ts.factory.createNull()
        ),
        bin.right,
        bin.left
      );
    },
  },
};

// ============================================================================
// TRANSFORM 10: Spread to Object.assign
// ============================================================================

const spreadToObjectAssignTransform: AstTransform = {
  name: "spread-to-object-assign",
  description: "Convierte spread operator a Object.assign o concat",
  visitors: {
    [ts.SyntaxKind.ObjectLiteralExpression](node: Node, context) {
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
        result = ts.factory.createCall(
          ts.factory.createPropertyAccess("Object", "assign"),
          undefined,
          [result, spreadProps[i].expression]
        );
      }
      
      if (nonSpreadProps.length > 0) {
        const newObj = ts.factory.createObjectLiteralExpression(
          nonSpreadProps as any,
          true
        );
        result = ts.factory.createCall(
          ts.factory.createPropertyAccess("Object", "assign"),
          undefined,
          [result, newObj]
        );
      }
      
      return result;
    },
    [ts.SyntaxKind.ArrayLiteralExpression](node: Node, context) {
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
        result = ts.factory.createCall(
          ts.factory.createPropertyAccess(result, "concat"),
          undefined,
          [sp.expression as ts.Expression]
        );
      }
      
      return result;
    },
  },
};

// ============================================================================
// TRANSFORM 11: Class to Function Constructor
// ============================================================================

const classToFunctionConstructorTransform: AstTransform = {
  name: "class-to-function-constructor",
  description: "Convierte class declarations a function constructors",
  visitors: {
    [ts.SyntaxKind.ClassDeclaration](node: Node, context) {
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
            p.decorators,
            p.modifiers,
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
              ts.factory.createBinary(
                ts.factory.createPropertyAccess(
                  ts.factory.createPropertyAccess(cls.name, "prototype"),
                  member.name.text
                ),
                ts.SyntaxKind.EqualsToken,
                init
              )
            ) as any
          );
        }
      }
      
      return ts.factory.createStatement(stmts as any);
    },
  },
};

// ============================================================================
// TRANSFORM 12: Default Params to Checks
// ============================================================================

const defaultParamsToChecksTransform: AstTransform = {
  name: "default-params-to-checks",
  description: "Convierte default parameters a chequeos explícitos",
  visitors: {
    [ts.SyntaxKind.ArrowFunction](node: Node, context) {
      const arrow = node as ts.ArrowFunction;
      const newParams = arrow.parameters.map((param) => {
        if (!param.initializer) return param;
        
        const paramName = ts.isIdentifier(param.name)
          ? param.name.text
          : `_param_${Math.random().toString(36).substr(2, 8)}`;
        
        return ts.factory.createParameterDeclaration(
          param.decorators,
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
        arrow.asteriskToken,
        newParams,
        undefined,
        arrow.equalsGreaterThanToken,
        arrow.body
      );
    },
    [ts.SyntaxKind.FunctionExpression](node: Node, context) {
      const func = node as ts.FunctionExpression;
      const newParams = func.parameters.map((param) => {
        if (!param.initializer) return param;
        
        return ts.factory.createParameterDeclaration(
          param.decorators,
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
        newParams,
        func.type,
        func.body
      );
    },
    [ts.SyntaxKind.FunctionDeclaration](node: Node, context) {
      const func = node as ts.FunctionDeclaration;
      const newParams = func.parameters.map((param) => {
        if (!param.initializer) return param;
        
        return ts.factory.createParameterDeclaration(
          param.decorators,
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

// ============================================================================
// Registry de todos los transformers
// ============================================================================

export const ALL_AST_TRANSFORMS: AstTransform[] = [
  removeImportsExportsTransform,
  removeTypeAnnotationsTransform,
  letConstToVarTransform,
  arrowToFunctionTransform,
  templateLiteralToStringConcatTransform,
  forOfToForLoopTransform,
  destructuringToAssignmentTransform,
  optionalChainingToLogicalAndTransform,
  nullishCoalescingToLogicalOrTransform,
  spreadToObjectAssignTransform,
  classToFunctionConstructorTransform,
  defaultParamsToChecksTransform,
];

export function getAllTransforms(): AstTransform[] {
  return ALL_AST_TRANSFORMS;
}

export function applyTransforms(sourceFile: SourceFile, transforms: AstTransform[]): SourceFile {
  let currentSource = sourceFile;
  
  for (const tf of transforms) {
    currentSource = applySingleTransform(currentSource, tf);
  }
  
  return currentSource;
}

function applySingleTransform(sourceFile: SourceFile, tf: AstTransform): SourceFile {
  const visitor: Visitor = (node: Node): VisitResult<Node> => {
    const visitorFn = tf.visitors[node.kind];
    let result: Node;
    
    if (visitorFn) {
      result = visitorFn(node, {} as TransformationContext);
    } else {
      result = node;
    }
    
    if (result === undefined) {
      return undefined;
    }
    
    return ts.visitEachChild(result, visitor, {});
  };
  
  return ts.visitNode(sourceFile, visitor) as SourceFile;
}
