#!/usr/bin/env bun

const { runPtCommand } = await import('../../../../scripts/pt-cli.ts');

export type IntencionPT =
  | 'runtime.status'
  | 'device.list'
  | 'logs.tail'
  | 'snapshot.save'
  | 'topology.events';

export interface CoincidenciaIntencion {
  intencion: IntencionPT;
  comando: string[];
  confianza: number;
  destructiva: boolean;
}

interface DescriptorIntencion {
  patron: RegExp;
  intencion: IntencionPT;
  comando?: string[];
  fabrica?: (texto: string) => string[];
  destructiva?: boolean;
  confianza: number;
}

const descriptores: DescriptorIntencion[] = [
  {
    patron: /(estado|status).*(runtime|bridge|pt)/i,
    intencion: 'runtime.status',
    comando: ['runtime', 'status', '--format', 'json'],
    confianza: 0.82,
  },
  {
    patron: /(listar|mostrar).*(dispositivo|equipo|device)/i,
    intencion: 'device.list',
    comando: ['device', 'list', '--format', 'json'],
    confianza: 0.78,
  },
  {
    patron: /(logs?|bitácora).*(seguir|tail|ver)/i,
    intencion: 'logs.tail',
    comando: ['logs', '--tail', '50'],
    confianza: 0.7,
  },
  {
    patron: /(respalda|snapshot|guarda).*(topolog)/i,
    intencion: 'snapshot.save',
    fabrica: (texto) => ['snapshot', 'save', generarNombre(texto)],
    confianza: 0.66,
  },
  {
    patron: /(inspecciona|inspect|detalles).*(evento|bitácora|historial)/i,
    intencion: 'topology.events',
    comando: ['runtime', 'events', '--tail', '100'],
    confianza: 0.6,
  },
];

export function detectarIntencionPT(texto: string): CoincidenciaIntencion | null {
  const entrada = texto.trim();
  if (!entrada) {
    return null;
  }
  for (const descriptor of descriptores) {
    if (descriptor.patron.test(entrada)) {
      const comando = descriptor.fabrica ? descriptor.fabrica(entrada) : descriptor.comando ?? [];
      return {
        intencion: descriptor.intencion,
        comando,
        confianza: descriptor.confianza,
        destructiva: descriptor.destructiva ?? false,
      };
    }
  }
  return null;
}

export interface OpcionesEjecucionIntencion {
  directorio?: string;
  argumentosExtra?: string[];
}

export interface ResultadoEjecucionIntencion {
  exito: boolean;
  stdout?: string;
  stderr?: string;
  comando: string[];
  intencion: IntencionPT;
}

export async function ejecutarIntencionPT(
  coincidencia: CoincidenciaIntencion,
  opciones?: OpcionesEjecucionIntencion
): Promise<ResultadoEjecucionIntencion> {
  const argumentos = [...coincidencia.comando, ...(opciones?.argumentosExtra ?? [])];
  const respuesta = await conDevDir(opciones?.directorio, () => runPtCommand(argumentos));
  return {
    exito: respuesta.success,
    stdout: respuesta.stdout,
    stderr: respuesta.stderr,
    comando: argumentos,
    intencion: coincidencia.intencion,
  };
}

function generarNombre(texto: string): string {
  const base = texto
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  if (base.length >= 3) {
    return base;
  }
  return `snapshot-${Date.now()}`;
}

async function conDevDir<T>(devDir: string | undefined, tarea: () => Promise<T>): Promise<T> {
  if (!devDir) {
    return tarea();
  }
  const previo = process.env.PT_DEV_DIR;
  process.env.PT_DEV_DIR = devDir;
  try {
    return await tarea();
  } finally {
    if (previo === undefined) {
      delete process.env.PT_DEV_DIR;
    } else {
      process.env.PT_DEV_DIR = previo;
    }
  }
}

function mostrarResultado(resultado: ResultadoEjecucionIntencion): void {
  const payload = {
    intent: resultado.intencion,
    command: resultado.comando,
    success: resultado.exito,
    stdout: resultado.stdout?.trim(),
    stderr: resultado.stderr?.trim(),
  };
  console.log(JSON.stringify(payload, null, 2));
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Proporciona una instrucción.');
    process.exit(1);
  }
  if (args[0] === '--detect') {
    const texto = args.slice(1).join(' ');
    const coinc = detectarIntencionPT(texto);
    console.log(coinc ? JSON.stringify(coinc, null, 2) : 'null');
    process.exit(coinc ? 0 : 2);
  }
  const texto = args.join(' ');
  const coinc = detectarIntencionPT(texto);
  if (!coinc) {
    console.error('No se detectó intención.');
    process.exit(2);
  }
  ejecutarIntencionPT(coinc, { directorio: process.env.PT_DEV_DIR })
    .then(mostrarResultado)
    .catch((error) => {
      console.error(error);
      process.exit(3);
    });
}
