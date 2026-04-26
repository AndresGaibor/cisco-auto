// PTLink interface
import type { PTPort } from "./device-api.js";

export interface PTLink {
  getClassName?(): string;
  getObjectUuid?(): string;
  /** Cable type integer (e.g. 8100 = ethernet-straight) */
  getConnectionType?(): number;
  /** First port of the link (RouterPort or SwitchPort) */
  getPort1?(): PTPort | null;
  /** Second port of the link */
  getPort2?(): PTPort | null;
}