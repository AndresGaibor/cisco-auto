#!/usr/bin/env bun
/**
 * Create Ticket Script
 * 
 * Genera tickets Markdown estructurados para el sistema de gestión de conocimiento.
 * 
 * Uso: bun run create-ticket.ts --title "Título" --description "Descripción" [opciones]
 * 
 * Opciones requeridas:
 *   --title, -t          Título del ticket (requerido)
 *   --description, -d   Descripción del problema/solicitud (requerido)
 * 
 * Opciones opcionales:
 *   --autor, -a          Autor del ticket (default: sistema)
 *   --prioridad          Prioridad: baja|media|alta|critica (default: media)
 *   --evidencia          Evidencia o contexto adicional
 *   --impacto            Impacto del problema
 *   --workaround         Solución temporal si existe
 *   --propuesta          Solución sugerida
 *   --criterios          Criterios de aceptación (separados por |)
 *   --help, -h           Muestra esta ayuda
 * 
 * Ejemplos:
 *   bun run create-ticket.ts -t "VLANs no funcionan" -d "Las PCs no tienen conectividad"
 *   bun run create-ticket.ts -t "Configuración OSPF" -d "Necesito ayuda con OSPF" -p alta
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { parseArgs } from 'util';
import { join, dirname } from 'path';

// Constants
const TICKETS_DIR = '.ai/tickets';
const TEMPLATE_PATH = '.claude/skills/cisco-networking-assistant/templates/ticket.md';

// Priority levels
type Priority = 'baja' | 'media' | 'alta' | 'critica';

// Interfaces
interface TicketData {
  titulo: string;
  descripcion: string;
  autor: string;
  fecha: string;
  prioridad: Priority;
  estado: string;
  evidencia?: string;
  impacto?: string;
  workaround?: string;
  propuesta?: string;
  criterios: string[];
}

// Parse command line arguments
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    title: {
      type: 'string',
      short: 't',
    },
    description: {
      type: 'string',
      short: 'd',
    },
    autor: {
      type: 'string',
      short: 'a',
      default: 'sistema',
    },
    prioridad: {
      type: 'string',
      short: 'p',
      default: 'media',
    },
    evidencia: {
      type: 'string',
      short: 'e',
    },
    impacto: {
      type: 'string',
      short: 'i',
    },
    workaround: {
      type: 'string',
      short: 'w',
    },
    propuesta: {
      type: 'string',
      short: 'o',
    },
    criterios: {
      type: 'string',
      short: 'c',
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false,
    },
  },
  allowPositionals: true,
});

// Validate arguments
function validateArgs(): TicketData | null {
  const errors: string[] = [];

  if (!values.title) {
    errors.push('El título (--title, -t) es requerido');
  }

  if (!values.description) {
    errors.push('La descripción (--description, -d) es requerida');
  }

  // Validate priority
  const validPriorities: Priority[] = ['baja', 'media', 'alta', 'critica'];
  const prioridad = (values.prioridad as Priority) || 'media';
  
  if (!validPriorities.includes(prioridad)) {
    errors.push(`Prioridad inválida: ${values.prioridad}. Opciones: ${validPriorities.join(', ')}`);
  }

  if (errors.length > 0) {
    console.error('Error de validación:');
    errors.forEach(err => console.error(`  • ${err}`));
    console.error('\nUsa --help para ver el uso correcto.');
    return null;
  }

  // Parse criterios (separated by |)
  const criterios = values.criterios 
    ? values.criterios.split('|').map(c => c.trim()).filter(c => c.length > 0)
    : [];

  return {
    titulo: values.title!,
    descripcion: values.description!,
    autor: values.autor || 'sistema',
    fecha: new Date().toISOString().split('T')[0],
    prioridad,
    estado: 'abierto',
    evidencia: values.evidencia,
    impacto: values.impacto,
    workaround: values.workaround,
    propuesta: values.propuesta,
    criterios,
  };
}

// Generate ticket content from template
function generateTicketContent(data: TicketData): string {
  let content = `---
tipo: ticket
autor: ${data.autor}
fecha: ${data.fecha}
prioridad: ${data.prioridad}
estado: ${data.estado}
---

# ${data.titulo}

## Resumen

${data.descripcion}
`;

  // Evidencia (optional)
  if (data.evidencia) {
    content += `
## Evidencia

${data.evidencia}
`;
  }

  // Impacto (optional)
  if (data.impacto) {
    content += `
## Impacto

${data.impacto}
`;
  }

  // Workaround (optional)
  if (data.workaround) {
    content += `
## Workaround (si existe)

${data.workaround}
`;
  }

  // Propuesta (optional)
  if (data.propuesta) {
    content += `
## Propuesta

${data.propuesta}
`;
  }

  // Criterios de aceptación
  content += `
## Criterios de aceptación
`;

  if (data.criterios.length > 0) {
    data.criterios.forEach(criterio => {
      content += `\n- [ ] ${criterio}`;
    });
  } else {
    content += '\n- [ ] _Condición por definir_';
  }

  content += '\n';
  return content;
}

// Generate stable filename
function generateFilename(titulo: string, fecha: string): string {
  // Create slug from title (lowercase, hyphens, max 50 chars)
  const slug = titulo
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .replace(/-+$/, '');
  
  // Format: YYYY-MM-DD-slug.md
  return `${fecha}-${slug}.md`;
}

// Ensure tickets directory exists
function ensureTicketsDir(): void {
  if (!existsSync(TICKETS_DIR)) {
    mkdirSync(TICKETS_DIR, { recursive: true });
    console.log(`📁 Directorio creado: ${TICKETS_DIR}`);
  }
}

// Main execution
function main() {
  // Show help
  if (values.help) {
    console.log(`
Create Ticket - Generador de tickets Markdown

Uso: bun run create-ticket.ts [opciones]

Opciones requeridas:
  -t, --title <texto>       Título del ticket (requerido)
  -d, --description <texto> Descripción del problema/solicitud (requerido)

Opciones opcionales:
  -a, --autor <nombre>     Autor del ticket (default: sistema)
  -p, --prioridad <nivel>  Prioridad: baja|media|alta|critica (default: media)
  -e, --evidencia <texto>  Evidencia o contexto adicional
  -i, --impacto <texto>    Impacto del problema
  -w, --workaround <texto> Solución temporal si existe
  -o, --propuesta <texto>  Solución sugerida
  -c, --criterios <texto>  Criterios de aceptación (separados por |)
  -h, --help               Muestra esta ayuda

Ejemplos:
  bun run create-ticket.ts -t "VLANs no funcionan" -d "Las PCs no tienen conectividad entre VLANs"
  bun run create-ticket.ts -t "Config OSPF" -d "Ayuda con configuración" -p alta -c "Verificar vecinos|Verificar rutas"
`);
    process.exit(0);
  }

  // Validate arguments
  const ticketData = validateArgs();
  if (!ticketData) {
    process.exit(1);
  }

  // Ensure directory exists
  ensureTicketsDir();

  // Generate content
  const content = generateTicketContent(ticketData);
  
  // Generate filename
  const filename = generateFilename(ticketData.titulo, ticketData.fecha);
  const filepath = join(TICKETS_DIR, filename);

  // Write file
  writeFileSync(filepath, content, 'utf-8');

  console.log(`✅ Ticket creado exitosamente: ${filepath}`);
  console.log(`   Título: ${ticketData.titulo}`);
  console.log(`   Prioridad: ${ticketData.prioridad}`);
  console.log(`   Fecha: ${ticketData.fecha}`);
}

main();
