#!/usr/bin/env bun
/**
 * Append Report Script
 * 
 * Crea reportes en .ai/reports/{errors,efficiency,repeated-flows}/
 * 
 * Uso: bun run append-report.ts [opciones]
 * 
 * Opciones:
 *   --tipo <tipo>          Tipo de reporte: errors, efficiency, repeated-flows
 *   --autor <nombre>       Autor del reporte
 *   --criticidad           Criticidad: baja, media, alta, critica (para errors)
 *   --titulo <titulo>      Título del reporte
 *   --descripcion <texto>  Descripción del problema Hallazgo
 *   --evidencia <texto>    Evidencia/logs
 *   --impacto <texto>      Impacto del problema
 *   --workaround <texto>   Solución temporal si existe
 *   --propuesta <texto>    Propuesta de solución
 *   -h, --help             Muestra esta ayuda
 */

import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { parseArgs } from 'util';
import { join, dirname } from 'path';

// Tipos de reportes válidos
const TIPOS_VALIDOS = ['errors', 'efficiency', 'repeated-flows'] as const;
type TipoReporte = typeof TIPOS_VALIDOS[number];

// Carga la plantilla correspondiente al tipo de reporte
function loadTemplate(tipo: TipoReporte): string {
  const templateMap: Record<TipoReporte, string> = {
    'errors': 'error-report.md',
    'efficiency': 'efficiency-report.md',
    'repeated-flows': 'repeated-flow-report.md',
  };
  
  const templatePath = join(dirname(__dirname), 'templates', templateMap[tipo]);
  if (!existsSync(templatePath)) {
    throw new Error(`Plantilla no encontrada: ${templatePath}`);
  }
  return require('fs').readFileSync(templatePath, 'utf-8');
}

// Genera el contenido del reporte según el tipo
function generateReportContent(params: {
  tipo: TipoReporte;
  autor: string;
  criticidad: string;
  titulo: string;
  descripcion: string;
  evidencia: string;
  impacto: string;
  workaround: string;
  propuesta: string;
}): string {
  const template = loadTemplate(params.tipo);
  const fecha = new Date().toISOString().split('T')[0];
  
  let content = template
    .replace('autor:', `autor: ${params.autor || 'anonimo'}`)
    .replace('fecha:', `fecha: ${fecha}`);
  
  // Personaliza según el tipo de reporte
  if (params.tipo === 'errors') {
    const criticidadValor = params.criticidad || 'media';
    content = content
      .replace('tipo: error', `tipo: ${params.tipo}`)
      .replace('criticidad:', `criticidad: ${criticidadValor}`)
      .replace('_Explica el error observado, incluyendo mensajes, comandos y contexto._', 
        params.descripcion || '_Sin descripción_')
      .replace('_Adjunta logs, capturas de pantalla o pasos para reproducir._', 
        params.evidencia || '_Sin evidencia_')
      .replace('_¿Qué consecuencias tiene este error? ¿Afecta a todos o solo a ciertos casos?_', 
        params.impacto || '_Sin impacto definido_')
      .replace('_¿Existe una forma temporal de evitar el error?_', 
        params.workaround || '_No existe workaround_')
      .replace('_Describe cómo debería resolverse el error._', 
        params.propuesta || '_Sin propuesta_');
      
  } else if (params.tipo === 'efficiency') {
    content = content
      .replace('tipo: eficiencia', `tipo: ${params.tipo}`)
      .replace('_Describe el proceso o flujo actual que se busca optimizar._', 
        params.descripcion || '_Sin descripción_')
      .replace('_Adjunta métricas, tiempos, ejemplos o comparativas que respalden la necesidad de mejora._', 
        params.evidencia || '_Sin evidencia_')
      .replace('_¿Qué beneficios se esperan al mejorar este flujo? (tiempo, errores, satisfacción, etc.)_', 
        params.impacto || '_Sin impacto definido_')
      .replace('_Explica la optimización sugerida y cómo implementarla._', 
        params.propuesta || '_Sin propuesta_');
      
  } else if (params.tipo === 'repeated-flows') {
    content = content
      .replace('tipo: flujo-repetido', `tipo: ${params.tipo}`)
      .replace('_Explica el flujo o tarea que se repite frecuentemente._', 
        params.descripcion || '_Sin descripción_')
      .replace('_Adjunta ejemplos, logs o métricas que demuestren la repetición._', 
        params.evidencia || '_Sin evidencia_')
      .replace('_¿Qué problemas o desperdicios genera este flujo repetitivo?_', 
        params.impacto || '_Sin impacto definido_')
      .replace('_Describe cómo se podría automatizar o mejorar el flujo repetitivo._', 
        params.propuesta || '_Sin propuesta_');
  }
  
  return content;
}

