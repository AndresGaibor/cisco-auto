// Generador de plantillas .pts para Packet Tracer
// El archivo producido incluye la topología serializada y el bootstrap
// que inyecta el polling HTTP en la WebView de PTBuilder.

import type { TopologyPlan } from '../core/types/tool.ts';

// Valores configurables para el bridge (no hardcodear en múltiples lugares)
const BRIDGE_HOST = process.env.PT_BRIDGE_HOST || '127.0.0.1';
const BRIDGE_PORT = process.env.PT_BRIDGE_PORT || '54321';

/**
 * Genera el snippet de bootstrap que se inyectará en la WebView de Packet Tracer.
 * Usa setInterval para hacer polling a /next del bridge y ejecutar comandos recibidos.
 */
function makeBootstrapSnippet(host: string, port: string): string {
  // Usamos comillas dobles internas y escapamos nuevas líneas para que la cadena
  // pueda pegarse tal cual en el Builder Code Editor.
  const url = `http://${host}:${port}/next`;

  return `/* PT-MCP Bridge */ window.webview.evaluateJavaScriptAsync("setInterval(function(){var x=new XMLHttpRequest();x.open('GET','${url}',true);x.onload=function(){if(x.status===200&&x.responseText){$se('runCode',x.responseText)}};x.onerror=function(){};x.send()},500)");`;
}

/**
 * Serializa la topología de forma legible y segura para inyectarla en el .pts
 */
function serializeTopology(topology: TopologyPlan): string {
  // JSON con identación de 2 espacios para facilitar debugging dentro del .pts
  return JSON.stringify(topology, null, 2);
}

/**
 * Exportada: genera el contenido del archivo .pts como string.
 * - Inserta la topología serializada en la variable TOPLOGY
 * - Añade un pequeño runner que convierte la topología en comandos PTBuilder
 * - Inyecta el bootstrap HTTP polling para conectar con el bridge
 */
export function generatePtsTemplate(topology: TopologyPlan): string {
  const topologyJson = serializeTopology(topology);
  const bootstrap = makeBootstrapSnippet(BRIDGE_HOST, BRIDGE_PORT);

  const lines: string[] = [];
  lines.push('// Auto-generated .pts template');
  lines.push('// Topology embedded as TOPLOGY variable');
  lines.push('');
  lines.push('// --- Topology (JSON) ---');
  lines.push(`const TOPLOGY = ${topologyJson};`);
  lines.push('');
  lines.push('// --- Simple PTBuilder runner ---');
  lines.push('// Este runner crea dispositivos y enlaces básicos según TOPLOGY');
  lines.push('function runTopology(t){');
  lines.push('  try {');
  lines.push("    // Añadir dispositivos");
  lines.push('    if (t.devices && t.devices.length) {');
  lines.push('      for (var i=0;i<t.devices.length;i++){');
  lines.push('        var d = t.devices[i];');
  lines.push("        // pt.addDevice espera: id, ptType, x, y");
  lines.push('        if (d.model && d.model.ptType) {');
  lines.push("          pt.addDevice(d.id || d.name, d.model.ptType, (d.position&&d.position.x)||100, (d.position&&d.position.y)||100);" );
  lines.push('        }');
  lines.push('      }');
  lines.push('    }');
  lines.push('');
  lines.push("    // Añadir enlaces");
  lines.push('    if (t.links && t.links.length) {');
  lines.push('      for (var j=0;j<t.links.length;j++){');
  lines.push('        var l = t.links[j];');
  lines.push("        pt.addLink(l.from.deviceId, l.from.port, l.to.deviceId, l.to.port, l.cableType||'auto');");
  lines.push('      }');
  lines.push('    }');
  lines.push('  } catch(e){');
  lines.push('    // Manejo básico de errores dentro del environment de Packet Tracer');
  lines.push('    console.log("Error al ejecutar runTopology:", e);');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('// Ejecutar inmediatamente al cargar (no bloqueante)');
  lines.push('try{ runTopology(TOPLOGY); }catch(e){}');
  lines.push('');
  lines.push('// --- Bootstrap HTTP polling (WebView) ---');
  lines.push(bootstrap);
  lines.push('');
  lines.push('// Fin del template');

  return lines.join('\n');
}

export default generatePtsTemplate;
