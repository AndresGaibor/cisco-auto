// ============================================
// BRIDGE MINIMAL v2 - Con diagnostico de links
// ============================================

var DIR = '/tmp/cisco-auto-bridge';
var CMD_FILE = DIR + '/cmd.json';
var RESP_DIR = DIR + '/resp';
var INTERVAL = 300;

var fm = null;
var timer = null;
var lastId = null;

function main() {
    console.log('[B] Iniciando v2');
    try {
        fm = ipc.systemFileManager();
        console.log('[B] FM OK');
    } catch(e) {
        console.log('[B] Error FM: ' + e.message);
        return;
    }
    poll();
    console.log('[B] Listo - probando link con cross cable...');
}

function cleanUp() {
    if (timer) clearTimeout(timer);
}

function poll() {
    try {
        var cmd = readCmd();
        if (cmd && cmd.id && cmd.id !== lastId) {
            lastId = cmd.id;
            var r = exec(cmd);
            writeResp(cmd.id, r);
            clearCmd();
        }
    } catch(e) {}
    timer = setTimeout(poll, INTERVAL);
}

function readCmd() {
    try {
        if (!fm.fileExists(CMD_FILE)) return null;
        var s = fm.getFileContents(CMD_FILE);
        if (!s || !String(s).trim()) return null;
        return JSON.parse(s);
    } catch(e) { return null; }
}

function clearCmd() {
    try { if (fm.fileExists(CMD_FILE)) fm.removeFile(CMD_FILE); } catch(e) {}
}

function writeResp(id, r) {
    try {
        var file = RESP_DIR + '/' + id + '.txt';
        var content = r.ok ? 'OKOKOKOKOK' : 'ERRERRERR';
        fm.writeTextToFile(file, content);
        console.log('[B] -> ' + id + ': ' + (r.ok ? 'OK' : 'ERR'));
    } catch(e) {
        console.log('[B] writeResp err: ' + e.message);
    }
}

function exec(c) {
    try {
        switch(c.tipo) {
            case 'add': return add(c.args);
            case 'link': return link(c.args);
            case 'list': return list();
            case 'get': return get(c.args);
            case 'cfg': return cfg(c.args);
            case 'del': return del(c.args);
            case 'diag': return diag(c.args);
            default: return {ok:false,msg:'?'+c.tipo};
        }
    } catch(e) {
        return {ok:false,msg:String(e)};
    }
}

// ============================================
// DIAGNOSTICO
// ============================================

function diag(a) {
    var p = a[0] || {};
    var d1 = p.d1;
    var d2 = p.d2;
    
    var net = ipc.network();
    var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
    
    var dev1 = net.getDevice(d1);
    var dev2 = net.getDevice(d2);
    
    if (!dev1) return {ok:false,msg:d1+' no existe'};
    if (!dev2) return {ok:false,msg:d2+' no existe'};
    
    console.log('[B] === DIAG ' + d1 + ' ===');
    
    // Info del dispositivo
    try { console.log('[B] getName: ' + dev1.getName()); } catch(e) {}
    try { console.log('[B] getType: ' + dev1.getType()); } catch(e) {}
    try { console.log('[B] getModel: ' + dev1.getModel()); } catch(e) {}
    try { console.log('[B] isPowered?: ' + typeof dev1.isPowered); } catch(e) {}
    try { 
        if (dev1.isPowered) console.log('[B] isPowered: ' + dev1.isPowered()); 
    } catch(e) {}
    try {
        if (dev1.powerOn) {
            console.log('[B] Encendiendo ' + d1 + '...');
            dev1.powerOn();
        }
    } catch(e) {}
    
    // Listar puertos con mas info
    console.log('[B] Puertos de ' + d1 + ':');
    for (var i = 0; i < dev1.getPortCount(); i++) {
        var port = dev1.getPortAt(i);
        var pname = port.getName();
        try {
            var linked = port.getLinkedPort ? port.getLinkedPort() : null;
            var status = linked ? 'CONECTADO' : 'libre';
            console.log('[B]   ' + pname + ' - ' + status);
        } catch(e) {
            console.log('[B]   ' + pname + ' - ?');
        }
    }
    
    console.log('[B] === DIAG ' + d2 + ' ===');
    try {
        if (dev2.powerOn) {
            console.log('[B] Encendiendo ' + d2 + '...');
            dev2.powerOn();
        }
    } catch(e) {}
    
    for (var i = 0; i < dev2.getPortCount(); i++) {
        var port = dev2.getPortAt(i);
        var pname = port.getName();
        try {
            var linked = port.getLinkedPort ? port.getLinkedPort() : null;
            var status = linked ? 'CONECTADO' : 'libre';
            console.log('[B]   ' + pname + ' - ' + status);
        } catch(e) {
            console.log('[B]   ' + pname + ' - ?');
        }
    }
    
    // Verificar metodos de lw
    console.log('[B] === LW Methods ===');
    console.log('[B] lw.createLink: ' + typeof lw.createLink);
    console.log('[B] lw.autoConnectDevices: ' + typeof lw.autoConnectDevices);
    console.log('[B] lw.addLink: ' + typeof lw.addLink);
    
    return {ok:true,msg:'diagnostico completo'};
}

