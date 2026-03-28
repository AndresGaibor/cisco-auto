/**
 * Handlers dinámicos para Packet Tracer Script Engine
 * Este código se sirve vía GET /script y se ejecuta con $se('runCode', ...)
 */

export interface BridgeResult {
  id: string;
  ok: boolean;
  message: string;
  data?: unknown;
}

// Almacén de resultados pendientes
const pendingResults = new Map<string, BridgeResult>();

/**
 * Genera el código JavaScript de handlers para PT Script Engine
 */
export function generateHandlersScript(): string {
  return `
// ============================================
// PT SCRIPT ENGINE HANDLERS - Versión dinámica
// ============================================

var PT_HANDLERS = PT_HANDLERS || {};

// TypeId: 0=router, 1=switch, 8=PC, 9=server
PT_HANDLERS.agregarDispositivo = function(args) {
    try {
        var p = args[0] || {};
        var name = p.name;
        var typeId = p.typeId !== undefined ? p.typeId : 0;
        var model = p.model || '1941';
        var x = p.x || 100;
        var y = p.y || 100;

        var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
        var assignedName = lw.addDevice(typeId, model, x, y);

        if (!assignedName) return { ok: false, message: 'Error creando dispositivo' };

        if (assignedName !== name) {
            var dev = ipc.network().getDevice(assignedName);
            if (dev) dev.setName(name);
        }
        console.log('[PT] Creado: ' + name + ' (typeId=' + typeId + ')');
        return { ok: true, message: 'OK', data: { name: name } };
    } catch (e) { 
        return { ok: false, message: String(e) }; 
    }
};

PT_HANDLERS.conectar = function(args) {
    try {
        var p = args[0] || {};
        var dev1 = p.dev1;
        var port1 = p.port1;
        var dev2 = p.dev2;
        var port2 = p.port2;
        var cableType = p.cableType || 'straight';

        // Usar PTBuilder API
        pt.addLink(dev1, port1, dev2, port2, cableType);
        
        console.log('[PT] Enlace: ' + dev1 + ' <-> ' + dev2);
        return { ok: true, message: 'Enlace creado' };
    } catch (e) { 
        console.log('[PT] Error conectar: ' + String(e));
        return { ok: false, message: String(e) }; 
    }
};

PT_HANDLERS.configurar = function(args) {
    try {
        var p = args[0] || {};
        var device = p.device;
        var commands = p.commands || [];
        
        if (!device) return { ok: false, message: 'Device name required' };
        
        var cmdStr = commands.join('\n');
        pt.configureIosDevice(device, cmdStr);
        
        console.log('[PT] Config: ' + device + ' (' + commands.length + ' cmds)');
        return { ok: true, message: 'Configuración aplicada' };
    } catch (e) { 
        return { ok: false, message: String(e) }; 
    }
};

PT_HANDLERS.eliminarDispositivo = function(args) {
    try {
        var p = args[0] || {};
        var name = p.name;
        
        var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
        lw.removeDevice(name);
        
        console.log('[PT] Eliminado: ' + name);
        return { ok: true, message: 'OK' };
    } catch (e) { 
        return { ok: false, message: String(e) }; 
    }
};

PT_HANDLERS.listarDispositivos = function(args) {
    try {
        var net = ipc.network();
        var count = net.getDeviceCount();
        var devices = [];
        
        for (var i = 0; i < count; i++) {
            var d = net.getDeviceAt(i);
            devices.push({ 
                name: d.getName(), 
                model: d.getModel(), 
                type: d.getType() 
            });
        }
        
        console.log('[PT] Dispositivos: ' + count);
        return { ok: true, message: 'OK', data: { devices: devices, count: count } };
    } catch (e) { 
        return { ok: false, message: String(e) }; 
    }
};

PT_HANDLERS.obtenerDispositivo = function(args) {
    try {
        var p = args[0] || {};
        var name = p.name;
        
        var dev = ipc.network().getDevice(name);
        if (!dev) return { ok: false, message: 'Dispositivo no encontrado: ' + name };
        
        var ports = [];
        for (var i = 0; i < dev.getPortCount(); i++) {
            var port = dev.getPortAt(i);
            var link = port.getLink();
            var linkedPort = null;
            
            if (link) {
                var other = link.getOtherPort(port);
                if (other) linkedPort = other.getName();
            }
            
            ports.push({
                name: port.getName(),
                ip: port.getIpAddress() || '',
                mask: port.getSubnetMask() || '',
                mac: port.getMacAddress() || '',
                link: linkedPort
            });
        }
        
        return { ok: true, message: 'OK', data: { 
            name: dev.getName(), 
            model: dev.getModel(), 
            type: dev.getType(),
            ports: ports 
        }};
    } catch (e) { 
        return { ok: false, message: String(e) }; 
    }
};

PT_HANDLERS.obtenerEnlaces = function(args) {
    try {
        var net = ipc.network();
        var count = net.getLinkCount();
        var links = [];
        
        for (var i = 0; i < count; i++) {
            var link = net.getLinkAt(i);
            var p1 = link.getPort1();
            var p2 = link.getPort2();
            
            links.push({
                port1: p1.getName(),
                port2: p2.getName(),
                type: link.getConnectionType()
            });
        }
        
        return { ok: true, message: 'OK', data: { links: links, count: count } };
    } catch (e) { 
        return { ok: false, message: String(e) }; 
    }
};

console.log('[PT] Handlers actualizados y listos');
`;
}

/**
 * Ejecuta un handler y retorna el resultado
 */
export function executeHandler(tipo: string, args: unknown[]): BridgeResult {
  // Esto se ejecuta en el contexto del Script Engine, no aquí
  // Esta función es solo para tipado
  return { id: '', ok: false, message: 'Not implemented' };
}

/**
 * Registra un resultado pendiente
 */
export function registerResult(result: BridgeResult): void {
  pendingResults.set(result.id, result);
  
  // Limpiar resultados antiguos después de 30 segundos
  setTimeout(() => {
    pendingResults.delete(result.id);
  }, 30000);
}

/**
 * Obtiene y remueve un resultado pendiente
 */
export function consumeResult(id: string): BridgeResult | null {
  const result = pendingResults.get(id);
  if (result) {
    pendingResults.delete(id);
  }
  return result || null;
}

/**
 * Handler GET /handlers
 * Retorna los handlers como JavaScript ejecutable
 */
export function handleHandlers(): Response {
  const script = generateHandlersScript();
  
  return new Response(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}