// Parsea los argumentos
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    tipo: {
      type: 'string',
      short: 't',
      default: 'errors',
    },
    autor: {
      type: 'string',
      short: 'a',
      default: '',
    },
    criticidad: {
      type: 'string',
      short: 'c',
      default: 'media',
    },
    titulo: {
      type: 'string',
      short: 'T',
      default: '',
    },
    descripcion: {
      type: 'string',
      short: 'd',
      default: '',
    },
    evidencia: {
      type: 'string',
      short: 'e',
      default: '',
    },
    impacto: {
      type: 'string',
      short: 'i',
      default: '',
    },
    workaround: {
      type: 'string',
      short: 'w',
      default: '',
    },
    propuesta: {
      type: 'string',
      short: 's',
      default: '',
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false,
    },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Append Report - Creador de Reportes

Uso: bun run append-report.ts [opciones]

Opciones:
  -t, --tipo <tipo>          Tipo: errors, efficiency, repeated-flows (default: errors)
  -a, --autor <nombre>       Autor del reporte
  -c, --criticidad <nivel>   Criticidad: baja, media, alta, critica (default: media)
  -T, --titulo <titulo>      Título del reporte
  -d, --descripcion <texto>  Descripción del problema/hallazgo
  -e, --evidencia <texto>   Evidencia/logs
  -i, --impacto <texto>     Impacto del problema
  -w, --workaround <texto>   Solución temporal si existe
  -s, --propuesta <texto>   Propuesta de solución
  -h, --help                Muestra esta ayuda

Ejemplos:
  bun run append-report.ts -t errors -T "Error de conexión" -d "No conecta al router"
  bun run append-report.ts -t efficiency -T "Optimización VLAN" -c alta
  bun run append-report.ts -t repeated-flows -T "Flujo repetido config"
`);
  process.exit(0);
}

// Valida el tipo de reporte
const tipo = (values.tipo as string)?.toLowerCase() as TipoReporte;
if (!TIPOS_VALIDOS.includes(tipo)) {
  console.error(`Error: Tipo inválido. Use: ${TIPOS_VALIDOS.join(', ')}`);
  process.exit(1);
}

// Valida la criticidad para errors
let criticidad = values.criticidad as string;
if (tipo === 'errors') {
  const criticidadesValidas = ['baja', 'media', 'alta', 'critica'];
  if (!criticidadesValidas.includes(criticidad?.toLowerCase() || '')) {
    criticidad = 'media';
  }
}

// Genera el contenido
const contenido = generateReportContent({
  tipo,
  autor: values.autor as string,
  criticidad,
  titulo: values.titulo as string,
  descripcion: values.descripcion as string,
  evidencia: values.evidencia as string,
  impacto: values.impacto as string,
  workaround: values.workaround as string,
  propuesta: values.propuesta as string,
});

// Genera el nombre del archivo
const timestamp = Date.now();
const tituloSlug = (values.titulo as string || 'reporte')
  .toLowerCase()
  .replace(/[^a-z0-9áéíóúñ]+/g, '-')
  .replace(/^-|-$/g, '')
  .substring(0, 30);
const filename = `${timestamp}-${tituloSlug || 'reporte'}.md`;

// Asegura que el directorio existe
const projectRoot = join(dirname(dirname(dirname(dirname(__dirname)))), '');
const reportsDir = join(projectRoot, '.ai', 'reports', tipo);
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}

// Guarda el reporte
const filepath = join(reportsDir, filename);
writeFileSync(filepath, contenido, 'utf-8');

console.log(`✅ Reporte creado: ${filepath}`);
console.log(`   Tipo: ${tipo}`);
console.log(`   Título: ${values.titulo || 'Sin título'}`);
console.log(`   Autor: ${values.autor || 'anonimo'}`);
