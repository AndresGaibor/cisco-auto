#!/usr/bin/env bun
/**
 * Instalación manual del bridge - SIN permisos de accesibilidad
 * Solo verifica y muestra instrucciones
 */

const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT || '54321');
const BRIDGE_URL = `http://127.0.0.1:${BRIDGE_PORT}`;

interface PTStatus {
  installed: boolean;
  path: string | null;
  running: boolean;
  version: string | null;
}

// Helper to run pt CLI (pt-control-v2) intelligently
async function runPtCommand(args: string[]): Promise<{ success: boolean; stdout?: string; stderr?: string }> {
  try {
    const { promisify } = await import('util');
    const { exec } = await import('child_process');
    const execAsync = promisify(exec);
    const which = await execAsync('which pt').then(r => r.stdout.trim()).catch(() => '');
    if (which) {
      const { stdout, stderr } = await execAsync(`pt ${args.map(a => String(a)).join(' ')}`);
      return { success: true, stdout, stderr };
    }
    const { stdout, stderr } = await execAsync(`bun run packages/pt-control-v2/dist/cli/index.js ${args.map(a => String(a)).join(' ')}`);
    return { success: true, stdout, stderr };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, stderr: msg };
  }
}

async function detectPacketTracer(): Promise<PTStatus> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const platform = process.platform;
  let installed = false;
  let path: string | null = null;
  let version: string | null = null;
  
  try {
    if (platform === 'darwin') {
      const { stdout } = await execAsync('ls /Applications | grep -i "packet tracer" || ls /Applications | grep -i "cisco packet"');
      const lines = stdout.trim().split('\n').filter(line => line.length > 0);
      
      if (lines.length > 0) {
        const latestDir = lines.sort().pop() || lines[0];
        const baseDir = `/Applications/${latestDir}`;
        
        try {
          const { stdout: appList } = await execAsync(`ls "${baseDir}" | grep -i ".app$" | grep -i "packet" | head -1`);
          const appName = appList.trim();
          
          if (appName) {
            path = `${baseDir}/${appName}`;
          } else {
            path = baseDir;
          }
        } catch {
          path = baseDir;
        }
        
        installed = true;
        const versionMatch = latestDir.match(/(\d+\.\d+(?:\.\d+)?)/);
        version = versionMatch ? versionMatch[1] : null;
      }
    }
  } catch {
    // No encontrado
  }
  
  // Verificar si está corriendo
  let running = false;
  try {
    const { stdout } = await execAsync('ps aux | grep -i "PacketTracer" | grep -v grep');
    running = stdout.length > 0;
  } catch {
    running = false;
  }
  
  return { installed, path, running, version };
}

async function main() {
  console.log('\n🔧 Instalación Manual del Bridge\n');
  console.log('══════════════════════════════════════════════════════\n');
  
  // Verificar bridge server
  console.log('1. Verificando Bridge Server...');
  try {
    const response = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      console.log('   ✅ Bridge server ejecutándose en ' + BRIDGE_URL + '\n');
    } else {
      console.log('   ❌ Bridge server no responde correctamente\n');
      console.log('   Ejecuta primero: bun run .iflow/skills/cisco-networking-assistant/scripts/bridge-automation.ts start\n');
      process.exit(1);
    }
  } catch {
    console.log('   ❌ Bridge server no está ejecutándose\n');
    console.log('   Ejecuta primero: bun run .iflow/skills/cisco-networking-assistant/scripts/bridge-automation.ts start\n');
    process.exit(1);
  }
  
  // Verificar Packet Tracer
  console.log('2. Verificando Packet Tracer...');
  const ptStatus = await detectPacketTracer();
  
  if (!ptStatus.installed) {
    console.log('   ❌ Packet Tracer no está instalado\n');
    console.log('   Descárgalo desde: https://www.netacad.com/courses/packet-tracer\n');
    process.exit(1);
  }
  
  console.log(`   ✅ Packet Tracer ${ptStatus.version || ''} instalado`);
  console.log(`   📁 Ruta: ${ptStatus.path}\n`);
  
  if (!ptStatus.running) {
    console.log('   ⚠️  Packet Tracer NO está ejecutándose\n');
    console.log('   Ábrelo manualmente desde:');
    console.log(`   ${ptStatus.path}\n`);
    console.log('   Vuelve a ejecutar este comando cuando PT esté abierto.\n');
    process.exit(1);
  }
  
  console.log('   ✅ Packet Tracer está ejecutándose\n');
  
  // Obtener bootstrap script
  console.log('3. Descargando script bootstrap...');
  let bootstrapScript: string;
  
  try {
    const response = await fetch(`${BRIDGE_URL}/bridge-client.js`);
    if (!response.ok) {
      console.log('   ❌ No se pudo obtener el script\n');
      process.exit(1);
    }
    bootstrapScript = await response.text();
    console.log('   ✅ Script descargado\n');
  } catch (error) {
    console.log('   ❌ Error al descargar script:', error, '\n');
    process.exit(1);
  }
  
  // Instrucciones
  console.log('══════════════════════════════════════════════════════\n');
  console.log('📋 INSTRUCCIONES DE INSTALACIÓN\n');
  console.log('══════════════════════════════════════════════════════\n');
  console.log('Sigue estos pasos en Packet Tracer:\n');
  console.log('   1. Ve a: Extensions > Builder Code Editor');
  console.log('   2. Si hay código, bórralo (Cmd+A, luego Delete)');
  console.log('   3. Copia el script de abajo');
  console.log('   4. Pégalo en el Code Editor');
  console.log('   5. Presiona Cmd+Enter (o Run) para ejecutar\n');
  console.log('──────────────────────────────────────────────────────\n');
  console.log('SCRIPT (copia todo entre las líneas):\n');
  console.log('══════════════════════════════════════════════════════\n');
  console.log(bootstrapScript);
  console.log('══════════════════════════════════════════════════════\n');
  console.log('──────────────────────────────────────────────────────\n');
  console.log('\n✅ Después de ejecutar el script en PT:');
  console.log('   El bridge quedará conectado y podrás enviar comandos.\n');
  console.log('Para verificar conexión:');
  console.log('   bun run .iflow/skills/cisco-networking-assistant/scripts/bridge-automation.ts status\n');

    // If --auto provided, try to deploy runtime via pt CLI
    const args = process.argv.slice(2);
    if (args.includes('--auto')) {
      console.log('\nIntentando despliegue automático vía pt CLI...');
      try {
        const { runPtCommand } = await import('../../../scripts/pt-cli.ts');
        const res = await runPtCommand(['runtime', 'build', '--no-deploy']);
        if (res.success) {
          console.log('pt runtime build ejecutado con éxito');
        } else {
          console.log('pt CLI no disponible o fallo:', res.stderr || 'unknown');
        }
      } catch (e) {
        console.log('Error al ejecutar pt CLI:', e);
      }
    }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});