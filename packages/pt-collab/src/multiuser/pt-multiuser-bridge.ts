import type {
  MultiuserServerConfig,
  MultiuserStatus,
  MultiuserConnectOptions,
  MultiuserIPCResponse,
} from "./multiuser-types.js";

interface BridgeEnvelope {
  value?: unknown;
  ok: boolean;
  status: string;
}
type SendFn = (type: string, payload: unknown, timeoutMs?: number) => Promise<BridgeEnvelope>;

export interface PTMultiuserBridge {
  status(): Promise<MultiuserStatus>;
  listen(config: MultiuserServerConfig): Promise<{ ok: boolean; port: number }>;
  stop(): Promise<void>;
  connect(options: MultiuserConnectOptions): Promise<{ ok: boolean }>;
  disconnect(): Promise<void>;
}

export async function queryMultiuserIPC(
  sendCommandAndWait: SendFn,
): Promise<MultiuserIPCResponse | null> {
  const exploit = [
    "(function() {",
    "  try {",
    "    var mum = ipc.multiUserManager();",
    "    return {",
    "      enabled: mum.isMultiuserEnabled(),",
    "      port: mum.getListenPort(),",
    "      clients: mum.getClientCount(),",
    "      name: mum.getLocalName()",
    "    };",
    "  } catch(e) { return null; }",
    "})()",
  ].join("\n");
  try {
    const res = await sendCommandAndWait("__evaluate", { code: exploit }, 10_000);
    return (res?.value ?? null) as MultiuserIPCResponse | null;
  } catch {
    return null;
  }
}

export async function multiuserListenIPC(
  sendCommandAndWait: SendFn,
  config: MultiuserServerConfig,
): Promise<{ ok: boolean; port: number }> {
  const port = JSON.stringify(config.port);
  const pass = JSON.stringify(config.password);
  const accept = JSON.stringify(config.acceptMode);
  const exploit = [
    "(function() {",
    "  try {",
    "    var mum = ipc.multiUserManager();",
    "    mum.setListenPort(" + port + ");",
    "    mum.setPassword(" + pass + ");",
    "    mum.setAcceptMode(" + accept + ");",
    "    mum.startListening();",
    "    return { ok: true, port: " + port + " };",
    "  } catch(e) { return { ok: false, error: String(e) }; }",
    "})()",
  ].join("\n");
  const res = await sendCommandAndWait("__evaluate", { code: exploit }, 10_000);
  return (res?.value ?? { ok: false, port: config.port }) as { ok: boolean; port: number };
}

export async function multiuserStopIPC(
  sendCommandAndWait: SendFn,
): Promise<void> {
  const exploit = [
    "(function() {",
    "  try {",
    "    var mum = ipc.multiUserManager();",
    "    mum.stopListening();",
    "  } catch(e) {}",
    "})()",
  ].join("\n");
  await sendCommandAndWait("__evaluate", { code: exploit }, 5_000);
}

export async function multiuserConnectIPC(
  sendCommandAndWait: SendFn,
  options: MultiuserConnectOptions,
): Promise<{ ok: boolean }> {
  const host = JSON.stringify(options.host);
  const port = JSON.stringify(options.port);
  const pass = JSON.stringify(options.password);
  const exploit = [
    "(function() {",
    "  try {",
    "    var mum = ipc.multiUserManager();",
    "    mum.connectToRemote(" + host + ", " + port + ", " + pass + ");",
    "    return { ok: true };",
    "  } catch(e) { return { ok: false, error: String(e) }; }",
    "})()",
  ].join("\n");
  const res = await sendCommandAndWait("__evaluate", { code: exploit }, 10_000);
  return (res?.value ?? { ok: false }) as { ok: boolean };
}
