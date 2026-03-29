// PTBuilder Shim - Implementa funciones de PTBuilder usando API nativa
// Pegar en PT > Extensions > Scripting ANTES del bridge

// Cable types mapping
var CABLE_TYPES = {
    'straight': 0,
    'cross': 1,
    'fiber': 2,
    'console': 3,
    'coaxial': 4,
    'phone': 5,
    'serial': 6,
    'dsl': 7
};

// Device type IDs
var DEVICE_TYPES = {
    'router': 0,
    'switch': 1,
    'hub': 2,
    'wireless router': 3,
    'access point': 4,
    'pc': 8,
    'server': 9,
    'laptop': 13,
    'generic': 18
};

// Model mapping
var DEVICE_MODELS = {
    '1941': { type: 0, model: '1941' },
    '2911': { type: 0, model: '2911' },
    '2960': { type: 1, model: '2960-24TT' },
    '3560': { type: 1, model: '3560-24PS' },
    'PC': { type: 8, model: 'PC-PT' },
    'Server': { type: 9, model: 'Server-PT' },
    'Laptop': { type: 13, model: 'Laptop-PT' }
};

function getLW() {
    return ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
}

function getNet() {
    return ipc.network();
}

// Add device - returns true/false
function addDevice(name, model, x, y) {
    var lw = getLW();
    var info = DEVICE_MODELS[model] || { type: 0, model: model };
    
    var assigned = lw.addDevice(info.type, info.model, x || 100, y || 100);
    if (!assigned) return false;
    
    if (assigned !== name) {
        var dev = getNet().getDevice(assigned);
        if (dev) dev.setName(name);
    }
    return true;
}

// Add link - returns true/false
function addLink(dev1, port1, dev2, port2, cableType) {
    var lw = getLW();
    var net = getNet();
    
    var d1 = net.getDevice(dev1);
    var d2 = net.getDevice(dev2);
    
    if (!d1 || !d2) {
        console.log('[PTBuilder] Device not found');
        return false;
    }
    
    var p1 = d1.getPort(port1);
    var p2 = d2.getPort(port2);
    
    if (!p1 || !p2) {
        console.log('[PTBuilder] Port not found');
        return false;
    }
    
    var cableNum = CABLE_TYPES[cableType] || 0;
    
    // Intentar crear el link
    try {
        var result = lw.createLink(dev1, port1, dev2, port2, cableNum);
        console.log('[PTBuilder] createLink result: ' + result);
        return result === true;
    } catch(e) {
        console.log('[PTBuilder] createLink error: ' + e.message);
        return false;
    }
}

// Configure IOS device
function configureIosDevice(name, commands) {
    var dev = getNet().getDevice(name);
    if (!dev) return false;
    
    try {
        var cmdList = commands.split('\n');
        for (var i = 0; i < cmdList.length; i++) {
            dev.sendCommand(cmdList[i]);
        }
        return true;
    } catch(e) {
        console.log('[PTBuilder] configureIosDevice error: ' + e.message);
        return false;
    }
}

// Configure PC IP
function configurePcIp(name, dhcp, ip, mask, gateway, dns) {
    var dev = getNet().getDevice(name);
    if (!dev) return false;
    
    try {
        if (dhcp) {
            dev.sendCommand('ipconfig /dhcp');
        } else {
            var cmd = 'ipconfig ' + ip + ' ' + mask + ' ' + gateway;
            dev.sendCommand(cmd);
        }
        return true;
    } catch(e) {
        return false;
    }
}

// Delete device
function deleteDevice(name) {
    var lw = getLW();
    try {
        lw.removeDevice(name);
        return true;
    } catch(e) {
        return false;
    }
}

// Get device names
function getDevices(filter, startsWith) {
    var net = getNet();
    var result = [];
    var count = net.getDeviceCount();
    
    for (var i = 0; i < count; i++) {
        var dev = net.getDeviceAt(i);
        var name = dev.getName();
        
        if (startsWith && name.indexOf(startsWith) !== 0) continue;
        
        result.push(name);
    }
    return result;
}

// Rename device
function renameDevice(oldName, newName) {
    var dev = getNet().getDevice(oldName);
    if (!dev) return false;
    
    try {
        dev.setName(newName);
        return true;
    } catch(e) {
        return false;
    }
}

// Move device
function moveDevice(name, x, y) {
    var lw = getLW();
    try {
        lw.setCanvasItemRealPos(name, x, y);
        return true;
    } catch(e) {
        return false;
    }
}

// Delete link
function deleteLink(devName, portName) {
    var lw = getLW();
    try {
        lw.deleteLink(devName, portName);
        return true;
    } catch(e) {
        return false;
    }
}

console.log('[PTBuilder] Shim loaded - addDevice, addLink, configureIosDevice, etc. available');
