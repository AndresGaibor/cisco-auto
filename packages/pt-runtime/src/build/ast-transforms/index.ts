// packages/pt-runtime/src/build/ast-transforms/index.ts
// Registry de todos los transformers - barrel file
// Los transformers individuales viven en archivos separados

import type { SourceFile } from "typescript";
import type { AstTransform } from "./types.js";

export type { AstTransform, Node, TransformationContext, SourceFile } from "./types.js";
export { noVisit, removeNode } from "./types.js";

export { removeImportsExportsTransform } from "./remove-imports-exports.transform.js";
export { removeTypeAnnotationsTransform } from "./remove-type-annotations.transform.js";
export { letConstToVarTransform } from "./let-const-to-var.transform.js";
export { arrowToFunctionTransform } from "./arrow-to-function.transform.js";
export { templateLiteralToStringConcatTransform } from "./template-literal-to-concat.transform.js";
export { forOfToForLoopTransform } from "./for-of-to-for-loop.transform.js";
export { destructuringToAssignmentTransform } from "./destructuring-to-assignment.transform.js";
export { optionalChainingToLogicalAndTransform } from "./optional-chaining-to-logical.transform.js";
export { nullishCoalescingToLogicalOrTransform } from "./nullish-coalescing-to-logical.transform.js";
export { spreadToObjectAssignTransform } from "./spread-to-object-assign.transform.js";
export { classToFunctionConstructorTransform } from "./class-to-function-constructor.transform.js";
export { defaultParamsToChecksTransform } from "./default-params-to-checks.transform.js";

import { removeImportsExportsTransform } from "./remove-imports-exports.transform.js";
import { removeTypeAnnotationsTransform } from "./remove-type-annotations.transform.js";
import { letConstToVarTransform } from "./let-const-to-var.transform.js";
import { arrowToFunctionTransform } from "./arrow-to-function.transform.js";
import { templateLiteralToStringConcatTransform } from "./template-literal-to-concat.transform.js";
import { forOfToForLoopTransform } from "./for-of-to-for-loop.transform.js";
import { destructuringToAssignmentTransform } from "./destructuring-to-assignment.transform.js";
import { optionalChainingToLogicalAndTransform } from "./optional-chaining-to-logical.transform.js";
import { nullishCoalescingToLogicalOrTransform } from "./nullish-coalescing-to-logical.transform.js";
import { spreadToObjectAssignTransform } from "./spread-to-object-assign.transform.js";
import { classToFunctionConstructorTransform } from "./class-to-function-constructor.transform.js";
import { defaultParamsToChecksTransform } from "./default-params-to-checks.transform.js";

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

import * as ts from "typescript";

function applySingleTransform(sourceFile: SourceFile, tf: AstTransform): SourceFile {
  const visitor: any = (node: ts.Node): any => {
    const visitorFn = tf.visitors[node.kind];
    let result: any;
    
    if (visitorFn) {
      result = visitorFn(node, {} as ts.TransformationContext);
    } else {
      result = node;
    }
    
    if (result === undefined) {
      return undefined;
    }
    
    return ts.visitEachChild(result, visitor, {} as ts.TransformationContext);
  };
  
  return ts.visitNode(sourceFile, visitor) as SourceFile;
}