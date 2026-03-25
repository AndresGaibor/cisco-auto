/**
 * ToolRegistry - Registro y gestión centralizado de tools
 * 
 * Proporciona registro, búsqueda, filtrado y ejecución de tools
 * con validación de schemas y manejo de errores robusto.
 */

import type {
  Tool,
  ToolInput,
  ToolResult,
  ToolResultSuccess,
  ToolExecutionContext,
  ToolCategory,
  ToolInputProperty
} from '../types/tool.ts';
import {
  RegistryErrorCode,
  type RegistryError,
  type ExecuteOptions
} from './types.ts';

export { RegistryErrorCode } from './types.ts';
export type { RegistryError, ExecuteOptions } from './types.ts';

/**
 * Crea un error de registry estructurado
 */
function createRegistryError(
  code: RegistryErrorCode,
  message: string,
  toolName?: string,
  cause?: string
): RegistryError {
  return {
    code,
    message,
    toolName,
    cause
  };
}

/**
 * Valida que el input cumple con el schema de la tool
 */
function validateInput(input: ToolInput, schema: Tool['inputSchema']): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Schema tipo object requiere validación de propiedades
  if (schema.type === 'object') {
    // Verificar campos requeridos
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in input)) {
          errors.push(`Campo requerido '${field}' faltante`);
        }
      }
    }

    // Verificar tipos de propiedades
    if (schema.properties) {
      for (const [key, value] of Object.entries(input)) {
        const propSchema: ToolInputProperty | undefined = schema.properties[key];
        if (propSchema) {
          const expectedType = propSchema.type;
          const actualType = typeof value;

          // Mapeo de tipos JSON Schema a tipos JS
          const typeMap: Record<string, string> = {
            string: 'string',
            number: 'number',
            boolean: 'boolean',
            array: 'object',
            object: 'object',
            null: 'object'
          };

          if (typeMap[expectedType] && actualType !== typeMap[expectedType]) {
            // Allow number as string if schema says number but input is string numeric
            if (!(expectedType === 'number' && actualType === 'string' && !isNaN(Number(value)))) {
              errors.push(`Tipo incorrecto para '${key}': esperado ${expectedType}, obtenido ${actualType}`);
            }
          }

          // Validar enum
          if (propSchema.enum && !propSchema.enum.includes(value as string)) {
            errors.push(`Valor '${value}' para '${key}' no está en los valores permitidos: ${propSchema.enum.join(', ')}`);
          }

          // Validar min/max para números
          if (expectedType === 'number' && typeof value === 'number') {
            if (propSchema.minimum !== undefined && value < propSchema.minimum) {
              errors.push(`Valor ${value} para '${key}' es menor que el mínimo ${propSchema.minimum}`);
            }
            if (propSchema.maximum !== undefined && value > propSchema.maximum) {
              errors.push(`Valor ${value} para '${key}' es mayor que el máximo ${propSchema.maximum}`);
            }
          }

          // Validar minLength/maxLength para strings
          if (expectedType === 'string' && typeof value === 'string') {
            if (propSchema.minLength !== undefined && value.length < propSchema.minLength) {
              errors.push(`Longitud de '${key}' (${value.length}) es menor que minLength ${propSchema.minLength}`);
            }
            if (propSchema.maxLength !== undefined && value.length > propSchema.maxLength) {
              errors.push(`Longitud de '${key}' (${value.length}) es mayor que maxLength ${propSchema.maxLength}`);
            }
          }

          // Validar pattern (regex)
          if (expectedType === 'string' && typeof value === 'string' && propSchema.pattern) {
            const regex = new RegExp(propSchema.pattern);
            if (!regex.test(value)) {
              errors.push(`Valor '${value}' para '${key}' no cumple el patrón ${propSchema.pattern}`);
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calcula score de relevancia para búsqueda
 */
function calculateSearchScore(tool: Tool, query: string): { score: number; matchType: 'name' | 'description' | 'tag' | 'category' } {
  const q = query.toLowerCase();
  const name = tool.name.toLowerCase();
  const description = (tool.description || '').toLowerCase();
  const tags = (tool.tags || []).map(t => t.toLowerCase());
  const category = (tool.category || '').toLowerCase();

  // Nombre tiene peso más alto
  if (name === q) return { score: 100, matchType: 'name' };
  if (name.startsWith(q)) return { score: 90, matchType: 'name' };
  if (name.includes(q)) return { score: 80, matchType: 'name' };

  // Descripción
  if (description.includes(q)) return { score: 60, matchType: 'description' };

  // Tags
  for (const tag of tags) {
    if (tag === q) return { score: 70, matchType: 'tag' };
    if (tag.includes(q)) return { score: 50, matchType: 'tag' };
  }

  // Categoría
  if (category.includes(q)) return { score: 40, matchType: 'category' };

  return { score: 0, matchType: 'name' };
}

/**
 * ToolRegistry - Registro centralizado de tools del sistema
 * 
 * Gestiona el ciclo de vida completo de las tools: registro,
 * búsqueda, filtrado y ejecución con validación.
 */
export class ToolRegistry {
  /** Mapa interno de tools registradas */
  private tools: Map<string, Tool> = new Map();

  /**
   * Crea una nueva instancia del registry
   * @param initialTools Tools iniciales para registrar (opcional)
   */
  constructor(initialTools: Tool[] = []) {
    for (const tool of initialTools) {
      this.register(tool);
    }
  }

  /**
   * Registra una nueva tool en el registry
   * @throws Error si ya existe una tool con el mismo nombre
   */
  register<TInput extends ToolInput = ToolInput, TOutput = unknown>(tool: Tool<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} ya esta registrada`);
    }
    this.tools.set(tool.name, tool as Tool);
  }

  /**
   * Elimina una tool del registry
   * @param name Nombre de la tool a eliminar
   * @returns true si la tool existía y fue eliminada, false si no existía
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Obtiene una tool por nombre
   * @param name Nombre de la tool
   * @returns La tool si existe, undefined si no
   */
  get<TInput extends ToolInput = ToolInput, TOutput = unknown>(name: string): Tool<TInput, TOutput> | undefined {
    return this.tools.get(name) as Tool<TInput, TOutput> | undefined;
  }

  /**
   * Lista todas las tools registradas
   * @returns Array con todas las tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Lista tools filtradas por categoría
   * @param category Categoría a filtrar
   * @returns Array de tools en la categoría especificada
   */
  listByCategory(category: ToolCategory): Tool[] {
    return this.list().filter(tool => tool.category === category);
  }

  /**
   * Busca tools por nombre, descripción o tags
   * @param query Texto a buscar (case-insensitive)
   * @returns Array de tools ordenadas por relevancia
   */
  search(query: string): Tool[] {
    if (!query || query.trim() === '') {
      return this.list();
    }

    const q = query.toLowerCase().trim();
    
    return this.list()
      .map(tool => {
        const { score, matchType } = calculateSearchScore(tool, q);
        return { tool, score, matchType };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ tool }) => tool);
  }

  /**
   * Verifica si una tool existe en el registry
   * @param name Nombre de la tool
   * @returns true si existe, false si no
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Ejecuta una tool por nombre con validación de input
   * @param name Nombre de la tool a ejecutar
   * @param input Datos de entrada para la tool
   * @param context Contexto de ejecución (opcional)
   * @returns Resultado de la tool
   */
  async execute<TInput extends ToolInput = ToolInput, TOutput = unknown>(
    name: string,
    input: TInput,
    context: ToolExecutionContext
  ): Promise<ToolResult<TOutput>> {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        success: false,
        error: createRegistryError(
          RegistryErrorCode.TOOL_NOT_FOUND,
          `Tool '${name}' no encontrada en el registry`,
          name
        )
      };
    }

    // Validar input contra schema
    const validation = validateInput(input, tool.inputSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: createRegistryError(
          RegistryErrorCode.INVALID_INPUT,
          `Validación de input fallida: ${validation.errors.join('; ')}`,
          name,
          validation.errors.join('; ')
        )
      };
    }

    // Preparar contexto con timeout y signal
    const timeout = context.timeout || 30000;
    const signal = context.signal;
    const startedAt = new Date();

    // Crear abort controller para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Si ya hay un signal externo, escucharlo
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      // Ejecutar la tool
      const result = await Promise.race([
        tool.handler(input, context),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Operation cancelled'));
          });
        })
      ]);

      clearTimeout(timeoutId);
      
      // Añadir metadata de duración si el resultado es exitoso y no la tiene
      if (result.success && !result.metadata?.duration) {
        const durationMs = Date.now() - startedAt.getTime();
        const successResult = result as ToolResultSuccess<TOutput>;
        return {
          success: true,
          data: successResult.data,
          metadata: {
            ...successResult.metadata,
            duration: durationMs,
            startedAt,
            completedAt: new Date()
          }
        } as ToolResult<TOutput>;
      }
      
      return result as ToolResult<TOutput>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.message === 'Operation cancelled') {
          return {
            success: false,
            error: createRegistryError(
              RegistryErrorCode.CANCELLED,
              'Operación cancelada por el usuario',
              name
            )
          };
        }

        if (error.message === 'Timeout exceeded') {
          return {
            success: false,
            error: createRegistryError(
              RegistryErrorCode.TIMEOUT,
              `Timeout de ${timeout}ms excedido`,
              name
            )
          };
        }

        return {
          success: false,
          error: createRegistryError(
            RegistryErrorCode.EXECUTION_FAILED,
            `Error ejecutando tool '${name}': ${error.message}`,
            name,
            error.message
          )
        };
      }

      return {
        success: false,
        error: createRegistryError(
          RegistryErrorCode.EXECUTION_FAILED,
          `Error desconocido ejecutando tool '${name}'`,
          name
        )
      };
    }
  }
}
