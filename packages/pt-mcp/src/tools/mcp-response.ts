import { randomUUID } from "node:crypto";

export interface McpToolResponse<T extends Record<string, unknown>> {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: T;
  isError?: boolean;
}

function baseMeta(startTime?: number): { schemaVersion: "1.0"; timestamp: string; requestId: string; durationMs?: number } {
  return {
    schemaVersion: "1.0" as const,
    timestamp: new Date().toISOString(),
    requestId: `mcp-${randomUUID().slice(0, 8)}`,
    ...(startTime != null ? { durationMs: Date.now() - startTime } : {}),
  };
}

export function ok<T extends Record<string, unknown>>(
  structuredContent: T,
  options?: { startTime?: number },
): McpToolResponse<T & { ok: true; schemaVersion: "1.0"; timestamp: string; requestId: string; durationMs?: number }> {
  const payload = {
    ok: true as const,
    ...baseMeta(options?.startTime),
    ...structuredContent,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

export function fail(
  code: string,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    hint?: string;
    retryable?: boolean;
    nextActions?: string[];
    action?: string;
    startTime?: number;
  },
): McpToolResponse<{
  ok: false;
  schemaVersion: "1.0";
  timestamp: string;
  requestId: string;
  durationMs?: number;
  action?: string;
  error: {
    code: string;
    message: string;
    hint?: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  };
  nextActions?: string[];
}> {
  const payload = {
    ok: false as const,
    ...baseMeta(options?.startTime),
    ...(options?.action ? { action: options.action } : {}),
    error: {
      code,
      message,
      ...(options?.hint ? { hint: options.hint } : {}),
      ...(options?.retryable != null ? { retryable: options.retryable } : {}),
      ...(options?.details ? { details: options.details } : {}),
    },
    ...(options?.nextActions ? { nextActions: options.nextActions } : {}),
  };

  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

export function errorToFail(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
  options?: { details?: Record<string, unknown>; hint?: string; retryable?: boolean; nextActions?: string[]; action?: string; startTime?: number },
) {
  const err = error as Error & { code?: string; details?: Record<string, unknown> };

  return fail(
    err.code ?? fallbackCode,
    err.message ?? fallbackMessage,
    {
      details: err.details,
      ...options,
    },
  );
}

export function assertStructuredContent<T>(
  schema: { parse: (value: unknown) => T },
  response: McpToolResponse<any>,
): McpToolResponse<any> {
  schema.parse(response.structuredContent);
  return response;
}

export interface InstructivoOptions {
  paso?: string;
  siguientes?: string[];
  tips?: string[];
  resumen?: string;
  startTime?: number;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function uniqueLines(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const line = typeof value === "string" ? value.trim() : "";
    if (!line || seen.has(line)) continue;
    seen.add(line);
    result.push(line);
  }

  return result;
}

function inferDeviceKind(entity: unknown): string | null {
  if (!isRecord(entity)) return null;

  const candidates = [entity.type, entity.kind, entity.deviceType, entity.model, entity.category, entity.role, entity.name]
    .filter((value) => typeof value === "string")
    .map((value) => String(value).toLowerCase());

  const haystack = candidates.join(" ");

  if (haystack.includes("switch")) return "switch";
  if (haystack.includes("router")) return "router";
  if (haystack.includes("server")) return "server";
  if (haystack.includes("wlc")) return "wlc";
  if (haystack.includes("access point") || haystack.includes("ap-")) return "ap";
  if (haystack.includes("pc") || haystack.includes("host") || haystack.includes("end device")) return "pc";
  if (haystack.includes("l3") || haystack.includes("multilayer")) return "l3-switch";

  return null;
}

function inferCommandFamily(command: string): string {
  const text = command.toLowerCase().replace(/\s+/g, " ").trim();

  if (text.includes("show vlan")) return "vlan";
  if (text.includes("show interfaces trunk") || text.includes("switchport")) return "trunk";
  if (text.includes("etherchannel") || text.includes("port-channel")) return "etherchannel";
  if (text.includes("spanning-tree")) return "stp";
  if (text.includes("ospf")) return "ospf";
  if (text.includes("eigrp")) return "eigrp";
  if (text.includes("bgp")) return "bgp";
  if (text.includes("show ip route")) return "routing";
  if (text.includes("show ip interface brief") || text.includes("show interfaces")) return "interfaces";
  if (text.includes("show run") || text.includes("running-config")) return "config";
  if (text.includes("ping") || text.includes("traceroute") || text.includes("trace")) return "reachability";
  if (text.includes("dhcp")) return "dhcp";
  if (text.includes("hsrp")) return "hsrp";
  if (text.includes("acl") || text.includes("access-list")) return "acl";
  if (text.includes("arp")) return "arp";
  if (text.includes("mac address-table") || text.includes("show mac")) return "mac";
  if (text.includes("version")) return "version";

  return "general";
}

function commandSuggestionsForFamily(family: string, deviceKind?: string | null): string[] {
  switch (family) {
    case "vlan":
      return [
        "pt_cmd_run con `show interfaces trunk` para validar trunks y VLAN permitidas.",
        "pt_cmd_run con `show spanning-tree vlan <id>` para revisar STP en la VLAN afectada.",
      ];
    case "trunk":
      return [
        "pt_cmd_run con `show vlan brief` para confirmar pertenencia de puertos.",
        "pt_cmd_run con `show interfaces switchport` para validar modo access/trunk.",
      ];
    case "etherchannel":
      return [
        "pt_cmd_run con `show etherchannel summary` para confirmar el bundle.",
        "pt_cmd_run con `show interfaces trunk` para verificar transporte VLAN si aplica.",
      ];
    case "stp":
      return [
        "pt_cmd_run con `show spanning-tree summary` para ver el estado global.",
        "pt_cmd_run con `show spanning-tree vlan <id>` para un análisis por VLAN.",
      ];
    case "ospf":
      return [
        "pt_cmd_run con `show ip ospf neighbor` para verificar adyacencias.",
        "pt_cmd_run con `show ip route ospf` para confirmar rutas aprendidas.",
      ];
    case "routing":
      return [
        "pt_cmd_run con `show ip ospf neighbor` o `show ip eigrp neighbors` según el protocolo.",
        "pt_cmd_run con `show running-config | section router` para revisar la configuración del routing.",
      ];
    case "interfaces":
      return [
        "pt_cmd_run con `show ip route` para ver la conectividad lógica.",
        "pt_cmd_run con `show cdp neighbors detail` si necesitas mapear vecinos.",
      ];
    case "dhcp":
      return [
        "pt_cmd_run con `show ip dhcp binding` para confirmar concesiones.",
        "pt_cmd_run con `show running-config | section dhcp` para revisar pools y exclusiones.",
      ];
    case "hsrp":
      return [
        "pt_cmd_run con `show standby brief` para validar el estado del gateway redundante.",
        "pt_cmd_run con `show ip interface brief` para comprobar la interfaz de enlace.",
      ];
    case "acl":
      return [
        "pt_cmd_run con `show access-lists` para revisar coincidencias y contadores.",
        "pt_cmd_run con `show running-config | include access-list|ip access-group` para ver aplicación.",
      ];
    case "reachability":
      return [
        "pt_cmd_run con un `show ip interface brief` primero para validar direccionamiento.",
        "pt_cmd_run con `show ip route` para comprobar la ruta hacia el destino.",
      ];
    case "config":
      return [
        "pt_cmd_run con `show running-config | section <bloque>` para validar el cambio.",
        "pt_cmd_run con `show startup-config` si quieres comparar persistencia.",
      ];
    case "mac":
      return [
        "pt_cmd_run con `show mac address-table` para ubicar el aprendizaje L2.",
        "pt_cmd_run con `show interfaces status` para confirmar el puerto de acceso.",
      ];
    case "version":
      return deviceKind === "router" || deviceKind === "switch"
        ? [
            "pt_cmd_run con `show running-config` para revisar la configuración activa.",
            "pt_cmd_run con `show ip interface brief` para validar interfaces y direccionamiento.",
          ]
        : [
            "pt_cmd_run con `show ip interface brief` para revisar interfaz y IP.",
            "pt_cmd_run con `ping <destino>` para comprobar conectividad básica.",
          ];
    default:
      return deviceKind === "switch"
        ? [
            "pt_cmd_run con `show vlan brief` si estás validando segmentación L2.",
            "pt_cmd_run con `show interfaces trunk` si hay enlaces entre switches.",
          ]
        : deviceKind === "router"
          ? [
              "pt_cmd_run con `show ip route` para ver el plano L3.",
              "pt_cmd_run con `show ip interface brief` para revisar interfaces.",
            ]
          : [
              "pt_device op=get o `pt_device op=ports` pueden darte más contexto del equipo.",
              "pt_cmd_run con un comando show adicional para seguir explorando.",
            ];
  }
}

function summarizeDeviceKinds(devices: unknown[]): { count: number; kinds: Record<string, number>; firstName?: string } {
  const kinds: Record<string, number> = {};
  let firstName: string | undefined;

  for (const device of devices) {
    if (!firstName && isRecord(device) && typeof device.name === "string") {
      firstName = device.name;
    }

    const kind = inferDeviceKind(device) ?? "unknown";
    kinds[kind] = (kinds[kind] ?? 0) + 1;
  }

  return { count: devices.length, kinds, firstName };
}

type Signal = { code: string; severity: "error" | "warning" | "info" };

const SEVERITY_RANK: Record<Signal["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function rankSeverity(value: unknown): Signal["severity"] {
  return value === "error" || value === "warning" || value === "info" ? value : "info";
}

function collectSignals(value: unknown, signals: Signal[]): void {
  if (typeof value === "string") {
    if (value.trim()) {
      signals.push({ code: value.trim(), severity: "info" });
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectSignals(item, signals);
    }
    return;
  }

  if (!isRecord(value)) return;

  if (typeof value.code === "string") {
    signals.push({ code: value.code, severity: rankSeverity(value.severity) });
  }
  if (isRecord(value.error)) collectSignals(value.error, signals);
  if (isRecord(value.result)) collectSignals(value.result, signals);
  if (Array.isArray(value.warnings)) collectSignals(value.warnings, signals);
  if (Array.isArray(value.results)) collectSignals(value.results, signals);
}

function prioritizeSignals(signals: Signal[]): Signal[] {
  const seen = new Set<string>();
  const unique: Signal[] = [];

  for (const signal of signals) {
    if (seen.has(signal.code)) continue;
    seen.add(signal.code);
    unique.push(signal);
  }

  return unique.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

function buildSignalGuidance(payload: JsonRecord): Partial<InstructivoOptions> {
  const signals: Signal[] = [];

  collectSignals(payload.error, signals);
  collectSignals(payload.warnings, signals);
  collectSignals(payload.results, signals);

  const ordered = prioritizeSignals(signals);
  const codes = new Set(ordered.map((signal) => signal.code));

  const tips: string[] = [];
  const siguientes: string[] = [];

  if (codes.has("CMD_SLOW_SUCCESS")) {
    tips.push("El comando fue exitoso pero lento; si necesitas evidencia, usa profile=\"audit\". Si estás depurando, cambia a profile=\"debug\".");
    siguientes.push("pt_cmd_run con profile=\"audit\" para evidencia o profile=\"debug\" para depurar el cuello de botella.");
  }

  if (codes.has("PT_TERMINAL_BRIDGE_TIMEOUT")) {
    tips.push("El bridge parece lento o inestable; revisa que Packet Tracer esté abierto, que el heartbeat siga vivo y que PT_DEV_DIR sea correcto.");
    siguientes.push("pt_status op=summary — confirmar salud del bridge y del runtime.");
  }

  if (codes.has("PT_TERMINAL_CONCURRENCY_EXPERIMENTAL")) {
    tips.push("La concurrencia de terminal es experimental; reduce terminalConcurrency a 1 si ves comportamiento raro.");
    siguientes.push("pt_cmd_run con terminalConcurrency=1 para eliminar interferencia.");
  }

  if (codes.has("CMD_BATCH_PARTIAL_FAILURE")) {
    tips.push("El batch terminó parcialmente; revisa subResults y vuelve a ejecutar el segmento fallido con profile=\"debug\".");
    siguientes.push("pt_cmd_run con profile=\"debug\" y continueOnError=true para aislar el fallo.");
  }

  if (codes.has("CMD_ADAPTIVE_BATCH_INCOMPLETE")) {
    tips.push("La estrategia adaptativa quedó incompleta; prueba sequential o reduce el tamaño del lote.");
    siguientes.push("pt_cmd_run con batchStrategy=\"sequential\" para forzar una ejecución más estable.");
  }

  if (codes.has("CMD_ADAPTIVE_BATCH_RECOVERY_TIMEOUT")) {
    tips.push("El recovery del batch agotó tiempo; reduce el lote o ejecuta los comandos de forma secuencial.");
    siguientes.push("pt_cmd_run con batchStrategy=\"sequential\" o menos comandos por job.");
  }

  if (codes.has("PT_CMD_SUBCOMMAND_FAILED") || codes.has("IOS_EXEC_FAILED")) {
    tips.push("Un subcomando falló; valida sintaxis, privilegios y si el IOS/host soporta ese comando.");
    siguientes.push("pt_cmd_run con show commands más básicos, por ejemplo `show ip interface brief` o `show version`.");
  }

  if (ordered.some((signal) => signal.severity === "error" && codes.has(signal.code))) {
    const firstError = ordered.find((signal) => signal.severity === "error" && codes.has(signal.code));
    tips.unshift("Hay advertencias con severidad 'error': corrige la primera antes de continuar.");
    siguientes.unshift(
      firstError
        ? "pt_status op=doctor — investigar el código " + firstError.code + " antes de seguir."
        : "pt_status op=doctor — diagnosticar la causa raíz antes de seguir.",
    );
  }

  if (ordered.length > 0) {
    const severitySummary = "Señales por severidad: " + ordered.map((signal) => signal.code + "(" + signal.severity + ")").join(", ") + ".";
    tips.unshift(severitySummary);
  }

  return {
    ...(tips.length > 0 ? { tips: uniqueLines(tips) } : {}),
    ...(siguientes.length > 0 ? { siguientes: uniqueLines(siguientes) } : {}),
  };
}

function buildGuidanceFromAction(toolName: string, payload: JsonRecord): Partial<InstructivoOptions> {
  const action = String(payload.action ?? toolName).toLowerCase();

  if (action === "pt_cli" || action === "legacy.cli") {
    const argv = Array.isArray(payload.argv) ? payload.argv.filter((value): value is string => typeof value === "string") : [];
    const firstArg = (argv[0] ?? "").toLowerCase();
    const legacyHint = firstArg === "status" || firstArg === "doctor"
      ? ["Usa pt_status op=summary o pt_status op=doctor en lugar del fallback legacy."]
      : firstArg === "device"
        ? ["Usa pt_device para inventario, inspección o módulos en vez del CLI legacy."]
        : firstArg === "link"
          ? ["Usa pt_link para cableado y verificación en vez del CLI legacy."]
          : firstArg === "project"
            ? ["Usa pt_project para abrir, guardar y recuperar el proyecto."]
            : ["Prefiere una tool directa (pt_status, pt_device, pt_link, pt_project, pt_cmd_run) en vez del fallback legacy."];

    return {
      resumen: "Fallback legacy usado; conviene migrar a una tool directa.",
      paso: legacyHint[0],
      siguientes: uniqueLines([
        ...legacyHint,
        "pt_status op=summary — estado general",
        "pt_device op=list — inventario",
        "pt_cmd_run — comandos IOS/host",
      ]),
      tips: ["El fallback legacy es útil solo como puente temporal."],
    };
  }

  if (action === "status.summary") {
    const reconciled = isRecord(payload.reconciled) ? payload.reconciled : null;
    const commandReady = reconciled ? Boolean(reconciled.commandReady) : false;
    const topologyUsable = reconciled ? Boolean(reconciled.topologyUsable) : false;
    const projectReady = reconciled ? Boolean(reconciled.projectReady) : false;
    const inventoryDeviceCount = reconciled && typeof reconciled.inventoryDeviceCount === "number" ? reconciled.inventoryDeviceCount : 0;
    const warnings = asArray(payload.warnings);
    const nextActions = asArray(payload.nextActions).filter((value): value is string => typeof value === "string");

    return {
      resumen: commandReady
        ? "Sistema listo. " + inventoryDeviceCount + " dispositivo(s) en inventario." + (warnings.length > 0 ? " " + warnings.length + " advertencia(s) visibles." : "")
        : "Sistema no listo. " + warnings.length + " problema(s) detectado(s)." + (!projectReady ? " El proyecto aún no está listo." : "") + (!topologyUsable ? " La topología todavía no es usable." : ""),
      paso: commandReady
        ? "Empieza con `pt_device op=list` y luego `pt_cmd_run device=\"<nombre>\" commands=\"show version\" profile=\"fast\"`."
        : "Corrige primero lo que impide ejecutar comandos. Si no sabes por dónde empezar, usa `pt_status op=doctor`.",
      siguientes: uniqueLines([
        ...nextActions.map((value) => "Acción sugerida: " + value),
        "pt_device op=list — inventario de dispositivos",
        "pt_link op=list — enlaces del laboratorio",
        "pt_status op=doctor — diagnóstico completo",
      ]),
      tips: warnings.length > 0
        ? [
            "Prioriza la primera advertencia actionable.",
            "Si el problema es de disponibilidad, inspecciona bridge, heartbeat y proyecto en ese orden.",
          ]
        : ["Si necesitas evidencia, usa profile=audit en pt_cmd_run."],
    };
  }

  if (action === "status.doctor") {
    const healthy = Boolean(payload.healthy);
    return {
      resumen: healthy ? "Diagnóstico OK. La base operativa está sana." : "Diagnóstico con fallas. Hay que corregir la base antes de automatizar más.",
      paso: healthy
        ? "Puedes continuar con `pt_device op=list` o `pt_cmd_run`."
        : "Ataca el problema raíz: runtime, bridge o proyecto. Luego repite `pt_status op=summary`.",
      siguientes: [
        "pt_status op=summary — estado reconciliado",
        "pt_status op=runtime — estado del runtime",
        "pt_status op=bridge — estado del bridge",
      ],
    };
  }

  if (action === "status.runtime") {
    const heartbeat = isRecord(payload.heartbeat) ? payload.heartbeat : null;
    const state = typeof heartbeat?.state === "string" ? heartbeat.state : "desconocido";
    return {
      resumen: state === "ok" ? "Runtime operativo." : "Runtime no está sano. Estado: " + state + ".",
      paso: state === "ok"
        ? "Sigue con `pt_device op=list` o `pt_cmd_run`."
        : "Asegúrate de que Packet Tracer esté abierto y el script/runtime esté cargado.",
    };
  }

  if (action === "status.bridge") {
    const bridge = isRecord(payload.bridge) ? payload.bridge : null;
    const ready = Boolean(bridge?.ready);
    return {
      resumen: ready ? "Bridge listo." : "Bridge no listo; la comunicación aún no está estable.",
      paso: ready
        ? "Continúa con inventario o comandos."
        : "Revisa el bridge, el heartbeat y la ruta de PT_DEV_DIR.",
    };
  }

  if (action === "app.paths") {
    const paths = isRecord(payload.paths) ? payload.paths : null;
    const selected = typeof paths?.selected === "string" ? paths.selected : null;
    const candidates = Array.isArray(paths?.candidates) ? paths.candidates : [];

    return {
      resumen: selected
        ? "Packet Tracer está localizado y hay una ruta seleccionada."
        : "Aún no hay una ruta de Packet Tracer claramente seleccionada.",
      paso: selected
        ? "Si quieres trabajar, abre un proyecto con `pt_app op=open` o valida el estado con `pt_app op=status`."
        : "Selecciona una instalación válida antes de abrir proyectos.",
      siguientes: uniqueLines([
        "pt_app op=status — validar el runtime de la app",
        "pt_app op=open path=\"<ruta>.pkt\" — abrir un proyecto",
        candidates.length > 0 ? "Revisa las rutas candidatas y escoge la correcta." : undefined,
      ]),
    };
  }

  if (action === "app.status") {
    const status = isRecord(payload.status) ? payload.status : null;
    const process = isRecord(status?.process) ? status.process : null;
    const runtime = isRecord(status?.runtime) ? status.runtime : null;
    const processLevel = typeof process?.level === "string" ? process.level : "unknown";
    const runtimeLoaded = Boolean(runtime?.loaded);

    return {
      resumen: runtimeLoaded
        ? "La aplicación está lista para operar."
        : "La aplicación aún no está lista o el runtime no cargó.",
      paso: runtimeLoaded
        ? "Continúa con `pt_project op=status` o `pt_device op=list`."
        : "Abre Packet Tracer o espera a que el runtime termine de cargar.",
      siguientes: uniqueLines([
        "pt_app op=wait runtime=true — esperar runtime",
        "pt_project op=status — revisar el proyecto activo",
        `Estado del proceso: ${processLevel}`,
      ]),
    };
  }

  if (action === "app.open") {
    const path = String(payload.path ?? "<ruta>");
    return {
      resumen: "Proyecto abierto o solicitado para apertura.",
      paso: "Verifica inmediatamente con `pt_project op=status` y luego `pt_status op=summary`.",
      siguientes: uniqueLines([
        `pt_project op=status — validar proyecto ${path}`,
        "pt_status op=summary — revisar si el entorno quedó listo",
        "pt_device op=list — inventario tras abrir",
      ]),
    };
  }

  if (action === "app.close") {
    return {
      resumen: "La aplicación se cerró o se solicitó su cierre.",
      paso: "Si el cierre era parte de un flujo, confirma el estado con `pt_app op=status` al reabrir.",
      siguientes: [
        "pt_app op=status — comprobar estado tras cierre",
        "pt_app op=paths — verificar instalación local",
      ],
    };
  }

  if (action === "app.restart") {
    return {
      resumen: "Reinicio de la aplicación ejecutado o solicitado.",
      paso: "Tras reiniciar, espera el runtime y luego valida el proyecto activo.",
      siguientes: uniqueLines([
        "pt_app op=wait runtime=true — esperar a que PT cargue",
        "pt_project op=status — confirmar el proyecto activo",
        "pt_status op=summary — validar el estado global",
      ]),
    };
  }

  if (action === "app.wait") {
    return {
      resumen: "Espera completada o solicitada para app/runtime.",
      paso: "Si el runtime está listo, sigue con `pt_project op=status` o `pt_device op=list`.",
      siguientes: uniqueLines([
        "pt_project op=status — validar el proyecto",
        "pt_status op=summary — revisar salud general",
      ]),
    };
  }

  if (action === "project.status") {
    const status = isRecord(payload.status) ? payload.status : null;
    const activeFile = typeof status?.activeFile === "string" ? status.activeFile : null;

    return {
      resumen: activeFile
        ? `Proyecto activo: ${activeFile}.`
        : "No se detectó un archivo activo claramente.",
      paso: activeFile
        ? "Si el proyecto es el correcto, usa `pt_device op=list` para inspeccionar el inventario o `pt_cmd_run` para validar la red."
        : "Abre un .pkt con `pt_project op=open`.",
      siguientes: uniqueLines([
        "pt_device op=list — inventario del proyecto",
        "pt_link op=list — enlaces del proyecto",
        "pt_project op=checkpoints — backups disponibles",
      ]),
    };
  }

  if (action === "project.save") {
    return {
      resumen: "Proyecto guardado en disco.",
      paso: "Si acabas de cambiar algo, valida con `pt_status op=summary` o guarda una evidencia con `pt_project op=autosave`.",
      siguientes: [
        "pt_project op=autosave — crear backup adicional",
        "pt_status op=summary — confirmar estado tras guardar",
      ],
    };
  }

  if (action === "project.autosave") {
    return {
      resumen: "Autosave creado.",
      paso: "Si el cambio era riesgoso, sigue con el flujo de validación del laboratorio.",
      siguientes: [
        "pt_project op=checkpoints — revisar backups",
        "pt_status op=summary — validar estado actual",
      ],
    };
  }

  if (action === "project.open") {
    const path = String(payload.path ?? "<ruta>");
    return {
      resumen: "Proyecto solicitado/abierto.",
      paso: "Comprueba `pt_project op=status` y luego `pt_status op=summary`.",
      siguientes: uniqueLines([
        `pt_project op=status — validar ${path}`,
        "pt_device op=list — inventario del proyecto abierto",
        "pt_link op=list — enlaces del proyecto abierto",
      ]),
    };
  }

  if (action === "project.recover") {
    return {
      resumen: "Recuperación de proyecto ejecutada o solicitada.",
      paso: "Tras recuperar, confirma inventario y enlaces antes de seguir.",
      siguientes: uniqueLines([
        "pt_project op=status — revisar el archivo activo",
        "pt_device op=list — confirmar inventario restaurado",
        "pt_link op=list — confirmar enlaces restaurados",
      ]),
    };
  }

  if (action === "project.checkpoints") {
    return {
      resumen: "Checkpoints/autosaves listados.",
      paso: "Si hay un checkpoint útil, recupéralo y luego valida el estado general.",
      siguientes: [
        "pt_project op=recover — restaurar un checkpoint",
        "pt_project op=status — validar el activo actual",
      ],
    };
  }

  if (action === "omni.status") {
    return {
      resumen: "Omni está disponible para diagnóstico avanzado.",
      paso: "No lo uses para flujos normales; preferí pt_status, pt_device, pt_link o pt_cmd_run.",
      siguientes: [
        "pt_status op=summary — preferir flujo normal",
        "pt_cmd_run — validación normal de IOS",
      ],
    };
  }

  if (action === "omni.capability") {
    return {
      resumen: "Capacidades Omni detectadas.",
      paso: "Úsalas solo si las tools de alto nivel no alcanzan.",
      siguientes: [
        "pt_status op=summary — flujo normal",
        "pt_project op=status — validar proyecto antes de Omni",
      ],
    };
  }

  if (action === "omni.raw") {
    return {
      resumen: "Ejecución raw avanzada completada.",
      paso: "Trata la salida como diagnóstico interno y vuelve a un flujo seguro cuando puedas.",
      siguientes: [
        "pt_cmd_run — volver a validación segura",
        "pt_status op=summary — confirmar que el entorno sigue sano",
      ],
      tips: ["Omni raw es para diagnóstico extremo, no para operación cotidiana."],
    };
  }

  if (action === "omni.result_status" || action === "omni.read_result") {
    return {
      resumen: "Resultado Omni consultado.",
      paso: "Si el resultado era diagnóstico, tradúcelo a una acción normal en pt_status/pt_cmd_run.",
      siguientes: [
        "pt_status op=summary — traducir diagnóstico a estado",
        "pt_cmd_run — continuar con validación normal",
      ],
    };
  }

  if (action === "omni.clear") {
    return {
      resumen: "Cache Omni limpiado.",
      paso: "Si limpiaste todo, vuelve a validar con una herramienta normal según el objetivo.",
      siguientes: [
        "pt_status op=summary — estado actual",
        "pt_cmd_run — validar la red",
      ],
    };
  }

  if (action === "cmd.queue.status") {
    const queue = isRecord(payload.queue) ? payload.queue : null;
    const pending = typeof queue?.pending === "number" ? queue.pending : undefined;
    const running = typeof queue?.running === "number" ? queue.running : undefined;
    const failed = typeof queue?.failed === "number" ? queue.failed : undefined;
    return {
      resumen: "Estado de cola consultado." + (pending != null ? " Pendientes: " + pending + "." : "") + (running != null ? " En curso: " + running + "." : "") + (failed != null ? " Fallidos: " + failed + "." : ""),
      paso: failed && failed > 0
        ? "Revisa los fallos antes de seguir con más comandos."
        : "Si ya terminó, puedes limpiar completados con `pt_cmd_queue op=clear_finished`.",
      siguientes: uniqueLines([
        "pt_cmd_run — continuar con la validación normal una vez que la cola quede libre",
        "pt_cmd_queue op=clear_finished — limpiar jobs terminados",
        "pt_status op=summary — verificar si el entorno sigue sano",
      ]),
    };
  }

  if (action === "cmd.queue.clear_finished") {
    return {
      resumen: "Jobs terminados limpiados de la cola.",
      paso: "Si todavía hay problemas, revisa `pt_cmd_queue op=status` o la salida de `pt_cmd_run`.",
      siguientes: [
        "pt_cmd_queue op=status — revisar cola actual",
        "pt_status op=summary — confirmar estado general",
      ],
    };
  }

  if (action === "device.list") {
    const devices = asArray(payload.devices);
    const summary = summarizeDeviceKinds(devices);
    const kinds = summary.kinds;
    const switchCount = kinds.switch ?? 0;
    const routerCount = kinds.router ?? 0;
    const pcCount = kinds.pc ?? 0;
    const serverCount = kinds.server ?? 0;
    const l3Count = kinds["l3-switch"] ?? 0;

    const typeHints = uniqueLines([
      switchCount > 0 ? "Hay switches: valida VLAN, trunk y spanning-tree antes de tocar cableado." : undefined,
      routerCount > 0 || l3Count > 0 ? "Hay routers o multilayer switches: valida routing, interfaces y rutas aprendidas." : undefined,
      pcCount > 0 || serverCount > 0 ? "Hay hosts/servidores: valida IP, gateway y reachability desde un switch o router." : undefined,
    ]);

    const nextStep = summary.firstName
      ? "Inspecciona `pt_device op=get device=\"" + summary.firstName + "\"` o ejecuta `pt_cmd_run device=\"" + summary.firstName + "\" commands=\"show version\" profile=\"fast\"`."
      : "Agrega un dispositivo de red con `pt_device op=add` para empezar.";

    return {
      resumen: devices.length > 0
        ? "Inventario encontrado: " + summary.count + " dispositivo(s). " + Object.entries(kinds).map(([kind, count]) => kind + "=" + count).join(", ") + "."
        : "Inventario vacío.",
      paso: nextStep,
      siguientes: uniqueLines([
        ...typeHints,
        "pt_device op=get device=\"<nombre>\" — inspección profunda",
        "pt_link op=list — mapa de enlaces",
        "pt_cmd_run device=\"<nombre>\" commands=\"show version\" profile=\"fast\" — verificación rápida",
      ]),
      tips: devices.length === 0 ? ["Primero crea el esqueleto del lab: switch + router + host."] : undefined,
    };
  }

  if (action === "device.get") {
    const state = payload.state;
    const deviceKind = inferDeviceKind(state) ?? inferDeviceKind(payload.device) ?? null;
    const ports = asArray(isRecord(state) ? state.ports : undefined);
    const portCount = ports.length;
    const familyTips = commandSuggestionsForFamily("general", deviceKind);

    const kindLabel = deviceKind ?? "dispositivo";
    const configHint = deviceKind === "switch"
      ? "show vlan brief / show interfaces trunk / show spanning-tree summary"
      : deviceKind === "router"
        ? "show ip route / show ip interface brief / show running-config"
        : deviceKind === "pc"
          ? "ipconfig / ping / arp -a"
          : deviceKind === "server"
            ? "ipconfig / ping / servicios del host"
            : deviceKind === "wlc"
              ? "show ap summary / show wlan summary"
              : null;

    const primaryCommand = configHint ? configHint.split(" /")[0] : "show version";
    const deviceName = String(payload.device ?? "<nombre>");

    return {
      resumen: "Dispositivo " + kindLabel + " inspeccionado. " + portCount + " puerto(s) visibles.",
      paso: "Usa `pt_cmd_run device=\"" + deviceName + "\" commands=\"" + primaryCommand + "\" profile=\"fast\"` para empezar.",
      siguientes: uniqueLines([
        ...familyTips,
        "pt_device op=ports device=\"" + deviceName + "\" — puertos disponibles",
        "pt_link op=list device=\"" + deviceName + "\" — enlaces del dispositivo",
      ]),
    };
  }

  if (action === "device.ports") {
    const ports = asArray(payload.ports);
    const deviceName = String(payload.device ?? "<nombre>");
    const firstPort = ports.find((port) => isRecord(port) && typeof port.name === "string") as JsonRecord | undefined;
    return {
      resumen: deviceName + " tiene " + ports.length + " puerto(s) visibles.",
      paso: firstPort?.name
        ? "Si vas a cablear, usa `pt_link op=add a.device=\"" + deviceName + "\" a.port=\"" + firstPort.name + "\" ...`."
        : "Usa `pt_link op=suggest` para encontrar puertos compatibles.",
      siguientes: uniqueLines([
        "pt_link op=suggest sourceDevice=\"" + deviceName + "\" targetDevice=\"<destino>\" — puertos sugeridos",
        "pt_link op=add — conectar el dispositivo",
        "pt_cmd_run device=\"" + deviceName + "\" commands=\"show interfaces status\" profile=\"fast\" — validar interfaz",
      ]),
    };
  }

  if (action === "link.list") {
    const links = asArray(payload.links);
    return {
      resumen: links.length > 0 ? "Hay " + links.length + " enlace(s) en el laboratorio." : "No hay enlaces todavía.",
      paso: links.length > 0
        ? "Verifica el enlace más importante con `pt_link op=verify`."
        : "Conecta dos dispositivos con `pt_link op=add`.",
      siguientes: uniqueLines([
        "pt_link op=verify a.device=\"<origen>\" a.port=\"<puerto>\" b.device=\"<destino>\" b.port=\"<puerto>\" — verificar enlace",
        "pt_link op=doctor a.device=\"<origen>\" a.port=\"<puerto>\" b.device=\"<destino>\" b.port=\"<puerto>\" — diagnosticar",
        "pt_cmd_run device=\"<origen>\" commands=\"show ip interface brief\" profile=\"fast\" — comprobar estado L3",
      ]),
    };
  }

  if (action === "link.verify" || action === "link.doctor") {
    const connected = Boolean(payload.connected);
    const a = isRecord(payload.a) ? payload.a : null;
    const b = isRecord(payload.b) ? payload.b : null;
    const aDevice = String(a?.device ?? "<origen>");
    const bDevice = String(b?.device ?? "<destino>");

    return {
      resumen: connected
        ? "Conexión confirmada entre " + aDevice + " y " + bDevice + "."
        : "No hay conexión directa entre " + aDevice + " y " + bDevice + ".",
      paso: connected
        ? "Ahora valida el plano lógico con `pt_cmd_run device=\"" + aDevice + "\" commands=\"show ip interface brief\" profile=\"fast\"`."
        : "Si falta el cable, usa `pt_link op=add` y luego repite la verificación.",
      siguientes: uniqueLines([
        "pt_link op=list — revisar todos los enlaces",
        "pt_device op=ports device=\"" + aDevice + "\" — puertos del origen",
        "pt_device op=ports device=\"" + bDevice + "\" — puertos del destino",
      ]),
    };
  }

  if (action === "cmd.run") {
    const results = asArray(payload.results);
    const jobCount = typeof payload.jobCount === "number" ? payload.jobCount : results.length;
    const failedCount = typeof payload.failedCount === "number" ? payload.failedCount : 0;
    const warnings = asArray(payload.warnings);
    const firstResult = results.find((entry) => isRecord(entry) && isRecord(entry.result)) as JsonRecord | undefined;
    const firstJob = results.find((entry) => isRecord(entry) && typeof entry.device === "string") as JsonRecord | undefined;
    const firstDevice = String(firstJob?.device ?? "<dispositivo>");

    const allCommands = results.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      if (Array.isArray(entry.commands)) {
        return entry.commands.filter((command): command is string => typeof command === "string");
      }
      if (isRecord(entry.result) && typeof entry.result.command === "string") {
        return [entry.result.command];
      }
      return [];
    });

    const families = uniqueLines(allCommands.map((command) => inferCommandFamily(command)));
    const familyTips = uniqueLines(families.flatMap((family) => commandSuggestionsForFamily(family, inferDeviceKind(firstResult?.result ?? firstResult))));

    const actionHint = failedCount > 0
      ? "Hay " + failedCount + " fallo(s). Enfócate en el primer error y, si necesitas más contexto, repite con profile=\"debug\"."
      : "Todo salió bien en " + jobCount + " job(s). Usa el resultado para validar el siguiente paso del flujo.";

    const nextSteps = failedCount > 0
      ? [
          "pt_cmd_run device=\"" + firstDevice + "\" commands=\"show interfaces\" profile=\"debug\" — profundizar en el fallo",
          "pt_status op=summary — confirmar si el entorno sigue sano",
          "pt_device op=get device=\"" + firstDevice + "\" — revisar el estado del equipo",
        ]
      : [
          "pt_cmd_run device=\"" + firstDevice + "\" commands=\"show running-config\" profile=\"audit\" — capturar evidencia",
          "pt_link op=verify a.device=\"" + firstDevice + "\" a.port=\"<puerto>\" b.device=\"<destino>\" b.port=\"<puerto>\" — validar enlaces",
          "pt_status op=summary — revisar el contexto global",
        ];

    return {
      resumen: actionHint,
      paso: firstResult
        ? "Interpretación del primer comando: " + String(firstResult.command ?? firstResult.action ?? "resultado") + "."
        : "Usa la salida para decidir el siguiente comando en " + firstDevice + ".",
      siguientes: uniqueLines([
        ...nextSteps,
        ...familyTips,
      ]),
      tips: uniqueLines([
        warnings.length > 0 ? "Revisa primero warnings antes de perseguir el siguiente comando." : undefined,
        failedCount > 0 ? "Si el output parece ambiguo, usa profile=debug e includeRawOutput=true." : undefined,
      ]),
    };
  }

  return {};
}

function mergeGuidance(base: InstructivoOptions, extra: Partial<InstructivoOptions>): InstructivoOptions {
  return {
    ...base,
    resumen: base.resumen ?? extra.resumen,
    paso: base.paso ?? extra.paso,
    siguientes: uniqueLines([...(base.siguientes ?? []), ...(extra.siguientes ?? [])]),
    tips: uniqueLines([...(base.tips ?? []), ...(extra.tips ?? [])]),
  };
}

function formatearJSON(datos: Record<string, unknown>): string {
  return JSON.stringify(datos, null, 2);
}

function construirTexto(
  titulo: string,
  datos: Record<string, unknown>,
  opts: InstructivoOptions,
): string {
  const lineas: string[] = [];

  lineas.push(`## ${titulo}`);
  lineas.push("");

  if (opts.resumen) {
    lineas.push(opts.resumen);
    lineas.push("");
  }

  lineas.push("```json");
  lineas.push(formatearJSON(datos));
  lineas.push("```");
  lineas.push("");

  if (opts.paso) {
    lineas.push("### Siguiente paso");
    lineas.push(opts.paso);
    lineas.push("");
  }

  if (opts.siguientes && opts.siguientes.length > 0) {
    lineas.push("### Opciones");
    opts.siguientes.forEach((s, i) => {
      lineas.push(`${i + 1}. ${s}`);
    });
    lineas.push("");
  }

  if (opts.tips && opts.tips.length > 0) {
    lineas.push("> 💡 " + opts.tips.join("\n> 💡 "));
  }

  return lineas.join("\n");
}

export function instructivo<T extends Record<string, unknown>>(
  toolName: string,
  structuredContent: T,
  opts: InstructivoOptions = {},
): McpToolResponse<T & { ok: true; schemaVersion: "1.0"; timestamp: string; requestId: string; durationMs?: number }> {
  const guidance = mergeGuidance(
    mergeGuidance(opts, buildGuidanceFromAction(toolName, structuredContent)),
    buildSignalGuidance(structuredContent),
  );

  const payload = {
    ok: true as const,
    ...baseMeta(guidance.startTime),
    ...structuredContent,
  };

  const texto = construirTexto(toolName, payload, guidance);

  return {
    content: [{ type: "text", text: texto }],
    structuredContent: payload,
  };
}
