import { Command } from 'commander';
import { exec } from 'child_process';
import { detectOS } from '../../../../../src/bridge/os-detection.ts';
import { detectPacketTracer, isPacketTracerRunning, launchPacketTracer, waitForPacketTracerReady } from '../../../../../src/bridge/packet-tracer.ts';

const BRIDGE_PORT = process.env.BRIDGE_PORT || '54321';
const BRIDGE_URL = `http://127.0.0.1:${BRIDGE_PORT}`;
const HEALTH_URL = `${BRIDGE_URL}/health`;

const MIN_PT_VERSION = '8.0';

function mostrarError(titulo: string, detalle: string, soluciones: string[]): void {
  console.error(`\n❌ Error: ${titulo}`);
  console.error(`   ${detalle}`);
  console.error('');
  console.error('💡 Solución:');
  soluciones.forEach((sol, i) => {
    console.error(`   ${i + 1}. ${sol}`);
  });
  console.error('');
}

function verificarVersionPT(ptPath: string): boolean {
  const match = ptPath.match(/(\d+\.\d+(?:\.\d+)?)/);
  if (!match || !match[1]) {
    return true;
  }
  
  const versionStr = match[1];
  const parts = versionStr.split('.').map(Number);
  const major = parts[0] ?? 0;
  
  return major >= 8;
}

function mostrarProgreso(mensaje: string, segundos: number): NodeJS.Timeout {
  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed++;
    const dots = '.'.repeat(elapsed % 4);
    const remaining = segundos - elapsed;
    if (remaining > 0) {
      console.write(`\r   ${mensaje}${dots} (${remaining}s restante)`);
    }
  }, 1000);
  return interval;
}

export function createInstallCommand(): Command {
  return new Command('install')
    .description('Instala el bridge en Packet Tracer (inyecta el script de bootstrap)')
    .action(installBridge);
}

async function installBridge(): Promise<void> {
  console.log('🔧 Instalando Bridge en Packet Tracer...\n');

  const os = detectOS();
  console.log(`   Sistema operativo: ${os === 'macos' ? 'macOS' : os === 'windows' ? 'Windows' : 'Linux'}`);

  // Verificar que el bridge server está corriendo antes de comenzar
  console.log('   Verificando Bridge Server...');
  const serverRunning = await verifyBridgeConnection(3);
  if (!serverRunning) {
    mostrarError(
      'Bridge Server no está ejecutándose',
      'El servidor bridge no responde en el puerto configurado.',
      [
        'Ejecuta: cisco-auto bridge start',
        `O usa un puerto diferente: BRIDGE_PORT=54322 cisco-auto bridge start`
      ]
    );
    process.exit(1);
  }
  console.log('   ✅ Bridge Server verificado\n');

  const ptPath = await detectPacketTracer();
  if (!ptPath) {
    mostrarError(
      'Packet Tracer no está instalado',
      'No se encontró Cisco Packet Tracer en el sistema.',
      [
        'Descarga Packet Tracer desde: https://www.netacad.com/courses/packet-tracer',
        'Instala Packet Tracer antes de continuar'
      ]
    );
    process.exit(1);
  }

  console.log(`   Packet Tracer encontrado: ${ptPath}\n`);

  // Verificar versión de PT
  if (!verificarVersionPT(ptPath)) {
    mostrarError(
      'Versión de Packet Tracer no soportada',
      `Se detectó una versión anterior a ${MIN_PT_VERSION}. El bridge requiere Packet Tracer 8.0 o superior.`,
      [
        'Actualiza Packet Tracer a la versión 8.0 o superior',
        'Descarga desde: https://www.netacad.com/courses/packet-tracer'
      ]
    );
    process.exit(1);
  }

  // Verificar estado de PT
  console.log('   Verificando estado de Packet Tracer...');
  const running = await isPacketTracerRunning();
  
  if (!running) {
    console.log('📡 Packet Tracer no está ejecutándose. Iniciando...');
    
    const launched = await launchPacketTracer(ptPath);
    if (!launched) {
      mostrarError(
        'No se pudo iniciar Packet Tracer',
        'El proceso de lanzamiento falló. Verifica los permisos.',
        [
          'Abre Packet Tracer manualmente desde: /Applications',
          'Verifica que el archivo .app no esté dañado',
          'Reinstala Packet Tracer si el problema persiste'
        ]
      );
      process.exit(1);
    }

    console.log('   Esperando que Packet Tracer esté listo...');
    const progressTimer = mostrarProgreso('Iniciando Packet Tracer', 15);
    
    const ready = await waitForPacketTracerReady(15000);
    clearInterval(progressTimer);
    console.write('\r' + ' '.repeat(60) + '\r'); // Limpiar línea
    
    if (!ready) {
      mostrarError(
        'Packet Tracer tardó demasiado en iniciar',
        'El programa tardó más de 15 segundos en responder.',
        [
          'Abre Packet Tracer manualmente',
          'Cierra otras aplicaciones que consuman muchos recursos',
          'Ejecuta nuevamente: cisco-auto bridge install'
        ]
      );
      process.exit(1);
    }

    console.log('   ✅ Packet Tracer iniciado correctamente.\n');
  } else {
    console.log('   ✅ Packet Tracer ya está ejecutándose.\n');
  }

  if (os === 'macos') {
    await installMacOS(ptPath);
  } else if (os === 'windows') {
    mostrarError(
      'Instalación en Windows no disponible',
      'El script de instalación automática solo está disponible para macOS.',
      [
        'Usa macOS para la instalación automática',
        'O ejecuta los pasos manualmente en Windows'
      ]
    );
    process.exit(1);
  } else {
    mostrarError(
      'Instalación en Linux no disponible',
      'El script de instalación automática solo está disponible para macOS.',
      [
        'Usa macOS para la instalación automática',
        'O ejecuta los pasos manualmente en Linux'
      ]
    );
    process.exit(1);
  }
}

