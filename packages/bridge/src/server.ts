import { serve } from 'bun';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { 
  QueuePacketSchema, 
  PTEventSchema, 
  type QueuePacket, 
  type PTEvent 
} from './schemas.ts';

/**
 * Puerto por defecto del bridge server
 */
const DEFAULT_PORT = parseInt(process.env.BRIDGE_PORT || '54321');
const HOST = '127.0.0.1';

// ============================================================================
// Estado Global
// ============================================================================

const queue: string[] = [];
const recentEvents: PTEvent[] = [];
let lastPollAt = 0;

const logDir = join(process.cwd(), 'pt-logs');
try {
  mkdirSync(logDir, { recursive: true });
} catch (e) {
  // Ignorar si ya existe
}

// ============================================================================
// Utilidades
// ============================================================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function text(data: string, status = 200) {
  return new Response(data, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function persistEvent(evt: PTEvent) {
  try {
    appendFileSync(join(logDir, 'events.jsonl'), JSON.stringify(evt) + '\n');
  } catch (e) {
    console.error('❌ Error persistiendo evento:', e);
  }
  recentEvents.push(evt);
  if (recentEvents.length > 500) recentEvents.shift();
}

function enqueuePacket(packet: QueuePacket) {
  const full = {
    id: packet.id || crypto.randomUUID(),
    ts: Date.now(),
    ...packet,
  };

  // El script en PT espera una llamada a __ptRemote.evalPacket
  const js = `__ptRemote.evalPacket(${JSON.stringify(full)});`;
  queue.push(js);
  return full;
}

// ============================================================================
// Servidor principal
// ============================================================================

export function startBridgeServer() {
  console.log(`🔌 Bridge server iniciando en http://${HOST}:${DEFAULT_PORT}`);
  
  const server = serve({
    port: DEFAULT_PORT,
    hostname: HOST,
    
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const pathname = url.pathname;
      const method = req.method;

      if (method === 'OPTIONS') {
        return text('', 204);
      }

      // Endpoint para polling desde Packet Tracer
      if (method === 'GET' && pathname === '/next') {
        lastPollAt = Date.now();
        return text(queue.shift() ?? '');
      }

      // Endpoint para estado del bridge
      if (method === 'GET' && pathname === '/status') {
        return json({
          connected: Date.now() - lastPollAt < 5000,
          queued: queue.length,
          lastPollAgoMs: lastPollAt ? Date.now() - lastPollAt : null,
        });
      }

      // Endpoint para ver eventos recientes
      if (method === 'GET' && pathname === '/events') {
        const limit = Number(url.searchParams.get('limit') ?? '100');
        return json(recentEvents.slice(-Math.max(1, Math.min(limit, 500))));
      }

      // Endpoint para reportes desde Packet Tracer
      if (method === 'POST' && pathname === '/event') {
        try {
          const body = await req.json();
          const result = PTEventSchema.safeParse(body);
          if (!result.success) {
            console.warn('⚠️ Evento inválido recibido:', result.error.format());
            return json({ ok: false, error: 'invalid_event' }, 400);
          }
          persistEvent(result.data);
          return json({ ok: true });
        } catch (e) {
          return json({ ok: false, error: 'invalid_json' }, 400);
        }
      }

      // Encolar paquetes genéricos
      if (method === 'POST' && pathname === '/queue') {
        try {
          const body = await req.json();
          const result = QueuePacketSchema.safeParse(body);
          if (!result.success) {
            return json({ ok: false, error: result.error.format() }, 400);
          }
          const full = enqueuePacket(result.data);
          return json({ ok: true, queued: true, packet: full });
        } catch (e) {
          return json({ ok: false, error: 'invalid_json' }, 400);
        }
      }

      // Atajos para encolar acciones comunes
      if (method === 'POST' && pathname === '/queue/eval') {
        try {
          const body = await req.json() as { code: string; payload?: unknown; withSnapshot?: boolean };
          if (!body.code) return json({ ok: false, error: 'missing_code' }, 400);
          const full = enqueuePacket({
            kind: 'eval',
            code: body.code,
            payload: body.payload,
            withSnapshot: body.withSnapshot,
          });
          return json({ ok: true, queued: true, packet: full });
        } catch (e) {
          return json({ ok: false, error: 'invalid_json' }, 400);
        }
      }

      if (method === 'POST' && pathname === '/queue/runtime') {
        try {
          const body = await req.json() as { code: string };
          if (!body.code) return json({ ok: false, error: 'missing_code' }, 400);
          const full = enqueuePacket({ kind: 'set-runtime', code: body.code });
          return json({ ok: true, queued: true, packet: full });
        } catch (e) {
          return json({ ok: false, error: 'invalid_json' }, 400);
        }
      }

      if (method === 'POST' && pathname === '/queue/run') {
        try {
          const body = await req.json() as { payload?: unknown; withSnapshot?: boolean };
          const full = enqueuePacket({
            kind: 'run-runtime',
            payload: body.payload,
            withSnapshot: body.withSnapshot,
          });
          return json({ ok: true, queued: true, packet: full });
        } catch (e) {
          return json({ ok: false, error: 'invalid_json' }, 400);
        }
      }

      if (method === 'POST' && pathname === '/queue/snapshot') {
        const full = enqueuePacket({ kind: 'snapshot' });
        return json({ ok: true, queued: true, packet: full });
      }

      return json({ ok: false, error: 'not_found' }, 404);
    }
  });

  console.log(`✅ Bridge server corriendo en http://${HOST}:${DEFAULT_PORT}`);
  
  return {
    stop: () => {
      server.stop();
      console.log('🛑 Bridge server detenido');
    }
  };
}

export const VERSION = '2.0.0';

if (import.meta.main) {
  startBridgeServer();
}
