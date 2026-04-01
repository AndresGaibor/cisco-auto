/**
 * Tool Schema Types - Schema definitions for tool inputs and outputs
 * Input/output schemas, properties, validation rules
 */

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
}

export interface ToolInputProperty {
  type: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: { type: string; enum?: unknown[] };
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  format?: string;
  oneOf?: SchemaOption[];
  anyOf?: SchemaOption[];
  allOf?: SchemaOption[];
}

export interface SchemaOption {
  type?: string;
  properties?: Record<string, ToolInputProperty>;
  required?: string[];
  enum?: unknown[];
}

export interface ToolOutputSchema {
  type: string;
  properties?: Record<string, ToolOutputProperty>;
  items?: { type: string };
  description?: string;
}

export interface ToolOutputProperty {
  type: string;
  description?: string;
  items?: { type: string };
  properties?: Record<string, ToolOutputProperty>;
}

/**
 * Schema validation utilities
 */
export function validateAgainstSchema(input: unknown, schema: ToolInputSchema): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  if (schema.required) {
    const obj = input as Record<string, unknown>;
    for (const field of schema.required) {
      if (!(field in obj)) {
        errors.push({
          field,
          message: `Required field missing: ${field}`,
        });
      }
    }
  }

  // Validate property types
  const obj = input as Record<string, unknown>;
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (key in obj && obj[key] !== undefined) {
      const propErrors = validateProperty(obj[key], prop, key);
      errors.push(...propErrors);
    }
  }

  return errors;
}

function validateProperty(value: unknown, schema: ToolInputProperty, fieldName: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Type validation
  if (!matchesType(value, schema.type)) {
    errors.push({
      field: fieldName,
      message: `Expected type ${schema.type}, got ${typeof value}`,
    });
    return errors;
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      field: fieldName,
      message: `Value must be one of: ${schema.enum.join(', ')}`,
    });
  }

  // String validations
  if (typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push({
        field: fieldName,
        message: `String too short (min: ${schema.minLength})`,
      });
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push({
        field: fieldName,
        message: `String too long (max: ${schema.maxLength})`,
      });
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push({
        field: fieldName,
        message: `String does not match pattern: ${schema.pattern}`,
      });
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        field: fieldName,
        message: `Number too small (min: ${schema.minimum})`,
      });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        field: fieldName,
        message: `Number too large (max: ${schema.maximum})`,
      });
    }
  }

  return errors;
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

export interface ValidationError {
  field: string;
  message: string;
}
