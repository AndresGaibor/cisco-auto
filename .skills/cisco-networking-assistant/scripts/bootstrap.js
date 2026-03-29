// PT BOOTSTRAP - Cargar UNA SOLA VEZ en Packet Tracer

var BRIDGE_URL = 'http://127.0.0.1:54321';
var webView = null;

function main() {
    console.log('[PT-Bootstrap] Iniciando...');
    
    try {
        webView = webViewManager.createWebView('Bridge', 'about:blank', 1, 1);
        webView.show();
        
        var script = getBridgeScript();
        webView.evaluateJavaScriptAsync(script);
        console.log('[PT-Bootstrap] Bridge iniciado');
    } catch (e) {
        console.log('[PT-Bootstrap] Error: ' + e.message);
    }
}

function getBridgeScript() {
    return ''
+ 'var BRIDGE_URL = "http://127.0.0.1:54321";'
+ 'var PT_HANDLERS = {};'
+ 'var pollTimer = null;'
+ ''
+ 'function loadHandlers() {'
+ '    try {'
+ '        var xhr = new XMLHttpRequest();'
+ '        xhr.open("GET", BRIDGE_URL + "/handlers", false);'
+ '        xhr.send();'
+ '        if (xhr.status === 200) {'
+ '            $se("runCode", xhr.responseText);'
+ '            console.log("[Bridge] Handlers cargados");'
+ '        }'
+ '    } catch(e) { console.log("[Bridge] Error cargando handlers: " + e.message); }'
+ '}'
+ ''
+ 'function poll() {'
+ '    try {'
+ '        loadHandlers();'
+ '        var xhr = new XMLHttpRequest();'
+ '        xhr.open("GET", BRIDGE_URL + "/next", false);'
+ '        xhr.send();'
+ '        if (xhr.status === 200) {'
+ '            var data = JSON.parse(xhr.responseText);'
+ '            if (data.hasCommand && data.command) {'
+ '                executeCommand(data.command);'
+ '            }'
+ '        }'
+ '    } catch(e) { console.log("[Bridge] Poll error: " + e.message); }'
+ '    pollTimer = setTimeout(poll, 300);'
+ '}'
+ ''
+ 'function executeCommand(cmd) {'
+ '    console.log("[Bridge] Ejecutando: " + cmd.tipo);'
+ '    var result = {ok: false, message: "Unknown"};'
+ '    try {'
+ '        if (PT_HANDLERS[cmd.tipo]) {'
+ '            result = PT_HANDLERS[cmd.tipo](cmd.args);'
+ '        } else {'
+ '            result = {ok: false, message: "Handler no encontrado: " + cmd.tipo};'
+ '        }'
+ '    } catch(e) {'
+ '        result = {ok: false, message: String(e)};'
+ '    }'
+ '    sendResult(cmd.id, result);'
+ '}'
+ ''
+ 'function sendResult(id, result) {'
+ '    try {'
+ '        var xhr = new XMLHttpRequest();'
+ '        xhr.open("POST", BRIDGE_URL + "/result", false);'
+ '        xhr.setRequestHeader("Content-Type", "application/json");'
+ '        xhr.send(JSON.stringify({id: id, ok: result.ok, message: result.message, data: result.data}));'
+ '    } catch(e) {}'
+ '}'
+ ''
+ 'console.log("[Bridge] Script cargado, iniciando polling...");'
+ 'poll();';
}

function cleanUp() {
    if (webView) webViewManager.closeAll();
}