async function installMacOS(ptPath: string): Promise<void> {
  console.log('🍎 Ejecutando script de instalación en macOS...\n');

  const scriptPath = './scripts/install-bridge-macos.scpt';

  if (!Bun.file(scriptPath).exists) {
    mostrarError(
      'Script de instalación no encontrado',
      `No se encontró el archivo: ${scriptPath}`,
      [
        'Verifica que el proyecto esté completo',
        'Reclona el repositorio si es necesario'
      ]
    );
    process.exit(1);
  }

  console.log('   Ejecutando script de automatización...\n');
  
  const result = await ejecutarAppleScript(scriptPath);
  
  if (!result.success) {
    if (result.esPermiso) {
      mostrarError(
        'Permisos de Accesibilidad Denegados',
        'AppleScript necesita permisos de accesibilidad para controlar Packet Tracer.',
        [
          'Ve a: System Preferences > Security & Privacy > Privacy > Accessibility',
          'Haz clic en el candado para desbloquear',
          'Agrega Terminal (o tu app de terminal) a la lista',
          'Vuelve a ejecutar: cisco-auto bridge install'
        ]
      );
    } else if (result.tipoTimeout) {
      mostrarError(
        'Tiempo de espera agotado',
        'Packet Tracer tardó demasiado en responder.',
        [
          'Verifica que Packet Tracer esté funcionando correctamente',
          'Abre Packet Tracer manualmente y cierra otras apps',
          'Ejecuta nuevamente: cisco-auto bridge install'
        ]
      );
    } else if (result.codeEditorError) {
      mostrarError(
        'No se pudo abrir Code Editor',
        'El menú Extensions > Builder Code Editor no respondió.',
        [
          'Verifica que Extensions > Builder Code Editor exista en tu versión de PT',
          'Ejecuta nuevamente: cisco-auto bridge install'
        ]
      );
    } else {
      mostrarError(
        'Error en script de AppleScript',
        result.mensaje,
        [
          'Verifica que Packet Tracer esté funcionando',
          'Ejecuta nuevamente: cisco-auto bridge install'
        ]
      );
    }
    process.exit(1);
  }

  console.log('🔍 Verificando conexión con Bridge Server...\n');

  const connected = await verifyBridgeConnection();

  if (connected) {
    console.log('✅ Bridge instalado exitosamente');
    console.log(`   Packet Tracer: ${ptPath}`);
    console.log(`   Bridge URL: ${BRIDGE_URL}`);
    console.log('   Estado: Conectado\n');
  } else {
    mostrarError(
      'Bridge Server no responde',
      `El servidor bridge no responde en ${BRIDGE_URL}`,
      [
        'Ejecuta: cisco-auto bridge start',
        'Verifica que no haya otro proceso usando el puerto',
        `Intenta con puerto diferente: BRIDGE_PORT=54322 cisco-auto bridge start`
      ]
    );
    process.exit(1);
  }
}

interface AppleScriptResult {
  success: boolean;
  mensaje: string;
  esPermiso: boolean;
  tipoTimeout: boolean;
  codeEditorError: boolean;
}

function ejecutarAppleScript(scriptPath: string): Promise<AppleScriptResult> {
  return new Promise((resolve) => {
    exec(`osascript "${scriptPath}"`, (error, stdout, stderr) => {
      const errorMsg = stderr || error?.message || '';
      
      // Verificar permisos de accesibilidad
      if (errorMsg.includes('not allowed') || 
          errorMsg.includes('permission') || 
          errorMsg.includes('(-128)')) {
        resolve({
          success: false,
          mensaje: errorMsg,
          esPermiso: true,
          tipoTimeout: false,
          codeEditorError: false
        });
        return;
      }
      
      // Verificar timeout en script
      if (errorMsg.includes('timeout') || errorMsg.includes('lento')) {
        resolve({
          success: false,
          mensaje: errorMsg,
          esPermiso: false,
          tipoTimeout: true,
          codeEditorError: false
        });
        return;
      }
      
      // Verificar error de Code Editor
      if (errorMsg.includes('Code Editor') || errorMsg.includes('menu')) {
        resolve({
          success: false,
          mensaje: errorMsg,
          esPermiso: false,
          tipoTimeout: false,
          codeEditorError: true
        });
        return;
      }
      
      // Error genérico
      if (error) {
        resolve({
          success: false,
          mensaje: errorMsg,
          esPermiso: false,
          tipoTimeout: false,
          codeEditorError: false
        });
        return;
      }
      
      // Éxito
      if (stdout) {
        console.log(stdout);
      }
      resolve({
        success: true,
        mensaje: '',
        esPermiso: false,
        tipoTimeout: false,
        codeEditorError: false
      });
    });
  });
}

async function verifyBridgeConnection(maxRetries = 10): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(HEALTH_URL);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server no responde aún
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return false;
}
