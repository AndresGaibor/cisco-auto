# Runtime Primitives Contract

## Propósito

Este documento define el contrato oficial de primitives que `pt-runtime` puede ejecutar. Toda primitive debe seguir este contrato.

## Primitive Families

| Familia | Descripción | Localización |
|---------|------------|--------------|
| `device.*` | Operaciones atómicas de dispositivo | `handlers/device-crud.ts`, `handlers/device-discovery.ts` |
| `link.*` | Operaciones atómicas de enlace | `handlers/link.ts` |
| `module.*` | Operaciones de módulo | `handlers/module/handlers.ts` |
| `host.*` | Configuración de host (PC/Server) | `handlers/host.ts` |
| `terminal.*` | Ejecución de comandos IOS | `handlers/ios-execution.ts`, `pt/terminal/*.ts` |
| `omni.*` | Capacidades de bajo nivel | `handlers/omniscience-*.ts` |
| `canvas.*` | Operaciones de canvas | `handlers/canvas.ts` |
| `inspect.*` | Inspección de dispositivos | `handlers/inspect.ts` |
| `vlan.*` | Operaciones VLAN básicas | `handlers/vlan.ts` |
| `dhcp.*` | Operaciones DHCP básicas | `handlers/dhcp.ts` |

---

## Primitive List

### Device Primitives

```typescript
// device.add - Añadir dispositivo
interface AddDevicePayload {
  type: "addDevice";
  model: string;
  name?: string;
  x?: number;
  y?: number;
  deviceType?: number;
}

// device.remove - Eliminar dispositivo
interface RemoveDevicePayload {
  type: "removeDevice";
  name: string;
}

// device.rename - Renombrar dispositivo
interface RenameDevicePayload {
  type: "renameDevice";
  oldName: string;
  newName: string;
}

// device.move - Mover dispositivo
interface MoveDevicePayload {
  type: "moveDevice";
  name: string;
  x: number;
  y: number;
}

// device.list - Listar dispositivos
interface ListDevicesPayload {
  type: "listDevices";
}
```

### Link Primitives

```typescript
// link.add - Añadir enlace
interface AddLinkPayload {
  type: "addLink";
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType?: number;
}

// link.remove - Eliminar enlace
interface RemoveLinkPayload {
  type: "removeLink";
  device: string;
  port: string;
}
```

### Module Primitives

```typescript
// module.add - Añadir módulo
interface AddModulePayload {
  type: "addModule";
  device: string;
  slot: string;
  module: string;
}

// module.remove - Eliminar módulo
interface RemoveModulePayload {
  type: "removeModule";
  device: string;
  slot: string;
}
```

### Host Primitives

```typescript
// host.config - Configurar host (PC/Server)
interface ConfigHostPayload {
  type: "configHost";
  device: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

// host.inspect - Inspeccionar host
interface InspectHostPayload {
  type: "inspectHost";
  device: string;
}
```

### Terminal Primitives

```typescript
// terminal.exec - Ejecutar comando IOS
interface ExecIosPayload {
  type: "execIos";
  device: string;
  command: string;
  parse?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

// terminal.config - Configurar IOS con múltiples comandos
interface ConfigIosPayload {
  type: "configIos";
  device: string;
  commands: string[];
  save?: boolean;
  stopOnError?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}

// terminal.poll - Consultar estado de job diferido
interface PollDeferredPayload {
  type: "__pollDeferred";
  ticket: string;
}

// terminal.execPc - Ejecutar comando en PC
interface ExecPcPayload {
  type: "execPc";
  device: string;
  command: string;
  timeoutMs?: number;
}
```

### Canvas Primitives

```typescript
// canvas.listRects - Listar rectángulos de canvas
interface ListCanvasRectsPayload {
  type: "listCanvasRects";
}

// canvas.getRect - Obtener datos de rectángulo
interface GetRectPayload {
  type: "getRect";
  rectId: string;
}

// canvas.devicesInRect - Obtener dispositivos en rectángulo
interface DevicesInRectPayload {
  type: "devicesInRect";
  rectId: string;
  includeClusters?: boolean;
}
```

### Inspect Primitives

```typescript
// inspect - Inspeccionar dispositivo
interface InspectPayload {
  type: "inspect";
  device: string;
  includeXml?: boolean;
}

// deepInspect - Inspeccionar profundo
interface DeepInspectPayload {
  type: "deepInspect";
  path: string;
  method?: string;
  args?: unknown[];
}
```

### VLAN Primitives (básico)

