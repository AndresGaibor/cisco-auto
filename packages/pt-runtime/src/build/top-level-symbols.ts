import ts from "typescript";

export type TopLevelSymbolKind = "function" | "variable" | "class";
export type VariableDeclarationKind = "var" | "let" | "const" | "unknown";

export interface TopLevelSymbolLocation {
  name: string;
  kind: TopLevelSymbolKind;
  variableKind?: VariableDeclarationKind;
  line: number;
  column: number;
}

export interface DuplicateTopLevelSymbol {
  name: string;
  locations: TopLevelSymbolLocation[];
  fatal: boolean;
  reason: string;
}

export interface DuplicateTopLevelSymbolOptions {
  fileName?: string;
  label?: string;
  allowDuplicateVarDeclarations?: boolean;
}

function getVariableDeclarationKind(flags: ts.NodeFlags): VariableDeclarationKind {
  if ((flags & ts.NodeFlags.Const) !== 0) return "const";
  if ((flags & ts.NodeFlags.Let) !== 0) return "let";
  if ((flags & ts.NodeFlags.BlockScoped) !== 0) return "let";
  return "var";
}

function locationFor(
  sourceFile: ts.SourceFile,
  name: string,
  kind: TopLevelSymbolKind,
  node: ts.Node,
  variableKind?: VariableDeclarationKind,
): TopLevelSymbolLocation {
  const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    name,
    kind,
    variableKind,
    line: pos.line + 1,
    column: pos.character + 1,
  };
}

function collectBindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }

  const names: string[] = [];

  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }

    if (ts.isBindingElement(element)) {
      names.push(...collectBindingNames(element.name));
    }
  }

  return names;
}

function isFatalDuplicate(locations: TopLevelSymbolLocation[], allowDuplicateVarDeclarations: boolean): {
  fatal: boolean;
  reason: string;
} {
  const allVariables = locations.every((location) => location.kind === "variable");
  const allVars = locations.every(
    (location) => location.kind === "variable" && location.variableKind === "var",
  );

  if (allowDuplicateVarDeclarations && allVars) {
    return {
      fatal: false,
      reason: "duplicate var declarations are allowed in ES5 output but should be audited for semantic shadowing",
    };
  }

  if (allVariables && !allVars) {
    return {
      fatal: true,
      reason: "duplicate lexical variable declarations can break generated JavaScript",
    };
  }

  return {
    fatal: true,
    reason: "duplicate top-level function/class/mixed declarations can collide in the generated global runtime",
  };
}

export function findDuplicateTopLevelSymbols(
  sourceText: string,
  options: DuplicateTopLevelSymbolOptions = {},
): DuplicateTopLevelSymbol[] {
  const fileName = options.fileName ?? "generated.js";
  const allowDuplicateVarDeclarations = options.allowDuplicateVarDeclarations ?? false;

  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );

  const seen = new Map<string, TopLevelSymbolLocation[]>();

  function addSymbol(location: TopLevelSymbolLocation): void {
    const existing = seen.get(location.name) ?? [];
    existing.push(location);
    seen.set(location.name, existing);
  }

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      addSymbol(locationFor(sourceFile, statement.name.text, "function", statement.name));
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name) {
      addSymbol(locationFor(sourceFile, statement.name.text, "class", statement.name));
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      const variableKind = getVariableDeclarationKind(statement.declarationList.flags);

      for (const declaration of statement.declarationList.declarations) {
        for (const name of collectBindingNames(declaration.name)) {
          addSymbol(locationFor(sourceFile, name, "variable", declaration.name, variableKind));
        }
      }
    }
  }

  const duplicates: DuplicateTopLevelSymbol[] = [];

  for (const [name, locations] of seen.entries()) {
    if (locations.length <= 1) {
      continue;
    }

    const classification = isFatalDuplicate(locations, allowDuplicateVarDeclarations);

    duplicates.push({
      name,
      locations,
      fatal: classification.fatal,
      reason: classification.reason,
    });
  }

  return duplicates.sort((a, b) => a.name.localeCompare(b.name));
}

export function assertNoDuplicateTopLevelSymbols(
  sourceText: string,
  options: DuplicateTopLevelSymbolOptions = {},
): void {
  const fileName = options.fileName ?? "generated.js";
  const label = options.label ?? fileName;

  const duplicates = findDuplicateTopLevelSymbols(sourceText, options);
  const fatalDuplicates = duplicates.filter((duplicate) => duplicate.fatal);

  if (fatalDuplicates.length === 0) {
    return;
  }

  const details = fatalDuplicates
    .map((duplicate) => {
      const locations = duplicate.locations
        .map((location) => {
          const variableSuffix = location.variableKind ? `/${location.variableKind}` : "";
          return `${location.kind}${variableSuffix}@${location.line}:${location.column}`;
        })
        .join(", ");

      return `  - ${duplicate.name}: ${locations}\n    reason: ${duplicate.reason}`;
    })
    .join("\n");

  throw new Error(`${label} has fatal duplicate top-level symbols:\n${details}`);
}

export function formatDuplicateTopLevelSymbolWarnings(
  sourceText: string,
  options: DuplicateTopLevelSymbolOptions = {},
): string {
  const duplicates = findDuplicateTopLevelSymbols(sourceText, {
    ...options,
    allowDuplicateVarDeclarations: true,
  });

  const warnings = duplicates.filter((duplicate) => !duplicate.fatal);

  if (warnings.length === 0) {
    return "";
  }

  return warnings
    .map((duplicate) => {
      const locations = duplicate.locations
        .map((location) => {
          const variableSuffix = location.variableKind ? `/${location.variableKind}` : "";
          return `${location.kind}${variableSuffix}@${location.line}:${location.column}`;
        })
        .join(", ");

      return `  - ${duplicate.name}: ${locations}`;
    })
    .join("\n");
}