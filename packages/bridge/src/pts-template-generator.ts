// Generador de plantillas .pts para Packet Tracer
// El archivo producido incluye la topología serializada y el bootstrap
// que inyecta el polling HTTP en la WebView de PTBuilder.

import type { TopologyPlan } from '../../packages/core/src/schemas/tool.ts';

// Valores configurables para el bridge
const BRIDGE_HOST = process.env.PT_BRIDGE_HOST || '127.0.0.1';
const BRIDGE_PORT = process.env.PT_BRIDGE_PORT || '54321';

/**
 * Genera el script de bootstrap remoto que habilita telemetría y hot-reload.
 */
function makeRemoteBootstrap(): string {
  return `
var __ptRemote = (function() {
  var state = { port: ${BRIDGE_PORT}, pollMs: 400, cmdLogMs: 700, runtimeFn: null, lastCmdIndex: 0 };
  function post(obj) {
    try {
      var json = JSON.stringify(obj).replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
      var js = "(function(){var x=new XMLHttpRequest();x.open('POST','http://127.0.0.1:' + state.port + '/event',true);x.setRequestHeader('Content-Type','application/json');x.send(\\"" + json + "\\");})();";
      window.webview.evaluateJavaScriptAsync(js);
    } catch (e) {}
  }
  function snapshot() {
    var net = ipc.network(); var devices = []; var dc = net.getDeviceCount();
    for (var i = 0; i < dc; i++) {
      var d = net.getDeviceAt(i); var ports = []; var pc = d.getPortCount();
      for (var p = 0; p < pc; p++) try { ports.push(d.getPortAt(p).getName()); } catch (e) {}
      devices.push({ name: d.getName(), model: d.getModel(), type: d.getType(), ports: ports });
    }
    return { deviceCount: dc, linkCount: net.getLinkCount ? net.getLinkCount() : null, devices: devices };
  }
  function flushCommandLog() {
    try {
      var cl = ipc.commandLog(); cl.setEnabled(true); var count = cl.getEntryCount();
      while (state.lastCmdIndex < count) {
        var e = cl.getEntryAt(state.lastCmdIndex++);
        post({ type: "cmdlog", ts: Date.now(), device: e.getDeviceName(), prompt: e.getPrompt(), command: e.getCommand() });
      }
    } catch (e) {}
  }
  function execPacket(pkt) {
    try {
      if (pkt.kind === "hello") { post({ type: "hello", ts: Date.now(), source: "pt", snapshot: snapshot() }); return; }
      if (pkt.kind === "eval") {
        var fn = new Function("payload", "ipc", "window", "pt", pkt.code);
        var r = fn(pkt.payload || {}, ipc, window, __ptRemote);
        post({ type: "result", id: pkt.id, ok: true, value: r, snapshot: pkt.withSnapshot ? snapshot() : undefined });
      }
    } catch (e) { post({ type: "error", id: pkt.id, ts: Date.now(), message: String(e) }); }
  }
  return { 
    start: function() {
      window.webview.evaluateJavaScriptAsync("(function(){setInterval(function(){var x=new XMLHttpRequest();x.open('GET','http://127.0.0.1:" + state.port + "/next',true);x.onload=function(){if(x.status===200&&x.responseText){$se('__ptRemote.execPacket', JSON.parse(x.responseText));}};x.send();}, 400);})();");
      setInterval(function(){ try{$se('__ptRemote.flushCommandLog');}catch(e){} }, 700);
      post({ type: "hello", ts: Date.now(), source: "pt-bootstrap" });
    },
    execPacket: execPacket,
    flushCommandLog: flushCommandLog
  };
})();
__ptRemote.start();
`;
}

/**
 * Genera el contenido del archivo .pts.
 */
export function generatePtsTemplate(topology: TopologyPlan): string {
  const bootstrap = makeRemoteBootstrap();
  const topologyJson = JSON.stringify(topology, null, 2);

  return `
// Auto-generated .pts template
const TOPOLOGY_DATA = ${topologyJson};

// Mapeo oficial de tipos de conexión
const CT = {
  straight: 8100, cross: 8101, fiber: 8103, serial: 8106,
  auto: 8107, console: 8108, wireless: 8109, coaxial: 8110
};

function runTopology(t) {
  var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
  if (!t.devices) return;
  
  // Crear dispositivos
  for (var i = 0; i < t.devices.length; i++) {
    var d = t.devices[i];
    if (d.ptType !== undefined) {
      lw.addDevice(d.ptType, d.model || "", d.x || 100, d.y || 100);
    }
  }
  
  // Crear enlaces (usando firma oficial)
  if (t.links) {
    for (var j = 0; j < t.links.length; j++) {
      var l = t.links[j];
      var ct = CT[l.cableType] || CT.auto;
      lw.createLink(l.from.deviceId, l.from.port, l.to.deviceId, l.to.port, ct);
    }
  }
}

try { runTopology(TOPOLOGY_DATA); } catch(e) { dprint("Error en topologia inicial: " + e); }

${bootstrap}
`;
}

export default generatePtsTemplate;
