import { Command } from 'commander';

export function createStartCommand(): Command {
  return new Command('start')
    .description('Inicia el bridge server en segundo plano')
    .action(async () => {
      console.log('🚀 Iniciando Bridge Server...');

      const { spawn } = await import('child_process');

      try {
        const response = await fetch('http://127.0.0.1:54321/health');
        if (response.ok) {
          console.log('ℹ️  El bridge server ya está ejecutándose en puerto 54321');
          console.log('   Usa "cisco-auto bridge status" para verificar');
          return;
        }
      } catch {
        // Server no está corriendo, continuar con el inicio
      }

      const child = spawn('bun', ['run', 'src/bridge/server.ts'], {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();

      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log('✅ Bridge server iniciado en http://127.0.0.1:54321');
      console.log('   Usa "cisco-auto bridge status" para verificar');
    });
}
