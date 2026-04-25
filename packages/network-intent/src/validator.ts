import { z } from "zod";
import { NetworkLabIntentSchema } from "./schema.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateLabIntent(yamlContent: string): ValidationResult {
  try {
    const parsed = JSON.parse(yamlContent);
    const result = NetworkLabIntentSchema.safeParse(parsed);
    
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`),
        warnings: [],
      };
    }
    
    return { valid: true, errors: [], warnings: [] };
  } catch (e: unknown) {
    return { valid: false, errors: [String(e)], warnings: [] };
  }
}
