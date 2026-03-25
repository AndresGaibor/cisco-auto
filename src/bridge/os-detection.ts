import { exec } from 'child_process';

// detectOS devuelve 'macos' | 'windows' | 'linux'
export function detectOS(): 'macos' | 'windows' | 'linux' {
  const p = process.platform;
  if (p === 'darwin') return 'macos';
  if (p === 'win32') return 'windows';
  return 'linux';
}

export async function detectPacketTracer(): Promise<string | null> {
  const os = detectOS();

  if (os === 'macos') {
    // Buscar directorios de Packet Tracer en /Applications
    // La estructura típica es: /Applications/Cisco Packet Tracer 9.0.0/Cisco Packet Tracer 9.0.app
    try {
      const { readdirSync, existsSync } = await import('fs');
      const entries = readdirSync('/Applications');
      
      for (const entry of entries) {
        if (entry.toLowerCase().includes('cisco packet tracer') || entry.toLowerCase().includes('packet tracer')) {
          const baseDir = `/Applications/${entry}`;
          
          // Verificar si es un directorio (no un .app directo)
          if (!entry.endsWith('.app') && existsSync(baseDir)) {
            const subEntries = readdirSync(baseDir);
            for (const subEntry of subEntries) {
              if (subEntry.endsWith('.app') && subEntry.toLowerCase().includes('packet')) {
                return `${baseDir}/${subEntry}`;
              }
            }
          }
          // Si es un .app directo, retornarlo
          if (entry.endsWith('.app')) {
            return baseDir;
          }
        }
      }
    } catch {
      // Ignorar errores
    }
    
    // Fallback: rutas comunes
    const candidates = [
      '/Applications/Cisco Packet Tracer.app',
      '/Applications/Cisco Packet Tracer 8.app',
      '/Applications/Cisco Packet Tracer 7.app'
    ];
    
    for (const c of candidates) {
      try {
        const exists = await Bun.file(c).exists();
        if (exists) return c;
      } catch {
        // Ignorar
      }
    }
  } else if (os === 'windows') {
    const candidates = [
      'C:/Program Files/Cisco Packet Tracer/',
      'C:/Program Files (x86)/Cisco Packet Tracer/'
    ];
    
    for (const c of candidates) {
      try {
        const exists = await Bun.file(c).exists();
        if (exists) return c;
      } catch {
        // Ignorar
      }
    }
  } else {
    const candidates = [
      '/opt/pt/',
      '/usr/share/packettracer/',
      '/usr/local/packettracer/'
    ];
    
    for (const c of candidates) {
      try {
        const exists = await Bun.file(c).exists();
        if (exists) return c;
      } catch {
        // Ignorar
      }
    }
  }

  return null;
}

export async function isPacketTracerRunning(): Promise<boolean> {
  const os = detectOS();
  let cmd = '';

  if (os === 'macos') {
    cmd = `ps aux | grep -i "packet tracer" | grep -v grep`;
  } else if (os === 'windows') {
    cmd = `tasklist | findstr "PacketTracer"`;
  } else {
    cmd = `ps aux | grep -i packettracer | grep -v grep`;
  }

  return new Promise((resolve) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        // En Windows, findstr devuelve código 1 si no encuentra coincidencias; tratamos eso como 'no corriendo'
        resolve(false);
        return;
      }
      const out = String(stdout || '').trim();
      resolve(out.length > 0);
    });
  });
}
