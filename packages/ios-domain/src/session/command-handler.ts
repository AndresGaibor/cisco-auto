/**
 * Interface para handler que ejecuta comandos en una sesión CLI.
 * La implementación real (e.g., PTCommandLine) recibe el comando y retorna status + output.
 */
export interface CommandHandler {
  /**
   * Ejecuta un comando IOS y retorna el resultado.
   * @param cmd - Comando a ejecutar
   * @returns Tupla de [status, rawOutput]; status 0 = éxito
   */
  enterCommand(cmd: string): [number, string] | Promise<[number, string]>;
}
