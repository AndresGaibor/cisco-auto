/**
 * Hint — guidance provided to the user during an exercise.
 *
 * Hints are progressive: vague first, then moderate, then explicit.
 * They never give away the direct answer but help when stuck.
 */

export type HintLevel = "vague" | "moderate" | "explicit";

export interface Hint {
  level: HintLevel;
  text: string;
  codeSnippet?: string;
  links?: string[];
}

/**
 * Create a hint with all fields
 */
export function createHint(
  level: HintLevel,
  text: string,
  options?: { codeSnippet?: string; links?: string[] }
): Hint {
  return {
    level,
    text,
    ...(options?.codeSnippet && { codeSnippet: options.codeSnippet }),
    ...(options?.links && { links: options.links }),
  };
}

/**
 * Vague hint — conceptual direction without specifics
 */
export function vagueHint(text: string): Hint {
  return { level: "vague", text };
}

/**
 * Moderate hint — specific concept but no exact command
 */
export function moderateHint(text: string, codeSnippet?: string): Hint {
  return { level: "moderate", text, ...(codeSnippet && { codeSnippet }) };
}

/**
 * Explicit hint — detailed guidance, may include command structure
 */
export function explicitHint(text: string, codeSnippet?: string, links?: string[]): Hint {
  return { level: "explicit", text, ...(codeSnippet && { codeSnippet }), ...(links && { links }) };
}
