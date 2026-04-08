var IOS_JOBS = {};
var IOS_SESSIONS = {};
var commandEnded = true;
var outputWritten = true;
var modeChanged = true;
var moreDisplayed = false;
var CABLE_TYPES = {
    "ethernet-straight": 8100,
    "ethernet-cross": 8101,
    "straight": 8100,
    "cross": 8101,
    "roll": 8102,
    "fiber": 8103,
    "phone": 8104,
    "cable": 8105,
    "serial": 8106,
    "auto": 8107,
    "console": 8108,
    "wireless": 8109
};
var DEVICE_TYPES = {
    router: 0,
    switch: 1,
    cloud: 2,
    pc: 8,
    server: 9,
    wirelessRouter: 11,
    multilayerSwitch: 16
};
var DEVICE_TYPE_NAMES = {
    0: "router",
    1: "switch",
    2: "cloud",
    8: "pc",
    9: "server",
    11: "wirelessRouter",
    16: "multilayerSwitch"
};
function resolveModel(model) {
    if (!model)
        return "1941";
    return String(model);
}
function getDeviceTypeString(typeId) {
    var map = {
        0: "router",
        1: "switch",
        2: "cloud",
        3: "bridge",
        4: "hub",
        7: "wireless",
        8: "pc",
        9: "server",
        10: "printer",
        11: "wirelessRouter",
        12: "ipPhone",
        13: "dslModem",
        14: "cableModem",
        16: "multilayerSwitch",
        18: "laptop",
        19: "tablet",
        20: "smartphone"
    };
    return map[typeId] || "generic";
}
function getDeviceTypeCandidates(model) {
    var normalized = String(model || "").toLowerCase();
    if (normalized.indexOf("switch") >= 0 || normalized.indexOf("3560") >= 0 || normalized.indexOf("2960") >= 0) {
        return [1, 16, 0];
    }
    if (normalized.indexOf("pc") >= 0 || normalized.indexOf("laptop") >= 0) {
        return [8, 18, 20, 19, 22, 7, 0, 1];
    }
    if (normalized.indexOf("server") >= 0) {
        return [9, 8, 18, 0, 1];
    }
    return [0, 1, 8, 9];
}
function createDeviceWithFallback(host, model, x, y, typeList) {
    var lw = host.ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
    var net = host.ipc.network();
    for (var i = 0; i < typeList.length; i++) {
        var typeId = typeList[i];
        try {
            var autoName = lw.addDevice(typeId, model, x, y);
            if (!autoName)
                continue;
            var device = net.getDevice(autoName);
            if (!device) {
                lw.removeDevice(autoName);
                continue;
            }
            return { autoName: autoName, device: device, typeId: typeId };
        }
        catch (e) {
        }
    }
    return null;
}
function getDevicePortNames(device) {
    var names = [];
    var count = device && device.getPortCount ? device.getPortCount() : 0;
    for (var i = 0; i < count; i++) {
        try {
            var port = device.getPortAt(i);
            if (port && port.getName) {
                var portName = port.getName();
                if (portName)
                    names.push(String(portName));
            }
        }
        catch (e) { }
    }
    return names;
}
function normalizePortKey(name) {
    var value = String(name || "").replace(/\s+/g, "").toLowerCase();
    var suffix = value.match(/(\d+(?:\/\d+)*(?:\.\d+)?)$/);
    return suffix && suffix[1] ? suffix[1] : value;
}
function resolveDevicePortName(device, requested) {
    var wanted = String(requested || "").replace(/\s+/g, "").toLowerCase();
    var names = getDevicePortNames(device);
    for (var i = 0; i < names.length; i++) {
        var candidateValue = String(names[i] || "").replace(/\s+/g, "").toLowerCase();
        if (candidateValue === wanted)
            return String(names[i]);
    }
    var wantedKey = normalizePortKey(requested);
    for (var j = 0; j < names.length; j++) {
        var candidateName = names[j];
        if (candidateName && normalizePortKey(candidateName) === wantedKey)
            return String(candidateName);
    }
    return null;
}
function isEndDevice(device) {
    try {
        var type = device.getType();
        return type === 8 || type === 9 || type === 10 || type === 12 || type === 18 || type === 19 || type === 20 || type === 21 || type === 22 || type === 23 || type === 24 || type === 25 || type === 34 || type === 35 || type === 36 || type === 37;
    }
    catch (e) {
        return false;
    }
}
function getCableTypeId(name) {
    var value = String(name || "straight").toLowerCase();
    if (value === "cross")
        return 8101;
    if (value === "roll")
        return 8102;
    if (value === "fiber")
        return 8103;
    if (value === "serial")
        return 8106;
    if (value === "console")
        return 8108;
    return 8100;
}
function getRuntimeState(host) {
    if (!host.state)
        host.state = {};
    if (!host.state.runtime) {
        host.state.runtime = {
            pendingCommands: {},
            iosJobs: {},
            lastHeartbeatAt: 0,
            dirsReady: false,
            initializedAt: Date.now()
        };
    }
    return host.state.runtime;
}
function getNet(host) {
    return host.ipc.network();
}
function getLW(host) {
    return host.ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
}
function objectKeys(obj) {
    var keys = [];
    if (!obj)
        return keys;
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            keys.push(key);
        }
    }
    return keys;
}
function padSeq(n) {
    var s = String(n);
    while (s.length < 12)
        s = "0" + s;
    return s;
}
function log(host, msg) {
    host.log(msg);
}
function ensureDir(host, path) {
    try {
        if (!host.fm.directoryExists(path)) {
            host.fm.makeDirectory(path);
        }
    }
    catch (e) {
        log(host, "[ensureDir] " + String(e));
    }
}
function ensureRuntimeDirs(host) {
    var state = getRuntimeState(host);
    if (state.dirsReady)
        return;
    ensureDir(host, host.paths.COMMANDS_DIR);
    ensureDir(host, host.paths.IN_FLIGHT_DIR);
    ensureDir(host, host.paths.RESULTS_DIR);
    ensureDir(host, host.paths.DEV_DIR + "/journal");
    ensureDir(host, host.paths.LOGS_DIR);
    state.dirsReady = true;
}
function getPendingCommandFiles(host) {
    try {
        return host.fm.getFilesInDirectory(host.paths.COMMANDS_DIR) || [];
    }
    catch (e) {
        return [];
    }
}
function recoverInFlightOnStartup(host) {
    reconcileInflight(host);
}
function loadPendingCommands(host) {
    var state = getRuntimeState(host);
    var path = host.paths.PENDING_COMMANDS_FILE;
    if (!host.fm.fileExists(path))
        return;
    try {
        var content = host.fm.getFileContents(path);
        if (content && content.trim().length > 0) {
            state.pendingCommands = JSON.parse(content) || {};
        }
    }
    catch (e) {
        log(host, "[journal] load pending error: " + String(e));
    }
}
function savePendingCommands(host) {
    var state = getRuntimeState(host);
    host.fm.writePlainTextToFile(host.paths.PENDING_COMMANDS_FILE, JSON.stringify(state.pendingCommands));
}
function writeHeartbeat(host) {
    var state = getRuntimeState(host);
    var now = Date.now();
    if ((now - state.lastHeartbeatAt) < 5000)
        return;
    state.lastHeartbeatAt = now;
    host.fm.writePlainTextToFile(host.paths.HEARTBEAT_FILE, JSON.stringify({
        ownerId: "pt-runtime",
        pid: 0,
        startedAt: state.initializedAt,
        updatedAt: now
    }, null, 2));
}
function buildDevicePorts(device) {
    var ports = [];
    var count = 0;
    try {
        count = device && device.getPortCount ? device.getPortCount() : 0;
    }
    catch (e) {
        count = 0;
    }
    for (var i = 0; i < count; i++) {
        try {
            var port = device.getPortAt(i);
            if (!port)
                continue;
            var portInfo = { name: port.getName ? String(port.getName()) : "" };
            try {
                portInfo.ipAddress = port.getIpAddress ? port.getIpAddress() : undefined;
            }
            catch (e1) { }
            try {
                portInfo.subnetMask = port.getSubnetMask ? port.getSubnetMask() : undefined;
            }
            catch (e2) { }
            try {
                portInfo.macAddress = port.getMacAddress ? port.getMacAddress() : undefined;
            }
            catch (e3) { }
            try {
                portInfo.defaultGateway = port.getDefaultGateway ? port.getDefaultGateway() : undefined;
            }
            catch (e4) { }
            try {
                portInfo.link = port.getLink ? port.getLink() : undefined;
            }
            catch (e5) { }
            ports.push(portInfo);
        }
        catch (e6) { }
    }
    return ports;
}
function collectSnapshot(host) {
    var net = getNet(host);
    var count = 0;
    try {
        count = net.getDeviceCount ? net.getDeviceCount() : 0;
    }
    catch (e) {
        count = 0;
    }
    var devices = {};
    var links = {};
    for (var i = 0; i < count; i++) {
        var device = null;
        try {
            device = net.getDeviceAt(i);
        }
        catch (e1) {
            device = null;
        }
        if (!device)
            continue;
        var name = "";
        try {
            name = String(device.getName ? device.getName() : "");
        }
        catch (e2) {
            name = "";
        }
        if (!name)
            continue;
        var typeId = 2;
        try {
            typeId = device.getType ? device.getType() : 2;
        }
        catch (e3) {
            typeId = 2;
        }
        devices[name] = {
            name: name,
            model: device.getModel ? String(device.getModel() || "") : "",
            type: getDeviceTypeString(typeId),
            power: device.getPower ? !!device.getPower() : true,
            ports: buildDevicePorts(device),
            x: device.x,
            y: device.y,
            uuid: device.uuid,
            hostname: device.hostname,
            version: device.version,
            configRegister: device.configRegister,
            ip: device.ip,
            mask: device.mask,
            gateway: device.gateway,
            dns: device.dns,
            dhcp: device.dhcp
        };
        var ports = devices[name].ports || [];
        for (var p = 0; p < ports.length; p++) {
            var port = ports[p];
            var link = port && port.link;
            if (!link)
                continue;
            for (var j = 0; j < count; j++) {
                var other = null;
                try {
                    other = net.getDeviceAt(j);
                }
                catch (e4) {
                    other = null;
                }
                if (!other)
                    continue;
                var otherName = "";
                try {
                    otherName = String(other.getName ? other.getName() : "");
                }
                catch (e5) {
                    otherName = "";
                }
                if (!otherName || otherName === name)
                    continue;
                var otherPorts = buildDevicePorts(other);
                for (var op = 0; op < otherPorts.length; op++) {
                    var otherPort = otherPorts[op];
                    if (!otherPort || otherPort.link !== link)
                        continue;
                    var dev1 = name;
                    var pt1 = port.name;
                    var dev2 = otherName;
                    var pt2 = otherPort.name;
                    if (dev2 < dev1 || (dev2 === dev1 && pt2 < pt1)) {
                        dev1 = otherName;
                        pt1 = otherPort.name;
                        dev2 = name;
                        pt2 = port.name;
                    }
                    var linkId = dev1 + ":" + pt1 + "--" + dev2 + ":" + pt2;
                    if (!links[linkId]) {
                        links[linkId] = {
                            id: linkId,
                            device1: dev1,
                            port1: pt1,
                            device2: dev2,
                            port2: pt2,
                            cableType: "auto"
                        };
                    }
                }
            }
        }
    }
    return {
        ok: true,
        version: "1.0",
        timestamp: Date.now(),
        devices: devices,
        links: links,
        metadata: {
            deviceCount: Object.keys(devices).length,
            linkCount: Object.keys(links).length,
            generatedBy: "pt-runtime"
        }
    };
}
function handleSnapshot(host) {
    try {
        return collectSnapshot(host);
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleInspect(payload, host) {
    try {
        var net = getNet(host);
        var device = net.getDevice(payload.device);
        if (!device)
            return { ok: false, error: "Device not found: " + payload.device };
        return {
            ok: true,
            name: device.getName ? String(device.getName()) : payload.device,
            model: device.getModel ? String(device.getModel() || "") : "",
            type: getDeviceTypeString(device.getType ? device.getType() : 2),
            power: device.getPower ? !!device.getPower() : true,
            ports: buildDevicePorts(device),
            x: device.x,
            y: device.y,
            uuid: device.uuid,
            version: device.version,
            configRegister: device.configRegister
        };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleMoveDevice(payload, host) {
    try {
        var net = getNet(host);
        var device = net.getDevice(payload.name);
        if (!device)
            return { ok: false, error: "Device not found: " + payload.name };
        var x = Math.round(payload.x !== undefined ? payload.x : 0);
        var y = Math.round(payload.y !== undefined ? payload.y : 0);
        var moved = false;
        if (device.moveToLocation)
            moved = !!device.moveToLocation(x, y);
        if (!moved && device.moveToLocationCentered)
            moved = !!device.moveToLocationCentered(x, y);
        if (!moved)
            return { ok: false, error: "Packet Tracer rejected move", code: "INTERNAL_ERROR", details: { name: payload.name, x: x, y: y } };
        return { ok: true, name: payload.name, x: x, y: y };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e), code: "INTERNAL_ERROR" };
    }
}
function handleRenameDevice(payload, host) {
    try {
        var net = getNet(host);
        var device = net.getDevice(payload.oldName || payload.name);
        if (!device)
            return { ok: false, error: "Device not found: " + (payload.oldName || payload.name) };
        if (device.setName)
            device.setName(payload.newName);
        return { ok: true, oldName: payload.oldName || payload.name, newName: payload.newName };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleAddModule(payload, host) {
    try {
        var net = getNet(host);
        var device = net.getDevice(payload.device);
        if (!device)
            return { ok: false, error: "Device not found: " + payload.device };
        if (!device.addModule)
            return { ok: false, error: "Device does not support modules" };
        var ok = !!device.addModule(String(payload.slot), String(payload.module));
        return { ok: ok, device: payload.device, slot: payload.slot, module: payload.module };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleRemoveModule(payload, host) {
    try {
        var net = getNet(host);
        var device = net.getDevice(payload.device);
        if (!device)
            return { ok: false, error: "Device not found: " + payload.device };
        if (!device.removeModule)
            return { ok: false, error: "Device does not support modules" };
        var ok = !!device.removeModule(String(payload.slot));
        return { ok: ok, device: payload.device, slot: payload.slot };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleHardwareInfo(payload, host) {
    try {
        var factory = host.ipc.hardwareFactory ? host.ipc.hardwareFactory() : null;
        var keys = [];
        if (factory) {
            for (var key in factory)
                keys.push(key);
        }
        return { ok: true, keys: keys, device: payload.device || null };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleHardwareCatalog(payload, host) {
    try {
        var factory = host.ipc.hardwareFactory ? host.ipc.hardwareFactory() : null;
        var list = factory && factory.devices ? factory.devices : [];
        var limit = payload.limit || 50;
        var results = [];
        for (var i = 0; i < list.length && results.length < limit; i++) {
            var item = list[i];
            var entry = {};
            try {
                entry.name = item.name;
            }
            catch (e1) { }
            try {
                entry.model = item.model;
            }
            catch (e2) { }
            try {
                entry.displayName = item.displayName;
            }
            catch (e3) { }
            try {
                entry.deviceType = item.deviceType;
            }
            catch (e4) { }
            results.push(entry);
        }
        return { ok: true, items: results, total: list.length || 0 };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleCommandLog(payload, host) {
    try {
        var cl = host.ipc.commandLog ? host.ipc.commandLog() : null;
        if (!cl)
            return { ok: false, error: "Command log unavailable" };
        var count = cl.getEntryCount ? cl.getEntryCount() : 0;
        var limit = payload.limit || 100;
        var start = Math.max(0, count - limit);
        var entries = [];
        for (var i = start; i < count; i++) {
            var entry = cl.getEntryAt ? cl.getEntryAt(i) : null;
            if (!entry)
                continue;
            var entryDevice = entry.getDeviceName ? String(entry.getDeviceName() || "") : "";
            if (payload.device && entryDevice !== String(payload.device))
                continue;
            entries.push({
                index: i,
                time: entry.getTimeToString ? entry.getTimeToString() : "",
                device: entryDevice,
                prompt: entry.getPrompt ? entry.getPrompt() : "",
                command: entry.getCommand ? entry.getCommand() : ""
            });
        }
        return { ok: true, entries: entries, count: count };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleListCanvasRects(payload, host) {
    try {
        var lw = getLW(host);
        var rectIds = [];
        if (lw.getCanvasRectIds) {
            rectIds = lw.getCanvasRectIds() || [];
        }
        return { ok: true, rects: rectIds, count: rectIds.length };
    }
    catch (e) {
        return { ok: false, error: "Failed to get canvas rect IDs: " + String(e) };
    }
}
function handleGetRect(payload, host) {
    try {
        var lw = getLW(host);
        var rectData = null;
        if (lw.getRectItemData) {
            rectData = lw.getRectItemData(payload.rectId) || null;
        }
        else if (lw.getRectData) {
            rectData = lw.getRectData(payload.rectId) || null;
        }
        if (!rectData) {
            return { ok: false, rectId: payload.rectId, error: "Rect not found" };
        }
        return { ok: true, rectId: payload.rectId, data: rectData };
    }
    catch (e) {
        return { ok: false, rectId: payload.rectId, error: "Failed to get rect data: " + String(e) };
    }
}
function handleDevicesInRect(payload, host) {
    try {
        var lw = getLW(host);
        var net = getNet(host);
        var devices = [];
        var clusters = [];
        if (lw.devicesAt) {
            var rectData = payload.rectId && lw.getRectItemData ? lw.getRectItemData(payload.rectId) : null;
            var x = 0;
            var y = 0;
            var width = 0;
            var height = 0;
            if (rectData && typeof rectData === "object") {
                x = rectData.x || 0;
                y = rectData.y || 0;
                width = rectData.width || 0;
                height = rectData.height || 0;
            }
            if (width > 0 && height > 0) {
                var foundDevices = lw.devicesAt(x, y, width, height, payload.includeClusters || false);
                if (Array.isArray(foundDevices)) {
                    for (var i = 0; i < foundDevices.length; i++) {
                        if (typeof foundDevices[i] === "string") {
                            devices.push(foundDevices[i]);
                        }
                    }
                }
            }
        }
        if (devices.length === 0 && payload.rectId) {
            var rectInfo = lw.getRectItemData ? lw.getRectItemData(payload.rectId) : null;
            if (rectInfo && typeof rectInfo === "object") {
                var rx = rectInfo.x || 0;
                var ry = rectInfo.y || 0;
                var rw = rectInfo.width || 0;
                var rh = rectInfo.height || 0;
                var deviceCount = net.getDeviceCount ? net.getDeviceCount() : 0;
                for (var j = 0; j < deviceCount; j++) {
                    var device = net.getDeviceAt ? net.getDeviceAt(j) : null;
                    if (!device)
                        continue;
                    var deviceX = device.getX ? device.getX() : 0;
                    var deviceY = device.getY ? device.getY() : 0;
                    if (deviceX >= rx && deviceX <= rx + rw && deviceY >= ry && deviceY <= ry + rh) {
                        devices.push(device.getName());
                    }
                }
            }
        }
        return { ok: true, rectId: payload.rectId, devices: devices, clusters: clusters, count: devices.length };
    }
    catch (e) {
        return { ok: false, rectId: payload.rectId, devices: [], count: 0, error: "Failed to get devices in rect: " + String(e) };
    }
}
function prepareIosSteps(device, command, ensurePrivileged) {
    var steps = [];
    var prompt = "";
    try {
        if (device && device.getCommandLine && device.getCommandLine().getPrompt) {
            prompt = String(device.getCommandLine().getPrompt() || "");
        }
    }
    catch (e) { }
    var normalizedCommand = String(command || "").trim();
    if (!normalizedCommand)
        return steps;
    if (prompt.indexOf("(config") >= 0) {
        steps.push("end");
    }
    if (ensurePrivileged && prompt.indexOf("#") === -1) {
        steps.push("enable");
    }
    steps.push(normalizedCommand);
    return steps;
}
function createIosJob(ticket, type, payload, host) {
    var job = {
        ticket: ticket,
        type: type,
        device: payload.device,
        commands: payload.commands || (payload.command ? [payload.command] : []),
        currentIndex: 0,
        output: "",
        raw: "",
        result: null,
        state: "queued",
        phase: "queued",
        finished: false,
        error: null,
        errorCode: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        currentCommand: "",
        currentCommandOutput: "",
        lastMode: "unknown",
        lastPrompt: "",
        lastOutputLength: 0,
        stableTicks: 0,
        waitingForCommandEnd: false
    };
    IOS_JOBS[ticket] = job;
    var state = getRuntimeState(host);
    state.iosJobs[ticket] = job;
    return job;
}
function getIosJobTerm(job) {
    if (!job)
        return null;
    var net = getNet({ ipc: ipc });
    var device = net.getDevice(job.device);
    if (!device || typeof device.getCommandLine !== "function")
        return null;
    return device.getCommandLine();
}
function completeIosJob(ticket) {
    var job = IOS_JOBS[ticket];
    if (!job)
        return;
    job.finished = true;
    job.state = "done";
    job.phase = "done";
    job.waitingForCommandEnd = false;
    job.updatedAt = Date.now();
    if (!job.result) {
        job.result = { ok: true, device: job.device, raw: job.raw || job.output || "", outputs: job.stepResults || [], session: { mode: job.lastMode || "unknown", prompt: job.lastPrompt || "" } };
    }
}
function failIosJob(ticket, message, code) {
    var job = IOS_JOBS[ticket];
    if (!job)
        return;
    job.finished = true;
    job.state = "error";
    job.phase = "error";
    job.waitingForCommandEnd = false;
    job.error = message;
    job.errorCode = code;
    job.updatedAt = Date.now();
    job.result = { ok: false, error: message, code: code, raw: job.raw || job.output || "", device: job.device };
}
function sendIosJobCommand(ticket, command, phase) {
    var job = IOS_JOBS[ticket];
    var term = getIosJobTerm(job);
    if (!job)
        return;
    if (!term) {
        failIosJob(ticket, "Terminal not available", "NO_TERMINAL");
        return;
    }
    job.phase = phase;
    job.state = phase;
    job.currentCommand = command;
    job.currentCommandOutput = "";
    job.lastOutputLength = 0;
    job.stableTicks = 0;
    job.waitingForCommandEnd = true;
    job.updatedAt = Date.now();
    try {
        var before = 0;
        try {
            before = term.getOutput ? String(term.getOutput() || "").length : 0;
        }
        catch (e1) {
            before = 0;
        }
        term.enterCommand(command);
        try {
            var after = term.getOutput ? String(term.getOutput() || "") : "";
            if (after.length > before) {
                job.currentCommandOutput = after.slice(before);
                job.raw = job.raw + job.currentCommandOutput;
                job.lastOutputLength = after.length;
                job.stableTicks = 0;
                outputWritten = true;
            }
            else {
                job.stableTicks = (job.stableTicks || 0) + 1;
            }
            commandEnded = job.stableTicks >= 2;
        }
        catch (e2) { }
    }
    catch (e) {
        failIosJob(ticket, "Command execution error: " + String(e), "COMMAND_EXECUTION_ERROR");
    }
}
function advanceIosJob(ticket) {
    var job = IOS_JOBS[ticket];
    if (!job || job.finished)
        return;
    var term = getIosJobTerm(job);
    if (!term) {
        failIosJob(ticket, "Terminal not available", "NO_TERMINAL");
        return;
    }
    if (!job.started) {
        job.started = true;
        job.state = "running";
        job.phase = "running";
    }
    if (job.waitingForCommandEnd) {
        try {
            var currentOutput = term.getOutput ? String(term.getOutput() || "") : "";
            if (currentOutput.length > job.lastOutputLength) {
                job.currentCommandOutput = currentOutput.slice(job.lastOutputLength);
                job.raw = job.raw + job.currentCommandOutput;
                job.lastOutputLength = currentOutput.length;
                job.stableTicks = 0;
                outputWritten = true;
            }
            else {
                job.stableTicks = (job.stableTicks || 0) + 1;
            }
            try {
                if (term.getPrompt) {
                    job.lastPrompt = String(term.getPrompt() || job.lastPrompt);
                }
            }
            catch (e1) { }
            if (job.stableTicks >= 2 || commandEnded) {
                job.waitingForCommandEnd = false;
            }
            else {
                return;
            }
        }
        catch (e2) {
            job.waitingForCommandEnd = false;
        }
    }
    if (job.currentIndex >= job.commands.length) {
        completeIosJob(ticket);
        return;
    }
    var command = String(job.commands[job.currentIndex] || "");
    if (!command) {
        job.currentIndex += 1;
        return;
    }
    sendIosJobCommand(ticket, command, "running");
    if (!job.currentCommandOutput) {
        job.raw = job.raw + (job.raw ? "\n" : "") + command;
    }
    job.output = job.raw;
    job.currentIndex += 1;
}
function getCommandResultId(record, seq) {
    if (record && record.id)
        return String(record.id);
    return "cmd_" + padSeq(seq);
}
function claimNextCommand(host) {
    var files = host.fm.getFilesInDirectory(host.paths.COMMANDS_DIR);
    if (!files || files.length === 0)
        return null;
    for (var i = 0; i < files.length; i++) {
        var filename = files[i];
        if (filename.indexOf(".json") === -1)
            continue;
        var parts = filename.split("-");
        if (parts.length < 2)
            continue;
        var seq = parseInt(parts[0], 10);
        var srcPath = host.paths.COMMANDS_DIR + "/" + filename;
        var dstPath = host.paths.IN_FLIGHT_DIR + "/" + filename;
        try {
            host.fm.writePlainTextToFile(dstPath, host.fm.getFileContents(srcPath));
            host.fm.removeFile(srcPath);
            var content = host.fm.getFileContents(dstPath);
            var command = JSON.parse(content);
            return {
                id: getCommandResultId(command, seq),
                seq: seq,
                command: command,
                filePath: dstPath
            };
        }
        catch (e) {
            log(host, "[queue] claim error: " + filename + " " + String(e));
        }
    }
    return null;
}
function writeResult(host, cmdId, result) {
    var resultPath = host.paths.RESULTS_DIR + "/" + cmdId + ".json";
    var envelope = {
        protocolVersion: 2,
        id: cmdId,
        seq: result.seq || 0,
        startedAt: result.startedAt || Date.now(),
        completedAt: Date.now(),
        status: result.ok ? "completed" : "failed",
        ok: !!result.ok,
        value: result.ok ? result.value : { ok: false, error: result.error }
    };
    host.fm.writePlainTextToFile(resultPath, JSON.stringify(envelope, null, 2));
}
function removeInflightIfPresent(host, cmdId) {
    var files = host.fm.getFilesInDirectory(host.paths.IN_FLIGHT_DIR);
    if (!files || files.length === 0)
        return;
    for (var i = 0; i < files.length; i++) {
        var filename = files[i];
        if (filename.indexOf(cmdId) !== -1) {
            try {
                host.fm.removeFile(host.paths.IN_FLIGHT_DIR + "/" + filename);
            }
            catch (e) { }
        }
    }
}
function reconcileInflight(host) {
    var files = host.fm.getFilesInDirectory(host.paths.IN_FLIGHT_DIR);
    if (!files || files.length === 0)
        return;
    var now = Date.now();
    for (var i = 0; i < files.length; i++) {
        var filename = files[i];
        if (filename.indexOf(".json") === -1)
            continue;
        try {
            var path = host.paths.IN_FLIGHT_DIR + "/" + filename;
            var content = host.fm.getFileContents(path);
            var envelope = JSON.parse(content);
            var cmdId = envelope && envelope.id ? String(envelope.id) : filename.replace(/\.json$/, "");
            var resultPath = host.paths.RESULTS_DIR + "/" + cmdId + ".json";
            if (host.fm.fileExists(resultPath)) {
                host.fm.removeFile(path);
                continue;
            }
            if (envelope && envelope.expiresAt && Number(envelope.expiresAt) < now) {
                writeResult(host, cmdId, {
                    seq: envelope.seq || 0,
                    startedAt: envelope.createdAt || now,
                    ok: false,
                    error: "Command expired in-flight",
                });
                host.fm.removeFile(path);
            }
        }
        catch (e) {
            try {
                host.fm.removeFile(host.paths.IN_FLIGHT_DIR + "/" + filename);
            }
            catch (inner) { }
        }
    }
}
function handleExecIos(payload, host) {
    var _a;
    var ticket = "ios_job_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
    var device = getNet(host).getDevice(payload.device);
    if (!device)
        return { ok: false, error: "Device not found: " + payload.device };
    var command = String(payload.command || "").trim();
    if (!command)
        return { ok: false, error: "Command is required" };
    var ensurePrivileged = !!((_a = payload.options) === null || _a === void 0 ? void 0 : _a.ensurePrivileged) || command.toLowerCase().indexOf("show ") === 0;
    payload.commands = prepareIosSteps(device, payload.command, ensurePrivileged);
    createIosJob(ticket, "execIos", payload, host);
    return { deferred: true, ticket: ticket, kind: "ios" };
}
function handleExecInteractive(payload, host) {
    var ticket = "ios_job_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
    var net = getNet(host);
    var device = net.getDevice(payload.device);
    if (!device)
        return { ok: false, error: "Device not found: " + payload.device };
    var command = String(payload.command || "").trim();
    if (!command)
        return { ok: false, error: "Command is required" };
    var ensurePrivileged = !!(payload.options && payload.options.ensurePrivileged);
    payload.commands = prepareIosSteps(device, command, ensurePrivileged);
    createIosJob(ticket, "execInteractive", payload, host);
    return { deferred: true, ticket: ticket, kind: "ios" };
}
function handleAddDevice(payload, host) {
    var model = resolveModel(payload.model);
    var name = payload.name || model;
    var x = payload.x || 100;
    var y = payload.y || 100;
    log(host, "[addDevice] Adding: " + name + " model: " + model);
    try {
        var created = createDeviceWithFallback(host, model, x, y, getDeviceTypeCandidates(model));
        if (!created)
            return { ok: false, error: "Failed to add device for model: " + model };
        var device = created.device;
        device.setName(name);
        if (device.skipBoot)
            device.skipBoot();
        return { ok: true, name: name, model: model, type: getDeviceTypeString(created.typeId), power: true, x: x, y: y };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleRemoveDevice(payload, host) {
    var name = payload.name;
    log(host, "[removeDevice] Removing: " + name);
    var lw = host.ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
    var net = host.ipc.network();
    try {
        if (lw && typeof lw.removeDevice === "function") {
            lw.removeDevice(name);
        }
        else if (net && typeof net.removeDevice === "function") {
            net.removeDevice(name);
        }
        return { ok: true, device: name };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleListDevices(payload, host) {
    log(host, "[listDevices] Listing devices");
    var net = host.ipc.network();
    var devices = [];
    try {
        if (net && typeof net.getDeviceCount === "function" && typeof net.getDeviceAt === "function") {
            var count = net.getDeviceCount();
            for (var i = 0; i < count; i++) {
                var device = net.getDeviceAt(i);
                if (device) {
                    devices.push({
                        name: typeof device.getName === "function" ? device.getName() : "",
                        model: typeof device.getModel === "function" ? device.getModel() : "",
                        type: typeof device.getType === "function" ? DEVICE_TYPE_NAMES[device.getType()] || String(device.getType()) : "",
                        power: typeof device.getPower === "function" ? device.getPower() : true
                    });
                }
            }
        }
        if (payload && payload.filter !== undefined && payload.filter !== null) {
            var filterText = String(payload.filter).toLowerCase();
            var filterType = typeof payload.filter === "number" ? getDeviceTypeString(payload.filter) : null;
            devices = devices.filter(function (device) {
                var name = String(device.name || "").toLowerCase();
                var model = String(device.model || "").toLowerCase();
                var type = String(device.type || "").toLowerCase();
                if (filterType) {
                    return type === String(filterType).toLowerCase();
                }
                if (Array.isArray(payload.filter)) {
                    return payload.filter.indexOf(device.name) !== -1 || payload.filter.indexOf(device.model) !== -1 || payload.filter.indexOf(device.type) !== -1;
                }
                return name.indexOf(filterText) !== -1 || model.indexOf(filterText) !== -1 || type.indexOf(filterText) !== -1;
            });
        }
        return { ok: true, devices: devices, count: devices.length };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleAddLink(payload, host) {
    var lw = host.ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
    var net = host.ipc.network();
    var device1 = net.getDevice(payload.device1);
    var device2 = net.getDevice(payload.device2);
    if (!device1)
        return { ok: false, error: "Device not found: " + payload.device1 };
    if (!device2)
        return { ok: false, error: "Device not found: " + payload.device2 };
    var port1 = resolveDevicePortName(device1, payload.port1);
    var port2 = resolveDevicePortName(device2, payload.port2);
    if (!port1 || !port2) {
        return { ok: false, error: "Port not found", details: { device1: payload.device1, port1: port1, device2: payload.device2, port2: port2 } };
    }
    var cableType = getCableTypeId(payload.linkType || "straight");
    var first = lw.createLink(payload.device1, port1, payload.device2, port2, cableType);
    if (!first) {
        var second = lw.createLink(payload.device2, port2, payload.device1, port1, cableType);
        if (!second)
            return { ok: false, error: "Packet Tracer rejected the link" };
    }
    return { ok: true, device1: payload.device1, port1: port1, device2: payload.device2, port2: port2, cableType: cableType };
}
function handleRemoveLink(payload, host) {
    try {
        host.ipc.appWindow().getActiveWorkspace().getLogicalWorkspace().deleteLink(payload.device, payload.port);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleConfigHost(payload, host) {
    var deviceName = payload.device;
    var ip = payload.ip;
    var mask = payload.mask;
    var gateway = payload.gateway;
    var dns = payload.dns;
    var dhcp = payload.dhcp === true;
    log(host, "[configHost] Configuring: " + deviceName);
    var net = host.ipc.network();
    var device = net.getDevice(deviceName);
    if (!device)
        return { ok: false, error: "Device not found: " + deviceName };
    try {
        var port = device.getPortAt ? device.getPortAt(0) : null;
        if (!port)
            return { ok: false, error: "No ports on device" };
        if (dhcp) {
            if (port.setDhcpEnabled)
                port.setDhcpEnabled(true);
        }
        else {
            if (ip && mask && port.setIpSubnetMask)
                port.setIpSubnetMask(ip, mask);
            if (gateway && port.setDefaultGateway)
                port.setDefaultGateway(gateway);
            if (dns && port.setDnsServerIp)
                port.setDnsServerIp(dns);
        }
        return { ok: true, device: deviceName, ip: ip, gateway: gateway, dns: dns, dhcp: dhcp };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handleConfigIos(payload, host) {
    var deviceName = payload.device;
    var commands = payload.commands || [];
    log(host, "[configIos] Configuring: " + deviceName + " commands: " + commands.length);
    var net = getNet(host);
    var device = net.getDevice(deviceName);
    if (!device)
        return { ok: false, error: "Device not found: " + deviceName };
    var ticket = "ios_job_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
    createIosJob(ticket, "configIos", payload, host);
    return { deferred: true, ticket: ticket, kind: "ios" };
}
function handleClearTopology(payload, host) {
    try {
        var snapshot = collectSnapshot(host);
        var links = snapshot && snapshot.links ? snapshot.links : {};
        var devices = snapshot && snapshot.devices ? snapshot.devices : {};
        var removedLinks = 0;
        var removedDevices = 0;
        for (var linkId in links) {
            if (!Object.prototype.hasOwnProperty.call(links, linkId))
                continue;
            try {
                host.ipc.appWindow().getActiveWorkspace().getLogicalWorkspace().deleteLink(links[linkId].device1, links[linkId].port1);
                removedLinks += 1;
            }
            catch (e1) {
                try {
                    host.ipc.appWindow().getActiveWorkspace().getLogicalWorkspace().deleteLink(links[linkId].device2, links[linkId].port2);
                    removedLinks += 1;
                }
                catch (e2) { }
            }
        }
        for (var deviceName in devices) {
            if (!Object.prototype.hasOwnProperty.call(devices, deviceName))
                continue;
            try {
                getLW(host).removeDevice(deviceName);
                removedDevices += 1;
            }
            catch (e3) { }
        }
        return {
            ok: true,
            removedDevices: removedDevices,
            removedLinks: removedLinks,
            remainingDevices: 0,
            remainingLinks: 0
        };
    }
    catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}
function handlePollDeferred(payload, host) {
    var ticket = payload.ticket;
    var state = getRuntimeState(host);
    var job = IOS_JOBS[ticket] || (state.iosJobs ? state.iosJobs[ticket] : null);
    if (!job) {
        log(host, "[pollDeferred] Job not found: " + ticket);
        return { done: true, ok: false, error: "Job not found: " + ticket };
    }
    if (!job.finished) {
        advanceIosJob(ticket);
        job = IOS_JOBS[ticket];
    }
    if (!job.finished)
        return { done: false, state: job.state, phase: job.phase };
    if (job.state === "error")
        return { done: true, ok: false, error: job.error || "Job failed", raw: job.output || "" };
    return { done: true, ok: true, raw: job.output || "", status: job.status || 0 };
}
function dispatch(payload, host) {
    var type = payload && payload.type ? payload.type : "unknown";
    try {
        log(host, "[Runtime] Processing: " + type);
        switch (type) {
            case "snapshot": return handleSnapshot(host);
            case "inspect": return handleInspect(payload, host);
            case "moveDevice": return handleMoveDevice(payload, host);
            case "renameDevice": return handleRenameDevice(payload, host);
            case "clearTopology": return handleClearTopology(payload, host);
            case "listCanvasRects": return handleListCanvasRects(payload, host);
            case "getRect": return handleGetRect(payload, host);
            case "devicesInRect": return handleDevicesInRect(payload, host);
            case "addDevice": return handleAddDevice(payload, host);
            case "removeDevice": return handleRemoveDevice(payload, host);
            case "listDevices": return handleListDevices(payload, host);
            case "addLink": return handleAddLink(payload, host);
            case "removeLink": return handleRemoveLink(payload, host);
            case "addModule": return handleAddModule(payload, host);
            case "removeModule": return handleRemoveModule(payload, host);
            case "configHost": return handleConfigHost(payload, host);
            case "configIos": return handleConfigIos(payload, host);
            case "execIos": return handleExecIos(payload, host);
            case "execInteractive": return handleExecInteractive(payload, host);
            case "hardwareInfo": return handleHardwareInfo(payload, host);
            case "hardwareCatalog": return handleHardwareCatalog(payload, host);
            case "commandLog": return handleCommandLog(payload, host);
            case "__pollDeferred": return handlePollDeferred(payload, host);
            case "__healthcheck__": return { ok: true, runtime: "pt-runtime-es5", version: "3.0.0" };
            default:
                return { ok: false, error: "Unknown command: " + type };
        }
    }
    catch (e) {
        var errMsg = e && e.message ? e.message : String(e);
        log(host, "[Runtime] Error: " + errMsg);
        return { ok: false, error: errMsg };
    }
}
function processDeferred(host) {
    var state = getRuntimeState(host);
    var keys = objectKeys(state.pendingCommands);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!key)
            continue;
        var pending = state.pendingCommands[key];
        var pollResult = dispatch({ type: "__pollDeferred", ticket: pending.ticket }, host);
        if (!pollResult || pollResult.done !== true)
            continue;
        writeResult(host, pending.id, {
            seq: pending.seq || 0,
            startedAt: pending.startedAt,
            ok: pollResult.ok,
            value: pollResult,
            error: pollResult.error
        });
        removeInflightIfPresent(host, pending.id);
        delete state.pendingCommands[key];
        savePendingCommands(host);
        log(host, "[PT] Deferred completed: " + pending.id + " status=" + (pollResult.ok ? "ok" : "failed"));
    }
    var jobKeys = objectKeys(IOS_JOBS);
    for (var j = 0; j < jobKeys.length; j++) {
        var ticket = String(jobKeys[j] || "");
        if (!ticket)
            continue;
        var job = IOS_JOBS[ticket];
        if (!job || job.finished)
            continue;
        advanceIosJob(ticket);
    }
}
function processNextCommand(host) {
    var state = getRuntimeState(host);
    var claimed = claimNextCommand(host);
    if (!claimed)
        return;
    var record = claimed.command;
    var payload = record && record.payload ? record.payload : record;
    var type = record && record.type ? record.type : (payload && payload.type ? payload.type : "unknown");
    var startedAt = Date.now();
    log(host, "[PT] Executing: " + type);
    try {
        var result = dispatch(payload, host);
        if (result && result.deferred === true) {
            state.pendingCommands[claimed.id] = {
                id: claimed.id,
                seq: claimed.seq,
                startedAt: startedAt,
                ticket: result.ticket,
                kind: result.kind || "ios"
            };
            savePendingCommands(host);
            log(host, "[PT] Deferred: " + type + " [" + claimed.id + "] ticket=" + result.ticket);
            return;
        }
        writeResult(host, claimed.id, {
            seq: claimed.seq,
            startedAt: startedAt,
            ok: result && result.ok !== false,
            value: result,
            error: result ? result.error : "Unknown error"
        });
        removeInflightIfPresent(host, claimed.id);
        log(host, "[PT] Executed: " + type + " [" + claimed.id + "]");
    }
    catch (e) {
        var errMsg = e && e.message ? e.message : String(e);
        writeResult(host, claimed.id, {
            seq: claimed.seq,
            startedAt: startedAt,
            ok: false,
            error: errMsg
        });
        removeInflightIfPresent(host, claimed.id);
        log(host, "[PT] Error executing " + type + ": " + errMsg);
    }
}
function initRuntime(host) {
    ensureRuntimeDirs(host);
    loadPendingCommands(host);
    recoverInFlightOnStartup(host);
}
function tickRuntime(host) {
    if (host && host.isShuttingDown)
        return;
    ensureRuntimeDirs(host);
    reconcileInflight(host);
    writeHeartbeat(host);
    processDeferred(host);
    processNextCommand(host);
}
function cleanupRuntime(host) {
    if (host && host.isShuttingDown)
        return;
    savePendingCommands(host);
}
var Runtime = {
    init: initRuntime,
    tick: tickRuntime,
    cleanup: cleanupRuntime,
    dispatch: dispatch,
    CABLE_TYPES: CABLE_TYPES,
    DEVICE_TYPES: DEVICE_TYPES
};