```typescript
// vlan.ensure - Asegurar VLANs existen
interface EnsureVlansPayload {
  type: "ensureVlans";
  device: string;
  vlans: Array<{ id: number; name?: string }>;
}

// vlan.configInterfaces - Configurar interfaces VLAN
interface ConfigVlanInterfacesPayload {
  type: "configVlanInterfaces";
  device: string;
  interfaces: Array<{
    interface: string;
    vlanId: number;
    mode?: "access" | "trunk";
    ip?: string;
    mask?: string;
  }>;
}
```

### DHCP Primitives (básico)

```typescript
// dhcp.configureServer - Configurar servidor DHCP
interface ConfigureDhcpServerPayload {
  type: "configureDhcpServer";
  device: string;
  poolName: string;
  network: string;
  subnetMask: string;
  defaultRouter?: string;
  dnsServers?: string[];
  excludedAddresses?: string[];
  leaseTime?: number;
  domainName?: string;
}

// dhcp.configurePool - Configurar pool DHCP
interface ConfigureDhcpPoolPayload {
  type: "configureDhcpPool";
  device: string;
  poolName: string;
  network: string;
  mask: string;
  defaultRouter: string;
  dnsServer?: string;
  save?: boolean;
}

// dhcp.inspect - Inspeccionar servidor DHCP
interface InspectDhcpServerPayload {
  type: "inspectDhcpServer";
  device: string;
}
```

---

## Shape del Resultado

Toda primitive debe devolver:

```typescript
interface PrimitiveResult {
  // Estado de la operación
  ok: boolean;

  // Datos devueltos (si aplica)
  value?: unknown;

  // Error (si ok === false)
  error?: string;

  // Código de error
  code?: string;

  // Advertencias
  warnings?: string[];

  // Evidencia de la operación
  evidence?: Record<string, unknown>;

  // Nivel de confianza (0-1)
  confidence?: number;

  // Para operaciones deferred
  deferred?: boolean;
  ticket?: string;
  done?: boolean;
  state?: string;

  // Datos extra
  [key: string]: unknown;
}
```

### Campos Obligatorios

| Campo | Tipo | Descripción | Obligatorio |
|-------|------|-------------|------------|
| `ok` | boolean | Estado de éxito | **Sí** |
| `value` | unknown | Datos de retorno | No |
| `error` | string | Mensaje de error | Si `ok === false` |
| `code` | string | Código de error | Recomendado |
| `evidence` | Record | Evidencia de operación | **Sí** para terminal |
| `confidence` | number | Nivel de confianza | Recomendado |

---

## No-Primitives / Forbidden in Runtime

Estas operaciones **no** pueden vivir en runtime y deben implementarse en control:

### Prohibidas en Runtime

| Operación | Descripción | Vive en |
|-----------|-------------|--------|
| `configureVlans` | Configurar VLANs completas (secuencia) | control workflows |
| `configureTrunk` | Configurar trunk completo | control workflows |
| `configureDhcpPools` | Configurar múltiples pools DHCP | control workflows |
| `setupRouterOnAStick` | Configurar router-on-a-stick | control workflows |
| `verifyOspf` | Verificar OSPF configurado | control verification |
| `verifyVlan` | Verificar VLAN existe | control verification |
| `ensureSwitchHardening` | Asegurar hardening de switch | control workflows |
| `verifyAcl` | Verificar ACL configurada | control verification |
| `buildConfigPlan` | Construir plan de configuración | control planners |
| `calculateTopology` | Calcular topología | control diagnosis |

### Criterio para Primitive vs Workflow

**Es primitive si**:
1. Es una operación atómica (un solo cambio)
2. No requiere tomar decisiones
3. No requiere verificar resultado
4. Es idempotente o su resultado es claro

**Es workflow si**:
1. Requiere múltiples operaciones
2. Requiere tomar decisiones basadas en estado
3. Requiere verificar resultado
4. Puede tener múltiples paths de ejecución

---

## Contrato de Extensión

Para añadir nuevas primitives:

```typescript
// 1. Definir payload
interface MyPrimitivePayload {
  type: "myPrimitive";
  // campos...
}

// 2. Implementar handler
function handleMyPrimitive(payload: MyPrimitivePayload, api: PtRuntimeApi): PrimitiveResult {
  // Implementación atómica
  return { ok: true, value: {...}, evidence: {...} };
}

// 3. Registrar en dispatcher
dispatcher.register("myPrimitive", handleMyPrimitive);
```

---

## Histórico

| Fecha | Versión | Cambios |
|------|--------|---------|
| 2026-04-19 | 1.0 | Initial primitives contract |