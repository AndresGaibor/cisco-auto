var BRIDGE_DIR = '/tmp/cisco-auto-bridge';
var COMMAND_FILE = BRIDGE_DIR + '/bridge-command.json';
var RESPONSE_FILE = BRIDGE_DIR + '/bridge-response.json';
var POLL_INTERVAL = 250;

var fileManager = null;
var pollTimer = null;
var lastCommandId = null;
var webView = null;

function main() {
    console.log('[Bridge-SE] Script Engine iniciado');

    try {
        fileManager = ipc.systemFileManager();
        console.log('[Bridge-SE] SystemFileManager disponible');
    } catch (e) {
        console.log('[Bridge-SE] Error obteniendo SystemFileManager: ' + e.message);
        return;
    }

    try {
        console.log('[Bridge-SE] webViewManager disponible');
        console.log('[Bridge-SE] Metodos: ' + JSON.stringify(Object.keys(webViewManager)));
        webView = webViewManager.createWebView('Bridge Client', 'this-sm:bridge.html', 420, 320);
        webView.show();
        console.log('[Bridge-SE] WebView mostrada');
    } catch (e) {
        console.log('[Bridge-SE] Error creando WebView: ' + e.message);
    }

    startPolling();
}

function cleanUp() {
    console.log('[Bridge-SE] Script Engine detenido');

    try {
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
        if (webViewManager) {
            webViewManager.closeAll();
        }
    } catch (e) {
        console.log('[Bridge-SE] Error en cleanUp: ' + e.message);
    }
}

function startPolling() {
    console.log('[Bridge-SE] Iniciando polling por archivo cada ' + POLL_INTERVAL + 'ms');
    poll();
}

function poll() {
    try {
        var cmd = readCommand();
        if (cmd && cmd.id && cmd.id !== lastCommandId) {
            lastCommandId = cmd.id;
            logToUI('Comando recibido: ' + cmd.tipo);
            var result = executeCommand(cmd);
            writeResponse(cmd, result.ok, result.message);
            clearCommandFile();
        }
    } catch (e) {
        console.log('[Bridge-SE] Error en polling: ' + e.message);
    }

    pollTimer = setTimeout(poll, POLL_INTERVAL);
}

function readCommand() {
    if (!fileManager || !fileManager.fileExists(COMMAND_FILE)) {
        return null;
    }

    var raw = fileManager.getFileContents(COMMAND_FILE);
    if (!raw) {
        return null;
    }

    return JSON.parse(raw);
}

function clearCommandFile() {
    try {
        if (fileManager && fileManager.fileExists(COMMAND_FILE)) {
            if (typeof fileManager.removeFile === 'function') {
                fileManager.removeFile(COMMAND_FILE);
            } else {
                fileManager.writeTextToFile(COMMAND_FILE, '');
            }
        }
    } catch (e) {
        console.log('[Bridge-SE] Error limpiando comando: ' + e.message);
    }
}

function writeResponse(cmd, ok, message) {
    try {
        var response = {
            id: cmd.id,
            tipo: cmd.tipo,
            ok: ok,
            message: message,
            timestamp: new Date().toISOString()
        };

        fileManager.writeTextToFile(RESPONSE_FILE, JSON.stringify(response, null, 2));
    } catch (e) {
        console.log('[Bridge-SE] Error escribiendo respuesta: ' + e.message);
    }
}

function executeCommand(cmd) {
    try {
        switch (cmd.tipo) {
            case 'ping':
                console.log('[Bridge-SE] PING OK');
                return { ok: true, message: 'ping ok' };

            case 'test':
                testBridge();
                return { ok: true, message: 'test ok' };

            case 'demo-vlan':
                demoVlan();
                return { ok: true, message: 'demo-vlan ok' };

            case 'agregarDispositivo':
                console.log('[Bridge-SE] agregarDispositivo: ' + JSON.stringify(cmd.args || []));
                return { ok: true, message: 'agregarDispositivo ok' };

            case 'conectar':
                console.log('[Bridge-SE] conectar: ' + JSON.stringify(cmd.args || []));
                return { ok: true, message: 'conectar ok' };

            case 'configurar':
                console.log('[Bridge-SE] configurar: ' + JSON.stringify(cmd.args || []));
                return { ok: true, message: 'configurar ok' };

            case 'eliminarDispositivo':
                console.log('[Bridge-SE] eliminarDispositivo: ' + JSON.stringify(cmd.args || []));
                return { ok: true, message: 'eliminarDispositivo ok' };

            default:
                console.log('[Bridge-SE] Comando desconocido: ' + cmd.tipo);
                return { ok: false, message: 'comando desconocido' };
        }
    } catch (e) {
        console.log('[Bridge-SE] Error ejecutando comando: ' + e.message);
        return { ok: false, message: e.message };
    }
}

function logToUI(msg) {
    try {
        if (webView && typeof webView.evaluateJavaScriptAsync === 'function') {
            webView.evaluateJavaScriptAsync('window.BridgeUI && window.BridgeUI.log(' + JSON.stringify(msg) + ');');
        }
    } catch (e) {
        console.log('[Bridge-SE] Error enviando log a UI: ' + e.message);
    }
}

function testBridge() {
    console.log('[Bridge-SE] ✅ BRIDGE FUNCIONANDO PERFECTAMENTE');
    logToUI('✅ BRIDGE FUNCIONANDO PERFECTAMENTE');
}

function demoVlan() {
    console.log('[Bridge-SE] VLAN demo:');
    console.log('[Bridge-SE] - R1 <-> SW-CORE');
    console.log('[Bridge-SE] - SW-CORE <-> SW-ACC1');
    console.log('[Bridge-SE] - SW-CORE <-> SW-ACC2');
    console.log('[Bridge-SE] - VLAN 10: ADMIN');
    console.log('[Bridge-SE] - VLAN 20: USERS');
    console.log('[Bridge-SE] - VLAN 30: GUEST');
    console.log('[Bridge-SE] - Trunk entre SW-CORE y access');
    console.log('[Bridge-SE] - Router-on-a-stick para inter-VLAN routing');
    logToUI('Demo VLAN cargada: R1/SW-CORE/SW-ACC1/SW-ACC2 + VLAN 10/20/30');
}
