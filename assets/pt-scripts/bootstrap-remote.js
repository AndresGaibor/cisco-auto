/**
 * PT Bridge Bootstrap (Hot-Reload & Real-time Telemetry)
 * 
 * INSTRUCCIONES:
 * 1. Asegúrate de que el bridge server de Bun esté corriendo (puerto 54321).
 * 2. En Packet Tracer: Extensiones > Scripting > Configure PT Script Modules.
 * 3. Selecciona PTBuilder (o crea uno nuevo).
 * 4. Abre "Builder Code Editor".
 * 5. Pega este script y presiona "Run".
 */
var __ptRemote = (function() {
  var state = {
    port: 54321,
    pollMs: 400,
    cmdLogMs: 700,
    runtimeFn: null,
    lastCmdIndex: 0
  };

  function asText(x) {
    try {
      return typeof x === "string" ? x : JSON.stringify(x);
    } catch (e) {
      return String(x);
    }
  }

  function escapeJsString(s) {
    return String(s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n");
  }

  function post(obj) {
    try {
      var json = escapeJsString(JSON.stringify(obj));
      var js = "(function(){" +
        "var x=new XMLHttpRequest();" +
        "x.open('POST','http://127.0.0.1:" + state.port + "/event',true);" +
        "x.setRequestHeader('Content-Type','application/json');" +
        "x.send(\"" + json + "\");" +
        "})();";
      window.webview.evaluateJavaScriptAsync(js);
    } catch (e) {}
  }

  function log() {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) parts.push(asText(arguments[i]));
    post({
      type: "log",
      ts: Date.now(),
      level: "info",
      message: parts.join(" ")
    });
  }

  function snapshot() {
    var net = ipc.network();
    var devices = [];
    var dc = net.getDeviceCount();
    for (var i = 0; i < dc; i++) {
      var d = net.getDeviceAt(i);
      var ports = [];
      var pc = d.getPortCount();
      for (var p = 0; p < pc; p++) {
        try {
          ports.push(d.getPortAt(p).getName());
        } catch (e) {}
      }
      devices.push({
        name: d.getName(),
        model: d.getModel(),
        type: d.getType(),
        ports: ports
      });
    }
    var linkCount = null;
    try {
      linkCount = net.getLinkCount();
    } catch (e) {}
    return {
      deviceCount: dc,
      linkCount: linkCount,
      devices: devices
    };
  }

  function flushCommandLog() {
    try {
      var cl = ipc.commandLog();
      cl.setEnabled(true);
      var count = cl.getEntryCount();
      while (state.lastCmdIndex < count) {
        var idx = state.lastCmdIndex++;
        var e = cl.getEntryAt(idx);
        post({
          type: "cmdlog",
          ts: Date.now(),
          index: idx,
          time: e.getTimeToString(),
          device: e.getDeviceName(),
          prompt: e.getPrompt(),
          command: e.getCommand(),
          resolved: e.getResolvedCommand()
        });
      }
    } catch (e) {}
  }

  function makeFn(code) {
    return new Function(
      "payload", "ipc", "window", "pt",
      "addDevice", "addLink", "addModule", "configurePcIp", "configureIosDevice", "getDevices",
      code
    );
  }

  function execPacket(pkt) {
    try {
      if (!pkt || !pkt.kind) throw new Error("packet without kind");

      if (pkt.kind === "hello") {
        post({
          type: "hello",
          ts: Date.now(),
          source: "pt",
          snapshot: snapshot()
        });
        return;
      }

      if (pkt.kind === "set-runtime") {
        state.runtimeFn = makeFn(pkt.code || "");
        post({
          type: "result",
          id: pkt.id,
          ok: true,
          value: {
            message: "runtime updated"
          }
        });
        return;
      }

      if (pkt.kind === "run-runtime") {
        if (!state.runtimeFn) throw new Error("runtime not set");
        var rr = state.runtimeFn(
          pkt.payload || {}, ipc, window, __ptRemote,
          typeof addDevice === "function" ? addDevice : null,
          typeof addLink === "function" ? addLink : null,
          typeof addModule === "function" ? addModule : null,
          typeof configurePcIp === "function" ? configurePcIp : null,
          typeof configureIosDevice === "function" ? configureIosDevice : null,
          typeof getDevices === "function" ? getDevices : null
        );
        post({
          type: "result",
          id: pkt.id,
          ok: true,
          value: rr,
          snapshot: pkt.withSnapshot ? snapshot() : undefined
        });
        return;
      }

      if (pkt.kind === "eval") {
        var fn = makeFn(pkt.code || "");
        var r = fn(
          pkt.payload || {}, ipc, window, __ptRemote,
          typeof addDevice === "function" ? addDevice : null,
          typeof addLink === "function" ? addLink : null,
          typeof addModule === "function" ? addModule : null,
          typeof configurePcIp === "function" ? configurePcIp : null,
          typeof configureIosDevice === "function" ? configureIosDevice : null,
          typeof getDevices === "function" ? getDevices : null
        );
        post({
          type: "result",
          id: pkt.id,
          ok: true,
          value: r,
          snapshot: pkt.withSnapshot ? snapshot() : undefined
        });
        return;
      }

      if (pkt.kind === "snapshot") {
        post({
          type: "result",
          id: pkt.id,
          ok: true,
          value: snapshot()
        });
        return;
      }

      throw new Error("unknown kind: " + pkt.kind);
    } catch (e) {
      post({
        type: "error",
        id: pkt && pkt.id ? pkt.id : null,
        ts: Date.now(),
        message: String(e && e.message ? e.message : e),
        stack: String(e && e.stack ? e.stack : "")
      });
    }
  }

  function evalPacket(arg) {
    if (typeof arg === "string") execPacket(JSON.parse(arg));
    else execPacket(arg);
  }

  function start() {
    var pollJs = "(function(){" +
      "if(window.__ptRemotePollStarted){return;}" +
      "window.__ptRemotePollStarted=true;" +
      "setInterval(function(){" +
      "var x=new XMLHttpRequest();" +
      "x.open('GET','http://127.0.0.1:" + state.port + "/next',true);" +
      "x.onload=function(){" +
      "if(x.status===200&&x.responseText){$se('__ptRemote.evalPacket',x.responseText);}" +
      "};" +
      "x.send();" +
      "}," + state.pollMs + ");" +
      "setInterval(function(){" +
      "try{$se('__ptRemote.flushCommandLog');}catch(e){};" +
      "}," + state.cmdLogMs + ");" +
      "})();";
    
    window.webview.evaluateJavaScriptAsync(pollJs);
    
    post({
      type: "hello",
      ts: Date.now(),
      source: "pt-bootstrap"
    });
  }

  return {
    state: state,
    post: post,
    log: log,
    snapshot: snapshot,
    flushCommandLog: flushCommandLog,
    evalPacket: evalPacket,
    start: start
  };
})();

__ptRemote.start();