// ============================================
// HANDLERS
// ============================================

function add(a) {
    var p = a[0] || {};
    var name = p.name;
    var tid = p.tid !== undefined ? p.tid : 0;
    var model = p.model || '1941';
    var x = p.x || 100;
    var y = p.y || 100;
    
    var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
    var assigned = lw.addDevice(tid, model, x, y);
    
    if (!assigned) return {ok:false,msg:'addDevice fallo'};
    
    if (assigned !== name) {
        var dev = ipc.network().getDevice(assigned);
        if (dev) dev.setName(name);
    }
    
    // Encender el dispositivo si tiene powerOn
    try {
        var dev = ipc.network().getDevice(name);
        if (dev && dev.powerOn) dev.powerOn();
    } catch(e) {}
    
    console.log('[B] ADD ' + name);
    return {ok:true,msg:name};
}

function link(a) {
    var p = a[0] || {};
    var d1 = p.d1;
    var p1 = p.p1;
    var d2 = p.d2;
    var p2 = p.p2;
    var ct = p.ct || 'cross';
    
    console.log('[B] LINK: ' + d1 + ' ' + p1 + ' <-> ' + d2 + ' ' + p2);
    
    var net = ipc.network();
    var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
    
    var dev1 = net.getDevice(d1);
    var dev2 = net.getDevice(d2);
    
    if (!dev1) return {ok:false,msg:d1+' no existe'};
    if (!dev2) return {ok:false,msg:d2+' no existe'};
    
    var port1 = dev1.getPort(p1);
    var port2 = dev2.getPort(p2);
    
    if (!port1) return {ok:false,msg:'puerto '+p1+' no existe'};
    if (!port2) return {ok:false,msg:'puerto '+p2+' no existe'};
    
    // Verificar si ya estan conectados
    try {
        var linked1 = port1.getLinkedPort ? port1.getLinkedPort() : null;
        if (linked1) {
            console.log('[B] ' + p1 + ' ya conectado');
            return {ok:true,msg:'ya conectado'};
        }
    } catch(e) {}
    
    // Intentar createLink
    var cablesToTry = [1, 0, 2];
    for (var i = 0; i < cablesToTry.length; i++) {
        try {
            var result = lw.createLink(d1, p1, d2, p2, cablesToTry[i]);
            if (result === true) {
                console.log('[B] LINK OK via createLink');
                return {ok:true,msg:'link creado'};
            }
        } catch(e) {}
    }
    
    // Fallback: autoConnectDevices
    if (typeof lw.autoConnectDevices === 'function') {
        console.log('[B] Probando autoConnectDevices...');
        try {
            var result = lw.autoConnectDevices(d1, p1, d2, p2);
            console.log('[B] autoConnectDevices result: ' + result);
            if (result === true || result) {
                console.log('[B] LINK OK via autoConnectDevices');
                return {ok:true,msg:'autoConnect ok'};
            }
        } catch(e) {
            console.log('[B] autoConnectDevices err: ' + e.message);
        }
    }
    
    return {ok:false,msg:'createLink fallo'};
}

function cfg(a) {
    var p = a[0] || {};
    if (!p.dev) return {ok:false,msg:'dev?'};
    var dev = ipc.network().getDevice(p.dev);
    if (!dev) return {ok:false,msg:'not found'};
    
    var cmds = p.cmds || [];
    for (var i = 0; i < cmds.length; i++) {
        try {
            dev.sendCommand(cmds[i]);
        } catch(e) {
            console.log('[B] CMD err: ' + e.message);
        }
    }
    console.log('[B] CFG ' + p.dev + ' (' + cmds.length + ' cmds)');
    return {ok:true,msg:'cfg ok'};
}

function del(a) {
    var p = a[0] || {};
    var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
    lw.removeDevice(p.name);
    console.log('[B] DEL ' + p.name);
    return {ok:true,msg:'del ok'};
}

function list() {
    var net = ipc.network();
    var n = net.getDeviceCount();
    var d = [];
    for (var i = 0; i < n; i++) {
        var dev = net.getDeviceAt(i);
        d.push(dev.getName());
    }
    console.log('[B] LIST ' + n);
    return {ok:true,msg:d.join(','),data:{n:n,d:d}};
}

function get(a) {
    var p = a[0] || {};
    var dev = ipc.network().getDevice(p.name);
    if (!dev) return {ok:false,msg:'not found'};
    
    var ports = [];
    for (var i = 0; i < dev.getPortCount(); i++) {
        var port = dev.getPortAt(i);
        ports.push(port.getName());
    }
    return {ok:true,msg:ports.join(','),data:{name:dev.getName(),ports:ports}};
}
