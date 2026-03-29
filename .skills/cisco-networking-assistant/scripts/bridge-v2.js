// ============================================
// BRIDGE SCRIPT - Todo en Script Engine
// ============================================

var BRIDGE_DIR = '/tmp/cisco-auto-bridge';
var COMMAND_FILE = BRIDGE_DIR + '/bridge-command.json';
var RESPONSE_DIR = BRIDGE_DIR + '/responses';
var POLL_INTERVAL = 300;

var fileManager = null;
var pollTimer = null;
var lastCommandId = null;
var PT_HANDLERS = {};

function main() {
    console.log('[Bridge] Iniciando...');
    
    try {
        fileManager = ipc.systemFileManager();
        console.log('[Bridge] SystemFileManager OK');
    } catch (e) {
        console.log('[Bridge] Error: ' + e.message);
        return;
    }
    
    try {
        fileManager.writeTextToFile(RESPONSE_DIR + '/.keep', 'ok');
    } catch (e) {}
    
    initHandlers();
    startPolling();
    console.log('[Bridge] Listo');
}

function cleanUp() {
    if (pollTimer) clearTimeout(pollTimer);
}

function startPolling() {
    poll();
}

function poll() {
    try {
        var cmd = readCommand();
        if (cmd && cmd.id && cmd.id !== lastCommandId) {
            lastCommandId = cmd.id;
            console.log('[Bridge] Comando: ' + cmd.tipo);
            var result = executeCommand(cmd);
            writeResponse(cmd.id, result);
            clearCommandFile();
        }
    } catch (e) {
        console.log('[Bridge] Error poll: ' + e.message);
    }
    pollTimer = setTimeout(poll, POLL_INTERVAL);
}

function readCommand() {
    try {
        if (!fileManager.fileExists(COMMAND_FILE)) return null;
        var raw = fileManager.getFileContents(COMMAND_FILE);
        if (!raw || !String(raw).trim()) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function clearCommandFile() {
    try {
        if (fileManager.fileExists(COMMAND_FILE)) {
            fileManager.removeFile(COMMAND_FILE);
        }
    } catch (e) {}
}

function writeResponse(id, result) {
    try {
        var responseFile = RESPONSE_DIR + '/' + id + '.txt';
        var content = result.ok + '\n' + result.message + '\n';
        if (result.data) {
            content += JSON.stringify(result.data);
        }
        fileManager.writeTextToFile(responseFile, content);
        console.log('[Bridge] Respuesta escrita: ' + id);
    } catch (e) {
        console.log('[Bridge] Error writeResponse: ' + e.message);
    }
}

function executeCommand(cmd) {
    try {
        if (PT_HANDLERS[cmd.tipo]) {
            return PT_HANDLERS[cmd.tipo](cmd.args || []);
        }
        return { ok: false, message: 'Comando desconocido: ' + cmd.tipo };
    } catch (e) {
        return { ok: false, message: String(e) };
    }
}

function initHandlers() {
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
            
            console.log('[Bridge] Creado: ' + name);
            return { ok: true, message: 'OK', data: { name: name } };
        } catch (e) {
            return { ok: false, message: String(e) };
        }
    };

    PT_HANDLERS.conectar = function(args) {
        try {
            var p = args[0] || {};
            var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
            var result = lw.createLink(p.dev1, p.port1, p.dev2, p.port2, p.cableType || 'straight');
            if (!result) {
                return { ok: false, message: 'Error: createLink retorno false' };
            }
            console.log('[Bridge] Enlace: ' + p.dev1 + ' <-> ' + p.dev2);
            return { ok: true, message: 'Enlace creado' };
        } catch (e) {
            console.log('[Bridge] Error conectar: ' + String(e));
            return { ok: false, message: String(e) };
        }
    };

    PT_HANDLERS.configurar = function(args) {
        try {
            var p = args[0] || {};
            if (!p.device) return { ok: false, message: 'Device requerido' };
            var cmdStr = (p.commands || []).join('\n');
            pt.configureIosDevice(p.device, cmdStr);
            console.log('[Bridge] Config: ' + p.device);
            return { ok: true, message: 'OK' };
        } catch (e) {
            return { ok: false, message: String(e) };
        }
    };

    PT_HANDLERS.eliminarDispositivo = function(args) {
        try {
            var p = args[0] || {};
            var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
            lw.removeDevice(p.name);
            console.log('[Bridge] Eliminado: ' + p.name);
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
                devices.push({ name: d.getName(), model: d.getModel(), type: d.getType() });
            }
            console.log('[Bridge] Listados: ' + count);
            return { ok: true, message: 'OK', data: { devices: devices, count: count } };
        } catch (e) {
            return { ok: false, message: String(e) };
        }
    };

    PT_HANDLERS.obtenerDispositivo = function(args) {
        try {
            var p = args[0] || {};
            var dev = ipc.network().getDevice(p.name);
            if (!dev) return { ok: false, message: 'No encontrado: ' + p.name };
            
            var ports = [];
            for (var i = 0; i < dev.getPortCount(); i++) {
                var port = dev.getPortAt(i);
                ports.push({
                    name: port.getName(),
                    ip: port.getIpAddress() || '',
                    mask: port.getSubnetMask() || ''
                });
            }
            return { ok: true, message: 'OK', data: { name: dev.getName(), model: dev.getModel(), ports: ports } };
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
                links.push({
                    port1: link.getPort1().getName(),
                    port2: link.getPort2().getName()
                });
            }
            return { ok: true, message: 'OK', data: { links: links, count: count } };
        } catch (e) {
            return { ok: false, message: String(e) };
        }
    };

    console.log('[Bridge] Handlers cargados');
}
